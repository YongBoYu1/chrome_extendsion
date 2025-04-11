"""
Cookie Consent Handler
---------------------
Uses Playwright to handle cookie consent banners and returns cookies for use with FireCrawl.
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any
import os
import json

# Configure logging
logger = logging.getLogger(__name__)

class CookieHandler:
    def __init__(self):
        self.browser = None
        self.context = None
        
    async def setup(self):
        """Initialize Playwright browser (lazy initialization)"""
        try:
            # Import here to avoid dependency if not used
            from playwright.async_api import async_playwright
            
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            logger.info("Playwright browser initialized for cookie handling")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Playwright: {str(e)}")
            return False
            
    async def close(self):
        """Close Playwright browser"""
        if self.browser:
            await self.browser.close()
            await self.playwright.stop()
            self.browser = None
            logger.info("Playwright browser closed")
            
    async def accept_cookies(self, url: str) -> Dict[str, Any]:
        """
        Navigate to URL, accept cookies, and return cookies for the session
        
        Args:
            url: The URL to visit and accept cookies for
            
        Returns:
            Dictionary with cookies and success status
        """
        if not self.browser:
            success = await self.setup()
            if not success:
                return {"success": False, "error": "Failed to initialize browser"}
        
        try:
            # Create a new context for this URL
            context = await self.browser.new_context()
            page = await context.new_page()
            
            # Navigate to the URL
            logger.info(f"Navigating to {url} to handle cookies")
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait for the page to be fully loaded
            await page.wait_for_load_state("networkidle", timeout=10000)
            
            # Try different selectors for cookie consent buttons
            # Start with the specific eBay jobs selector
            selectors = [
                # eBay specific selectors (based on HTML analysis)
                "button[data-ph-at-id='cookie-close-link'][phae-main='2']",
                "button:has(.icon-check-mark)",
                "button:has(ppc-content[key='allowCookiesText'])",
                
                # Generic selectors for other sites
                "button[id*='accept'], button[id*='agree'], button[id*='allow']",
                "button[class*='accept'], button[class*='agree'], button[class*='allow']",
                "button:has-text('Accept')",
                "button:has-text('Allow')",
                "button:has-text('Agree')",
                "button:has-text('I agree')",
                "button:has-text('Accept all')",
                "button:has-text('Accept cookies')"
            ]
            
            # Try each selector in order
            for selector in selectors:
                try:
                    # Check if the selector exists with a short timeout
                    button = await page.wait_for_selector(selector, timeout=1000, state="visible")
                    if button:
                        logger.info(f"Found cookie consent button with selector: {selector}")
                        await button.click()
                        # Wait a moment for the cookie to be set and banner to disappear
                        await asyncio.sleep(2)
                        break
                except Exception as e:
                    # Just continue to the next selector
                    continue
            
            # Get all cookies
            cookies = await context.cookies()
            logger.info(f"Retrieved {len(cookies)} cookies from {url}")
            
            # Take a screenshot for debugging if needed
            # screenshot_path = f"cookie_debug_{url.replace('://', '_').replace('/', '_')}.png"
            # await page.screenshot(path=screenshot_path)
            
            # Close context
            await context.close()
            
            return {
                "success": True,
                "cookies": cookies
            }
            
        except Exception as e:
            logger.error(f"Error handling cookies for {url}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def format_cookies_for_firecrawl(self, cookies: List[Dict[str, Any]]) -> Dict[str, str]:
        """Format cookies from Playwright format to FireCrawl headers format"""
        cookie_header = "; ".join([f"{cookie['name']}={cookie['value']}" for cookie in cookies])
        return {"Cookie": cookie_header}

# Singleton instance
cookie_handler = CookieHandler() 