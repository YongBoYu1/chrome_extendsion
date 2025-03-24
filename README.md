# Page Processor Chrome Extension

A Chrome extension that processes web pages with various modes:
- **Summarize**: Create a summary of the page content
- **Focus View**: Strip distractions for better reading
- **Duplicate**: Create a clean duplicate of the page using FireCrawl

## Features

- Content processing with a Python backend
- FireCrawl API integration for advanced content extraction
- Clean, distraction-free content viewing

## Setup Instructions

### 1. Set up the Python backend

```bash
# Run the start script from the project root directory
# This will set up the environment and start the backend server
./start-backend.sh
```

> **Note:** The script will automatically:
> - Create a virtual environment
> - Install dependencies
> - Set up the environment variables
> - Create a .env file for your FireCrawl API key
> - Start the backend server

### 2. Install the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked" and select the root folder of this project
4. The extension should now be installed and visible in your Chrome toolbar

## Usage

1. Make sure the Python backend is running (status shown in the extension popup)
2. Click the extension icon in the toolbar
3. Choose a processing mode:
   - **Summarize**: Creates a summary of the current page
   - **Focus View**: Removes distractions for better reading
   - **Duplicate**: Creates a clean duplicate of the page using FireCrawl

## Requirements

- Chrome browser
- Python 3.7+
- FireCrawl API key (for clean content extraction)

## Files Structure

```
.
├── backend/                 # Python backend
│   ├── app.py               # FastAPI server
│   ├── .env                 # Environment variables (API keys)
│   └── requirements.txt     # Python dependencies
├── popup/                   # Extension popup
│   ├── popup.html           # HTML for the popup
│   └── popup.js             # JavaScript for the popup
├── pages/                   # Result pages
│   ├── result.html          # HTML for results display
│   └── result.js            # JavaScript for results processing
├── manifest.json            # Extension manifest
├── start-backend.sh         # Script to start the backend server
└── README.md                # This file
```

## Troubleshooting

If the extension shows "Backend: Disconnected":
1. Make sure you've run the start-backend.sh script
2. Check if it's running on http://localhost:5001
3. Verify your FireCrawl API key is valid in the backend/.env file

## License

MIT 