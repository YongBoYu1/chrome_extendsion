"""
Test script to extract full content from eBay jobs page and save it to a file
"""
import asyncio
import os
import json
import re # Added for CSS cleaning
from datetime import datetime
from cookie_handler import cookie_handler
from firecrawl_extractor import FireCrawlExtractor
from page_processor import PageProcessor  # Import PageProcessor for cleaning
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test URL with cookie consent
TEST_URL = "https://jobs.ebayinc.com/us/en/job/R0065663/Staff-Software-Engineer-Frontend"

async def test_and_save_full_content():
    print(f"Testing full content extraction for {TEST_URL}")
    
    # Initialize FireCrawl extractor
    api_key = os.getenv('FIRECRAWL_API_KEY')
    if not api_key:
        print("ERROR: FIRECRAWL_API_KEY environment variable not set")
        return
        
    extractor = FireCrawlExtractor(api_key=api_key)
    
    # Create page processor instance for cleaning (pass None for summarizer as we won't use it)
    processor = PageProcessor(extractor=extractor, summarizer=None)
    
    # Run extraction with cookie handling
    print("\n--- Running extraction with cookie handling ---")
    result = await extractor.scrape(
        url=TEST_URL,
        formats=["markdown", "html"],  # Get both formats
        bypass_cookies=False,  # Enable cookie handling
        only_main_content=False # <--- ADD THIS LINE
    )
    
    if not result.get("success"):
        print(f"FAILED - Error: {result.get('error')}")
        return
    
    # Get content
    data = result.get("data", {})
    markdown_content = data.get("markdown", "")
    html_content = data.get("html", "")
    metadata = data.get("metadata", {})
    
    # Clean the markdown content
    content_type = 'markdown' if markdown_content else 'html'
    
    if content_type == 'markdown':
        # Use the extract_text_from_markdown method from PageProcessor
        cleaned_content = processor.extract_text_from_markdown(markdown_content)
        print(f"- Original markdown: {len(markdown_content)} characters")
        print(f"- Cleaned markdown: {len(cleaned_content)} characters")
        print(f"- Reduction: {len(markdown_content) - len(cleaned_content)} characters ({(len(markdown_content) - len(cleaned_content)) / len(markdown_content) * 100:.1f}%)")
    else:
        # Fall back to regex cleaning if no markdown
        cleaned_content = processor.clean_content_regex(html_content)
        print(f"- Original HTML: {len(html_content)} characters")
        print(f"- Cleaned HTML: {len(cleaned_content)} characters")
        print(f"- Reduction: {len(html_content) - len(cleaned_content)} characters ({(len(html_content) - len(cleaned_content)) / len(html_content) * 100:.1f}%)")
    
    # Print stats
    print(f"\nExtraction SUCCESSFUL:")
    print(f"- Markdown content: {len(markdown_content)} characters")
    print(f"- HTML content: {len(html_content)} characters")
    print(f"- Title: {metadata.get('title', 'No title')}")
    
    # Create output directory
    output_dir = "full_content_test"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Save timestamp for filenames
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save original markdown content
    markdown_file = f"{output_dir}/{timestamp}_original.md"
    with open(markdown_file, "w", encoding="utf-8") as f:
        f.write(f"# Extracted content from {TEST_URL}\n\n")
        f.write(markdown_content)
    print(f"Saved original markdown content to: {markdown_file}")
    
    # Save cleaned markdown content
    cleaned_file = f"{output_dir}/{timestamp}_cleaned.md"
    with open(cleaned_file, "w", encoding="utf-8") as f:
        f.write(f"# Cleaned content from {TEST_URL}\n\n")
        f.write(cleaned_content)
    print(f"Saved cleaned content to: {cleaned_file}")
    
    # Save HTML content
    html_file = f"{output_dir}/{timestamp}_original.html"
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Saved HTML content to: {html_file}")
    
    # Save metadata
    metadata_file = f"{output_dir}/{timestamp}_metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to: {metadata_file}")
    
    # Clean up
    await cookie_handler.close()
    print("\nTest completed")

if __name__ == "__main__":
    asyncio.run(test_and_save_full_content()) 