"""
Page Processor Service
--------------------
Combines FireCrawl extraction and Gemini summarization functionality.
"""

import logging
from typing import Dict, List, Optional
from firecrawl_extractor import FireCrawlExtractor
from gemini_summarizer import GeminiSummarizer

# Configure logging
logger = logging.getLogger(__name__)

class PageProcessor:
    def __init__(self, extractor: FireCrawlExtractor, summarizer: GeminiSummarizer):
        self.extractor = extractor
        self.summarizer = summarizer

    async def process_page(self, url: str, formats: List[str] = ["markdown", "html"],
                         only_main_content: bool = True) -> Dict:
        """Process a webpage by extracting content and generating a summary"""
        logger.info(f"Processing page: {url}")
        
        try:
            # Extract content using FireCrawl
            extraction_result = await self.extractor.scrape(
                url=url,
                formats=formats,
                only_main_content=only_main_content
            )
            
            if not extraction_result.get('success'):
                logger.error(f"Failed to extract content from {url}")
                return extraction_result
            
            # Get the content and title
            data = extraction_result.get('data', {})
            content = data.get('markdown', '') or data.get('html', '')
            title = data.get('metadata', {}).get('title', '')
            
            # Generate summary using Gemini
            summary_result = await self.summarizer.summarize(content, title)
            
            # Combine results
            return {
                "success": True,
                "url": url,
                "content": extraction_result,
                "summary": summary_result.get('summary'),
                "keyPoints": summary_result.get('keyPoints', []),
                "title": title
            }
            
        except Exception as e:
            logger.error(f"Error processing page {url}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            } 