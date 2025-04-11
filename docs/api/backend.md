# Backend API Documentation

This document details the API endpoints provided by the FastAPI backend server.

## Base URL

The base URL for the API depends on where the backend is deployed. During local development, it's typically `http://localhost:5001` (or the port specified by the `PORT` environment variable).

## Authentication

Currently, there is no authentication required to access these endpoints.

## Endpoints

### 1. Health Check

*   **Endpoint:** `GET /api/ping`
*   **Description:** A simple endpoint to check if the backend server is running and responsive.
*   **Request:** None
*   **Success Response (200 OK):**
    ```json
    {
      "status": "ok"
    }
    ```
*   **Error Response:** None typically, unless the server is unreachable.

### 2. FireCrawl API Status

*   **Endpoint:** `GET /api/firecrawl/status`
*   **Description:** Checks if the FireCrawl API key is configured in the backend environment.
*   **Request:** None
*   **Success Response (200 OK):**
    ```json
    {
      "configured": true,
      "available": true 
    }
    ```
    *(Note: `configured` and `available` will be `false` if the `FIRECRAWL_API_KEY` environment variable is not set)*
*   **Error Response:** None typically.

### 3. Summarize Content or URL

*   **Endpoint:** `POST /api/summarize`
*   **Description:** This is the main endpoint used by the Chrome extension. It accepts either a URL to scrape and summarize, or raw content to summarize directly.
*   **Request Body:**
    ```json
    {
      "url": "string (optional)",
      "title": "string (optional, used if content is provided)",
      "content": "string (optional, raw text content)",
      "max_length": "integer (optional, default: 1000)"
    }
    ```
    *   *Note:* Either `url` or `content` must be provided.
*   **Success Response (200 OK - URL provided):** Returns the result from `PageProcessor.process_page`:
    ```json
    {
        "success": true,
        "url": "string (original requested URL)",
        "content": { 
            "success": true, 
            "data": { 
                 "markdown": "string (extracted markdown)",
                 "html": "string (extracted html)",
                 "metadata": { "title": "string", ... }
                 // ... other firecrawl data
            }
        },
        "summary": "string (generated summary text)",
        "keyPoints": [
            "string (key point 1)",
            "string (key point 2)",
            ...
        ],
        "title": "string (page title from metadata)"
    }
    ```
*   **Success Response (200 OK - Content provided):** Returns the result from `GeminiSummarizer.summarize`:
    ```json
    {
        "success": true,
        "summary": "string (generated summary text)",
        "title": "string (title provided in request)",
        "keyPoints": [
            "string (key point 1)",
            "string (key point 2)",
            ...
        ]
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If neither `url` nor `content` is provided in the request body.
    *   `500 Internal Server Error` or `502 Bad Gateway`: If an error occurs during scraping (FireCrawl error), summarization (Gemini API error), or other internal processing. The response body will typically contain:
        ```json
        {
          "detail": "Error message string"
        }
        ```

### 4. Direct FireCrawl Scrape

*   **Endpoint:** `POST /api/firecrawl/scrape`
*   **Description:** Provides a direct proxy to the `FireCrawlExtractor.scrape` method, allowing more control over FireCrawl options.
*   **Request Body:** Matches the parameters of the `FireCrawlExtractor.scrape` method (excluding `api_key` and `bypass_cookies`).
    ```json
    {
      "url": "string (required)",
      "formats": "list[string] (optional, default: [\"markdown\", \"html\"])",
      "onlyMainContent": "boolean (optional, default: true)",
      "removeBase64Images": "boolean (optional, default: true)",
      "excludeTags": "list[string] (optional, default: [])",
      "includeTags": "list[string] (optional, default: [])",
      "waitFor": "integer (optional, milliseconds)",
      "mobile": "boolean (optional)"
    }
    ```
*   **Success Response (200 OK):** Returns the raw successful response dictionary from `FireCrawlExtractor.scrape`.
    ```json
    {
      "success": true,
      "data": { 
          "markdown": "string or null",
          "html": "string or null",
          "rawHtml": "string or null",
          "metadata": { ... },
          // ... other firecrawl data based on requested formats
      }
    }
    ```
*   **Error Responses:**
    *   `422 Unprocessable Entity`: If the request body fails Pydantic validation (e.g., missing `url`).
    *   `500 Internal Server Error` or `502 Bad Gateway`: If FireCrawl API call fails (after retries) or another unexpected error occurs. The response body will typically contain:
        ```json
        {
          "detail": "Error message string"
        }
        ``` 