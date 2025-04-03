# Development Guide

## Getting Started

### Prerequisites

1. **Chrome Browser**
   - Latest version recommended
   - Developer mode enabled

2. **Python Environment**
   - Python 3.9+
   - pip package manager
   - virtualenv (recommended)

3. **Node.js**
   - Latest LTS version
   - npm package manager

### Environment Setup

1. **Clone the Repository**
```bash
git clone https://github.com/yourusername/chrome-extension.git
cd chrome-extension
```

2. **Backend Setup**
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

3. **Frontend Setup**
```bash
# Install dependencies
npm install

# Build extension
npm run build
```

## Project Structure

```
chrome-extension/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── page_processor.py      # Content processing logic
│   ├── gemini_summarizer.py   # AI summarization
│   └── requirements.txt       # Python dependencies
├── extension/
│   ├── manifest.json          # Extension manifest
│   ├── background/            # Background scripts
│   ├── popup/                 # Popup interface
│   └── pages/                 # Result pages
├── docs/                      # Documentation
└── tests/                     # Test suites
```

## Development Workflow

### 1. Local Development

#### Backend Server
```bash
# Start the development server
python backend/app.py
```

#### Chrome Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `extension` directory

### 2. Making Changes

#### Backend Changes
1. Make changes to Python files
2. Server will auto-reload
3. Test endpoints using Postman/curl

#### Frontend Changes
1. Make changes to extension files
2. Click "Reload" in Chrome extensions page
3. Test in browser

### 3. Testing

#### Run Backend Tests
```bash
pytest tests/
```

#### Run Frontend Tests
```bash
npm test
```

### 4. Building for Production

```bash
# Build extension
npm run build:prod

# Package extension
npm run package
```

## Code Style Guidelines

### Python Code Style

1. **PEP 8 Compliance**
```python
# Good
def process_content(url: str) -> Dict[str, Any]:
    """
    Process content from URL.
    
    Args:
        url: The URL to process
        
    Returns:
        Dict containing processed content
    """
    result = extract_content(url)
    return format_response(result)

# Bad
def processContent(url):
    result=extract_content(url)
    return format_response(result)
```

2. **Type Hints**
```python
from typing import Dict, List, Optional

def get_key_points(
    content: str,
    max_points: Optional[int] = None
) -> List[str]:
    pass
```

### JavaScript Code Style

1. **ES6+ Features**
```javascript
// Good
const processContent = async (url) => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

// Bad
function processContent(url) {
    return fetch(url)
        .then(function(response) {
            return response.json();
        })
        .catch(function(error) {
            console.error('Error:', error);
            throw error;
        });
}
```

2. **Error Handling**
```javascript
const handleError = (error) => {
    console.error('Error:', error);
    
    if (error instanceof NetworkError) {
        showNetworkError();
    } else if (error instanceof ValidationError) {
        showValidationError(error.message);
    } else {
        showGenericError();
    }
};
```

## Debugging

### Backend Debugging

1. **Debug Logging**
```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug("Processing URL: %s", url)
logger.error("Error occurred: %s", str(error))
```

2. **Using pdb**
```python
def process_content(url):
    import pdb; pdb.set_trace()
    result = extract_content(url)
    return result
```

### Frontend Debugging

1. **Chrome DevTools**
- Open DevTools (F12)
- Go to Sources tab
- Add breakpoints
- Use console.log

2. **Debug Logging**
```javascript
const DEBUG = true;

const debugLog = (message, data) => {
    if (DEBUG) {
        console.log(`[Debug] ${message}`, data);
    }
};
```

## Common Issues and Solutions

### Backend Issues

1. **API Key Issues**
```python
# Check if API keys are loaded
if not os.getenv('FIRECRAWL_API_KEY'):
    raise ConfigError("FireCrawl API key not found")
```

2. **CORS Issues**
```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["chrome-extension://*"],
        "methods": ["GET", "POST"]
    }
})
```

### Frontend Issues

1. **Extension Permissions**
```json
{
    "permissions": [
        "activeTab",
        "storage",
        "http://*/*",
        "https://*/*"
    ]
}
```

2. **Content Security Policy**
```json
{
    "content_security_policy": {
        "extension_pages": "script-src 'self'; object-src 'self'"
    }
}
```

## Performance Optimization

### Backend Optimization

1. **Caching**
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_processed_content(url: str) -> Dict[str, Any]:
    return process_content(url)
```

2. **Async Processing**
```python
import asyncio

async def process_multiple_urls(urls: List[str]) -> List[Dict]:
    tasks = [process_url(url) for url in urls]
    return await asyncio.gather(*tasks)
```

### Frontend Optimization

1. **Resource Loading**
```javascript
// Lazy load components
const loadComponent = async (name) => {
    const module = await import(`./components/${name}.js`);
    return module.default;
};
```

2. **Memory Management**
```javascript
class ContentManager {
    constructor() {
        this.cleanup();
    }

    cleanup() {
        // Clear old data
        chrome.storage.local.remove(['oldContent']);
    }
}
```

## Deployment

### Backend Deployment

1. **Docker Deployment**
```bash
# Build image
docker build -t backend-server .

# Run container
docker run -p 5000:5000 backend-server
```

2. **Environment Configuration**
```bash
# Production settings
export FLASK_ENV=production
export DEBUG=False
export API_KEY=your_api_key
```

### Extension Deployment

1. **Build Production Version**
```bash
# Build
npm run build:prod

# Package
npm run package
```

2. **Chrome Web Store**
- Create developer account
- Package extension
- Submit for review

## Contributing

### Pull Request Process

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit PR

### Code Review Guidelines

1. **Review Checklist**
- Code style compliance
- Test coverage
- Documentation
- Performance impact
- Security considerations

2. **Commit Messages**
```
feat: Add new content processing feature
fix: Resolve CORS issues with API
docs: Update API documentation
refactor: Improve error handling
``` 