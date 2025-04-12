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
from pathlib import Path

# Fix import path - using relative import since we're running from the backend directory
from firecrawl_extractor import FireCrawlExtractor
from gemini_summarizer import GeminiSummarizer
from page_processor import PageProcessor

# Configure basic logging
logging.basicConfig(
    level=logging.INFO, # Keep INFO level for startup and general status
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Load environment variables ---
try:
    load_dotenv(dotenv_path=Path(__file__).resolve().parent / '.env')
    firecrawl_api_key = os.getenv("FIRECRAWL_API_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    if not firecrawl_api_key:
        logger.warning("FIRECRAWL_API_KEY not found in .env file.")
    # Keep Gemini key check, it's essential
    if not gemini_api_key:
        logger.critical("GEMINI_API_KEY not found in .env file. Summarization will fail.")
        # Consider exiting if Gemini key is missing
        # sys.exit("Critical error: Gemini API key missing.")

except Exception as e:
    logger.error(f"Error loading .env file: {e}")
    firecrawl_api_key = None
    gemini_api_key = None

# --- Initialize services ---

# Initialize FireCrawl extractor
extractor = FireCrawlExtractor(api_key=firecrawl_api_key)

# Initialize Gemini summarizer
summarizer = GeminiSummarizer(api_key=gemini_api_key)

# Initialize PageProcessor
page_processor = PageProcessor(extractor=extractor, summarizer=summarizer)

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity (adjust for production)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# --- API Models ---
class SummarizeRequest(BaseModel):
    url: str
    mode: str = 'summarize'

# --- API Endpoints ---
@app.post("/summarize")
async def summarize_endpoint(request: SummarizeRequest):
    logger.info(f"Received request for URL: {request.url}")
    try:
        # Use PageProcessor to handle the request
        result = await page_processor.process_page(request.url)
        
        if result.get("success"):
            # ---> REMOVED DEBUG LOG: Don't log the whole successful result
            # logger.info(f"Successfully processed: {request.url}, Title: {result.get('title')}")
            return result
        else:
            logger.error(f"Processing failed for {request.url}: {result.get('error')}")
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
            
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions directly
        raise http_exc
    except Exception as e:
        logger.exception(f"Unexpected error processing {request.url}: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")

@app.get("/ping")
async def ping_endpoint():
    # ---> REMOVED DEBUG LOG
    # logger.info("Received ping request")
    return {"status": "ok"}

# --- Main execution ---
if __name__ == "__main__":
    logger.info("Starting backend server...")
    # Recommended: Use environment variables for host and port in production
    host = os.getenv('HOST', '127.0.0.1') 
    port = int(os.getenv('PORT', '8000'))
    
    uvicorn.run(app, host=host, port=port)