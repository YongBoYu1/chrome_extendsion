# Development Setup Guide

This guide explains how to set up the development environment for the Python backend server.

## Prerequisites

*   **Python:** Version 3.9 or higher recommended.
*   **pip:** Python package installer.
*   **Git:** For cloning the repository.
*   **Web Browser:** Chrome (required for Playwright browser automation if using `CookieHandler`).

## Setup Steps

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Navigate to Backend Directory:**
    ```bash
    cd backend
    ```

3.  **Create and Activate a Virtual Environment:**
    It's highly recommended to use a virtual environment to isolate project dependencies.
    ```bash
    # Create the virtual environment (e.g., named 'venv')
    python -m venv venv

    # Activate the virtual environment
    # On macOS/Linux:
    source venv/bin/activate
    # On Windows:
    .\venv\Scripts\activate
    ```
    *You should see `(venv)` prepended to your terminal prompt.* 

4.  **Install Dependencies:**
    Install all required Python packages from `requirements.txt`.
    ```bash
    pip install -r requirements.txt
    ```

5.  **Install Playwright Browsers:**
    The `CookieHandler` uses Playwright, which requires browser binaries to be installed.
    ```bash
    python -m playwright install chromium
    ```
    *(Note: This step is only strictly necessary if you intend to use the `CookieHandler` functionality, which is currently inactive by default in `page_processor.py`)*

6.  **Create `.env` File:**
    The backend requires API keys for external services. Create a file named `.env` in the `backend/` directory.
    ```
    # backend/.env

    # Required API Keys
    FIRECRAWL_API_KEY='YOUR_FIRECRAWL_API_KEY'
    GEMINI_API_KEY='YOUR_GEMINI_API_KEY'

    # Optional: Specify port (defaults to 5001 if not set)
    # PORT=5001 
    
    # Optional: Set log level (defaults to INFO if not set)
    # LOG_LEVEL=DEBUG
    ```
    *Replace `YOUR_FIRECRAWL_API_KEY` and `YOUR_GEMINI_API_KEY` with your actual keys.* You can obtain keys from:
    *   FireCrawl: [https://firecrawl.dev/](https://firecrawl.dev/)
    *   Google AI Studio (Gemini): [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

7.  **Run the Backend Server:**
    Use `uvicorn` to run the FastAPI application locally. The `--reload` flag enables auto-reloading when code changes are detected.
    ```bash
    uvicorn app:app --reload --port 5001
    ```
    *(Adjust the `--port` value if you set a different `PORT` in your `.env` file)*

    You should see output indicating the server is running, typically on `http://127.0.0.1:5001`.

8.  **Verify Setup:**
    Open your web browser and navigate to `http://127.0.0.1:5001/api/ping`. You should see:
    ```json
    {
      "status": "ok"
    }
    ```
    You can also check FastAPI's automatic interactive documentation at `http://127.0.0.1:5001/docs`.

## Development Notes

*   Ensure your virtual environment is always activated when working on the backend.
*   Use the `--reload` flag with `uvicorn` for easier development.
*   Refer to the other documentation files for architecture, API details, and component information. 