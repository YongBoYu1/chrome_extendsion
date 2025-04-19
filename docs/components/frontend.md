# Chrome Extension Frontend

## Overview

The Chrome Extension Frontend consists of several key components that work together to provide a seamless user experience for content extraction and processing. The frontend is built using vanilla JavaScript, HTML, and CSS, following Chrome Extension's architecture guidelines.

## Component Structure

### 1. Popup Interface (`popup/`)
- Entry point for user interaction
- Provides quick access to extension features
- Handles initial user input and settings

### 2. Result Page (`pages/result/`)
- Displays processed content
- Manages content rendering and formatting
- Handles navigation and user interactions

### 3. Background Script (`background/`)
- Manages extension lifecycle
- Handles communication between components
- Controls content processing flow

### 4. Utilities (`utils/`)
- Contains reusable helper functions and modules.
- Centralizes common logic like API communication.

## Key Files and Their Responsibilities

### Popup Interface

#### `popup/popup.html`
- Main popup interface structure
- Quick action buttons
- Settings controls

#### `popup/popup.js`
```javascript
// Core functionality
- User input handling
- Tab interaction
- Message passing to background script
- UI state management
```

#### `popup/styles.css`
- Popup styling
- Theme consistency
- Responsive design

### Result Page

#### `pages/result/index.html`
- Content display layout
- Navigation elements
- Processing indicators

#### `pages/result/index.js`
```javascript
// Main functionality
- Page initialization
- Navigation handling
- Event listeners setup
```

#### `pages/result/content.js`
```javascript
// Content handling
- Content rendering
- Markdown processing (using a simplified custom parser; does not use external libraries like Marked.js)
- Handles headings (#, ##, ###) and basic lists (*, -).
- HTML sanitization (implied via DOM manipulation, ensure proper handling)
- Full-width content display (maximizes available space)
```

#### `pages/result/processing.js`
```javascript
// Processing state
// ... (keep existing lines) ...
```

### Background Script

#### `background/background.js` or `background/service-worker.js`
```javascript
// Core background tasks
- Event listeners (e.g., onInstalled, onMessage)
- State management across the extension
- Orchestration of content processing
- Communication hub between popup, content scripts, and pages
// Note: May delegate actual API calls to utils/api.js
```

### Utilities

#### `utils/api.js`
```javascript
// Backend API Client
- Centralizes all HTTP requests to the Python backend.
- Contains the configuration for the backend URL (CONFIG.BACKEND_URL).
- Provides methods like ping(), summarize(), etc.
- Handles request formatting and basic error handling.
// IMPORTANT: Update CONFIG.BACKEND_URL in this file when deploying the backend.
```

### Content Scripts (`content/` - If applicable)
