# API Documentation

## Overview

This document details the API endpoints and communication protocols used in the Chrome Extension system. The API facilitates communication between the frontend extension and the backend server, as well as integration with external services.

## Backend API Endpoints

The backend server runs on `http://localhost:5001` by default during development.

### Ping (Health Check)

Checks the health status of the backend server.

**Endpoint:** `GET /api/ping`

**Request Body:** None

**Success Response (200 OK):**
```json
{
    "status": "ok"
}
```

**Error Response:** Standard HTTP errors (e.g., 500 if server fails).

### Summarize Page Content

Extracts content from a URL, generates a summary and key points using configured services (Firecrawl, Gemini).

**Endpoint:** `POST /api/summarize`

**Request Body:**
```json
{
    "url": "string (required) - The URL of the page to process",
    "mode": "string (optional, default: 'summarize') - Processing mode (currently only 'summarize' is used)"
}
```

**Success Response (200 OK):**
```json
{
    "success": true,
    "url": "string - The processed URL",
    "content": { 
        "success": true, 
        "data": { 
            "markdown": "string - Raw markdown extracted by Firecrawl",
            "html": "string - Raw HTML extracted by Firecrawl",
            "metadata": { 
                "title": "string - Page title",
                "description": "string - Page description",
                // ... other Firecrawl metadata ...
            }
        }
        // ... or { "success": false, "error": "..." } if extraction failed
    },
    "summary": "string - The generated summary text (in Markdown format)",
    "keyPoints": [
        "string - Key point 1",
        "string - Key point 2",
        // ... more key points
    ],
    "title": "string - The page title",
    "wordCount": "integer - Estimated word count of the summary",
    "readingTime": "integer - Estimated reading time in minutes for the summary"
}
```

**Error Responses:**
*   `422 Unprocessable Entity`: If the request body (`url`, `mode`) fails validation. The response body contains details about the validation error.
*   `500 Internal Server Error`: If an unexpected error occurs during processing (e.g., cleaning fails, summarizer fails).
*   `502 Bad Gateway`: If the call to the Gemini API fails after retries.
*   Other standard HTTP errors.

### FireCrawl Status Check (Not currently used by frontend)

Checks if the FireCrawl API key is configured on the backend.

**Endpoint:** `GET /api/firecrawl/status`

**Request Body:** None

**Success Response (200 OK):**
```json
{
    "configured": true, 
    "available": true
    // Values can be false if API key is missing
}
```

### FireCrawl Scrape (Not currently used by frontend)

Directly triggers a FireCrawl scrape operation.

**Endpoint:** `POST /api/firecrawl/scrape`

**Request Body:** (Mirrors Firecrawl scrape options, see `backend/app.py` `FireCrawlScrapeRequest` model)
```json
{
    "url": "string",
    "formats": ["markdown", "html"],
    "onlyMainContent": true,
    // ... other options ...
}
```

**Success Response (200 OK):** (Directly returns the Firecrawl API response)
```json
{
    "success": true,
    "data": { ... Firecrawl data ... }
}
```

**Error Responses:** Standard HTTP errors, or Firecrawl API errors.

## Chrome Extension Message API

### Internal Message Types

#### Process Page Request
```javascript
{
    type: 'PROCESS_PAGE',
    url: string,
    options?: {
        includeSummary: boolean,
        extractKeyPoints: boolean,
        format: 'markdown' | 'html'
    }
}
```

#### Processing Update
```javascript
{
    type: 'PROCESSING_UPDATE',
    status: 'extracting' | 'processing' | 'complete' | 'error',
    progress: number,
    message: string
}
```

#### Content Ready
```javascript
{
    type: 'CONTENT_READY',
    content: {
        title: string,
        html: string,
        markdown: string,
        summary?: string,
        keyPoints?: string[]
    },
    metadata: {
        url: string,
        processedAt: string,
        readingTime: number
    }
}
```

### Message Handling

#### Background Script
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'PROCESS_PAGE':
            handleProcessPage(message.url, message.options);
            break;
        case 'PROCESSING_UPDATE':
            updateProcessingStatus(message.status, message.progress);
            break;
        // ... other message types
    }
});
```

#### Content Script
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CONTENT_READY') {
        displayContent(message.content);
    }
});
```

## External API Integration

### FireCrawl API

#### Content Extraction
```javascript
const extractContent = async (url) => {
    const response = await fetch('https://api.firecrawl.com/extract', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
    });
    return response.json();
};
```

### Google Gemini API

#### Content Summarization
```javascript
const summarizeContent = async (content) => {
    const response = await fetch('https://api.gemini.ai/summarize', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GEMINI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
    });
    return response.json();
};
```

## Storage API

### Chrome Storage

#### Store Content
```javascript
const storeContent = async (content) => {
    await chrome.storage.local.set({
        'latestContent': content,
        'timestamp': new Date().toISOString()
    });
};
```

#### Retrieve Content
```javascript
const getLatestContent = async () => {
    const result = await chrome.storage.local.get(['latestContent']);
    return result.latestContent;
};
```

## Error Codes and Handling

### HTTP Status Codes

| Code | Description | Handling |
|------|-------------|----------|
| 200 | Success | Process response normally |
| 400 | Bad Request | Display validation error |
| 401 | Unauthorized | Prompt for authentication |
| 403 | Forbidden | Show access denied message |
| 404 | Not Found | Display not found message |
| 429 | Too Many Requests | Implement retry with backoff |
| 500 | Server Error | Show error message and retry option |

### Custom Error Types

```javascript
class ProcessingError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'ProcessingError';
        this.code = code;
    }
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.code = 400;
    }
}
```

## Rate Limiting

### Backend Rate Limits

- 200 requests per day per IP
- 50 requests per hour per IP
- 5 requests per minute per user

### External API Rate Limits

#### FireCrawl
- 1000 requests per day
- 100 requests per hour
- 10 requests per minute

#### Gemini
- 500 requests per day
- 50 requests per hour
- 5 requests per minute

## Authentication

### API Key Management
```javascript
const getApiKey = () => {
    return process.env.API_KEY || config.defaultApiKey;
};

const validateApiKey = (key) => {
    // Validate key format and expiration
    return isValidFormat(key) && !isExpired(key);
};
```

### Request Authentication
```javascript
const authenticateRequest = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || !validateApiKey(apiKey)) {
        return res.status(401).json({
            error: 'Invalid or missing API key'
        });
    }
    next();
};
```

## Versioning

### API Versioning
```javascript
// Version 1 endpoint
app.use('/api/v1', v1Router);

// Version 2 endpoint
app.use('/api/v2', v2Router);
```

### Response Headers
```javascript
response.headers['X-API-Version'] = '1.0.0';
response.headers['X-API-Deprecated'] = 'false';
```

## Security

### Request Validation
```javascript
const validateRequest = (req) => {
    const { url, options } = req.body;
    if (!url || !isValidUrl(url)) {
        throw new ValidationError('Invalid URL');
    }
    if (options && !isValidOptions(options)) {
        throw new ValidationError('Invalid options');
    }
};
```

### Response Sanitization
```javascript
const sanitizeResponse = (data) => {
    return {
        content: sanitizeHtml(data.content),
        metadata: filterSensitiveData(data.metadata)
    };
};
```

## Testing

### API Testing
```javascript
describe('API Endpoints', () => {
    it('should process page successfully', async () => {
        const response = await request(app)
            .post('/api/process')
            .send({ url: 'https://example.com' });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('content');
    });
});
```

### Mock Responses
```javascript
const mockProcessResponse = {
    content: {
        title: 'Test Article',
        html: '<div>Test content</div>',
        markdown: '# Test Article'
    },
    metadata: {
        url: 'https://example.com',
        processedAt: '2024-03-20T10:00:00Z'
    }
};
``` 