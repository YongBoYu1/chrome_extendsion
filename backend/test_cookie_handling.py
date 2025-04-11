"""
Test script for cookie handling solution
"""
import asyncio
import os
import json
from cookie_handler import cookie_handler
from firecrawl_extractor import FireCrawlExtractor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test URL with cookie consent
TEST_URL = "https://jobs.ebayinc.com/us/en/job/R0065754/Senior-Staff-Engineer-Backend"

async def test_cookie_handling():
    print(f"Testing cookie handling for {TEST_URL}")
    
    # Initialize FireCrawl extractor
    api_key = os.getenv('FIRECRAWL_API_KEY')
    if not api_key:
        print("ERROR: FIRECRAWL_API_KEY environment variable not set")
        return
        
    extractor = FireCrawlExtractor(api_key=api_key)
    
    # First test - direct FireCrawl extraction (should fail or be incomplete)
    print("\n--- Direct Extraction (No Cookie Handling) ---")
    direct_result = await extractor.scrape(
        url=TEST_URL,
        bypass_cookies=False  # Disable cookie handling
    )
    
    if direct_result.get("success"):
        content = direct_result.get("data", {}).get("markdown", "")
        print(f"SUCCESS - Content length: {len(content)} characters")
        print(f"First 200 characters: {content[:200]}...")
    else:
        print(f"FAILED - Error: {direct_result.get('error')}")
    
    # Second test - extraction with cookie handling
    print("\n--- Extraction With Cookie Handling ---")
    cookie_result = await extractor.scrape(
        url=TEST_URL,
        bypass_cookies=True  # Enable cookie handling
    )
    
    if cookie_result.get("success"):
        content = cookie_result.get("data", {}).get("markdown", "")
        print(f"SUCCESS - Content length: {len(content)} characters")
        print(f"First 200 characters: {content[:200]}...")
    else:
        print(f"FAILED - Error: {cookie_result.get('error')}")
    
    # Show difference in content length
    if direct_result.get("success") and cookie_result.get("success"):
        direct_content = direct_result.get("data", {}).get("markdown", "")
        cookie_content = cookie_result.get("data", {}).get("markdown", "")
        
        print(f"\nDirect content length: {len(direct_content)} characters")
        print(f"Cookie-handled content length: {len(cookie_content)} characters")
        
        if len(cookie_content) > len(direct_content):
            print(f"Cookie handling improved content by {len(cookie_content) - len(direct_content)} characters!")
        else:
            print("No significant improvement from cookie handling")
    
    # Clean up
    await cookie_handler.close()
    print("\nTest completed")

if __name__ == "__main__":
    asyncio.run(test_cookie_handling()) 