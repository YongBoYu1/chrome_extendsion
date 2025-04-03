# API Documentation

## Overview

This document details the API endpoints and communication protocols used in the Chrome Extension system. The API facilitates communication between the frontend extension and the backend server, as well as integration with external services.

## Backend API Endpoints

### Process Page

Initiates content processing for a given URL.

**Endpoint:** `POST /api/process`

**Request:**
```json
{
    "url": "https://example.com",
    "options": {
        "include_summary": true,
        "extract_key_points": true,
        "format": "markdown"
    }
}
```

**Response:**
```json
{
    "content": {
        "title": "Article Title",
        "html": "<div>Processed HTML content</div>",
        "markdown": "# Article Title\n\nProcessed markdown content",
        "summary": "Brief summary of the content",
        "key_points": [
            "Key point 1",
            "Key point 2",
            "Key point 3"
        ]
    },
    "metadata": {
        "url": "https://example.com",
        "processed_at": "2024-03-20T10:00:00Z",
        "reading_time": 5,
        "word_count": 1000
    },
    "status": "success"
}
```

**Error Response:**
```json
{
    "error": "Error message",
    "type": "ProcessingError",
    "code": 500
}
```

### Health Check

Checks the health status of the backend server.

**Endpoint:** `GET /health`

**Response:**
```json
{
    "status": "healthy",
    "version": "1.0.0",
    "uptime": "10h 30m"
}
```

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