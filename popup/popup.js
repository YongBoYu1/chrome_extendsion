import { apiClient } from '../utils/api.js';
import { storageManager } from '../utils/storage.js';

/**
 * Popup Controller for Page Processor Extension
 * Handles user interactions in the extension popup
 */

document.addEventListener('DOMContentLoaded', async function() {
    // ---> REMOVED DEBUG LOG
    // console.log('[DEBUG] Initializing popup...');
    
    try {
        // Initialize UI
        initializeUI();
        
        // Setup the summarize button with proper event handling
        setupSummarizeButton();
        
        // Check backend status and connect to background script
        await initializeConnections();
    } catch (error) {
        console.error('[ERROR] Popup initialization failed:', error);
        showError('Failed to initialize. Please try again.');
    }
});

function setupSummarizeButton() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    if (!summarizeBtn) {
        // Check the ID in your popup.html file!
        console.error('[ERROR] Summarize button (summarizeBtn) not found in popup.html!');
        return;
    }

    summarizeBtn.addEventListener('click', async function(event) {
        event.preventDefault();
        // ---> REMOVED DEBUG LOG
        // console.log('[DEBUG] Summarize button clicked.'); 

        try {
            // ---> REMOVED DEBUG LOG
            // console.log('[DEBUG] Getting current tab...'); 
            const currentTab = await getCurrentTab();
            // ---> REMOVED DEBUG LOG
            // console.log('[DEBUG] Current tab:', {
            //     id: currentTab?.id,
            //     url: currentTab?.url,
            //     title: currentTab?.title
            // }); 

            if (!currentTab || !isValidUrl(currentTab.url)) {
                console.error('[ERROR] Invalid tab or URL:', {
                    hasTab: !!currentTab,
                    url: currentTab?.url,
                    isValid: currentTab ? isValidUrl(currentTab.url) : false
                });
                
                // Check specifically for PDF files to show better error message
                if (currentTab && currentTab.url) {
                    const url = new URL(currentTab.url);
                    const pathname = url.pathname.toLowerCase();
                    const unsupportedExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
                    
                    if (unsupportedExtensions.some(ext => pathname.endsWith(ext))) {
                        showError('Word, Excel, and PowerPoint files are not currently supported. Please try a regular webpage or PDF.');
                        return;
                    }
                }
                
                showError('Cannot process this type of page');
                return;
            }
            // ---> REMOVED DEBUG LOG
            // console.log('[DEBUG] Tab validation passed, proceeding to initiate processing...'); 

            await initiateProcessing(currentTab);

        } catch (error) {
            console.error('[ERROR] Error within Summarize button click handler:', error);
            showError('Failed to start processing. Check popup console.');
        }
    });
}

async function getCurrentTab() {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    return tabs[0];
}

async function initiateProcessing(tab) {
    const tabInfo = {
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
        timestamp: Date.now(),
        tabCreatedByPopup: true
    };

    try {
        // Then send the start_processing message with all info
        // ---> REMOVED DEBUG LOG
        // console.log('[DEBUG] Sending start_processing message:', {
        //     type: 'start_processing',
        //     mode: 'summarize',
        //     ...tabInfo
        // });
        
        // Send message to background script and wait for response
        const response = await chrome.runtime.sendMessage({
            type: 'start_processing',
            mode: 'summarize',
            ...tabInfo
        });
        // ---> REMOVED DEBUG LOG
        // console.log('[DEBUG] Response from background for start_processing:', response);

        // Only after message is sent and response received, create the result tab
        // ---> REMOVED DEBUG LOG
        // console.log('[DEBUG] Creating result tab...');
        const resultTab = await chrome.tabs.create({
            url: chrome.runtime.getURL(`pages/result.html?url=${encodeURIComponent(tab.url)}`),
            active: true
        });
        // ---> REMOVED DEBUG LOG
        // console.log('[DEBUG] Result tab created:', {
        //     id: resultTab.id,
        //     url: resultTab.url
        // });

        // Update tabInfo with result tab ID
        tabInfo.resultTabId = resultTab.id;

        // Now it's safe to close the popup
        // ---> REMOVED DEBUG LOG
        // console.log('[DEBUG] All messages sent, closing popup window.');
        window.close();

    } catch (error) {
        console.error('[ERROR] Failed during initiateProcessing:', {
            phase: error.message.includes('tabs.create') ? 'tab creation' : 'message sending',
            error: error.message,
            stack: error.stack
        });
        showError('Error initiating process. Check popup console.');
    }
}

async function initializeConnections() {
    // ---> Get status elements
    const statusTextElement = document.getElementById('backendStatus');
    const statusIndicatorElement = document.getElementById('statusIndicator');
    // <--- END Get status elements

    try {
        // Check backend status
        const isBackendAvailable = await checkBackendStatus();

        // ---> Update UI based on status
        if (isBackendAvailable) {
            if (statusTextElement) statusTextElement.textContent = 'Connected';
            if (statusIndicatorElement) {
                statusIndicatorElement.classList.remove('disconnected');
                statusIndicatorElement.classList.add('connected');
            }
            return true; // Indicate success
        } else {
            if (statusTextElement) statusTextElement.textContent = 'Error';
            if (statusIndicatorElement) {
                statusIndicatorElement.classList.remove('connected');
                statusIndicatorElement.classList.add('disconnected');
            }
            showError('Backend service is not available');
            return false; // Indicate failure
        }
        // <--- END Update UI

    } catch (error) {
        console.error('[ERROR] Connection initialization failed:', error);
        // ---> Update UI on generic error
        if (statusTextElement) statusTextElement.textContent = 'Error';
        if (statusIndicatorElement) {
            statusIndicatorElement.classList.remove('connected');
            statusIndicatorElement.classList.add('disconnected');
        }
        // <--- END Update UI
        showError('Failed to initialize connections');
        return false;
    }
}

async function checkBackendStatus() {
    try {
        await apiClient.ping();
        return true;
    } catch (error) {
        // Keep this error log as it indicates a fundamental connectivity issue
        console.error('[ERROR] Backend status check failed:', error);
        return false;
    }
}

function showError(message) {
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function hideError() {
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

function isValidUrl(urlString) {
    try {
        const url = new URL(urlString);
        
        // Check if it's a valid HTTP/HTTPS URL
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return false;
        }
        
        // Now we support PDFs! Only block other document types
        const pathname = url.pathname.toLowerCase();
        const unsupportedExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
        
        if (unsupportedExtensions.some(ext => pathname.endsWith(ext))) {
            return false;
        }
        
        return true;
    } catch {
        return false;
    }
}

function initializeUI() {
    // Hide error message initially
    hideError();
    
    // Setup cancel button if present
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => window.close());
    }
} 