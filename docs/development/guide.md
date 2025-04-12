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
pip install -r backend/requirements.txt

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys:
# - FIRECRAWL_API_KEY
# - GEMINI_API_KEY
```

## Project Structure

```
.
├── backend/                 # Python backend (FastAPI)
│   ├── app.py              # Server & API endpoints
│   ├── page_processor.py   # Content processing orchestration
│   ├── gemini_summarizer.py    # AI summarization service
│   ├── firecrawl_extractor.py # Firecrawl client (if separate)
│   └── requirements.txt    # Python dependencies
│   └── .env / .env.example # Environment variables
├── background/             # Extension background scripts
│   └── processing/         # Processing queue, state management
│   └── services/           # Background service integrations
│   └── background.js       # Main background script (if used)
├── popup/                  # Extension popup UI
│   ├── popup.html         # Popup interface
│   └── popup.js           # Popup logic
│   └── popup.css          # Popup styling (if separate)
├── pages/                  # Extension pages (e.g., result page)
│   └── result/            # Result page components
│       ├── index.html     # Result page structure
│       ├── styles.css     # Styling
│       ├── index.js       # Main result page logic
│       ├── processing.js  # Processing state UI
│       ├── ui.js          # UI state and updates
│       └── content.js     # Content handling
├── utils/                  # Shared utility scripts (JS)
│   └── api.js             # API client
│   └── storage.js         # Storage manager
├── docs/                   # Documentation
├── assets/                 # Icons, images (optional)
└── manifest.json          # Extension manifest
```

## Development Workflow

### 1. Local Development

#### Backend Server
```bash
# Start the development server from the project root
python backend/app.py
```

#### Chrome Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the project root directory (the one containing manifest.json)

### 2. Making Changes

#### Backend Changes
1. Make changes to Python files in `backend/`
2. The FastAPI server (if running with `uvicorn --reload`) should auto-reload.
   If not, restart the server (`Ctrl+C` then `python backend/app.py`).
3. Test endpoints using the extension or tools like Postman/curl.

#### Frontend Changes
1. Make changes to HTML/JS/CSS files in `popup/`, `pages/`, `background/`, `utils/`.
2. Go to `chrome://extensions/`.
3. Click the "Reload" icon for your unpacked extension.
4. Test the changes in the browser.

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