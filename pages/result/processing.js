/**
 * Processing state and updates handling for the result page
 */

import { storageManager } from '../../utils/storage.js';
import { updateProcessingUI, hideProcessingUI, showError } from './ui.js';
import { loadAndDisplayLatestContent } from './content.js';

export function updateProcessingStatus(state) {
    console.log('[DEBUG] Updating processing status:', state);
    
    if (!state) {
        console.error('[ERROR] No state provided to updateProcessingStatus');
        return;
    }

    // Update processing UI
    updateProcessingUI(state);

    // Handle completion or error
    if (state.stage === 'completed') {
        console.log('[DEBUG] Processing completed, loading latest content...');
        hideProcessingUI();
        // Add a small delay to ensure state is fully saved before loading content
        setTimeout(() => {
            loadAndDisplayLatestContent()
                .catch(err => {
                    console.error('[ERROR] Failed to load latest content:', err);
                    showError('Failed to load processed content. Please try refreshing the page.');
                });
        }, 300);
    } else if (state.stage === 'error') {
        console.error('[ERROR] Processing error:', state.statusText);
        showError(state.statusText || 'An error occurred during processing');
    }
}

export function setupProcessingMessageListener() {
    console.log('[DEBUG] Setting up processing message listener...');
    
    // Get the URL this tab is responsible for
    const targetUrl = sessionStorage.getItem('targetUrl');
    console.log('[DEBUG] Setting up listener for URL:', targetUrl);
    
    // Ensure any existing listener is removed first to prevent duplicates
    chrome.runtime.onMessage.removeListener(processMessageHandler);
    chrome.runtime.onMessage.addListener(processMessageHandler);
    
    function processMessageHandler(message, sender, sendResponse) {
        console.log('[DEBUG] Result page received message:', message);
        
        if (message.type === 'processing_update') {
            // If this message is not for our URL, ignore it
            if (targetUrl && message.state && message.state.url !== targetUrl) {
                console.log('[DEBUG] Ignoring update for different URL:', message.state.url);
                sendResponse({ received: true, ignored: true });
                return true;
            }
            
            console.log('[DEBUG] Processing update received:', {
                stage: message.state?.stage,
                progress: message.state?.progress,
                status: message.state?.statusText
            });
            
            if (!message.state) {
                console.error('[ERROR] Processing update missing state object');
                sendResponse({ received: true, error: 'Missing state object' });
                return true;
            }
            
            try {
                updateProcessingStatus(message.state);
                console.log('[DEBUG] Processing status updated successfully');
                
                // If processing is complete but we don't see content yet, try to load it directly
                if (message.state.stage === 'completed') {
                    console.log('[DEBUG] Confirming content is displayed after completion');
                    setTimeout(() => {
                        loadAndDisplayLatestContent()
                            .catch(err => console.error('[ERROR] Fallback content loading failed:', err));
                    }, 500);
                }
            } catch (error) {
                console.error('[ERROR] Failed to update processing status:', error);
                sendResponse({ received: true, error: error.message });
                return true;
            }
        }
        
        // Always send a response
        sendResponse({ received: true });
        return true; // Keep the message channel open for asynchronous response
    }
}

export function registerWithBackgroundScript() {
    console.log('[DEBUG] Registering result page with background script...');
    
    // Get the URL this tab is responsible for
    const targetUrl = sessionStorage.getItem('targetUrl');
    
    chrome.runtime.sendMessage({
        type: 'result_page_ready',
        url: targetUrl // Include the URL this tab is responsible for
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('[ERROR] Failed to register with background script:', chrome.runtime.lastError);
            showError('Failed to connect to extension. Please try reloading the page.');
            return;
        }
        
        if (response && response.acknowledged) {
            console.log('[DEBUG] Successfully registered with background script for URL:', targetUrl);
            
            // Check if processing is already completed for this URL
            storageManager.getProcessingState().then(state => {
                if (state && state.url === targetUrl && state.stage === 'completed') {
                    console.log('[DEBUG] Processing already completed for this URL, loading content...');
                    hideProcessingUI();
                    loadAndDisplayLatestContent();
                }
            }).catch(err => {
                console.error('[ERROR] Failed to check processing state:', err);
            });
        }
    });
}

export function waitForBackgroundReady() {
    return new Promise((resolve) => {
        function checkReady() {
            chrome.runtime.sendMessage({ type: 'ping' }, response => {
                if (chrome.runtime.lastError) {
                    setTimeout(checkReady, 50); // Retry if error
                    return;
                }
                if (response && response.ready) {
                    resolve();
                } else {
                    setTimeout(checkReady, 50); // Retry if not ready
                }
            });
        }
        checkReady();
    });
} 