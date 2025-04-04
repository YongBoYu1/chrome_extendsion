# Page Processor Chrome Extension

A Chrome extension that processes web pages to create concise, readable summaries using advanced content extraction and AI summarization.

## Features

- **Intelligent Content Extraction**: Uses FireCrawl to extract meaningful content from any webpage
- **AI-Powered Summarization**: Leverages Google's Gemini AI for high-quality content summarization
- **Clean Reading Interface**: Distraction-free content viewing with dark mode support
- **Progress Tracking**: Real-time processing status updates
- **Responsive Design**: Works seamlessly across different screen sizes

## Documentation

For detailed documentation, please refer to the following guides:

### User Documentation
- [User Guide](/docs/user-guide/guide.md): Complete guide for end users
  - Installation and setup
  - Features and usage
  - Customization options
  - Troubleshooting
  - Best practices

### Developer Documentation
- [Architecture Overview](/docs/architecture/overview.md): System design and component interaction
- [Backend Components](/docs/components/backend.md): Python backend architecture and implementation
- [Frontend Components](/docs/components/frontend.md): Chrome extension frontend details
- [FireCrawl Integration](/docs/components/firecrawl.md): Content extraction service integration
- [API Documentation](/docs/api/api.md): Complete API reference
- [Development Guide](/docs/development/guide.md): Setup and contribution guidelines

## Quick Start

### 1. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env to add your API keys:
# - FIRECRAWL_API_KEY
# - GEMINI_API_KEY

# Start the backend server
python backend/app.py
```

### 2. Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the project root directory
4. The extension icon should appear in your Chrome toolbar

## Project Structure

```
.
├── backend/                 # Python backend
│   ├── app.py              # Flask server & API endpoints
│   ├── page_processor.py   # Content processing orchestration
│   ├── gemini_summarizer.py    # AI summarization service
│   └── requirements.txt    # Python dependencies
│
├── background/             # Extension background
│   └── background.js      # Background script functionality
│
├── popup/                  # Extension popup
│   ├── popup.html         # Popup interface
│   └── popup.js           # Popup logic
│
├── pages/                  # Result pages
│   └── result/            # Result page components
│       ├── index.html     # Result page structure
│       ├── styles.css     # Styling
│       ├── index.js       # Main result page logic
│       ├── processing.js  # Processing state management
│       ├── ui.js          # UI state and updates
│       └── content.js     # Content handling
│
├── docs/                   # Documentation
│   ├── architecture/      # System architecture
│   ├── components/        # Component documentation
│   ├── api/              # API reference
│   ├── development/      # Development guide
│   └── user-guide/       # End-user documentation
│
└── manifest.json          # Extension manifest
```

## Requirements

- Chrome browser (latest version)
- Python 3.9+
- FireCrawl API key
- Google Gemini API key

## Contributing

Please read our [Development Guide](/docs/development/guide.md) for details on our code of conduct and the process for submitting pull requests.

## Support

If you encounter any issues or need assistance:
1. Check the [User Guide](/docs/user-guide/guide.md) troubleshooting section
2. Review the [Development Guide](/docs/development/guide.md) for technical issues
3. Submit an issue on our GitHub repository

## License

MIT 