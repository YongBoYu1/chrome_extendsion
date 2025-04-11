# Backend Server Components

## Overview

The Backend Server is a Python service built using the **FastAPI** framework. Its primary purpose is to handle API requests from the Chrome extension, orchestrate web page content extraction using the FireCrawl service, perform content cleaning, and generate summaries using the Google Gemini AI.

## Core Components

### 1. FastAPI Application (`app.py`)

*   **Framework:** FastAPI
*   **Responsibilities:**
    *   Defines and serves the HTTP API endpoints used by the Chrome extension.
    *   Handles incoming request validation using Pydantic models (`SummarizeRequest`, `FireCrawlScrapeRequest`).
    *   Initializes and wires together the core service components (Extractor, Summarizer, PageProcessor).
    *   Loads API keys and basic configuration from environment variables (using `python-dotenv`).
    *   Configures basic logging (currently streams to console at INFO level).
    *   Sets up CORS middleware (currently configured permissively with `allow_origins=["*"]`, needs restriction for production).
    *   Uses `uvicorn` as the ASGI server for running the application.

### 2. Page Processor (`page_processor.py`)

*   **Class:** `PageProcessor`
*   **Responsibilities:**
    *   Orchestrates the main workflow for processing a URL requested via the `/api/summarize` endpoint.
    *   Calls the `FireCrawlExtractor` to fetch web page content.
    *   Determines content type (Markdown or HTML).
    *   Cleans the extracted content:
        *   Uses `markdown-it-py` for robust cleaning of Markdown content (`extract_text_from_markdown` method), preserving structure while removing formatting, links, and images.
        *   Includes a fallback regex-based cleaning method (`clean_content_regex`) for HTML content (note: using BeautifulSoup is recommended for better HTML parsing).
    *   Calls the `GeminiSummarizer` to generate a summary and key points from the cleaned content.
    *   Combines results from extraction and summarization into a final response.

### 3. FireCrawl Extractor (`firecrawl_extractor.py`)

*   **Class:** `FireCrawlExtractor`
*   **Responsibilities:**
    *   Provides an interface to the FireCrawl API (`/scrape` endpoint).
    *   Handles making HTTP POST requests to the FireCrawl service using the `requests` library.
    *   Includes retry logic (using `tenacity`) for transient network errors (Timeout, ConnectionError) when calling the FireCrawl API.
    *   Constructs the request payload for FireCrawl, including URL, desired formats, and other options.
    *   Manages the FireCrawl API key via its constructor.
    *   Processes the response from FireCrawl, handling potential errors and returning the extracted data.
    *   Contains logic (currently unused based on `page_processor.py` settings) to interact with `CookieHandler` if `bypass_cookies=True` is passed to its `scrape` method.

### 4. Gemini Summarizer (`gemini_summarizer.py`)

*   **Class:** `GeminiSummarizer`
*   **Responsibilities:**
    *   Interfaces with the Google Gemini AI API using the `google-generativeai` library.
    *   Takes cleaned text content and generates a summary and key points based on a defined prompt.
    *   Configures the Gemini model (e.g., `gemini-1.5-flash` by default) and generation parameters (temperature, max tokens).
    *   Includes retry logic (using `tenacity`) for specific transient Google API errors (`DeadlineExceeded`, `ServiceUnavailable`, `ResourceExhausted`).
    *   Handles basic input truncation if content exceeds a certain length.
    *   Manages the Gemini API key.

### 5. Cookie Handler (`cookie_handler.py`)

*   **Class:** `CookieHandler` (implemented as a singleton instance `cookie_handler`)
*   **Responsibilities:**
    *   Uses `playwright` to launch a headless browser (Chromium).
    *   Navigates to a given URL.
    *   Attempts to automatically find and click common cookie consent banner buttons using a list of predefined CSS selectors.
    *   Retrieves cookies set during the Playwright session.
    *   Provides a method to format cookies for use in HTTP headers.
*   **Current Usage:** This component is available but currently **not actively used** in the main processing flow within `page_processor.py`, as the `extractor.scrape` call has `bypass_cookies=False`.

## Configuration

*   Primary configuration (API keys) is handled via environment variables loaded from a `.env` file in the `backend/` directory using `python-dotenv`.
*   Key variables: `FIRECRAWL_API_KEY`, `GEMINI_API_KEY`.
*   Other configurations like timeouts, model names, and logging levels are currently mostly hardcoded within the respective Python modules, but could be moved to `.env` (See Step 6 of `production_readiness_plan.txt`).

## API Endpoints (Brief)

The backend exposes several API endpoints defined in `app.py`:

*   `GET /api/ping`: Basic health check.
*   `GET /api/firecrawl/status`: Checks if the FireCrawl API key is configured.
*   `POST /api/summarize`: The main endpoint used by the extension. Takes a URL (or content), processes it using `PageProcessor`, and returns extraction/summary results.
*   `POST /api/firecrawl/scrape`: A direct proxy to the `FireCrawlExtractor`'s scrape method.

*(For detailed request/response formats, see `docs/api/backend.md` - requires update)*

## Dependencies

Key external Python libraries used:

*   `fastapi`: Web framework.
*   `uvicorn`: ASGI server.
*   `requests`: HTTP requests (for FireCrawl).
*   `google-generativeai`: Google Gemini API client.
*   `python-dotenv`: Loading `.env` files.
*   `pydantic`: Data validation (used by FastAPI).
*   `markdown-it-py`: Markdown parsing for cleaning.
*   `tenacity`: Retrying failed operations.
*   `playwright`: Browser automation (for `CookieHandler`).

(See `backend/requirements.txt` for the full list and specific versions). 