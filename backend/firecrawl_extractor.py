import os
import json
import logging
import uuid
from datetime import datetime, timezone
import re
from typing import Dict, List, Optional, Any
import requests
import time
from cookie_handler import cookie_handler # Import the singleton instance
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Configure basic logging
logging.basicConfig(level=logging.INFO, # Changed from DEBUG to INFO for better performance
                    format='%(asctime)s [%(levelname)s] [%(name)s] - %(message)s')
logger = logging.getLogger(__name__)

# --- Simplified Constants ---
DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' # Modified UA slightly

# --- Simplified Sanitizer ---
def sanitize_filename(text: str, max_len: int = 100) -> str:
    if not text: return "NoTitle"
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', text)
    sanitized = re.sub(r'\s+', '_', sanitized)
    sanitized = sanitized.strip('_-')
    return sanitized[:max_len]

# --- Simplified Extractor Class ---
class FireCrawlExtractor:

    def __init__(self, api_key: str,
                 base_url: str = "https://api.firecrawl.dev/v1",
                 request_timeout: float = 90.0):

        if not api_key:
            logger.error("FireCrawl API key is required for this simplified version.")
            raise ValueError("API Key is missing")

        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.request_timeout = request_timeout
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    # Define retry strategy for the API call
    @retry(stop=stop_after_attempt(3), # Retry 3 times
           wait=wait_exponential(multiplier=1, min=2, max=10), # Wait 2s, 4s, 8s (max 10s)
           retry=retry_if_exception_type((requests.exceptions.Timeout, requests.exceptions.ConnectionError)), # Retry only on Timeout or ConnectionError
           reraise=True) # Reraise the exception if all retries fail
    def _make_scrape_request(self, api_url: str, req_body: Dict[str, Any]) -> requests.Response:
        """Internal method to make the actual HTTP POST request with retries."""
        logger.debug(f"Making FireCrawl request to {api_url}")
        response = requests.post(
            api_url,
            json=req_body,
            headers=self.headers,
            timeout=self.request_timeout
        )
        # Raise HTTPError for bad status codes (4xx or 5xx)
        # We don't retry on these by default, but it makes handling clearer
        response.raise_for_status()
        return response

    async def scrape(self, url: str, formats: List[str] = ["markdown", "html"],
                    only_main_content: bool = False, remove_base64_images: bool = True,
                    exclude_tags: List[str] = ["nav", "footer", "aside", "script", "style"],
                    include_tags: List[str] = [],
                    wait_for: Optional[int] = None, mobile: Optional[bool] = None,
                    bypass_cookies: bool = False) -> Dict[str, Any]:
        """
        Main scrape method that uses the confirmed flat structure.
        This is the method that should be called by external code.
        Returns response in format expected by page processor: {success: bool, data?: dict, error?: str}
        """
        request_id = str(uuid.uuid4())[:8]
        logger.info(f"[{request_id}] Initiating scrape for URL: {url}")

        api_url = f"{self.base_url}/scrape"
        
        # Prepare headers - start with default UA
        api_headers = self.headers.copy()
        api_headers["User-Agent"] = DEFAULT_USER_AGENT # Add User-Agent here
        
        # --- Define headers SPECIFICALLY for the target site ---
        target_site_headers = {
            "User-Agent": DEFAULT_USER_AGENT
        }
        # If bypass_cookies logic were here, the Cookie would be added to target_site_headers

        # Use the confirmed flat structure that worked in curl
        req_body: Dict[str, Any] = {
            "url": url,
            "formats": formats,
            "onlyMainContent": only_main_content,
            "removeBase64Images": remove_base64_images,
            "headers": target_site_headers, # Use target site headers here
            "excludeTags": exclude_tags,
            "includeTags": include_tags,
            "timeout": 60000
        }

        # Add optional parameters only if they are provided
        if wait_for is not None:
            req_body["waitFor"] = wait_for
        if mobile is not None:
            req_body["mobile"] = mobile

        # Add detailed request logging
        # logger.debug(f"[{request_id}] Request URL: {api_url}")
        # logger.debug(f"[{request_id}] Request Headers: {json.dumps(self.headers)}")
        # logger.debug(f"[{request_id}] Request Body (Raw): {json.dumps(req_body, indent=2)}")

        response_json = None
        status_code = -1

        try:
            # Use the internal method with retry logic
            response = self._make_scrape_request(api_url, req_body)
            status_code = response.status_code
            
            # Add response header logging
            logger.info(f"[{request_id}] Response Status: {status_code}")
            # logger.debug(f"[{request_id}] Response Headers: {dict(response.headers)}")

            try:
                response_json = response.json()
                # Comment out logging full response for debugging to improve performance
                # response_log_str = json.dumps(response_json, indent=2)
                # logger.debug(f"[{request_id}] FireCrawl Response Body:\n{response_log_str}")
            except json.JSONDecodeError:
                logger.error(f"[{request_id}] Failed JSON decode. Status: {status_code}")
                # Limit response text logging to reduce overhead
                logger.error(f"[{request_id}] Raw Response Text: {response.text[:500]}...")
                return {
                    "success": False,
                    "error": f"Failed to decode JSON response (HTTP {status_code})"
                }

            # Verify _save_simplified_result call is removed or remains commented out
            # # self._save_simplified_result(url, response_json, status_code)

            # Check for success
            if 200 <= status_code < 300 and response_json.get('success') is True:
                logger.info(f"[{request_id}] Scrape SUCCESSFUL (HTTP {status_code}) for {url}")
                # Ensure 'data' exists before returning it
                if 'data' in response_json:
                    return {
                        "success": True,
                        "data": response_json['data']
                    }
                else:
                    logger.error(f"[{request_id}] API reported success but 'data' field missing in response.")
                    return {
                        "success": False,
                        "error": "API reported success but no data field found in response"
                    }
            else:
                error_msg = response_json.get('error', f'Unknown API error or success=false (HTTP {status_code})')
                details = response_json.get('details', '')
                error = f"{error_msg}" + (f": {details}" if details else "")
                logger.error(f"[{request_id}] Scrape FAILED (HTTP {status_code}). Error: {error}")
                return {
                    "success": False,
                    "error": error
                }

        except requests.exceptions.Timeout as e: # Catch Timeout if retries fail
            error_msg = f"Request timed out after retries ({self.request_timeout}s) for URL: {url}"
            logger.error(f"[{request_id}] {error_msg}")
            return {
                "success": False,
                "error": error_msg
            }
        except requests.exceptions.RequestException as e: # Catch other RequestExceptions (ConnectionError, HTTPError)
            error_msg = f"Network error during request for {url} after potential retries: {str(e)}"
            logger.error(f"[{request_id}] {error_msg}", exc_info=True)
            return {
                "success": False,
                "error": error_msg
            }
        except Exception as e: # Catch any other unexpected errors
            error_msg = f"Unexpected error during scrape for {url}: {str(e)}"
            logger.exception(f"[{request_id}] {error_msg}")
            return {
                "success": False,
                "error": error_msg
            }