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
        loadAndDisplayLatestContent();
    } else if (state.stage === 'error') {
        console.error('[ERROR] Processing error:', state.statusText);
        showError(state.statusText || 'An error occurred during processing');
    }
}

export function setupProcessingMessageListener() {
    console.log('[DEBUG] Setting up processing message listener...');
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('[DEBUG] Result page received message:', message);
        
        if (message.type === 'processing_update') {
            console.log('[DEBUG] Processing update received:', {
                stage: message.state?.stage,
                progress: message.state?.progress,
                status: message.state?.statusText
            });
            
            if (!message.state) {
                console.error('[ERROR] Processing update missing state object');
                return;
            }
            
            try {
                updateProcessingStatus(message.state);
                console.log('[DEBUG] Processing status updated successfully');
            } catch (error) {
                console.error('[ERROR] Failed to update processing status:', error);
            }
        }
        
        // Always send a response
        sendResponse({ received: true });
    });
}

export function registerWithBackgroundScript() {
    console.log('[DEBUG] Registering result page with background script...');
    
    chrome.runtime.sendMessage({
        type: 'result_page_ready'
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('[ERROR] Failed to register with background script:', chrome.runtime.lastError);
            showError('Failed to connect to extension. Please try reloading the page.');
            return;
        }
        
        if (response && response.acknowledged) {
            console.log('[DEBUG] Successfully registered with background script');
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