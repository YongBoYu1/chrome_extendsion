from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import re
from bs4 import BeautifulSoup
from typing import Optional, Dict, Any

app = FastAPI(title="Page Processor API")

# Add CORS middleware to allow your extension to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (Chrome extension)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint with instructions"""
    return {
        "message": "Page Processor API is running",
        "endpoints": {
            "/api/ping": "Health check endpoint",
            "/api/process": "Process web page content (POST)"
        }
    }

@app.get("/api/ping")
async def ping():
    """Health check endpoint"""
    return {"status": "ok"}

@app.post("/api/process")
async def process(request: Request):
    """Process content from the extension"""
    data = await request.json()
    
    mode = data.get('mode', '')
    title = data.get('title', '')
    url = data.get('url', '')
    content = data.get('content', '')
    plain_text = data.get('plainText', '')
    
    # Process based on the requested mode
    if mode == 'summarize':
        return summarize_content(title, url, content, plain_text)
    elif mode == 'focus':
        return focus_content(title, url, content, plain_text)
    elif mode == 'duplicate':
        return duplicate_content(title, url, content, plain_text)
    else:
        return {
            "title": "Unknown Mode",
            "content": f"<div class='error'>Unknown processing mode: {mode}</div>",
            "metadata": {"url": url}
        }

def summarize_content(title: str, url: str, html_content: str, plain_text: str) -> Dict[str, Any]:
    """
    Summarize the web page content.
    In a real implementation, you would use NLP techniques or an API.
    """
    # For now, we'll create a basic summary by extracting key paragraphs
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract main content paragraphs
    paragraphs = soup.find_all('p')
    
    # Select paragraphs that are likely to be content (longer than 100 chars)
    content_paragraphs = [p.text for p in paragraphs if len(p.text) > 100]
    
    # Create a simple summary - in real app, use NLP summarization
    if content_paragraphs:
        # Take the first few paragraphs as a summary
        summary_text = content_paragraphs[0]
        if len(content_paragraphs) > 1:
            summary_text += "\n\n" + content_paragraphs[1]
            
        # Clean the content for display
        cleaned_content = clean_content(html_content)
        
        return {
            "title": f"Summary: {title}",
            "content": cleaned_content,
            "summary": f"<div class='summary'><p>{summary_text}</p></div>",
            "metadata": {"url": url}
        }
    else:
        return {
            "title": f"Summary: {title}",
            "content": "<div>Could not generate summary - insufficient content</div>",
            "summary": "<div class='error'>Could not generate summary</div>",
            "metadata": {"url": url}
        }

def focus_content(title: str, url: str, html_content: str, plain_text: str) -> Dict[str, Any]:
    """
    Create a distraction-free version of the content.
    Removes ads, navigation, sidebars, etc.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Remove potential distractions (common ad and navigation elements)
    for selector in ['nav', 'header', 'footer', 'aside', '.ads', '.ad', '.navigation', 
                     '.sidebar', '.comment', '.social', '.share', '.related']:
        for element in soup.select(selector):
            element.decompose()
    
    # Try to find the main content
    main_content = soup.find('main') or soup.find('article') or soup.find('div', class_='content')
    
    if main_content:
        content_html = str(main_content)
    else:
        # If no main content container, use the body but remove script/style tags
        for tag in soup.find_all(['script', 'style', 'iframe']):
            tag.decompose()
        content_html = str(soup.body)
    
    return {
        "title": f"Focus Mode: {title}",
        "content": f"<div class='focus-content'>{content_html}</div>",
        "summary": "<div class='info'>Focus mode removes distractions for better reading.</div>",
        "metadata": {"url": url}
    }

def duplicate_content(title: str, url: str, html_content: str, plain_text: str) -> Dict[str, Any]:
    """
    Create a duplicate of the page content with minimal processing.
    """
    # Clean up the content
    cleaned_content = clean_content(html_content)
    
    return {
        "title": title,
        "content": cleaned_content,
        "summary": "<div class='info'>This is a clean duplicate of the original page.</div>",
        "metadata": {"url": url}
    }

def clean_content(html_content: str) -> str:
    """Clean the HTML content for display"""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Remove scripts, styles, and iframes for security
    for tag in soup.find_all(['script', 'style', 'iframe']):
        tag.decompose()
    
    # Make all links open in a new tab and add nofollow
    for a in soup.find_all('a', href=True):
        a['target'] = '_blank'
        a['rel'] = 'nofollow noopener'
    
    # Return the cleaned HTML
    return str(soup.body) if soup.body else str(soup)

if __name__ == "__main__":
    print("Starting Page Processor API at http://localhost:5001")
    print("Available endpoints:")
    print("  - GET /api/ping: Health check")
    print("  - POST /api/process: Process web page content")
    print("Press Ctrl+C to stop the server")
    uvicorn.run(app, host="0.0.0.0", port=5001) 