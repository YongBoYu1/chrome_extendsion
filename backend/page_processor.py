"""
Page Processor Service
--------------------
Combines FireCrawl extraction and Gemini summarization functionality.
"""

import logging
import os
import re
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path
from firecrawl_extractor import FireCrawlExtractor
from gemini_summarizer import GeminiSummarizer
import markdown_it

# Configure logging
logger = logging.getLogger(__name__)

class PageProcessor:
    def __init__(self, extractor: FireCrawlExtractor, summarizer: GeminiSummarizer):
        self.extractor = extractor
        self.summarizer = summarizer
        # Initialize markdown parser
        self.md_parser = markdown_it.MarkdownIt()

    def extract_text_from_markdown(self, markdown_content: str) -> str:
        """
        Aggressively clean markdown to remove non-content elements (links, images, citations, etc.)
        while attempting to preserve basic paragraph and heading structure for summarization context.
        Focuses on reducing token count before sending to LLM.
        """
        # Parse the markdown into tokens
        tokens = self.md_parser.parse(markdown_content)
        
        text_content = []
        
        # Function to process inline tokens - aggressively cleans
        def process_inline_children(children):
            text = []
            for child in children:
                if child.type == 'text':
                    # Remove extra whitespace within text
                    text.append(re.sub(r'\s+', ' ', child.content))
                elif child.type == 'link_open':
                    # Skip URL, keep only link text
                    continue
                elif child.type == 'link_close':
                    continue
                elif child.type.startswith('image'):
                    # Skip images entirely
                    continue 
                elif child.type == 'softbreak' or child.type == 'hardbreak':
                    # Treat breaks within paragraphs as spaces unless they are significant
                    # This is aggressive; might merge lines inappropriately sometimes
                    text.append(' ') 
                # Skip other inline formatting like code, emphasis for max cleaning
                # else: logger.debug(f"Skipping inline child type: {child.type}")
            # Join and trim whitespace from the processed inline text
            return ' '.join(text).strip()
        
        # Process block tokens
        for i, token in enumerate(tokens):
            if token.type == 'heading_open':
                level = int(token.tag[1])
                # Keep headings but without extra blank lines initially
                text_content.append(f"{'#' * level} ")
            elif token.type == 'heading_close':
                 text_content.append('\n') # Single newline after heading
            elif token.type == 'paragraph_open':
                pass # Handled by inline and paragraph_close
            elif token.type == 'paragraph_close':
                text_content.append('\n\n') # Ensure blank line after paragraph block
            elif token.type == 'bullet_list_open' or token.type == 'ordered_list_open':
                # Skip list container tokens for simplicity
                pass
            elif token.type == 'bullet_list_close' or token.type == 'ordered_list_close':
                # Add a single newline after the list block
                 if text_content and not text_content[-1].endswith('\n\n'):
                      text_content.append('\n')
            elif token.type == 'list_item_open':
                 # Keep list items, marked simply
                 text_content.append(f"* ") 
            elif token.type == 'list_item_close':
                 text_content.append('\n') # Newline after list item content
            elif token.type == 'fence': # Code blocks - skip for summarization
                 pass
            elif token.type == 'html_block' or token.type == 'html_inline': # Skip raw HTML
                 pass
            # Skip tables and other complex blocks for aggressive cleaning
            elif token.type in ['table_open', 'table_close', 'thead_open', 'thead_close', 'tbody_open', 'tbody_close', 'tr_open', 'tr_close', 'th_open', 'th_close', 'td_open', 'td_close']:
                 pass
            elif token.type == 'blockquote_open' or token.type == 'blockquote_close': # Skip blockquotes
                 pass
            elif token.type == 'hr': # Skip horizontal rules
                 pass
            elif token.type == 'inline' and token.children: # Process text content
                 inline_text = process_inline_children(token.children)
                 if inline_text: # Only append if there is actual text content
                    text_content.append(inline_text)
            # else: logger.debug(f"Skipping block token type: {token.type}")

        # Join all parts and clean up aggressively
        result = ''.join(text_content)
        
        # Remove Wikipedia citation references like [1], [2], [citation needed]
        result = re.sub(r'\s?\[(?:\d+|citation needed|note \d+)\]', '', result)
        
        # Consolidate multiple blank lines AND leading/trailing whitespace on lines
        result = re.sub(r'\n\s*\n', '\n\n', result)
        result = re.sub(r'^\s+|\s+$', '', result, flags=re.MULTILINE)
        result = re.sub(r'\n{3,}', '\n\n', result) # Consolidate blank lines again
        
        # Remove lines that are just list markers (e.g., if item content was skipped)
        result = re.sub(r'^\*\s*$\n', '', result, flags=re.MULTILINE)
        
        return result.strip()

    async def process_page(self, url: str, formats: List[str] = ["markdown", "html"],
                         only_main_content: bool = False) -> Dict:
        """Process a webpage by extracting content and generating a summary"""
        logger.info(f"Processing page: {url}")
        
        try:
            # Extract content using FireCrawl
            extraction_result = await self.extractor.scrape(
                url=url,
                formats=formats,
                only_main_content=only_main_content,
                bypass_cookies=False
            )
            
            if not extraction_result.get('success'):
                logger.error(f"Failed to extract content from {url}")
                return extraction_result
            
            data = extraction_result.get('data', {})
            title = data.get('metadata', {}).get('title', '')

            # --- AGGRESSIVE CLEANING: Prepare content for summarization --- 
            content_to_summarize = ''
            if 'markdown' in data and data['markdown']:
                # Use the AGGRESSIVE markdown extractor
                logger.info("Using AGGRESSIVE markdown extractor for summarization content.")
                content_to_summarize = self.extract_text_from_markdown(data['markdown'])
            elif 'html' in data and data['html']:
                # Fallback: If only HTML is available, use the old regex cleaner 
                logger.warning("No markdown content found, using regex cleaning on HTML as fallback.")
                content_to_summarize = self.clean_content_regex(data['html'])
            else:
                logger.error(f"No markdown or HTML content found in extraction result for {url}")
                return {"success": False, "error": "No content extracted"}
            
            if not content_to_summarize:
                 logger.error(f"Content became empty after cleaning for {url}")
                 return {"success": False, "error": "Content empty after cleaning"}

            # Generate summary using Gemini with the aggressively cleaned content
            summary_result = await self.summarizer.summarize(content_to_summarize, title)

            # Calculate word count and reading time from summary
            summary_text = summary_result.get('summary', '')
            word_count = 0
            reading_time_minutes = 0
            if summary_text:
                # Simple word count based on whitespace splitting
                words = summary_text.split()
                word_count = len(words)
                # Estimate reading time (e.g., 200 words per minute)
                reading_time_minutes = round(word_count / 200) if word_count > 0 else 0
            else:
                logger.warning("Summary text is empty, cannot calculate word count or reading time.")

            # Combine results
            return {
                "success": True,
                "url": url,
                "content": extraction_result,
                "summary": summary_text, # Use the variable we already have
                "keyPoints": summary_result.get('keyPoints', []),
                "title": title,
                "wordCount": word_count,
                "readingTime": reading_time_minutes
            }
            
        except Exception as e:
            logger.error(f"Error processing page {url}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def clean_content_regex(self, content: str) -> str:
        """
        Legacy regex-based cleaning as fallback for HTML content.
        """
        # Start with the original content length
        original_length = len(content)
        
        # Replace image markdown: ![](...) or [![...](...)](...)
        content = re.sub(r'!\[(.*?)\]\([^)]+\)', '', content)
        
        # Replace links with just their text: [link text](url) -> link text
        content = re.sub(r'\[(.*?)\]\([^)]+\)', r'\1', content)
        
        # Remove HTML image tags
        content = re.sub(r'<img[^>]+>', '', content)
        
        # Remove Wikipedia-specific templates: {{...}}
        content = re.sub(r'\{\{[^}]+\}\}', '', content)
        
        # Remove HTML comments: <!-- ... -->
        content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
        
        # Remove citation references: [number] or [citation needed]
        content = re.sub(r'\[\d+\]|\[citation needed\]|\[note \d+\]', '', content)
        
        # Simplify horizontal rules
        content = re.sub(r'-{3,}', '---', content)
        
        # Simplify table structures - convert to plain text
        # First replace table headers
        content = re.sub(r'\|\s*-+\s*\|', '\n', content)
        # Replace table cells with simple spacing
        content = re.sub(r'\|\s*', ' ', content)
        
        # Remove duplicate newlines
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        # Log the new length
        new_length = len(content)
        
        return content 