"""
Page Processor Backend Server
-----------------------------
Handles API requests from the Chrome extension.
Provides endpoints for summarizing web pages using Gemini AI and Fire Crawl.
"""

import os
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
import uvicorn
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Fix import path - using relative import since we're running from the backend directory
from .firecrawl_extractor import FireCrawlExtractor
from .gemini_summarizer import GeminiSummarizer
from .page_processor import PageProcessor

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

app = FastAPI(title="Page Processor API")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity (adjust for production)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# --- Exception Handler for Validation Errors ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log the detailed validation errors
    logger.error(f"Validation error for request {request.method} {request.url}:")
    for error in exc.errors():
        logger.error(f"  Location: {error.get('loc')}, Message: {error.get('msg')}, Type: {error.get('type')}")
    
    # Return the default 422 response that FastAPI would normally send
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# --- API Models ---
class SummarizeRequest(BaseModel):
    url: str
    mode: str = 'summarize'

# --- API Endpoints ---
@app.post("/api/summarize")
async def summarize_endpoint(request: SummarizeRequest):
    # No need for manual validation or raw body logging anymore
    logger.info(f"Processing URL: {request.url} with mode: {request.mode}")
    
    try:
        # Use PageProcessor with validated Pydantic data
        result = await page_processor.process_page(request.url)
        
        if result.get("success"):
            return result
        else:
            logger.error(f"Processing failed for {request.url}: {result.get('error')}")
            raise HTTPException(status_code=500, detail=result.get("error", "Processing failed"))
            
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Unexpected error processing {request.url}: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")

@app.get("/api/ping")
async def ping_endpoint():
    # ---> REMOVED DEBUG LOG
    # logger.info("Received ping request")
    return {"status": "ok"}

# --- Main execution ---
if __name__ == "__main__":
    logger.info("Starting backend server...")
    # Recommended: Use environment variables for host and port in production
    host = os.getenv('HOST', '127.0.0.1') 
    port = int(os.getenv('PORT', '5001'))
    
    uvicorn.run(app, host=host, port=port)