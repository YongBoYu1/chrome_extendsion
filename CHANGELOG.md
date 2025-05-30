# Changelog

All notable changes to the Page Processor Chrome Extension will be documented in this file.

## [1.0.2] - 2025-05-30

### Added
- **PDF Support**: Extension now supports PDF text extraction and summarization
- **Enhanced Error Messages**: More specific and user-friendly error messages for different scenarios
- **Privacy Policy**: Added privacy policy for Chrome Web Store compliance
- **PDF Processor**: New backend module for handling PDF text extraction with size limits

### Improved
- **URL Validation**: Better detection of unsupported file types with specific error messages
- **API Error Handling**: More descriptive HTTP error responses (404, 500, 503, etc.)
- **User Experience**: Clear error messages shown to users instead of generic failures
- **Backend Architecture**: Added PDF processing capability with PyPDF2

### Fixed
- **User Feedback**: Users now see clear error messages instead of silent failures
- **PDF Processing**: Prevents HTTP 500 errors when users try to process PDF files
- **Extension Description**: Updated for better Chrome Web Store listing

### Technical
- Added PyPDF2 dependency for PDF text extraction
- Improved error handling in popup JavaScript
- Enhanced API client with status-specific error messages
- Added 10MB file size limit for PDF processing

## [1.0.1] - 2025-05-XX

### Initial Release Features
- Web page summarization using Google Gemini AI
- FireCrawl integration for content extraction
- Clean, responsive UI with dark mode support
- Real-time processing progress tracking
- Background service worker for state management
- Content storage and result page display 