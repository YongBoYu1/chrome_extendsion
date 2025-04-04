"""
Gemini Summarizer Component
--------------------------
Handles content summarization using Google's Gemini AI.
"""

import logging
from typing import Dict, Optional
import google.generativeai as genai
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
            
            # Create prompt
            prompt = f"""You are an AI assistant that creates high-quality, comprehensive summaries of web pages.

Here is the content from a webpage {f'titled "{title}"' if title else ''}:

{content}

Please provide:

1. A detailed summary of this content, highlighting the main points, key information, and conclusions.
Format the summary with proper Markdown formatting, including headings, bullet points, and emphasis where appropriate.
The summary should be informative, well-structured, and capture the essence of the original content.

2. A section labeled "**Key Points:**" with 3-5 bullet points of the most important takeaways from the content.
Each bullet point should be concise and start with "*" or "-".
"""
            
            logger.info("Sending content to Gemini for summarization")
            
            # Generate summary
            response = model.generate_content(prompt)
            summary = response.text
            
            logger.info(f"Gemini summary generated successfully. Summary length: {len(summary)}")
            
            # Extract key points if available
            key_points = []
            key_points_section = re.search(r'\*\*Key Points:\*\*([\s\S]*?)(\*\*|$)', summary)
            if key_points_section:
                section_content = key_points_section.group(1).strip()
                points = [line.strip().lstrip('*-').strip() for line in section_content.split('\n') 
                          if line.strip() and (line.strip().startswith('*') or line.strip().startswith('-'))]
                key_points = [point for point in points if point]
                logger.info(f"Extracted {len(key_points)} key points from summary")
            
            return {
                "success": True,
                
                "summary": summary,
                "title": title,
                "keyPoints": key_points
            }
            
        except Exception as e:
            logger.error(f"Error generating summary with Gemini: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}") 