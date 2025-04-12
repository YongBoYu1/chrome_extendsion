"""
Gemini Summarizer Component
--------------------------
Handles content summarization using Google's Gemini AI.
"""

import logging
from typing import Dict, Optional
import google.generativeai as genai
import google.api_core.exceptions
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from fastapi import HTTPException
import re

# Configure logging
logger = logging.getLogger(__name__)

class GeminiSummarizer:
    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash"):
        self.api_key = api_key
        self.model_name = model_name
        genai.configure(api_key=api_key)
        
        # Define generation config at initialization
        self.generation_config = {
            "temperature": 0.2,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 1000
        }

    def setup_model(self):
        """Setup and return a configured Gemini model"""
        return genai.GenerativeModel(
            model_name=self.model_name,
            generation_config=self.generation_config
        )

    # Define retry strategy for the Gemini API call
    @retry(stop=stop_after_attempt(3),
           wait=wait_exponential(multiplier=1, min=2, max=10),
           # Retry on specific Google API transient errors
           retry=retry_if_exception_type((google.api_core.exceptions.DeadlineExceeded,
                                        google.api_core.exceptions.ServiceUnavailable,
                                        google.api_core.exceptions.ResourceExhausted)), # ResourceExhausted often indicates rate limits
           reraise=True)
    def _generate_with_retry(self, model, prompt: str):
        """Internal method to make the Gemini API call with retries."""
        logger.debug("Calling Gemini model.generate_content")
        response = model.generate_content(prompt)
        return response

    async def summarize(self, content: str, title: Optional[str] = None, max_length: int = 1000) -> Dict:
        """Generate a summary using Gemini AI"""
        logger.info(f"Generating summary with Gemini. Title: {title}, Content length: {len(content)}")
        
        if not self.api_key:
            logger.error("Gemini API key not configured")
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        try:
            # Truncate content if too long
            max_input_chars = 30000
            if len(content) > max_input_chars:
                logger.info(f"Content too long ({len(content)} chars), truncating to {max_input_chars} chars")
                content = content[:max_input_chars] + "..."
            
            # Update max_output_tokens in generation config if max_length is different
            if max_length != self.generation_config["max_output_tokens"]:
                self.generation_config["max_output_tokens"] = max_length
            
            # Create model
            model = self.setup_model()
            
            # --- UPDATED Prompt ---
            prompt = f"""You are an AI assistant that creates high-quality, comprehensive summaries of web pages.

Here is the content from a webpage {f'titled "{title}"' if title else ''}:

{content}

Please perform the following tasks:

TASK 1: Generate a detailed summary of the content.
- Highlight main points, key information, and conclusions.
- Use proper Markdown formatting (headings, paragraphs, emphasis).
- Ensure the summary is informative, well-structured, and captures the essence of the original content.
- **Crucially, DO NOT include the 'Key Points' requested in TASK 2 within this summary text.**

TASK 2: Identify the 3-5 most important takeaways from the content.
- List these takeaways as bullet points.
- Each bullet point should be concise and start with "*" or "-".
- Present these bullet points clearly *after* the main summary, separated by a unique marker like '---KEYPOINTS---'.

Example Output Structure:
[Detailed Summary using Markdown paragraphs, headings, etc.]

---KEYPOINTS---
* Key point 1
* Key point 2
* Key point 3
"""
            
            logger.info("Sending content to Gemini for summarization")
            
            # Call internal method with retry logic
            response = self._generate_with_retry(model, prompt)
            full_response_text = response.text # Get the full response

            logger.info(f"Gemini response received. Length: {len(full_response_text)}")
            
            # --- UPDATED Response Parsing Logic ---
            summary_text = full_response_text # Default to full text
            key_points_text = ""
            key_points = []

            # Define the separator
            separator = "---KEYPOINTS---"
            
            if separator in full_response_text:
                try:
                    parts = full_response_text.split(separator, 1)
                    summary_text = parts[0].strip()
                    key_points_text = parts[1].strip()
                    
                    # Extract bullet points from the key_points_text
                    # Improved splitting to handle various line endings
                    lines = key_points_text.splitlines() 
                    points = [line.strip().lstrip('*-').strip() for line in lines
                              if line.strip() and (line.strip().startswith('*') or line.strip().startswith('-'))]
                    key_points = [point for point in points if point] # Filter out empty points
                    logger.info(f"Extracted {len(key_points)} key points using separator.")
                    
                    # Optional: Log extracted points for debugging
                    # logger.debug(f"Extracted key points: {key_points}")

                except Exception as e:
                     logger.error(f"Error splitting/parsing response with separator: {e}")
                     # Fallback: summary_text remains the full_response_text, key_points remain empty
                     summary_text = full_response_text 
                     key_points = []
            else:
                 logger.warning(f"Separator '{separator}' not found in response. Key points might be missing or extraction failed.")
                 # Optional: Implement fallback regex extraction here if desired
                 # key_points = self._extract_key_points_regex(summary_text) # Example fallback

            # Ensure summary text has some content, otherwise use a placeholder or log error
            if not summary_text:
                logger.error("Summary text is empty after processing. Using full response as fallback.")
                summary_text = full_response_text # Fallback to full response if split resulted in empty summary

            # --- Calculate Estimated Reading Time --- 
            words_per_minute = 230 # Average reading speed
            word_count = len(summary_text.split())
            estimated_reading_time = round(word_count / words_per_minute) if words_per_minute > 0 else 0
            logger.info(f"Calculated word count: {word_count}, Estimated reading time: {estimated_reading_time} min")
            # --- End Reading Time Calculation ---

            logger.info(f"Final summary length: {len(summary_text)}, Key points count: {len(key_points)}")

            return {
                "success": True,
                "summary": summary_text, 
                "title": title,
                "keyPoints": key_points,
                "readingTime": estimated_reading_time, # Add reading time
                "wordCount": word_count # Also add the calculated word count
            }
            
        # Catch specific Google API exceptions if retries fail
        except google.api_core.exceptions.GoogleAPICallError as e:
            logger.error(f"Error generating summary with Gemini after retries: {str(e)}")
            # Map specific errors to potentially different HTTP statuses if desired
            # Example: if isinstance(e, google.api_core.exceptions.ResourceExhausted): ...
            raise HTTPException(status_code=502, detail=f"Failed to generate summary (Gemini API error): {str(e)}")
        except Exception as e: # Catch any other unexpected errors
            logger.error(f"Unexpected error generating summary with Gemini: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Unexpected error during summary generation: {str(e)}") 