# UI Rendering System

## Overview

The UI Rendering System is responsible for displaying processed content in a readable and visually appealing format. It handles markdown parsing, content formatting, and UI state management. The system is designed to be modular, with separate components for different aspects of the rendering process.

## Content Rendering Components

### 1. Content Display (`pages/result/content.js`)

The `content.js` file contains functions for loading and displaying processed content:

```javascript
export async function loadAndDisplayLatestContent() {
    // Get the URL this tab is responsible for
    const targetUrl = sessionStorage.getItem('targetUrl');
    
    // Get all available content
    const contents = await storageManager.getAllContent();
    
    // Find content matching tab URL
    let contentToDisplay = null;
    if (targetUrl) {
        contentToDisplay = contents.find(item => item.url === targetUrl);
    }
    
    // Fall back to most recent if no match
    if (!contentToDisplay && contents.length > 0) {
        contentToDisplay = contents[0];
    }
    
    // Create immutable copy to prevent race conditions
    const contentCopy = JSON.parse(JSON.stringify(contentToDisplay));
    
    // Display the content
    await displayProcessedContent(contentCopy);
}
```

### 2. Markdown Rendering (`pages/result/content.js`)

The system includes a custom markdown renderer that transforms markdown text into HTML with appropriate styling:

```javascript
function renderMarkdown(markdown) {
    if (!markdown) return '';
    
    // Split into sections by double newlines
    const sections = markdown.split('\n\n').map(section => section.trim()).filter(section => section);
    
    return sections.map(section => {
        // Check if section is a list
        if (section.split('\n').every(line => line.trim().startsWith('*') || line.trim().startsWith('-'))) {
            const items = section
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .map(line => line.substring(1).trim()); // Remove the * or -
            
            return `<ul class="list-disc pl-5 space-y-2 my-4">
                ${items.map(item => `<li class="text-gray-800 dark:text-gray-200">${processMarkdownInline(item)}</li>`).join('\n')}
            </ul>`;
        }
        
        // Check for headers with markdown ** formatting
        if (section.includes('**') && section.match(/\*\*([^*]+):\*\*/)) {
            return processSpecialSection(section);
        }
        
        // Check for headers (# Header)
        if (section.startsWith('# ')) {
            return `<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 my-6">${section.substring(2)}</h1>`;
        }
        if (section.startsWith('## ')) {
            return `<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-200 my-4">${section.substring(3)}</h2>`;
        }
        if (section.startsWith('### ')) {
            return `<h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 my-3">${section.substring(4)}</h3>`;
        }
        
        // Regular paragraph
        return `<p class="text-gray-700 dark:text-gray-300 my-3">${processMarkdownInline(section)}</p>`;
    }).join('\n');
}
```

### 3. Inline Markdown Processing (`pages/result/content.js`)

For inline markdown elements (bold, italic, links), separate helper functions are used:

```javascript
function processMarkdownInline(text) {
    // Handle bold text (**text**)
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text (*text*)
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Handle links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');
    
    return text;
}
```

### 4. Special Sections Processing (`pages/result/content.js`)

For sections with special formatting:

```javascript
function processSpecialSection(section) {
    // Handle the pattern **Header:** Content
    if (section.match(/^\*\*([^*:]+):\*\*(.*)/s)) {
        const matches = section.match(/^\*\*([^*:]+):\*\*(.*)/s);
        const header = matches[1].trim();
        const content = matches[2].trim();
        
        return `<div class="my-4">
            <h4 class="font-bold text-gray-800 dark:text-gray-200 inline">${header}:</h4>
            <span class="text-gray-700 dark:text-gray-300 ml-1">${processMarkdownInline(content)}</span>
        </div>`;
    }
    
    // Regular processing for sections with bold text
    return `<p class="text-gray-700 dark:text-gray-300 my-3">${processMarkdownInline(section)}</p>`;
}
```

## Content Display Process

The content display process follows these steps:

1. **Content Retrieval**: Get content from storage
2. **Content Selection**: Identify which content to display based on tab's URL
3. **Content Processing**: Convert markdown to HTML
4. **DOM Rendering**: Insert the HTML into the document
5. **UI Updates**: Update sidebar, table of contents, and other UI elements

```javascript
export async function displayProcessedContent(content) {
    console.log('[DEBUG] Displaying processed content:', {
        hasHtml: !!content.html,
        hasMarkdown: !!content.markdown,
        hasSummary: !!content.summary,
        title: content.title
    });

    // Clear existing content
    contentContainer.innerHTML = '';

    // Create main content wrapper
    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'max-w-4xl mx-auto p-6';

    // Add title section
    const titleSection = document.createElement('div');
    titleSection.innerHTML = `
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">${escapeHtml(content.title || 'Processed Content')}</h1>
    `;
    
    // Format and add content
    let processedContent = '';
    if (content.markdown) {
        processedContent = renderMarkdown(content.markdown);
    } else if (content.html) {
        processedContent = content.html;
    } else if (content.summary) {
        processedContent = renderMarkdown(content.summary);
    }

    // Update sidebar contents
    updateSidebar(content);

    // Switch to content state
    setUIState(UIState.CONTENT);
}
```

## Sidebar Components

The sidebar contains several interactive components:

### 1. Table of Contents (`pages/result/content.js`)

```javascript
function updateTableOfContents() {
    const tocList = document.getElementById('tocList');
    if (!tocList) return;
    
    // Clear existing TOC
    tocList.innerHTML = '';
    
    // Find all headers in the processed content
    const headers = contentContainer.querySelectorAll('h1, h2, h3');
    
    // Create TOC entries
    headers.forEach((header, index) => {
        const id = `section-${index}`;
        header.id = id;
        
        const tocItem = document.createElement('li');
        const level = parseInt(header.tagName.substring(1)) - 1; // H1 = 0, H2 = 1, H3 = 2
        
        tocItem.innerHTML = `
            <a href="#${id}" class="toc-item level-${level} pl-${level * 2} block py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                ${header.textContent}
            </a>
        `;
        tocList.appendChild(tocItem);
    });
}
```

### 2. Key Takeaways (`pages/result/content.js`)

```javascript
function updateKeyTakeaways(content) {
    const keyTakeawaysList = document.getElementById('mainKeyTakeawaysList');
    if (!keyTakeawaysList) return;
    
    // Clear existing takeaways
    keyTakeawaysList.innerHTML = '';
    
    // Use provided key points if available
    if (content.keyPoints && Array.isArray(content.keyPoints) && content.keyPoints.length > 0) {
        content.keyPoints.forEach(point => {
            const item = document.createElement('li');
            item.className = 'key-takeaways-item';
            item.textContent = point;
            keyTakeawaysList.appendChild(item);
        });
        return;
    }

    // Fallback message if no key points
    const item = document.createElement('li');
    item.className = 'text-gray-500 dark:text-gray-400 italic text-sm pl-2 py-2';
    item.textContent = 'No key points available';
    keyTakeawaysList.appendChild(item);
}
```

### 3. Reading Stats (`pages/result/content.js`)

```javascript
function updateReadingStats(content) {
    // Update reading time
    const readingTimeValue = document.getElementById('readingTimeValue');
    if (readingTimeValue && content.readingTime) {
        readingTimeValue.textContent = `${Math.round(content.readingTime)} min`;
    }
    
    // Update word count
    const wordCountValue = document.getElementById('wordCountValue');
    if (wordCountValue && content.wordCount) {
        wordCountValue.textContent = content.wordCount;
    } else if (wordCountValue && content.summary) {
        // Estimate word count from summary
        const wordCount = content.summary.split(/\s+/).length;
        wordCountValue.textContent = wordCount;
    }
}
```

## Content History Management

The system maintains a history of processed content:

```javascript
export async function loadContentHistory() {
    try {
        const contents = await storageManager.getAllContent();
        if (contents && contents.length > 0) {
            displayContentHistory(contents);
        }
    } catch (error) {
        console.error('Error loading history:', error);
        showError('Failed to load history');
    }
}

export function displayContentHistory(contents) {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';

    contents.forEach(content => {
        try {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-lg mb-2';
            historyItem.onclick = () => loadContentById(content.id);

            const url = new URL(content.url);
            const hostname = url.hostname;
            const title = content.title || hostname;

            historyItem.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">${escapeHtml(title)}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${hostname}</p>
                    </div>
                    <div class="flex items-center text-xs text-gray-500 dark:text-gray-400 ml-4">
                        ${formatReadingTime(content.readingTime || 0)}
                    </div>
                </div>
            `;

            historyContainer.appendChild(historyItem);
        } catch (error) {
            console.error('Error creating history item:', error);
        }
    });
}
```

## UI State Management

The UI transitions between different states:

```javascript
// UI state constants
export const UIState = {
    INITIAL: 'initial',
    PROCESSING: 'processing',
    CONTENT: 'content',
    ERROR: 'error'
};

// Function to set UI state
export function setUIState(state) {
    // Hide all state containers
    document.querySelectorAll('.state-container').forEach(container => {
        container.classList.add('hidden');
    });
    
    // Show the appropriate container
    const container = document.getElementById(`${state}Container`);
    if (container) {
        container.classList.remove('hidden');
    }
    
    // Update body class for state-specific styling
    document.body.className = `state-${state}`;
}
```

## Content Sanitization

To prevent XSS vulnerabilities, content is sanitized:

```javascript
export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
```

## Responsive Design

The UI is designed to be responsive:

```css
/* For desktop */
@media (min-width: 1024px) {
    .content-layout {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 2rem;
    }
}

/* For mobile */
@media (max-width: 1023px) {
    .sidebar {
        display: none;
    }
}
```

## Dark Mode Support

The UI supports dark mode through Tailwind CSS classes:

```html
<h1 class="text-gray-900 dark:text-gray-100">Title</h1>
<p class="text-gray-700 dark:text-gray-300">Content</p>
```

## Special Content Features

### Code Syntax Highlighting

For code blocks, syntax highlighting is applied:

```javascript
// Handle code blocks
if (section.startsWith('```')) {
    // Extract language and code
    const lines = section.split('\n');
    const language = lines[0].substring(3).trim();
    const code = lines.slice(1, -1).join('\n');
    
    // Apply syntax highlighting
    return `<pre class="bg-gray-100 dark:bg-gray-800 rounded p-4 overflow-x-auto my-4">
        <code class="language-${language}">${escapeHtml(code)}</code>
    </pre>`;
}
```

### Mathematical Formulas

For mathematical formulas, MathJax integration is used:

```javascript
// Handle math blocks
if (section.includes('$$')) {
    // Replace math delimiters
    section = section.replace(/\$\$(.*?)\$\$/g, '<span class="math-display">$1</span>');
    
    // Initialize MathJax
    if (window.MathJax) {
        window.MathJax.typeset();
    }
}
``` 