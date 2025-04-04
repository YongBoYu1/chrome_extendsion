/**
 * Content handling and rendering for the result page
 */

import { storageManager } from '../../utils/storage.js';
import { escapeHtml, formatReadingTime, showError, hideError, setUIState, UIState } from './ui.js';

function renderMarkdown(markdown) {
    if (!markdown) return '';
    
    console.log('[DEBUG] Rendering markdown, first 100 chars:', markdown.substring(0, 100).replace(/\n/g, '\\n'));

    // First split into sections by double newlines
    const sections = markdown.split('\n\n').map(section => section.trim()).filter(section => section);
    
    return sections.map(section => {
        // Check if this section is a list
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
            // This appears to be a section with bold headers like "**Classification:**"
            return processSpecialSection(section);
        }
        
        // Check for headers
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

// Helper function to process markdown formatting within a line (bold, italic, etc.)
function processMarkdownInline(text) {
    // Handle bold text (**text**)
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text (*text*)
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Handle links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');
    
    return text;
}

// Helper function to process special sections with bold headers
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

export async function displayProcessedContent(content) {
    console.log('[DEBUG] Displaying processed content:', {
        hasHtml: !!content.html,
        hasMarkdown: !!content.markdown,
        hasSummary: !!content.summary,
        title: content.title
    });

    const contentContainer = document.getElementById('contentContainer');
    if (!contentContainer) {
        console.error('[ERROR] Content container not found');
        return;
    }

    // Clear existing content
    contentContainer.innerHTML = '';

    // Create main content wrapper
    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'max-w-4xl mx-auto p-6';

    // Add title section
    const titleSection = document.createElement('div');
    titleSection.className = 'mb-8';
    titleSection.innerHTML = `
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">${escapeHtml(content.title || 'Processed Content')}</h1>
    `;
    mainWrapper.appendChild(titleSection);

    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'prose dark:prose-invert max-w-none';

    // Handle different content formats
    let processedContent = '';
    if (content.markdown) {
        console.log('[DEBUG] Processing markdown content');
        processedContent = renderMarkdown(content.markdown);
    } else if (content.html) {
        console.log('[DEBUG] Using provided HTML content');
        processedContent = content.html;
    } else if (content.summary) {
        console.log('[DEBUG] Using summary content');
        processedContent = renderMarkdown(content.summary);
    } else {
        console.warn('[WARN] No content available to display');
        processedContent = '<p class="text-gray-600 dark:text-gray-400">No content available</p>';
    }

    contentWrapper.innerHTML = processedContent;
    mainWrapper.appendChild(contentWrapper);
    
    // Add reading time if available
    if (content.readingTime) {
        const readingTime = document.createElement('div');
        readingTime.className = 'text-sm text-gray-500 dark:text-gray-400 mt-4';
        readingTime.textContent = formatReadingTime(content.readingTime);
        mainWrapper.appendChild(readingTime);
    }

    // Append content and show container
    contentContainer.appendChild(mainWrapper);
    
    // Update page title
    document.title = content.title || 'Processed Content';

    // Update sidebar contents
    updateSidebar(content);

    // Switch to content state
    setUIState(UIState.CONTENT);

    console.log('[DEBUG] Content displayed successfully');
}

// Function to update sidebar contents
function updateSidebar(content) {
    // Update the TOC list
    updateTableOfContents();
    
    // Update reading stats
    updateReadingStats(content);
    
    // Update key takeaways
    updateKeyTakeaways(content);
}

function updateTableOfContents() {
    const tocList = document.getElementById('tocList');
    if (!tocList) return;
    
    // Clear existing TOC
    tocList.innerHTML = '';
    
    // Find all headers in the processed content
    const contentContainer = document.getElementById('contentContainer');
    if (!contentContainer) return;
    
    const headers = contentContainer.querySelectorAll('h1, h2, h3');
    if (headers.length === 0) return;
    
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

function updateKeyTakeaways(content) {
    const keyTakeawaysList = document.getElementById('mainKeyTakeawaysList');
    if (!keyTakeawaysList) {
        console.error('[ERROR] Key takeaways list element not found');
        return;
    }
    
    // Clear existing takeaways
    keyTakeawaysList.innerHTML = '';
    
    console.log('[DEBUG] Updating key takeaways with content:', {
        hasKeyPoints: Array.isArray(content.keyPoints) && content.keyPoints.length > 0,
        keyPointsCount: Array.isArray(content.keyPoints) ? content.keyPoints.length : 0,
        title: content.title
    });
    
    // First check if keyPoints are explicitly provided by the backend
    if (content.keyPoints && Array.isArray(content.keyPoints) && content.keyPoints.length > 0) {
        console.log('[DEBUG] Using provided key points:', content.keyPoints);
        content.keyPoints.forEach(point => {
            const item = document.createElement('li');
            item.className = 'key-takeaways-item';
            item.textContent = point;
            keyTakeawaysList.appendChild(item);
        });
        return;
    }

    // If no key points are available, show a placeholder message
    console.log('[DEBUG] No key points found in content');
    const item = document.createElement('li');
    item.className = 'text-gray-500 dark:text-gray-400 italic text-sm pl-2 py-2';
    item.textContent = 'No key points available';
    keyTakeawaysList.appendChild(item);
}

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

export async function loadContentById(contentId) {
    try {
        const content = await storageManager.getContent(contentId);
        if (content) {
            await displayProcessedContent(content);
            updateHistorySelection(contentId);
        } else {
            showError('Content not found');
        }
    } catch (error) {
        console.error('Error loading content:', error);
        showError('Failed to load content');
    }
}

export async function loadAndDisplayLatestContent() {
    try {
        // Get the URL this tab is responsible for
        const targetUrl = sessionStorage.getItem('targetUrl');
        console.log('[DEBUG] Loading content for URL:', targetUrl);
        
        if (!targetUrl) {
            console.warn('[WARN] No target URL set for this tab');
            // Continue with default behavior for backward compatibility
        }
        
        // Get all available content
        const contents = await storageManager.getAllContent();
        if (!contents || contents.length === 0) {
            console.error('[ERROR] No content found');
            showError('No content available after processing');
            return;
        }
        
        // Try to find content for this tab's URL first
        let contentToDisplay = null;
        
        if (targetUrl) {
            contentToDisplay = contents.find(item => item.url === targetUrl);
            
            if (contentToDisplay) {
                console.log('[DEBUG] Found content matching tab URL:', targetUrl);
            } else {
                console.log('[DEBUG] No content found for tab URL:', targetUrl);
            }
        }
        
        // If no matching content found or no target URL set, fall back to most recent
        if (!contentToDisplay) {
            // For backward compatibility, use the most recent content
            contentToDisplay = contents[0];
            console.log('[DEBUG] Using most recent content:', contentToDisplay.url);
        }
        
        // Get a clean immutable copy to avoid race conditions during rendering
        const contentCopy = JSON.parse(JSON.stringify(contentToDisplay));
        
        // Display the content
        await displayProcessedContent(contentCopy);
        
    } catch (error) {
        console.error('[ERROR] Failed to load content:', error);
        showError('Failed to load processed content');
    }
} 