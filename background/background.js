import { storageManager } from '../utils/storage.js';
import { apiClient } from '../utils/api.js';
import { ProcessingQueue } from './processing/queue.js';
import { ProcessingState } from './processing/state.js';
import { MessageHandler } from './processing/handler.js';

/**
 * Background script for Page Processor extension
 * Handles state management and coordinates between components
 */

// Initialize components
const stateManager = new ProcessingState();
const queue = new ProcessingQueue(apiClient, stateManager);
const messageHandler = new MessageHandler(queue, stateManager);

// Track open result tabs
let resultTabs = [];

console.log('DEBUG: Background script loaded');

// Register message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    messageHandler.handleMessage(message, sender)
        .then(response => sendResponse(response))
        .catch(error => {
            console.error('[ERROR] Message handling failed:', error);
            sendResponse({ error: error.message });
        });
    return true; // Keep message channel open
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('pages/result.html')) {
        console.log('Result page loaded:', tabId);
        resultTabs.push(tabId);
    }
});

// Remove tabs from tracking when closed
chrome.tabs.onRemoved.addListener(function(tabId) {
    const initialLength = resultTabs.length;
    resultTabs = resultTabs.filter(id => id !== tabId);
    if (resultTabs.length < initialLength) {
        console.log('[DEBUG] Result tab removed:', tabId, 'Current tabs:', resultTabs);
    }
});

// Reset state on extension startup
chrome.runtime.onStartup.addListener(async function() {
    await resetProcessingState();
});

// Reset state on extension installation/update
chrome.runtime.onInstalled.addListener(async function() {
    await resetProcessingState();
});

async function resetProcessingState() {
    stateManager.clear();
    queue.clear();
    await storageManager.clearProcessingState();
}

// Helper function to send message to a specific tab
function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, response => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}

// Helper function to broadcast to all result tabs
function broadcastToResultTabs(message) {
    resultTabs.forEach(tabId => {
        sendMessageToTab(tabId, message)
            .catch(error => {
                console.error('[ERROR] Failed to send message to tab:', tabId, error);
            });
    });
}

// Add state observer to handle storage updates
stateManager.addObserver(async (state) => {
    if (state) {
        try {
            // Perform all state-related operations as a transaction
            // This helps prevent race conditions with partial state updates
            
            // 1. Update persistent storage first
            await storageManager.setProcessingState(state);
            
            // 2. Store processed content if available
            if (state.stage === 'completed' && state.processedContent) {
                console.log('[DEBUG] Storing processed content for URL:', state.url);
                try {
                    await storageManager.storeContent(state.processedContent);
                } catch (contentError) {
                    console.error('[ERROR] Failed to store content:', contentError);
                    // Continue with broadcast even if content storage fails
                }
            }
            
            // 3. Broadcast updates to result tabs
            // Use a copy of the state to avoid race conditions with modifications
            const stateCopy = JSON.parse(JSON.stringify(state));
            broadcastToResultTabs({
                type: 'processing_update',
                state: stateCopy
            });
            
            console.log('[DEBUG] State update successfully processed');
        } catch (error) {
            console.error('[ERROR] Failed to process state update:', error);
        }
    } else {
        // Clear state
        try {
            await storageManager.clearProcessingState();
        } catch (error) {
            console.error('[ERROR] Failed to clear processing state:', error);
        }
    }
});

// Add helper function for estimating reading time if needed
function estimateReadingTime(text) {
    if (!text) return 1;
    const wordCount = text.split(/\s+/).length;
    // Average reading speed: 200-250 words per minute
    const minutes = Math.max(1, Math.round(wordCount / 225));
    return minutes;
}