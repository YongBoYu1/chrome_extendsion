# Architecture Overview

## System Components

The Chrome Extension system comprises three main parts:

1.  **Chrome Extension Frontend:** Runs within the user's browser.
    *   Popup Interface (`popup/`): Initial user interaction point.
    *   Background Script (`background/`): Manages communication, state, and coordinates backend calls.
    *   Result Page (`pages/result/`): Displays the processed content and summary.
    *   Content Scripts (`content/`): (If used) Interact directly with web pages.
    *   Utilities (`utils/`): Shared JavaScript functions (e.g., for storage, API calls).

2.  **Python Backend Server (`backend/`):** A separate service, likely hosted in the cloud.
    *   FastAPI Application (`app.py`): Handles API requests from the extension.
    *   Page Processor (`page_processor.py`): Orchestrates scraping and summarizing.
    *   FireCrawl Extractor (`firecrawl_extractor.py`): Interacts with the FireCrawl API.
    *   Gemini Summarizer (`gemini_summarizer.py`): Interacts with the Google Gemini API.
    *   Cookie Handler (`cookie_handler.py`): (Optional, currently inactive) Uses Playwright for cookie consent.

3.  **External Services:** Third-party APIs used by the backend.
    *   FireCrawl API: For web page content extraction.
    *   Google Gemini API: For content summarization.

## Component Interaction Flow (Typical Summarization)

```mermaid
graph TD
    A[User clicks Summarize in Popup/Page] -->|URL or Current Tab Info| B(Background Script)
    B -->|POST /api/summarize Request (URL)| C{Backend Server (app.py)}
    C -->|Call process_page| D[Page Processor]
    D -->|Call scrape| E[FireCrawl Extractor]
    E -->|POST /scrape| F[FireCrawl API]
    F -->|Raw Content (Markdown/HTML)| E
    E -->|Extraction Result| D
    D -->|Clean Content| D
    D -->|Call summarize| G[Gemini Summarizer]
    G -->|Call generate_content| H[Gemini API]
    H -->|Summary Text| G
    G -->|Summary Result| D
    D -->|Combined Result| C
    C -->|HTTP Response (JSON)| B
    B -->|Store Result / Send Message| I[Result Page]
    I -->|Display Content & Summary| J[User]
```

*(Note: The flow differs slightly if summarizing provided content instead of a URL)*

## Backend Components (Brief Roles)

*   **FastAPI Server (`app.py`):** The entry point for API requests. Validates input, routes requests to appropriate services, handles basic errors, and sends back HTTP responses.
*   **Page Processor (`page_processor.py`):** The main orchestrator for the `/api/summarize` endpoint. It uses the Extractor to get content, cleans it, and uses the Summarizer to generate the final output.
*   **FireCrawl Extractor (`firecrawl_extractor.py`):** A client wrapper for the FireCrawl API. Handles making the actual HTTP requests to FireCrawl, including retry logic.
*   **Gemini Summarizer (`gemini_summarizer.py`):** A client wrapper for the Google Gemini API. Handles preparing the prompt and making calls to the AI model, including retry logic.
*   **Cookie Handler (`cookie_handler.py`):** An optional component to handle cookie banners using Playwright before scraping. Currently inactive in the default flow.

## Communication Patterns

*   **Extension Internal:** Uses the Chrome Messaging API (`chrome.runtime.sendMessage`, `chrome.runtime.onMessage`) for communication between the popup, background script, and result pages.
*   **Extension to Backend:** Standard HTTP/REST API calls (using `fetch` or a similar method in JavaScript) from the background script to the hosted FastAPI backend server.
*   **Backend to External APIs:** HTTP/REST API calls from the backend server (using `requests` and `google-generativeai` libraries) to FireCrawl and Google Gemini.

## State Management

*   **Backend:** Primarily stateless, although configuration (API keys) is loaded at startup. Does not store user session data currently.
*   **Extension:** Uses `chrome.storage.local` or `chrome.storage.session` to store processing state for different URLs/tabs, potentially cached results, and user settings.

## Key Considerations (Current State)

*   **Stateless Backend:** The backend doesn't maintain user sessions. Each API request is independent.
*   **Security:** CORS is currently open (`*`), needs restriction. No backend authentication or authorization is implemented.
*   **Cost:** Direct calls to paid APIs (FireCrawl, Gemini) from the backend. Needs cost control measures (caching, rate limiting, auth/quotas) before public release.
*   **Error Handling:** Basic error handling exists, including retries for external APIs, but could be more robust and provide clearer feedback to the user via the extension.
*   **Deployment:** Requires hosting for the FastAPI backend and database (if added later).

## Security Considerations

1. **API Security**
   - Secure key storage
   - Request validation
   - Response sanitization

2. **Content Security**
   - CSP implementation
   - XSS prevention
   - Content sanitization

3. **Data Privacy**
   - Local storage only
   - No user tracking
   - Temporary data handling

## Performance Optimization

1. **Content Processing**
   - Parallel processing
   - Content chunking
   - Cache management

2. **UI Performance**
   - Lazy loading
   - Progressive rendering
   - Resource optimization

## Error Handling

1. **Frontend Errors**
   - Network errors
   - Processing errors
   - UI state errors

2. **Backend Errors**
   - API errors
   - Processing errors
   - Resource errors

## Development Workflow

1. **Local Development**
   - Component testing
   - Integration testing
   - End-to-end testing

2. **Deployment**
   - Version management
   - Release process
   - Update handling 