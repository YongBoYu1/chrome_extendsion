"""
PDF Processor Service
--------------------
Handles PDF text extraction for summarization.
"""

import logging
import requests
import io
from typing import Dict, Optional
import PyPDF2

logger = logging.getLogger(__name__)

class PDFProcessor:
    def __init__(self):
        self.max_file_size = 10 * 1024 * 1024  # 10MB limit
        
    async def extract_text_from_pdf_url(self, url: str) -> Dict:
        """Extract text from a PDF URL"""
        try:
            # Download the PDF
            logger.info(f"Downloading PDF from: {url}")
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            # Check file size
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) > self.max_file_size:
                return {
                    "success": False,
                    "error": "PDF file is too large (max 10MB)"
                }
            
            # Read PDF content
            pdf_content = io.BytesIO(response.content)
            pdf_reader = PyPDF2.PdfReader(pdf_content)
            
            # Extract text from all pages
            text_content = []
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text.strip():
                        text_content.append(f"Page {page_num + 1}:\n{page_text}")
                except Exception as e:
                    logger.warning(f"Failed to extract text from page {page_num + 1}: {e}")
                    continue
            
            if not text_content:
                return {
                    "success": False,
                    "error": "No readable text found in PDF"
                }
            
            full_text = "\n\n".join(text_content)
            
            # Basic cleanup
            full_text = self._clean_pdf_text(full_text)
            
            return {
                "success": True,
                "text": full_text,
                "pages": len(pdf_reader.pages),
                "source": "pdf_extraction"
            }
            
        except requests.RequestException as e:
            logger.error(f"Failed to download PDF from {url}: {e}")
            return {
                "success": False,
                "error": f"Failed to download PDF: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Failed to process PDF from {url}: {e}")
            return {
                "success": False,
                "error": f"Failed to process PDF: {str(e)}"
            }
    
    def _clean_pdf_text(self, text: str) -> str:
        """Clean extracted PDF text"""
        import re
        
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = re.sub(r' +', ' ', text)
        
        # Remove page headers/footers (basic patterns)
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            # Skip very short lines that might be headers/footers
            if len(line) < 3:
                continue
            # Skip lines that are just page numbers
            if re.match(r'^\d+$', line):
                continue
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines) 