/**
 * Background script for Page Processor extension
 * Handles installation events and background tasks
 */

// Store content temporarily
let extractedContent = {};

// Keep track of processing state
let processingState = null;

// Listen for installation event
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        // Open a welcome page when first installed
        chrome.tabs.create({
            url: 'https://github.com/yourusername/page-processor'
        });
    }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'ping_backend') {
        // Ping the backend to check if it's running
        fetch('http://localhost:5001/api/ping')
            .then(response => response.json())
            .then(data => {
                sendResponse({ status: 'connected', data: data });
            })
            .catch(error => {
                sendResponse({ status: 'disconnected', error: error.message });
            });
        return true; // Keep the message channel open for async response
    }
    
    if (message.type === 'start_processing') {
        // Save the processing state
        processingState = {
            mode: message.mode,
            tabId: message.tabId,
            title: message.title,
            url: message.url,
            stage: 'started',
            startTime: new Date().getTime()
        };
        
        // Acknowledge receipt
        sendResponse({ status: 'processing_started', state: processingState });
        return true;
    }
    
    if (message.type === 'update_processing') {
        // Update the processing state
        if (processingState) {
            processingState.stage = message.stage;
            processingState.progress = message.progress;
            processingState.statusText = message.statusText;
        }
        
        // Acknowledge receipt
        sendResponse({ status: 'processing_updated', state: processingState });
        return true;
    }
    
    if (message.type === 'get_processing_state') {
        // Return the current processing state
        sendResponse({ 
            status: processingState ? 'processing' : 'idle',
            state: processingState
        });
        return true;
    }
    
    if (message.type === 'end_processing') {
        // Clear the processing state
        const oldState = processingState;
        processingState = null;
        
        // Acknowledge receipt
        sendResponse({ 
            status: 'processing_ended', 
            previousState: oldState
        });
        return true;
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'setPageContent') {
        // Store content for the new tab
        extractedContent[message.tabId] = {
            content: message.content,
            summarize: message.summarize
        };
    }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if our newtab page is fully loaded
    if (
        changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes(chrome.runtime.getURL('newtab/newtab.html')) && 
        extractedContent[tabId]
    ) {
        // Send content to the new tab page
        chrome.tabs.sendMessage(tabId, {
            action: 'displayContent',
            content: extractedContent[tabId].content,
            summarize: extractedContent[tabId].summarize
        });
        
        // Clean up
        delete extractedContent[tabId];
    }
});

// Check for interrupted processing when popup reopens
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "popup") {
        // The popup has connected
        port.onDisconnect.addListener(function() {
            // The popup has closed, but processing might still be happening
            // State will be preserved in processingState
        });
        
        // Send current state to popup if processing is happening
        if (processingState) {
            port.postMessage({
                type: 'processing_state_update',
                state: processingState
            });
        }
    }
}); 