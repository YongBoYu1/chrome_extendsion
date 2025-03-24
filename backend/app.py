from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from bs4 import BeautifulSoup
import nltk
from nltk.tokenize import sent_tokenize
from nltk.corpus import stopwords
from nltk.cluster.util import cosine_distance
import numpy as np
import re
from pydantic import BaseModel
import uvicorn
import requests
import asyncio
from typing import List, Optional, Dict, Any, Union
import os
from dotenv import load_dotenv
from urllib.parse import urlparse, urljoin
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Get API keys from environment variables
FIRECRAWL_API_KEY = os.getenv('FIRECRAWL_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
FIRECRAWL_API_BASE_URL = 'https://fire-crawl.fly.dev/api/v1'

# Initialize Gemini client
genai.configure(api_key=GEMINI_API_KEY)

# Initialize FastAPI app
app = FastAPI(title="Content Processor API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Download required NLTK resources
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
except Exception as e:
    logger.error(f"Error downloading NLTK resources: {e}")

# Define request models
class ProcessRequest(BaseModel):
    mode: str
    url: str = ""
    title: str = ""
    content: str = ""
    plainText: str = ""

class FireCrawlScrapeRequest(BaseModel):
    url: str
    formats: List[str] = ["markdown", "html"]
    onlyMainContent: bool = True
    removeBase64Images: bool = True
    excludeTags: Optional[List[str]] = None
    includeTags: Optional[List[str]] = None
    mobile: Optional[bool] = None
    waitFor: Optional[int] = None
    timeout: Optional[int] = 30000

class FireCrawlMapRequest(BaseModel):
    url: str
    limit: Optional[int] = 10
    includeSubdomains: bool = False
    sitemapOnly: bool = False

class FireCrawlSearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 5
    lang: str = "en"
    country: str = "us"
    scrapeOptions: Optional[Dict[str, Any]] = None

@app.get("/")
async def root():
    """Root endpoint to verify API is running"""
    return {"message": "Page Processor API is running"}

@app.get("/api/status")
async def status():
    """Endpoint to check if the backend is running"""
    logger.info("Status endpoint called")
    return {"status": "ok", "message": "Backend is running properly"}

@app.get("/api/firecrawl/status")
async def fire_crawl_status():
    """Check if FireCrawl API is configured and available"""
    try:
        is_configured = bool(FIRECRAWL_API_KEY)
        
        # Simple test request if key is configured
        is_available = False
        if is_configured:
            try:
                # Just test connection to the API
                response = requests.get(
                    f"{FIRECRAWL_API_BASE_URL}/health", 
                    headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}"},
                    timeout=2
                )
                is_available = response.status_code == 200
            except:
                is_available = False
        
        return {
            "configured": is_configured,
            "available": is_configured and is_available,
            "status": "ready" if (is_configured and is_available) else "unavailable"
        }
    except Exception as e:
        logger.error(f"Error checking FireCrawl status: {str(e)}")
        return {"configured": False, "available": False, "status": f"error: {str(e)}"}

@app.get("/api/ping")
async def ping():
    """Simple ping endpoint to check if the API is running"""
    return {"status": "ok", "message": "Backend server is running"}

@app.post("/api/process")
async def process_content(request: ProcessRequest):
    """Process content with specified mode"""
    try:
        logger.info(f"Processing content with mode: {request.mode}")
        logger.info(f"Content length: {len(request.content) if request.content else 'No content'}")
        logger.info(f"URL: {request.url if request.url else 'No URL provided'}")
        
        # Set up response structure
        result = {
            "original_content": request.content[:1000] + "..." if request.content and len(request.content) > 1000 else request.content,
            "processed_content": "",
            "title": request.title or "Processed Content",
            "mode": request.mode,
            "source_url": request.url
        }
        
        # If we have a URL and no content, first fetch the content using FireCrawl
        if request.url and not request.content and request.mode == "summarize":
            logger.info(f"Fetching content from URL using FireCrawl: {request.url}")
            
            # Create a FireCrawl scrape request
            firecrawl_request = FireCrawlScrapeRequest(
                url=request.url,
                formats=["markdown", "html"],
                onlyMainContent=True
            )
            
            # Get summary directly using our integrated endpoint
            summary_result = await summarize_url(firecrawl_request)
            result["processed_content"] = summary_result["summary"]
            result["title"] = summary_result["title"] or request.title
            return result
        
        # Process existing content (if URL fetch wasn't used)
        # Extract main content from HTML if provided
        if request.content and "<html" in request.content:
            soup = BeautifulSoup(request.content, 'html.parser')
            main_content = extract_main_content(soup)
            text_content = extract_text_content(main_content)
        else:
            text_content = request.content
        
        # Process based on mode
        if request.mode == "summarize":
            # Enhanced summarization using Gemini
            summarized_content = await generate_ai_summary(text_content, request.url, request.title)
            result["processed_content"] = summarized_content
            
        elif request.mode == "focus":
            # Apply focus mode processing
            focus_content = generate_focus_view(text_content)
            result["processed_content"] = focus_content
            
        elif request.mode == "duplicate":
            # For duplicate mode, provide cleaned content
            readable_content = make_content_readable(request.content, request.url)
            result["processed_content"] = readable_content
        
        logger.info(f"Processing completed for mode: {request.mode}")
        return result
        
    except Exception as e:
        logger.error(f"Error processing content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process content: {str(e)}")

@app.post("/api/firecrawl/scrape")
async def fire_crawl_scrape(request: FireCrawlScrapeRequest):
    """Scrape a single webpage with FireCrawl"""
    if not FIRECRAWL_API_KEY:
        logger.warning("FireCrawl API key not configured. Using local fallback method.")
        return await _local_scrape_fallback(request.url)
    
    try:
        logger.info(f"Fire Crawl Scrape request for URL: {request.url}")
        logger.info(f"Request formats: {request.formats}, onlyMainContent: {request.onlyMainContent}")
        
        # Prepare request to FireCrawl API
        api_url = f"{FIRECRAWL_API_BASE_URL}/scrape"
        
        # Set default formats if not provided
        formats = request.formats or ["markdown", "html"]
        
        # Enhanced payload with optimized parameters for better content extraction
        payload = {
            "url": request.url,
            "formats": formats,
            "onlyMainContent": request.onlyMainContent,
            "removeBase64Images": request.removeBase64Images,
            # Additional optimized parameters
            "excludeTags": ["iframe", "script", "button", "form", "aside", "nav", "footer", "header", "style"],
            "mobile": True,  # Use mobile view for cleaner content
            "waitFor": 1500,  # Wait for JavaScript content to render (1.5 seconds)
        }
        
        headers = {
            "Authorization": f"Bearer {FIRECRAWL_API_KEY}",
            "Content-Type": "application/json"
        }
        
        logger.info(f"Sending request to FireCrawl API: {api_url}")
        
        # Call FireCrawl API
        response = requests.post(api_url, json=payload, headers=headers, timeout=10)
        
        logger.info(f"FireCrawl API response status code: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"FireCrawl API error: {response.text}")
            logger.info("Falling back to local scraping method")
            return await _local_scrape_fallback(request.url)
        
        # Return the FireCrawl response
        result = response.json()
        logger.info(f"Success! Received data from FireCrawl API with keys: {list(result.keys())}")
        return result
    
    except (requests.RequestException, requests.Timeout) as e:
        logger.error(f"Request to FireCrawl API failed: {str(e)}")
        logger.info("Falling back to local scraping method")
        return await _local_scrape_fallback(request.url)
    except Exception as e:
        logger.error(f"Error during scraping: {str(e)}")
        logger.info("Falling back to local scraping method")
        return await _local_scrape_fallback(request.url)

async def _local_scrape_fallback(url):
    """Local fallback method for scraping when FireCrawl API is unavailable"""
    logger.info(f"Using local scraper for URL: {url}")
    try:
        # Use requests to get the page content
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        response.raise_for_status() # Raise exception for bad status codes
        
        # Get base URL for resolving relative paths
        base_url = get_base_url(url)
        
        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Fix relative image URLs before any processing
        for img in soup.find_all('img'):
            # Handle src attribute
            if img.has_attr('src'):
                img['src'] = make_absolute_url(img['src'], url)
            
            # Handle data-src for lazy-loaded images
            if img.has_attr('data-src'):
                img['src'] = make_absolute_url(img['data-src'], url)
            
            # Filter out tiny images (likely tracking pixels or icons)
            width = img.get('width')
            height = img.get('height')
            if width and height and int(width) < 50 and int(height) < 50:
                img.decompose()
                continue
            
            # Remove images with ad-related classes or parent containers with ad classes
            img_classes = img.get('class', [])
            if isinstance(img_classes, str):
                img_classes = [img_classes]
                
            parent_classes = []
            for parent in img.parents:
                if parent.get('class'):
                    parent_classes.extend(parent.get('class', []))
            
            ad_related_terms = ['ad', 'ads', 'advertisement', 'banner', 'promo', 'sidebar', 'tracking']
            has_ad_class = any(any(term in cls.lower() for term in ad_related_terms) 
                              for cls in img_classes + parent_classes)
            
            if has_ad_class:
                img.decompose()
                continue
        
        # Remove unnecessary elements
        for element in soup(['script', 'style', 'nav', 'footer', 'header', 'iframe', 'aside']):
            element.decompose()
        
        # Get the title
        title = soup.title.string if soup.title else "Scraped Content"
        
        # Try to find main content
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile('content|main|article'))
        
        if not main_content:
            # If no main content found, use the body
            main_content = soup.body
        
        # Convert to markdown-like plain text for the markdown format
        markdown_content = ""
        for heading in main_content.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            level = int(heading.name[1])
            markdown_content += '#' * level + ' ' + heading.get_text().strip() + '\n\n'
        
        for para in main_content.find_all('p'):
            markdown_content += para.get_text().strip() + '\n\n'
            
        # Add image descriptions to markdown
        for img in main_content.find_all('img'):
            if img.get('alt'):
                markdown_content += f"![{img.get('alt')}]({img.get('src', '')})\n\n"
            else:
                markdown_content += f"![Image]({img.get('src', '')})\n\n"
        
        return {
            "title": title,
            "html": str(main_content),
            "markdown": markdown_content
        }
        
    except Exception as e:
        logger.error(f"Error in local scraper: {str(e)}")
        # Return minimal content so the frontend doesn't break
        return {
            "title": "Error Scraping Content",
            "html": f"<div><p>Error scraping content: {str(e)}</p></div>",
            "markdown": f"Error scraping content: {str(e)}"
        }

@app.post("/api/firecrawl/map")
async def fire_crawl_map(request: FireCrawlMapRequest):
    """Discover URLs from a starting point"""
    if not FIRECRAWL_API_KEY:
        raise HTTPException(status_code=500, detail="FireCrawl API key not configured")
    
    try:
        logger.info(f"Fire Crawl Map request for URL: {request.url}")
        
        urls = []
        base_domain = extract_domain(request.url)
        
        # Check sitemap if not explicitly skipped
        if not request.sitemapOnly:
            # Try to get sitemap.xml
            sitemap_url = f"{get_base_url(request.url)}/sitemap.xml"
            try:
                sitemap_response = requests.get(sitemap_url, timeout=10)
                if sitemap_response.status_code == 200:
                    soup = BeautifulSoup(sitemap_response.text, 'xml')
                    locs = soup.find_all('loc')
                    
                    for loc in locs:
                        url = loc.text
                        # Check if we should include subdomains
                        if request.includeSubdomains or is_same_domain(url, base_domain):
                            urls.append(url)
                            if len(urls) >= request.limit:
                                break
            except Exception as sitemap_err:
                logger.warning(f"Error fetching sitemap: {sitemap_err}")
        
        # If we haven't reached the limit and we're not using sitemap only,
        # try to get URLs from HTML links
        if len(urls) < request.limit and not request.sitemapOnly:
            try:
                response = requests.get(request.url, timeout=10)
                soup = BeautifulSoup(response.text, 'html.parser')
                links = soup.find_all('a', href=True)
                
                for link in links:
                    href = link['href']
                    full_url = make_absolute_url(href, request.url)
                    
                    if full_url and (request.includeSubdomains or is_same_domain(full_url, base_domain)):
                        if full_url not in urls:
                            urls.append(full_url)
                            if len(urls) >= request.limit:
                                break
            except Exception as html_err:
                logger.warning(f"Error extracting links from HTML: {html_err}")
        
        return {"urls": urls[:request.limit]}
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Request to FireCrawl API failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error mapping URLs: {str(e)}")

@app.post("/api/firecrawl/search")
async def fire_crawl_search(request: FireCrawlSearchRequest):
    """Search and retrieve content from web pages"""
    if not FIRECRAWL_API_KEY:
        raise HTTPException(status_code=500, detail="FireCrawl API key not configured")
    
    try:
        logger.info(f"Fire Crawl Search request for query: {request.query}")
        
        # We'll simulate a search by using a search engine API
        # In a real implementation, you would use a proper search API
        # This is a simplified version
        
        search_url = f"https://duckduckgo.com/html/?q={request.query}&kl={request.lang}_{request.country}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        response = requests.get(search_url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        results = []
        search_results = soup.find_all('div', class_='result')
        
        for result in search_results[:request.limit]:
            title_el = result.find('a', class_='result__a')
            url_el = result.find('a', class_='result__url')
            snippet_el = result.find('a', class_='result__snippet')
            
            if title_el and url_el:
                title = title_el.text.strip()
                url = "https://" + url_el.text.strip()
                snippet = snippet_el.text.strip() if snippet_el else ""
                
                result_data = {
                    "title": title,
                    "url": url,
                    "snippet": snippet
                }
                
                # If scrapeOptions is provided, scrape the page
                if request.scrapeOptions:
                    try:
                        # Create a scrape request
                        scrape_request = FireCrawlScrapeRequest(
                            url=url,
                            formats=request.scrapeOptions.get("formats", ["markdown"]),
                            onlyMainContent=request.scrapeOptions.get("onlyMainContent", True)
                        )
                        # Scrape the page
                        scrape_result = await fire_crawl_scrape(scrape_request)
                        # Add scraped content to the result
                        result_data["content"] = scrape_result
                    except Exception as scrape_err:
                        logger.warning(f"Error scraping result: {scrape_err}")
                
                results.append(result_data)
        
        return {"results": results}
    
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Request to FireCrawl API failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during search: {str(e)}")

@app.post("/api/summarize-url")
async def summarize_url(request: FireCrawlScrapeRequest):
    """Scrape a URL with FireCrawl and then summarize with Gemini"""
    try:
        logger.info(f"Processing URL for summary: {request.url}")
        
        # Use FireCrawl to scrape the content
        scrape_result = await fire_crawl_scrape(request)
        
        # Extract the markdown content for processing
        if "markdown" in scrape_result:
            content = scrape_result["markdown"]
        elif "html" in scrape_result:
            # Parse HTML if markdown not available
            soup = BeautifulSoup(scrape_result["html"], 'html.parser')
            content = extract_text_content(soup)
        else:
            return {"error": "No content could be scraped from the URL"}
        
        # Extract title from scrape result
        title = scrape_result.get("title", "")
        
        # Clean the content
        cleaned_content = clean_for_summarization(content)
        
        # Get URL metadata
        url = request.url
        
        # Generate summary using Gemini
        summary = await generate_ai_summary(cleaned_content, url, title)
        
        return {
            "url": url,
            "title": title,
            "summary": summary,
            "original_content_length": len(cleaned_content)
        }
        
    except Exception as e:
        logger.error(f"Error summarizing URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to summarize URL: {str(e)}")

# Helper functions for FireCrawl

def extract_domain(url):
    """Extract domain from URL"""
    import re
    match = re.search(r'https?://([^/]+)', url)
    if match:
        return match.group(1)
    return None

def get_base_url(url):
    """Get base URL (scheme + domain)"""
    import re
    match = re.search(r'(https?://[^/]+)', url)
    if match:
        return match.group(1)
    return url

def is_same_domain(url, domain):
    """Check if URL is from the same domain"""
    url_domain = extract_domain(url)
    return url_domain == domain or (url_domain and url_domain.endswith('.' + domain))

def make_absolute_url(url, base_url):
    """Convert a relative URL to an absolute URL"""
    if not url:
        return ""
    
    # If it's already an absolute URL or a data URL, return as is
    if url.startswith(('http://', 'https://', 'data:', '//')):
        return url
    
    # Handle root-relative URLs
    if url.startswith('/'):
        # Extract domain from base_url
        parsed_base = urlparse(base_url)
        domain = f"{parsed_base.scheme}://{parsed_base.netloc}"
        return domain + url
    
    # Handle relative URLs (without leading slash)
    return urljoin(base_url, url)

# Existing functions

async def generate_ai_summary(content, url=None, title=None):
    """Generate an AI-powered summary of the content"""
    try:
        # Clean and prepare the content for summarization
        cleaned_content = clean_for_summarization(content)
        
        # If content is too short, no need to summarize
        if len(cleaned_content.split()) < 100:
            return f"<h3>Summary</h3><p>{cleaned_content}</p>"
        
        # Context information for summarization
        context = f"Title: {title}\nURL: {url}\n\n" if title and url else ""
        
        # Prepare the prompt for the AI model
        prompt = f"""{context}You are an expert content summarizer. Please create a comprehensive summary of the following web page content:

            1. Begin with a brief overview (1-2 sentences) of what this page is about.

            2. Identify and preserve the main sections and their hierarchical structure.

            3. For documentation pages:
            - Preserve important code examples (but you can shorten verbose ones)
            - Highlight key functions, parameters, and return values
            - Note important warnings or tips
            - Maintain proper technical terminology

            4. Extract the most important points and concepts from each section.

            5. Format your response with clear headings and bullet points for easy scanning.

            6. If the content contains step-by-step instructions, preserve the essential steps.

            7. Conclude with any important notes or next steps mentioned in the content.

            Your summary should be both concise and comprehensive, allowing the reader to understand the key information without reading the full page.

            Content to summarize:
            {cleaned_content}"""
                    
        # Use Gemini for summarization if available
        if GEMINI_API_KEY:
            summary = await get_gemini_summary(prompt)
        # Otherwise use a simpler extractive summarization approach
        else:
            summary = extractive_summarization(cleaned_content)
        
        # Format the summary for display
        formatted_summary = format_summary_for_display(summary, title)
        return formatted_summary
        
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        return f"<p>Error generating summary: {str(e)}</p>"

async def get_gemini_summary(prompt):
    """Get a summary from Gemini API"""
    try:
        # Get Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Generate content asynchronously
        response = await asyncio.to_thread(model.generate_content, prompt)
        
        # Return the generated text
        return response.text
        
    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        # Fall back to extractive summarization
        return extractive_summarization(prompt.split("\n\n")[-1])  # Get just the content part

def extractive_summarization(text, num_sentences=5):
    """Simple extractive summarization when AI is not available"""
    try:
        from nltk.tokenize import sent_tokenize
        from nltk.corpus import stopwords
        from nltk.cluster.util import cosine_distance
        import numpy as np
        import networkx as nx
        
        # Ensure NLTK resources are available
        try:
            stopwords.words('english')
        except:
            import nltk
            nltk.download('punkt')
            nltk.download('stopwords')
        
        # Tokenize into sentences
        sentences = sent_tokenize(text)
        
        # If very few sentences, return all
        if len(sentences) <= num_sentences:
            return " ".join(sentences)
            
        # Build similarity matrix
        stop_words = set(stopwords.words('english'))
        similarity_matrix = np.zeros((len(sentences), len(sentences)))
        
        for i in range(len(sentences)):
            for j in range(len(sentences)):
                if i != j:
                    similarity_matrix[i][j] = sentence_similarity(sentences[i], sentences[j], stop_words)
                    
        # Use PageRank to rank sentences
        nx_graph = nx.from_numpy_array(similarity_matrix)
        scores = nx.pagerank(nx_graph)
        
        # Get top-ranked sentences
        ranked_sentences = sorted(((scores[i], i, s) for i, s in enumerate(sentences)), reverse=True)
        top_sentences = [s for _, i, s in sorted(ranked_sentences[:num_sentences], key=lambda x: x[1])]
        
        return " ".join(top_sentences)
    except Exception as e:
        logger.error(f"Extractive summarization error: {str(e)}")
        # Very basic fallback - first few sentences
        sentences = text.split(". ")
        return ". ".join(sentences[:num_sentences]) + "."

def sentence_similarity(sent1, sent2, stop_words):
    """Calculate similarity between two sentences"""
    words1 = [word.lower() for word in sent1.split() if word.lower() not in stop_words]
    words2 = [word.lower() for word in sent2.split() if word.lower() not in stop_words]
    
    all_words = list(set(words1 + words2))
    
    vector1 = [0] * len(all_words)
    vector2 = [0] * len(all_words)
    
    for word in words1:
        vector1[all_words.index(word)] += 1
    
    for word in words2:
        vector2[all_words.index(word)] += 1
    
    # Calculate cosine similarity
    sum_dot = sum(v1 * v2 for v1, v2 in zip(vector1, vector2))
    sum1 = sum(v**2 for v in vector1) ** 0.5
    sum2 = sum(v**2 for v in vector2) ** 0.5
    
    if sum1 > 0 and sum2 > 0:
        return sum_dot / (sum1 * sum2)
    else:
        return 0

def format_summary_for_display(summary, title=None):
    """Format the summary for display in the extension"""
    if not title:
        title = "Summary"
    
    # Check if the summary already contains HTML tags
    contains_html = '<p>' in summary or '<h' in summary or '<ul>' in summary or '<ol>' in summary
    
    # If it's plain text, wrap it in HTML tags
    if not contains_html:
        # Split into paragraphs
        paragraphs = summary.split("\n")
        html_parts = []
        
        for p in paragraphs:
            if p.strip():
                # Check if it's a bullet point list
                if p.strip().startswith("- ") or p.strip().startswith("• "):
                    html_parts.append(f"<ul><li>{p.strip()[2:]}</li></ul>")
                # Check if it's a heading with ## or ** markers
                elif p.strip().startswith("#"):
                    level = 0
                    while p.strip()[level] == '#' and level < len(p.strip()):
                        level += 1
                    html_parts.append(f"<h{min(level+2, 6)}>{p.strip()[level:].strip()}</h{min(level+2, 6)}>")
                # Check for bold text
                elif p.strip().startswith("**") and p.strip().endswith("**"):
                    html_parts.append(f"<p><strong>{p.strip()[2:-2]}</strong></p>")
                # Regular paragraph
                else:
                    html_parts.append(f"<p>{p}</p>")
        
        html = f"<div class='summary-container'><h2>{title}</h2>{''.join(html_parts)}</div>"
    else:
        # If the summary already has HTML, ensure it's wrapped in a container
        if not summary.startswith('<div'):
            html = f"<div class='summary-container'><h2>{title}</h2>{summary}</div>"
        else:
            html = summary
    
    return html

def extract_main_content(soup):
    """Extract the main content from a webpage"""
    # Try to find the main content container
    main_element = (
        soup.find('main') or 
        soup.find('article') or 
        soup.find(attrs={"role": "main"}) or
        soup.find(id=re.compile(r'content|main|article')) or
        soup.find(class_=re.compile(r'content|main|article')) or
        soup.find('div', class_=re.compile(r'content|main|article'))
    )
    
    # If we found a main element, use it
    if main_element:
        # Remove unnecessary elements from the main content
        for element in main_element.find_all(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe']):
            element.decompose()
        return main_element
    
    # Otherwise use the body but be more selective
    if soup.body:
        # Create a new container
        from bs4 import Tag
        main_content = Tag(name='div')
        
        # Add all paragraphs with decent text content
        for p in soup.find_all('p'):
            if len(p.get_text(strip=True)) > 20:  # Only paragraphs with substantial content
                main_content.append(p)
        
        # Add headings that are near paragraphs
        for heading in soup.find_all(['h1', 'h2', 'h3']):
            next_sibling = heading.find_next_sibling()
            if next_sibling and next_sibling.name == 'p' and len(next_sibling.get_text(strip=True)) > 20:
                main_content.append(heading)
        
        return main_content
    
    return soup

def extract_text_content(soup_element):
    """Extract clean text content from a BeautifulSoup element"""
    if not soup_element:
        return ""
    
    # Get text from paragraphs and headings
    text_parts = []
    
    # Extract headings with proper formatting
    for i in range(1, 7):
        for heading in soup_element.find_all(f'h{i}'):
            heading_text = heading.get_text(strip=True)
            if heading_text:
                text_parts.append(f"{'#' * i} {heading_text}\n")
    
    # Extract paragraphs
    for p in soup_element.find_all('p'):
        p_text = p.get_text(strip=True)
        if p_text:
            text_parts.append(f"{p_text}\n\n")
    
    # Extract lists
    for ul in soup_element.find_all('ul'):
        for li in ul.find_all('li'):
            li_text = li.get_text(strip=True)
            if li_text:
                text_parts.append(f"- {li_text}\n")
        text_parts.append("\n")
    
    return "".join(text_parts)

def clean_for_summarization(text):
    """Clean and prepare text for summarization"""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Remove URLs
    text = re.sub(r'https?://\S+', '', text)
    
    # Limit length for API constraints
    max_length = 15000  # Adjust based on your API limits
    if len(text) > max_length:
        text = text[:max_length] + "..."
    
    return text

def make_content_readable(html_content, url=None):
    """Make content readable (similar to reader mode) for duplicate view"""
    try:
        # Parse HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract main content
        main_content = extract_main_content(soup)
        
        # Fix image URLs if needed
        if url and main_content:
            for img in main_content.find_all('img'):
                if img.get('src'):
                    img['src'] = make_absolute_url(img['src'], url)
        
        # Create a clean HTML structure
        clean_html = f"""
        <div class="readable-content">
            {str(main_content)}
        </div>
        """
        
        return clean_html
    except Exception as e:
        logger.error(f"Error making content readable: {str(e)}")
        return html_content

def generate_focus_view(content):
    """Generate a focus view that highlights key information"""
    try:
        # Simple focus view implementation
        soup = BeautifulSoup(f"<div>{content}</div>", 'html.parser')
        
        # Highlight headings
        for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            heading['class'] = heading.get('class', []) + ['highlight-heading']
        
        # Highlight important paragraphs (basic heuristic)
        paragraphs = soup.find_all('p')
        for p in paragraphs:
            text = p.get_text().lower()
            # Highlight paragraphs with signal phrases
            if any(phrase in text for phrase in ['important', 'key', 'significant', 'note', 'remember', 'essential']):
                p['class'] = p.get('class', []) + ['highlight-important']
            # Highlight paragraphs with strong numerical content
            elif re.search(r'\d+%|\d+\.\d+|statistics|data shows', text):
                p['class'] = p.get('class', []) + ['highlight-data']
        
        return str(soup)
    except Exception as e:
        logger.error(f"Error generating focus view: {str(e)}")
        return content

if __name__ == '__main__':
    host = "127.0.0.1"
    port = 5001
    logger.info(f"Starting server at http://{host}:{port}")
    uvicorn.run("app:app", host=host, port=port, reload=True, log_level=log_level.lower()) 