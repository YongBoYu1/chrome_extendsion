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
        Extract clean text from markdown content using markdown-it-py parser.
        This removes formatting, links, images, and other non-text elements.
        """
        # Parse the markdown into tokens
        tokens = self.md_parser.parse(markdown_content)
        
        # Build the cleaned text content
        text_content = []
        
        # Function to process inline tokens and extract just the text
        def process_inline_children(children):
            text = []
            for child in children:
                if child.type == 'text':
                    text.append(child.content)
                elif child.type == 'softbreak' or child.type == 'hardbreak':
                    text.append('\n')
                # For links, just extract the text content
                elif child.type == 'link_open':
                    continue  # Skip the link opening tag
                elif child.type == 'link_close':
                    continue  # Skip the link closing tag
                # Skip images entirely
                elif child.type.startswith('image'):
                    continue
            return ''.join(text)
        
        # Process all tokens
        in_paragraph = False
        for token in tokens:
            # Handle headings - keep the text but make it stand out
            if token.type == 'heading_open':
                level = int(token.tag[1])  # h1, h2, etc.
                text_content.append(f"\n{'#' * level} ")
            # Handle paragraphs
            elif token.type == 'paragraph_open':
                in_paragraph = True
                if text_content and not text_content[-1].endswith('\n'):
                    text_content.append('\n\n')
            elif token.type == 'paragraph_close':
                in_paragraph = False
                if text_content and not text_content[-1].endswith('\n'):
                    text_content.append('\n')
            # Handle inline content (the actual text)
            elif token.type == 'inline' and token.children:
                text_content.append(process_inline_children(token.children))
            # Handle bullet lists
            elif token.type == 'bullet_list_open':
                if text_content and not text_content[-1].endswith('\n'):
                    text_content.append('\n')
            elif token.type == 'list_item_open':
                text_content.append('- ')
            # Handle code blocks - keep them
            elif token.type == 'fence':
                text_content.append(f"\n```\n{token.content}\n```\n")
            # Handle tables - simplify them
            elif token.type == 'table_open':
                text_content.append('\n')
            elif token.type == 'tr_open':
                text_content.append('\n')
            elif token.type == 'tr_close':
                text_content.append('\n')
            elif token.type == 'th_open' or token.type == 'td_open':
                text_content.append('| ')
            elif token.type == 'th_close' or token.type == 'td_close':
                text_content.append(' ')
        
        # Join all text and clean up extra whitespace
        result = ''.join(text_content)
        
        # Remove extra newlines
        result = re.sub(r'\n{3,}', '\n\n', result)
        
        # Remove Wikipedia citation references that might remain
        result = re.sub(r'\[\d+\]|\[citation needed\]|\[note \d+\]', '', result)
        
        # Clean up extra whitespace again after removal
        result = re.sub(r'\n{3,}', '\n\n', result)
        return result.strip()

    async def process_page(self, url: str, formats: List[str] = ["markdown", "html"],
                         only_main_content: bool = False) -> Dict:
        """Process a webpage by extracting content and generating a summary"""
        logger.info(f"Processing page: {url}")
        
        try:
            # Extract content using FireCrawl, matching the successful test script parameters
            extraction_result = await self.extractor.scrape(
                url=url,
                formats=formats, # Typically ["markdown", "html"]
                only_main_content=False, # Explicitly match the test script
                bypass_cookies=False  # Explicitly match the test script (no Playwright)
            )
            
            if not extraction_result.get('success'):
                logger.error(f"Failed to extract content from {url}")
                return extraction_result
            
            # Get the content and title
            data = extraction_result.get('data', {})
            content = data.get('markdown', '') or data.get('html', '')
            title = data.get('metadata', {}).get('title', '')
            
            # Extract clean text from markdown
            content_type = 'markdown' if 'markdown' in data else 'html'
            
            if content_type == 'markdown':
                # Use markdown-it-py parser for markdown content
                cleaned_content = self.extract_text_from_markdown(content)
            else:
                # For HTML content, use the existing regex cleaning as fallback
                # In a production version, we would want to use BeautifulSoup here
                cleaned_content = self.clean_content_regex(content)
            
            # Generate summary using Gemini with cleaned content
            summary_result = await self.summarizer.summarize(cleaned_content, title)
            
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