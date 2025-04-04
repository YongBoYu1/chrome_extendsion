"""
Page Processor Backend Server
-----------------------------
Handles API requests from the Chrome extension.
Provides endpoints for summarizing web pages using Gemini AI and Fire Crawl.
"""

import os
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Fix import path - using relative import since we're running from the backend directory
from firecrawl_extractor import FireCrawlExtractor
from gemini_summarizer import GeminiSummarizer
from page_processor import PageProcessor

# Load environment variables
load_dotenv()

# Set up API keys
FIRECRAWL_API_KEY = os.getenv('FIRECRAWL_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    force=True,
    handlers=[
        logging.StreamHandler()
    ]
)

# Get the logger for this module
logger = logging.getLogger(__name__)

# Set all loggers to INFO level (not DEBUG)
for log_name in logging.root.manager.loggerDict:
    logging.getLogger(log_name).setLevel(logging.INFO)

# Initialize components
extractor = FireCrawlExtractor(api_key=FIRECRAWL_API_KEY)
summarizer = GeminiSummarizer(api_key=GEMINI_API_KEY)
page_processor = PageProcessor(extractor=extractor, summarizer=summarizer)

# Initialize FastAPI app
app = FastAPI(title="Page Processor API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request validation
class SummarizeRequest(BaseModel):
    """Request model for summarization"""
    url: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    max_length: Optional[int] = 1000

class FireCrawlScrapeRequest(BaseModel):
    """Request model for Fire Crawl scrape endpoint"""
    url: str
    formats: List[str] = ["markdown", "html"]
    onlyMainContent: bool = True
    removeBase64Images: bool = True
    excludeTags: List[str] = []
    includeTags: List[str] = []
    waitFor: Optional[int] = None
    mobile: Optional[bool] = None

# API endpoints
@app.get("/api/ping")
async def ping():
    """Health check endpoint"""
    logger.info("Ping endpoint called - backend is running")
    return {"status": "ok"}

@app.get("/api/firecrawl/status")
async def firecrawl_status():
    """Check if FireCrawl API is configured"""
    logger.info("Checking FireCrawl API configuration")
    return {
        "configured": bool(FIRECRAWL_API_KEY),
        "available": bool(FIRECRAWL_API_KEY)
    }

@app.post("/api/summarize")
async def summarize(request: SummarizeRequest):
    """Generate a summary of the provided content"""
    if not request.content and not request.url:
        raise HTTPException(status_code=400, detail="Either content or URL must be provided")
    
    try:
        if request.url:
            # Process the URL using the PageProcessor
            result = await page_processor.process_page(
                url=request.url,
                formats=["markdown", "html"],
                only_main_content=True
            )
            return result
        else:
            # Directly summarize the provided content
            summary_result = await summarizer.summarize(
                content=request.content,
                title=request.title,
                max_length=request.max_length
            )
            return summary_result
    except Exception as e:
        logger.error(f"Error in summarize endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/firecrawl/scrape")
async def fire_crawl_scrape(request: FireCrawlScrapeRequest):
    """Scrape a single webpage with FireCrawl"""
    try:
        result = await extractor.scrape(
            url=request.url,
            formats=request.formats,
            only_main_content=request.onlyMainContent,
            remove_base64_images=request.removeBase64Images,
            exclude_tags=request.excludeTags,
            include_tags=request.includeTags,
            wait_for=request.waitFor,
            mobile=request.mobile
        )
        return result
    except Exception as e:
        logger.error(f"Error in fire_crawl_scrape endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Start the server
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5001"))
    logger.info(f"Starting server on port {port}")
    logger.info(f"FireCrawl API key configured: {bool(FIRECRAWL_API_KEY)}")
    logger.info(f"Gemini API key configured: {bool(GEMINI_API_KEY)}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True) 