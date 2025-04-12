/**
 * Content handling and rendering for the result page
 */

import { storageManager } from '../../utils/storage.js';
import { escapeHtml, formatReadingTime, showError, hideError, setUIState, UIState } from './ui.js';

/**
 * Loads and displays the latest content for this tab
 */
export async function loadAndDisplayLatestContent() {
    try {
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
        
        if (!contentToDisplay) {
            console.error('[ERROR] No content available to display');
            showError('No content available. Please try processing a page first.');
            return;
        }
        
        // Create immutable copy to prevent race conditions
        const contentCopy = JSON.parse(JSON.stringify(contentToDisplay));
        
        // Display the content
        await displayProcessedContent(contentCopy);
    } catch (error) {
        console.error('[ERROR] Failed to load content:', error);
        showError('Failed to load content: ' + error.message);
    }
}

/**
 * Displays processed content in the UI
 * @param {Object} content - Content object with title, markdown, html, etc.
 */
export async function displayProcessedContent(content) {
    const contentContainer = document.getElementById('contentContainer');
    if (!contentContainer) {
        console.error('[displayProcessedContent] ERROR: Content container (#contentContainer) not found!');
        return;
    }

    // Clear existing content
    contentContainer.innerHTML = '';

    // Create main content wrapper
    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'p-6';

    // Add title section
    const titleSection = document.createElement('div');
    titleSection.className = 'mb-8';
    titleSection.innerHTML = `
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">${escapeHtml(content.title || 'Processed Content')}</h1>
    `;
    mainWrapper.appendChild(titleSection);

    // Create content wrapper
    const contentWrapper = document.createElement('div');
    // Apply base prose styles for markdown rendering enhancement
    contentWrapper.className = 'prose dark:prose-invert max-w-none'; // Use max-w-none to allow content to fill container

    // Handle different content formats
    let processedContentHtml = '';
    // Prioritize rendering the summary field if it exists (assuming it's markdown)
    let markdownInput = content.summary || content.markdown; 

    // --- Check for and remove duplicate H1/H2 from markdown ---
    if (content.title && markdownInput) {
        const lines = markdownInput.trim().split('\n');
        if (lines.length > 0) {
            const firstLine = lines[0].trim();
            if (firstLine.startsWith('# ') || firstLine.startsWith('## ')) {
                const hText = firstLine.replace(/^#+\s*/, '').trim();
                if (hText.toLowerCase() === content.title.trim().toLowerCase()) {
                    markdownInput = lines.slice(1).join('\n').trim(); 
                }
            }
        }
    }
    // --- End of duplicate check ---

    if (markdownInput) { // Render summary/markdown using Marked.js
        try {
            // CALL THE CORRECTED RENDERER
            processedContentHtml = renderMarkdown(markdownInput);
        } catch (renderError) {
            console.error('[displayProcessedContent] ERROR during renderMarkdown:', renderError);
            processedContentHtml = '<p class="text-red-500">Error rendering Markdown.</p>';
        }
    } else if (content.html) {
        // Fallback to raw HTML if no markdown/summary
        processedContentHtml = content.html;
    } else {
        console.warn('[displayProcessedContent] WARN: No content (summary, markdown, html) found to display.');
        processedContentHtml = '<p class="text-gray-600 dark:text-gray-400">No content available</p>';
    }

    contentWrapper.innerHTML = processedContentHtml;
    mainWrapper.appendChild(contentWrapper);
    
    // Add reading time if available
    if (content.readingTime) {
        const readingTimeDiv = document.createElement('div');
        readingTimeDiv.className = 'text-sm text-gray-500 dark:text-gray-400 mt-4';
        readingTimeDiv.textContent = formatReadingTime(content.readingTime);
        mainWrapper.appendChild(readingTimeDiv);
    }

    // Append content and show container
    contentContainer.appendChild(mainWrapper);
    
    // Update page title
    document.title = content.title || 'Processed Content';

    // Update sidebar contents AFTER rendering
    updateSidebarAfterRender(content);

    // Switch to content state
    setUIState(UIState.CONTENT);

    // Setup back to top button
    setupBackToTopButton();
}

/**
 * Sets up the back to top button functionality
 */
function setupBackToTopButton() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (!backToTopBtn) return;
    
    // Show button when scrolled down
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.remove('hidden');
        } else {
            backToTopBtn.classList.add('hidden');
        }
    });
    
    // Scroll to top when clicked
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/**
 * Updates all sidebar components AFTER content is rendered by Marked.js
 * @param {Object} content - Original content object (for non-DOM related data)
 */
function updateSidebarAfterRender(content) {
    updateTableOfContentsAfterRender(); // Needs to run after DOM is updated
    updateReadingStats(content); // Uses data from content object
    updateKeyTakeaways(content); // Uses data from content object
}

/**
 * Updates the table of contents based on headings rendered by Marked.js
 */
function updateTableOfContentsAfterRender() {
    const tocList = document.getElementById('tocList');
    if (!tocList) return;
    
    // Clear existing TOC
    tocList.innerHTML = '';
    
    // Find all headers in the processed content
    const contentContainer = document.getElementById('contentContainer');
    if (!contentContainer) return;
    
    // Include h3 elements (section headers) in the table of contents
    const headers = contentContainer.querySelectorAll('h1, h2, h3');
    if (headers.length === 0) {
        // If no headers, show a message
        tocList.innerHTML = '<li class="text-gray-500 italic text-sm p-2">No sections available</li>';
        return;
    }
    
    // Create TOC entries
    headers.forEach((header) => {
        // If header doesn't have an ID, generate one
        if (!header.id) {
            header.id = header.textContent.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        }
        
        const tocItem = document.createElement('li');
        const level = parseInt(header.tagName.substring(1)) - 1; // H1 = 0, H2 = 1, H3 = 2
        
        tocItem.innerHTML = `
            <a href="#${header.id}" class="toc-item level-${level} ${level > 0 ? `ml-${level * 2}` : ''} block py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2">
                ${header.textContent}
            </a>
        `;
        tocList.appendChild(tocItem);
    });
    
    // Add scroll highlighting for active section
    if (headers.length > 0) {
        setupTocHighlighting(headers);
    }
}

/**
 * Sets up highlighting for the active section in the table of contents
 * @param {NodeList} headers - List of header elements
 */
function setupTocHighlighting(headers) {
    if (headers.length === 0) return;
    
    // Convert NodeList to Array for easier manipulation
    const headerElements = Array.from(headers);
    
    // Get all TOC links
    const tocLinks = document.querySelectorAll('#tocList a');
    
    // Add scroll event listener
    window.addEventListener('scroll', () => {
        // Find the current active header based on scroll position
        const scrollPosition = window.scrollY + 100; // Add offset for better UX
        
        // Find the current section
        let currentSection = headerElements[0];
        
        for (const header of headerElements) {
            if (header.offsetTop <= scrollPosition) {
                currentSection = header;
            } else {
                break;
            }
        }
        
        // Remove active class from all links
        tocLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current section link
        if (currentSection && currentSection.id) {
            const activeLink = document.querySelector(`#tocList a[href="#${currentSection.id}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    });
}

/**
 * Updates reading stats in the sidebar
 * @param {Object} content - Content object
 */
function updateReadingStats(content) {
    // Update reading time
    const readingTimeValue = document.getElementById('readingTimeValue');
    if (readingTimeValue && content.readingTime) {
        readingTimeValue.textContent = `${Math.round(content.readingTime)} min`;
    } else if (readingTimeValue) {
        readingTimeValue.textContent = 'N/A';
    }
    
    // Update word count
    const wordCountValue = document.getElementById('wordCountValue');
    if (wordCountValue) {
        if (content.wordCount) {
            wordCountValue.textContent = content.wordCount;
        } else if (content.summary || content.markdown) {
            // Estimate word count from content
            const text = content.markdown || content.summary || '';
            const wordCount = text.split(/\s+/).length;
            wordCountValue.textContent = wordCount;
        } else {
            wordCountValue.textContent = '0';
        }
    }
}

/**
 * Updates the key takeaways section in the sidebar
 * @param {Object} content - Content object
 */
function updateKeyTakeaways(content) {
    const keyTakeawaysList = document.getElementById('mainKeyTakeawaysList');
    if (!keyTakeawaysList) return;
    
    // Clear existing takeaways
    keyTakeawaysList.innerHTML = '';
    
    // Check if keyPoints exists and is a non-empty array
    const keyPoints = content?.keyPoints;
    const hasKeyPoints = Array.isArray(keyPoints) && keyPoints.length > 0;

    if (hasKeyPoints) {
        keyPoints.forEach(point => {
            const item = document.createElement('li');
            // Use Tailwind classes for styling each item
            item.className = 'flex items-start space-x-2 p-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
            
            // Add an SVG icon (e.g., checkmark or bullet)
            item.innerHTML = `
                <svg class="flex-shrink-0 w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>${escapeHtml(point)}</span>
            `;
            keyTakeawaysList.appendChild(item);
        });
    } else {
        // Fallback message if no key points
        const item = document.createElement('li');
        item.className = 'text-gray-500 dark:text-gray-400 italic text-sm px-2 py-2';
        item.textContent = 'No key points available';
        keyTakeawaysList.appendChild(item);
    }
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

/**
 * Renders markdown content to HTML using a simplified custom parser
 * @param {string} markdown - Markdown content to render
 * @returns {string} - HTML result
 */
export function renderMarkdown(markdown) {
    if (!markdown) {
        console.warn('[WARN] Empty markdown provided to renderMarkdown');
        return '';
    }

    // Pre-process: Ensure markdown headings are treated as separate blocks
    // Replace single newline after a heading line with a double newline
    const processedMarkdown = markdown.replace(/^(\#{1,6}\s+.*?)\n(?!\n)/gm, '$1\n\n'); 

    // Split markdown into sections by DOUBLE newline
    const sections = processedMarkdown.split('\n\n');
    
    // Process each section
    let processedSections = [];
    
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (!section) continue;
        
        // Process each non-empty section using the existing logic
        processedSections.push(processSpecialSection(section));
    }
    
    // Join processed sections with an empty string
    return processedSections.join('');
}

// Keep generateHeadingId, processMarkdownInline, processSpecialSection as they were defined before Marked.js attempt
// (Including the list handling we added earlier)
function generateHeadingId(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
}

function processMarkdownInline(text) {
    // Handle bold text (**text**)
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');
    return text;
}

function processSpecialSection(section) {
    // Handle standard markdown headers
    if (section.startsWith('# ')) {
        const headerText = section.substring(2).trim();
        const headerId = generateHeadingId(headerText);
        return `<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-6" id="${headerId}">${processMarkdownInline(headerText)}</h1>`;
    }
    if (section.startsWith('## ')) {
        const headerText = section.substring(3).trim();
        const headerId = generateHeadingId(headerText);
        return `<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-6 mb-4" id="${headerId}">${processMarkdownInline(headerText)}</h2>`;
    }
    if (section.startsWith('### ')) {
        const headerText = section.substring(4).trim();
        const headerId = generateHeadingId(headerText);
        return `<h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 mt-5 mb-4" id="${headerId}">${processMarkdownInline(headerText)}</h3>`;
    }
    // Handle simple unordered lists (split by lines within the section)
    const lines = section.split('\n');
    const isUnorderedList = lines.every(line => line.trim().startsWith('* ') || line.trim().startsWith('- '));
    if (isUnorderedList && lines.length > 0) {
        let listHtml = '<ul class="list-disc list-inside space-y-2 my-4">';
        lines.forEach(line => {
            const itemText = line.trim().substring(2).trim();
            if (itemText) {
                listHtml += `<li class="text-gray-700 dark:text-gray-300">${processMarkdownInline(itemText)}</li>`;
            }
        });
        listHtml += '</ul>';
        return listHtml;
    }
    // Default: Treat as a paragraph
    return `<p class="text-gray-700 dark:text-gray-300 my-4">${processMarkdownInline(section)}</p>`;
} 