# Backend Server

## Overview

The Backend Server is a Python-based service that handles content processing, summarization, and API integration. It serves as the bridge between the Chrome Extension frontend and external services like FireCrawl and Google Gemini AI.

## Core Components

### 1. Application Server (`app.py`)
```python
from flask import Flask, request, jsonify
from page_processor import PageProcessor
from gemini_summarizer import GeminiSummarizer

app = Flask(__name__)
```

Main responsibilities:
- HTTP endpoint handling
- Request validation
- Response formatting
- Error handling
- CORS support

### 2. Page Processor (`page_processor.py`)
```python
class PageProcessor:
    def process_page(self, url: str) -> Dict[str, Any]:
        """
        Coordinates the entire page processing pipeline:
        1. Content extraction via FireCrawl
        2. Content cleaning and formatting
        3. Summarization via Gemini
        4. Key points extraction
        """
        
    def extract_text_from_markdown(self, markdown_content: str) -> str:
        """
        Extract clean text from markdown content using markdown-it-py parser.
        This removes formatting, links, images, and other non-text elements.
        """
```

Key features:
- Content extraction coordination
- Advanced markdown cleaning using markdown-it-py parser
- HTML content cleaning fallback
- Format standardization
- Error handling
- Processing pipeline management
- Content size optimization

#### Content Cleaning System
The Page Processor implements an intelligent content cleaning system that:

1. **Format Detection**: Automatically detects whether content is in markdown or HTML format
2. **Markdown Processing**: Uses the markdown-it-py parser to understand document structure and selectively extract text
3. **Link Handling**: Preserves link text while removing URLs
4. **Structure Preservation**: Maintains headings, paragraphs, and list formats for readability
5. **Image Removal**: Completely strips out images and other non-text elements
6. **Debugging**: Saves both original and cleaned content for comparison and analysis
7. **Size Reduction**: Typically reduces content size by 50-70%, ensuring more efficient use of the LLM's token limits

This cleaning system significantly improves the quality of input sent to the Gemini AI model by:
- Removing extraneous markup that would waste token limits
- Preserving the semantic structure of the document
- Focusing on actual content rather than formatting elements
- Ensuring more of the document's real content can be included within token limits

### 3. Gemini Summarizer (`gemini_summarizer.py`)
```python
class GeminiSummarizer:
    def summarize(self, content: str) -> Dict[str, Any]:
        """
        Generates content summary and key points using Google Gemini AI.
        Returns formatted summary data.
        """
```

Capabilities:
- Text summarization
- Key points extraction
- Content analysis
- Format optimization

## API Endpoints

### 1. Process Page
```python
@app.route('/api/process', methods=['POST'])
def process_page():
    """
    Process a webpage and return extracted content
    
    Request:
    {
        "url": "https://example.com",
        "options": {
            "include_summary": true,
            "extract_key_points": true
        }
    }
    
    Response:
    {
        "content": {
            "title": "Page Title",
            "html": "Processed HTML content",
            "markdown": "Processed Markdown content",
            "summary": "Content summary",
            "key_points": ["Point 1", "Point 2"]
        },
        "metadata": {
            "url": "Original URL",
            "processed_at": "2024-03-20T10:00:00Z",
            "reading_time": 5
        }
    }
    """
```

### 2. Health Check
```python
@app.route('/health', methods=['GET'])
def health_check():
    """
    Returns server health status
    """
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0'
    })
```

## Configuration

### Environment Variables
```python
FIRECRAWL_API_KEY = os.getenv('FIRECRAWL_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
PORT = int(os.getenv('PORT', 5000))
```

### Application Config
```python
app.config.update(
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024,  # 16MB
    CORS_HEADERS = 'Content-Type',
    JSON_SORT_KEYS = False
)
```

## Error Handling

### Global Error Handler
```python
@app.errorhandler(Exception)
def handle_error(error):
    """
    Global error handler for all exceptions
    """
    response = {
        'error': str(error),
        'type': error.__class__.__name__
    }
    return jsonify(response), getattr(error, 'code', 500)
```

### Custom Exceptions
```python
class ProcessingError(Exception):
    def __init__(self, message, code=500):
        self.message = message
        self.code = code

class ValidationError(Exception):
    def __init__(self, message):
        self.message = message
        self.code = 400
```

## Middleware

### Request Logging
```python
@app.before_request
def log_request():
    """
    Log incoming request details
    """
    app.logger.info(f"Request: {request.method} {request.path}")
```

### Response Headers
```python
@app.after_request
def add_headers(response):
    """
    Add standard headers to all responses
    """
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    return response
```

## Data Models

### Content Model
```python
class Content:
    def __init__(self):
        self.title = ""
        self.html = ""
        self.markdown = ""
        self.summary = ""
        self.key_points = []
        self.metadata = {}
```

### Processing Result
```python
class ProcessingResult:
    def __init__(self):
        self.content = Content()
        self.status = "success"
        self.error = None
        self.processing_time = 0
```

## Logging

### Configuration
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log'),
        logging.StreamHandler()
    ]
)
```

### Usage
```python
logger = logging.getLogger(__name__)

logger.info("Processing started for URL: %s", url)
logger.error("Error during processing: %s", str(error))
logger.debug("Processing details: %s", json.dumps(details))
```

## Performance Optimization

### Caching
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_processed_content(url: str) -> Dict[str, Any]:
    """
    Cache processed content for frequently accessed URLs
    """
```

### Async Processing
```python
import asyncio

async def process_content_async(url: str) -> Dict[str, Any]:
    """
    Asynchronous content processing for better performance
    """
```

## Security

### Input Validation
```python
def validate_url(url: str) -> bool:
    """
    Validate URL format and security
    """
    if not url.startswith(('http://', 'https://')):
        raise ValidationError("Invalid URL scheme")
```

### Rate Limiting
```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
```

## Testing

### Unit Tests
```python
def test_page_processor():
    processor = PageProcessor()
    result = processor.process_page(test_url)
    assert result.status == "success"
    assert result.content.title is not None
```

### Integration Tests
```python
def test_api_endpoint():
    response = client.post('/api/process', json={
        'url': test_url
    })
    assert response.status_code == 200
    assert 'content' in response.json
```

## Deployment

### Docker Configuration
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

### Requirements
```text
fastapi==2.0.1
requests==2.26.0
beautifulsoup4==4.9.3
google-cloud-aiplatform==1.7.0
python-dotenv==0.19.0
markdown-it-py==3.0.0
``` 