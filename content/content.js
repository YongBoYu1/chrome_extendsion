/**
 * Content script for Page Processor extension
 * Handles retrieving content from the current page
 */

console.log("Content script loaded");

// Listen for messages from the extension
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Handle content extraction request
    if (request.action === 'extract_content') {
        try {
            const pageContent = {
                url: window.location.href,
                title: document.title,
                content: document.documentElement.outerHTML,
                plainText: document.body.innerText
            };
            
            sendResponse({
                success: true,
                data: pageContent
            });
        } catch (error) {
            sendResponse({
                success: false,
                error: error.message
            });
        }
        return true;
    }
}); 