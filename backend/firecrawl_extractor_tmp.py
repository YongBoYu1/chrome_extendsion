import os
import json
import logging
import uuid
from datetime import datetime, timezone
import re
from typing import Dict, List, Optional, Any
import requests

# Configure basic logging
logging.basicConfig(level=logging.DEBUG, # Use DEBUG for detailed request/response info
                    format='%(asctime)s [%(levelname)s] [%(name)s] - %(message)s')
logger = logging.getLogger(__name__)

# --- Simplified Constants ---
DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 PythonSimplifiedTest/1.0' # Modified UA slightly

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
                 scrape_dir: str = "scraped_content_simplified", # Use different dir
                 request_timeout: float = 90.0): # Overall request timeout

        if not api_key:
            logger.error("FireCrawl API key is required for this simplified version.")
            raise ValueError("API Key is missing")

        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.scrape_dir = scrape_dir
        self.request_timeout = request_timeout
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        if not os.path.exists(scrape_dir):
            try:
                os.makedirs(scrape_dir)
                logger.info(f"Created simplified scrape directory: {scrape_dir}")
            except OSError as e:
                logger.error(f"Failed to create directory {scrape_dir}: {e}")

    def _save_simplified_result(self, url: str, response_data: Dict[str, Any], status_code: int) -> None:
        """Saves the raw API response for debugging."""
        if not os.path.exists(self.scrape_dir):
             logger.error(f"Scrape directory '{self.scrape_dir}' does not exist. Cannot save result.")
             return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        status = f"HTTP_{status_code}"
        safe_url_part = sanitize_filename(url.split('//')[-1].replace('/', '_'), 50)
        filename = f"{status}_{safe_url_part}_{timestamp}.json"
        filepath = os.path.join(self.scrape_dir, filename)

        save_content = {
            '_debug_info': {
                'original_url': url,
                'scrape_timestamp_utc': datetime.now(timezone.utc).isoformat(),
                'saved_filename': filename,
                'response_status_code': status_code
            },
            'api_response': response_data
        }

        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(save_content, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved simplified API response to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save simplified result to {filepath}: {str(e)}")

    # --- scrape_simplified using the CONFIRMED Flattened Structure ---
    async def scrape_simplified(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Attempts a scrape with the confirmed minimal, flattened request body structure.
        """
        request_id = str(uuid.uuid4())[:8]
        logger.info(f"[{request_id}] Initiating SIMPLIFIED scrape for URL: {url}")

        api_url = f"{self.base_url}/scrape"

        # --- CONFIRMED Flattened Request Body Structure ---
        req_body: Dict[str, Any] = {
            "url": url,
            "formats": ["markdown", "html"],
            "onlyMainContent": True,
            "removeBase64Images": True,
            "headers": {"User-Agent": DEFAULT_USER_AGENT},
            "excludeTags": ["nav", "footer", "aside", "script", "style"],
            "includeTags": [],
            "timeout": 60000
        }

        # Add detailed request logging
        logger.debug(f"[{request_id}] Request URL: {api_url}")
        logger.debug(f"[{request_id}] Request Headers: {json.dumps(self.headers)}")
        logger.debug(f"[{request_id}] Request Body (Raw): {json.dumps(req_body, indent=2)}")

        response_json = None
        status_code = -1

        try:
            response = requests.post(
                api_url,
                json=req_body,
                headers=self.headers,
                timeout=self.request_timeout
            )
            status_code = response.status_code
            
            # Add response header logging
            logger.debug(f"[{request_id}] Response Status: {status_code}")
            logger.debug(f"[{request_id}] Response Headers: {dict(response.headers)}")

            try:
                response_json = response.json()
                # Log full response for debugging
                response_log_str = json.dumps(response_json, indent=2)
                logger.debug(f"[{request_id}] FireCrawl Response Body:\n{response_log_str}")
            except json.JSONDecodeError:
                logger.error(f"[{request_id}] Failed JSON decode. Status: {status_code}")
                logger.error(f"[{request_id}] Raw Response Text: {response.text[:1000]}")
                response_json = {"_error": "JSON Decode Failed", "raw_body": response.text}

            # Save the raw response for inspection
            self._save_simplified_result(url, response_json, status_code)

            # Check for success
            if 200 <= status_code < 300 and response_json.get('success') is True:
                logger.info(f"[{request_id}] Simplified scrape SUCCESSFUL (HTTP {status_code}) for {url}")
                # Ensure 'data' exists before returning it
                if 'data' in response_json:
                    return response_json.get('data')
                else:
                    logger.error(f"[{request_id}] API reported success but 'data' field missing in response.")
                    return None
            else:
                error_msg = response_json.get('error', f'Unknown API error or success=false (HTTP {status_code})')
                details = response_json.get('details', '')
                logger.error(f"[{request_id}] Simplified scrape FAILED (HTTP {status_code}). Error: {error_msg}, Details: {details}")
                return None

        except requests.exceptions.Timeout:
            logger.error(f"[{request_id}] Request timed out ({self.request_timeout}s) for URL: {url}")
            self._save_simplified_result(url, {"_error": "Request Timeout"}, status_code=408)
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"[{request_id}] Network error during request for {url}: {str(e)}", exc_info=True)
            self._save_simplified_result(url, {"_error": f"Network Error: {e}"}, status_code=599)
            return None
        except Exception as e:
            logger.exception(f"[{request_id}] Unexpected Python error during simplified scrape for {url}: {str(e)}")
            self._save_simplified_result(url, {"_error": f"Unexpected Python Error: {e}"}, status_code=500)
            return None

    # Add the missing scrape method that was being called
    async def scrape(self, url: str, formats: List[str] = ["markdown", "html"],
                    only_main_content: bool = True, remove_base64_images: bool = True,
                    exclude_tags: List[str] = ["nav", "footer", "aside", "script", "style"],
                    include_tags: List[str] = [],
                    wait_for: Optional[int] = None, mobile: Optional[bool] = None) -> Dict[str, Any]:
        """
        Main scrape method that uses the confirmed flat structure.
        This is the method that should be called by external code.
        Returns response in format expected by page processor: {success: bool, data?: dict, error?: str}
        """
        request_id = str(uuid.uuid4())[:8]
        logger.info(f"[{request_id}] Initiating scrape for URL: {url}")

        api_url = f"{self.base_url}/scrape"

        # Use the confirmed flat structure that worked in curl
        req_body: Dict[str, Any] = {
            "url": url,
            "formats": formats,
            "onlyMainContent": only_main_content,
            "removeBase64Images": remove_base64_images,
            "headers": {"User-Agent": DEFAULT_USER_AGENT},
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
        logger.debug(f"[{request_id}] Request URL: {api_url}")
        logger.debug(f"[{request_id}] Request Headers: {json.dumps(self.headers)}")
        logger.debug(f"[{request_id}] Request Body (Raw): {json.dumps(req_body, indent=2)}")

        response_json = None
        status_code = -1

        try:
            response = requests.post(
                api_url,
                json=req_body,
                headers=self.headers,
                timeout=self.request_timeout
            )
            status_code = response.status_code
            
            # Add response header logging
            logger.debug(f"[{request_id}] Response Status: {status_code}")
            logger.debug(f"[{request_id}] Response Headers: {dict(response.headers)}")

            try:
                response_json = response.json()
                # Log full response for debugging
                response_log_str = json.dumps(response_json, indent=2)
                logger.debug(f"[{request_id}] FireCrawl Response Body:\n{response_log_str}")
            except json.JSONDecodeError:
                logger.error(f"[{request_id}] Failed JSON decode. Status: {status_code}")
                logger.error(f"[{request_id}] Raw Response Text: {response.text[:1000]}")
                return {
                    "success": False,
                    "error": f"Failed to decode JSON response (HTTP {status_code})"
                }

            # Save the raw response for inspection
            self._save_simplified_result(url, response_json, status_code)

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

        except requests.exceptions.Timeout:
            error_msg = f"Request timed out ({self.request_timeout}s) for URL: {url}"
            logger.error(f"[{request_id}] {error_msg}")
            self._save_simplified_result(url, {"_error": "Request Timeout"}, status_code=408)
            return {
                "success": False,
                "error": error_msg
            }
        except requests.exceptions.RequestException as e:
            error_msg = f"Network error during request for {url}: {str(e)}"
            logger.error(f"[{request_id}] {error_msg}", exc_info=True)
            self._save_simplified_result(url, {"_error": f"Network Error: {e}"}, status_code=599)
            return {
                "success": False,
                "error": error_msg
            }
        except Exception as e:
            error_msg = f"Unexpected error during scrape for {url}: {str(e)}"
            logger.exception(f"[{request_id}] {error_msg}")
            self._save_simplified_result(url, {"_error": f"Unexpected Python Error: {e}"}, status_code=500)
            return {
                "success": False,
                "error": error_msg
            }