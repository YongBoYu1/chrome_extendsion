/**
 * Content handling and rendering for the result page
 */

import { storageManager } from '../../utils/storage.js';
import { escapeHtml, formatReadingTime, showError, hideError, setUIState, UIState } from './ui.js';

/**
 * Renders markdown content to HTML
 * @param {string} markdown - Markdown content to render
 * @returns {string} - HTML result
 */
export function renderMarkdown(markdown) {
    if (!markdown) {
        console.warn('[WARN] Empty markdown provided to renderMarkdown');
        return '';
    }

    // Split markdown into sections
    const sections = markdown.split('\n\n');
    
    // Process each section
    let processedSections = [];
    
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        if (!section) continue;
        
        // Normal section processing
        processedSections.push(processSpecialSection(section));
    }
    
    return processedSections.join('\n');
}

/**
 * Generates a valid ID from heading text for anchor links
 * @param {string} text - Heading text
 * @returns {string} Valid ID for HTML
 */
function generateHeadingId(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
}

/**
 * Processes inline markdown formatting
 * @param {string} text - Raw text with markdown formatting
 * @returns {string} HTML with formatting applied
 */
function processMarkdownInline(text) {
    // Handle bold text (**text**)
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text (*text*)
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Handle links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');
    
    return text;
}

/**
 * Processes special sections with specific formatting - SIMPLIFIED
 * @param {string} section - The section to process
 * @returns {string} - Processed section HTML
 */
function processSpecialSection(section) {
    // Handle standard markdown headers ONLY for structural headings
    if (section.startsWith('# ')) {
        const headerText = section.substring(2).trim();
        const headerId = generateHeadingId(headerText);
        return `<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-6" id="${headerId}">${headerText}</h1>`;
    }
    
    if (section.startsWith('## ')) {
        const headerText = section.substring(3).trim();
        const headerId = generateHeadingId(headerText);
        return `<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-6 mb-4" id="${headerId}">${headerText}</h2>`;
    }
    
    if (section.startsWith('### ')) {
        const headerText = section.substring(4).trim();
        const headerId = generateHeadingId(headerText);
        return `<h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 mt-5 mb-4" id="${headerId}">${headerText}</h3>`;
    }
    
    // Default: Treat EVERYTHING else as a paragraph.
    // Inline formatting (like **bold**) will be handled by processMarkdownInline.
    return `<p class="text-gray-700 dark:text-gray-300 my-4">${processMarkdownInline(section)}</p>`;
}

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
    contentWrapper.className = 'prose dark:prose-invert';

    // Handle different content formats
    let processedContent = '';
    let markdownToRender = content.markdown; // Start with original markdown

    // --- Check for and remove duplicate H1 from markdown --- 
    if (content.title && markdownToRender) {
        const lines = markdownToRender.trim().split('\n');
        if (lines.length > 0) {
            const firstLine = lines[0].trim();
            if (firstLine.startsWith('# ')) {
                const h1Text = firstLine.substring(2).trim();
                // Compare titles case-insensitively
                if (h1Text.toLowerCase() === content.title.trim().toLowerCase()) {
                    markdownToRender = lines.slice(1).join('\n'); 
                }
            }
        }
    }
    // --- End of duplicate H1 check ---

    if (markdownToRender) { // Use the potentially modified markdown
        try {
            processedContent = renderMarkdown(markdownToRender);
        } catch (renderError) {
            console.error('[displayProcessedContent] ERROR during renderMarkdown:', renderError);
            processedContent = '<p class="text-red-500">Error rendering Markdown.</p>';
        }
    } else if (content.html) {
        processedContent = content.html;
    } else if (content.summary) {
        processedContent = renderMarkdown(content.summary); // Assuming summary is also markdown
    } else {
        console.warn('[displayProcessedContent] WARN: No content (markdown, html, summary) found to display.');
        processedContent = '<p class="text-gray-600 dark:text-gray-400">No content available</p>';
    }

    contentWrapper.innerHTML = processedContent;
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

    // Update sidebar contents
    updateSidebar(content);

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
 * Updates all sidebar components
 * @param {Object} content - Content object
 */
function updateSidebar(content) {
    // Update the TOC list
    updateTableOfContents();
    
    // Update reading stats
    updateReadingStats(content);
    
    // Update key takeaways
    updateKeyTakeaways(content);
}

/**
 * Updates the table of contents based on headings in the content
 */
function updateTableOfContents() {
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