/**
 * Page Processor Extension - Result Page Handler
 * 
 * Handles the display of processed content in the result page.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Clear any processing state when result page loads
    clearProcessingState();
    
    // Load processed content from storage
    chrome.storage.local.get('processedContent', function(data) {
        if (data.processedContent) {
            displayProcessedContent(data.processedContent);
        } else {
            showError('No processed content available');
        }
    });

    // Add event listeners
    document.getElementById('backBtn').addEventListener('click', function() {
        window.close();
    });
});

/**
 * Clear any processing state when result page loads successfully
 */
function clearProcessingState() {
    // Clear the processing state in the background script
    chrome.runtime.sendMessage({ type: 'end_processing' });
    
    // Clear the processing info in local storage
    chrome.storage.local.remove('processingInfo');
}

/**
 * Extract and properly display raw HTML without escaping
 */
function sanitizeAndDisplayHTML(html) {
    // Create a temporary div to parse and sanitize the HTML
    const tempDiv = document.createElement('div');
    
    try {
        // First, check if the HTML is escaped (contains &lt; instead of <)
        if (html.includes('&lt;') && html.includes('&gt;')) {
            // Unescape the HTML first
            const unescaped = html
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&');
            tempDiv.innerHTML = unescaped;
        } else {
            // Use the HTML as is
            tempDiv.innerHTML = html;
        }
        
        // Get the sanitized HTML
        return tempDiv.innerHTML;
    } catch (e) {
        console.error('Error sanitizing HTML:', e);
        // Fall back to a basic content display
        return `<p>${html}</p>`;
    }
}

/**
 * Display processed content in the result page
 */
function displayProcessedContent(data) {
    // Set page title
    document.title = `${data.title} - Page Processor`;
    
    // Update UI elements
    document.getElementById('pageTitle').textContent = data.title;
    document.getElementById('sourceUrl').textContent = data.sourceUrl;
    document.getElementById('sourceUrl').href = data.sourceUrl;
    
    // Add appropriate mode class to body
    document.body.classList.add(`mode-${data.mode}`);
    
    // Set mode label
    const modeLabel = document.getElementById('modeLabel');
    switch (data.mode) {
        case 'summarize':
            modeLabel.textContent = 'AI Summary';
            modeLabel.classList.add('ai-badge');
            break;
        case 'focus':
            modeLabel.textContent = 'Focus View';
            break;
        case 'duplicate':
            modeLabel.textContent = 'Clean View';
            break;
        default:
            modeLabel.textContent = data.mode;
    }
    
    // Display the processed content
    const contentContainer = document.getElementById('contentContainer');
    
    // Clean handling of different content types
    if (data.mode === 'summarize') {
        let summaryContent = '';
        
        // Check what type of content we're dealing with
        if (typeof data.content !== 'string') {
            // Handle non-string content
            summaryContent = `<div class="summary-container"><p>Invalid content format</p></div>`;
        } else if (data.content.includes('<div class="summary-container">') || data.content.includes('<div class=\'summary-container\'>')) {
            // The content is already wrapped in a summary container - use sanitizer to display properly
            summaryContent = sanitizeAndDisplayHTML(data.content);
        } else if (data.content.startsWith('<') && data.content.includes('</')) {
            // Looks like HTML - wrap it in a summary container
            summaryContent = `<div class="summary-container">${sanitizeAndDisplayHTML(data.content)}</div>`;
        } else if (data.content.includes('**') || data.content.includes('##') || data.content.includes('*')) {
            // Contains markdown - use our enhanced formatter
            summaryContent = `<div class="summary-container">${enhancedFormatMarkdown(data.content)}</div>`;
        } else {
            // Plain text - format as paragraphs
            const formatted = data.content
                .split('\n\n')
                .map(para => para.trim() ? `<p>${para.replace(/\n/g, '<br>')}</p>` : '')
                .join('');
            summaryContent = `<div class="summary-container">${formatted}</div>`;
        }
        
        // Set the content
        contentContainer.innerHTML = summaryContent;
        
        // Add special styling for AI summaries
        styleSummary();
    } else {
        // For other modes, we might need to handle HTML content
        if (data.content.startsWith('<')) {
            // Looks like HTML
            contentContainer.innerHTML = sanitizeAndDisplayHTML(data.content);
        } else {
            // Plain text or markdown
            contentContainer.innerHTML = `<div class="text-content">${formatTextContent(data.content)}</div>`;
        }
    }
    
    // Fix any display issues with raw HTML tags that may still be visible
    fixVisibleHTMLTags();
    
    // Show the result container
    document.getElementById('resultContainer').style.display = 'block';
}

/**
 * Find and fix any visible HTML tags that weren't properly rendered
 */
function fixVisibleHTMLTags() {
    // Get all text nodes in the content container
    const contentContainer = document.getElementById('contentContainer');
    const walker = document.createTreeWalker(
        contentContainer,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    // Collect nodes that need replacement
    const nodesToReplace = [];
    while (walker.nextNode()) {
        const node = walker.currentNode;
        // Check if the text contains HTML tags
        if (/<\/?[a-z][\s\S]*>/i.test(node.nodeValue)) {
            nodesToReplace.push(node);
        }
    }
    
    // Replace the nodes with properly parsed HTML
    nodesToReplace.forEach(node => {
        // Create a temporary element
        const temp = document.createElement('div');
        // Set its HTML to the node's text
        temp.innerHTML = node.nodeValue;
        // Replace the text node with the parsed content
        const fragment = document.createDocumentFragment();
        while (temp.firstChild) {
            fragment.appendChild(temp.firstChild);
        }
        node.parentNode.replaceChild(fragment, node);
    });
}

/**
 * Format text content for display
 */
function formatTextContent(text) {
    // Check if it's markdown
    if (text.includes('#') || text.includes('*') || text.includes('```')) {
        return enhancedFormatMarkdown(text);
    }
    
    // Simple text formatting
    return text
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Enhanced markdown formatting with better handling of nested elements
 */
function enhancedFormatMarkdown(markdown) {
    // First, escape any HTML in the content
    let formatted = markdown
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Process code blocks first to prevent formatting inside them
    const codeBlocks = [];
    formatted = formatted.replace(/```([\s\S]*?)```/g, function(match, code) {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`<pre><code>${code}</code></pre>`);
        return placeholder;
    });

    // Handle complex patterns like "* **Meet the Models:**" with asterisks at start
    formatted = formatted.replace(/^\s*[\*•]\s*\*\*([^:*]+?)(\*\*|:)?\s*$/gm, '<h3 class="content-section">$1</h3>');
    
    // Handle common patterns like "* **Section Name:**" 
    formatted = formatted.replace(/^\s*[\*•]\s*\*\*([^*]+?):\*\*\s*$/gm, '<h3 class="content-section">$1</h3>');
    
    // Handle lines starting with numbered section headings (N. Section Name:)
    formatted = formatted.replace(/^\s*(\d+)\.\s+([A-Z][^:]+):?\s*$/gm, '<h2 class="numbered-section"><span class="section-number">$1.</span> $2</h2>');
    
    // Process headings - special handling for #, ##, ###, etc.
    formatted = formatted
        .replace(/^#{6}\s+(.*)$/gm, '<h6>$1</h6>')
        .replace(/^#{5}\s+(.*)$/gm, '<h5>$1</h5>')
        .replace(/^#{4}\s+(.*)$/gm, '<h4>$1</h4>')
        .replace(/^#{3}\s+(.*)$/gm, '<h3>$1</h3>')
        .replace(/^#{2}\s+(.*)$/gm, '<h2>$1</h2>')
        .replace(/^#{1}\s+(.*)$/gm, '<h1>$1</h1>');

    // Catch any remaining Section headers with **Section Name** or **Section Name:** pattern
    formatted = formatted.replace(/^\s*\*\*([^:*]+?)(\*\*|:)?\s*$/gm, '<h3 class="content-section">$1</h3>');
    
    // Handle bullet points with * (must come after section headers)
    formatted = formatted.replace(/^\s*[\*•]\s+(?!\*\*)(.+)$/gm, '<li>$1</li>');
    
    // Process bold and italic (better handling)
    formatted = formatted
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>') // Bold + italic
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
    
    // Process lists more robustly
    formatted = formatted
        .replace(/^[\s]*[-+]\s+(.*?)$/gm, '<li>$1</li>') // Handle hyphen and plus list markers
        .replace(/^\d+\.[\s]+(.*?)$/gm, '<li>$1</li>'); // Numbered lists
    
    // Group list items
    formatted = formatted.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)+/gs, function(match) {
        if (match.includes('1.') || match.includes('2.')) {
            return `<ol class="content-list">${match}</ol>`;
        } else {
            return `<ul class="content-list">${match}</ul>`;
        }
    });
    
    // Process links
    formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="content-link">$1</a>');
    
    // Replace code block placeholders
    codeBlocks.forEach((block, index) => {
        formatted = formatted.replace(`__CODE_BLOCK_${index}__`, block);
    });
    
    // Process paragraphs (after all other processing)
    const paragraphs = formatted.split(/\n\n+/);
    formatted = paragraphs
        .map(p => {
            // Skip wrapping if it's already a block element
            if (p.trim().startsWith('<h') || 
                p.trim().startsWith('<ul') || 
                p.trim().startsWith('<ol') || 
                p.trim().startsWith('<pre') || 
                p.trim().startsWith('<div') || 
                p.trim().startsWith('<p') ||
                p.trim().startsWith('<li')) {
                return p;
            }
            return `<p>${p}</p>`;
        })
        .join('\n\n');
    
    // Replace single newlines with <br> tags, but not inside pre/code or lists
    formatted = formatted.replace(/([^>])\n([^<])/g, '$1<br>$2');
    
    // Final cleanup - remove any remaining asterisks that somehow survived
    formatted = formatted.replace(/\*\s+/g, '');
    
    return formatted;
}

/**
 * Apply special styling to AI summaries
 */
function styleSummary() {
    // Add special styling for key points
    const keyPoints = document.querySelectorAll('ul li, ol li');
    keyPoints.forEach(point => {
        point.classList.add('key-point');
    });
    
    // Add styling for headings in summary
    const summaryHeadings = document.querySelectorAll('#contentContainer h1, #contentContainer h2, #contentContainer h3, #contentContainer h4, #contentContainer h5, #contentContainer h6');
    summaryHeadings.forEach(heading => {
        heading.classList.add('summary-heading');
    });
    
    // Remove any unwanted background colors
    const elementsWithBackground = document.querySelectorAll('.summary-container *');
    elementsWithBackground.forEach(element => {
        if (window.getComputedStyle(element).backgroundColor !== 'transparent' && 
            window.getComputedStyle(element).backgroundColor !== 'rgba(0, 0, 0, 0)') {
            element.style.backgroundColor = 'transparent';
        }
    });
    
    // Format dates and versions in documentation content
    const dateRegex = /(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\w*)?(?:\s+\d{4})?)/g;
    const versionRegex = /(Patch \d+\.\d+(?:\.\d+)?)|(\d+\.\d+(?:\.\d+)? patch)|(v\d+\.\d+(?:\.\d+)?)/gi;
    
    // Process all text nodes to highlight key terms
    processTextNodes(document.querySelector('.content-container'), (node) => {
        // Skip if already inside special elements
        if (isInsideSpecialElement(node)) return node.textContent;
        
        let text = node.textContent;
        
        // Highlight dates
        text = text.replace(dateRegex, '<span class="date-info">$1</span>');
        
        // Highlight versions
        text = text.replace(versionRegex, '<span class="version-info">$1$2$3</span>');
        
        // Remove any leftover asterisks
        text = text.replace(/\*/g, '');
        
        return text;
    });
    
    // Fix any additional issues with asterisks that might still be present
    const textNodes = document.querySelectorAll('.summary-container *');
    textNodes.forEach(node => {
        if (node.textContent.includes('*')) {
            node.textContent = node.textContent.replace(/\*/g, '');
        }
    });
    
    // Improve code blocks styling
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
        block.classList.add('code-block');
    });
}

/**
 * Process all text nodes in an element and apply a transformation function
 */
function processTextNodes(element, transformFn) {
    if (!element) return;
    
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const nodesToReplace = [];
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeValue.trim()) {
            const newText = transformFn(node);
            if (newText !== node.nodeValue) {
                nodesToReplace.push({ node, newText });
            }
        }
    }
    
    nodesToReplace.forEach(({ node, newText }) => {
        const temp = document.createElement('span');
        temp.innerHTML = newText;
        
        const fragment = document.createDocumentFragment();
        while (temp.firstChild) {
            fragment.appendChild(temp.firstChild);
        }
        
        node.parentNode.replaceChild(fragment, node);
    });
}

/**
 * Check if node is inside a special element that shouldn't be processed
 */
function isInsideSpecialElement(node) {
    let parent = node.parentElement;
    while (parent) {
        if (parent.tagName === 'CODE' || 
            parent.tagName === 'PRE' || 
            parent.tagName === 'SCRIPT' || 
            parent.tagName === 'STYLE' ||
            parent.classList.contains('date-info') ||
            parent.classList.contains('version-info') ||
            parent.classList.contains('mechanic-name') ||
            parent.classList.contains('trait-name')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}

/**
 * Show an error message
 */
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    document.getElementById('resultContainer').style.display = 'none';
} 