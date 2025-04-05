/**
 * Main entry point for the result page
 */

import { storageManager } from '../../utils/storage.js';
import { showError } from './ui.js';
import { waitForBackgroundReady, registerWithBackgroundScript, setupProcessingMessageListener, updateProcessingStatus } from './processing.js';

document.addEventListener('DOMContentLoaded', async function() {
    await initializeResultPage();
    setupNavigationHandlers();
});

function setupNavigationHandlers() {
    // Back button handler
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }

    // Enhanced Source link handler with proper URL validation and target
    const sourceUrl = document.getElementById('sourceUrl');
    if (sourceUrl) {
        // Use the tab's target URL from session storage
        const targetUrl = sessionStorage.getItem('targetUrl');
        if (targetUrl && isValidUrl(targetUrl)) {
            sourceUrl.href = targetUrl;
            sourceUrl.setAttribute('target', '_blank');
            sourceUrl.setAttribute('rel', 'noopener noreferrer');
            console.log('[DEBUG] Source URL set to:', targetUrl);
        } else {
            // Fall back to storage if not in session storage
            chrome.storage.local.get(['currentUrl'], function(result) {
                if (result.currentUrl && isValidUrl(result.currentUrl)) {
                    sourceUrl.href = result.currentUrl;
                    sourceUrl.setAttribute('target', '_blank');
                    sourceUrl.setAttribute('rel', 'noopener noreferrer');
                } else {
                    // Hide the source link if no valid URL is found
                    sourceUrl.parentElement.style.display = 'none';
                }
            });
        }
    }
}

// Helper function to validate URLs
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return ['http:', 'https:'].includes(url.protocol);
    } catch (_) {
        return false;
    }
}

async function initializeResultPage() {
    try {
        console.log('[DEBUG] Result page initializing...');
        
        // Extract and store the target URL for this tab
        const urlParams = new URLSearchParams(window.location.search);
        const targetUrl = urlParams.get('url');
        if (targetUrl) {
            sessionStorage.setItem('targetUrl', targetUrl);
            console.log('[DEBUG] Tab initialized for URL:', targetUrl);
        } else {
            console.warn('[WARN] No target URL specified for this tab');
        }
        
        // Wait for background script to be ready
        await waitForBackgroundReady();
        console.log('[DEBUG] Background script ready, continuing initialization...');
        
        // Register with background script and setup listeners
        registerWithBackgroundScript();
        setupProcessingMessageListener();

        // Check for active processing state
        const processingState = await storageManager.getProcessingState();
        if (processingState) {
            console.log('[DEBUG] Found existing processing state:', {
                stage: processingState.stage,
                progress: processingState.progress,
                status: processingState.statusText
            });
            updateProcessingStatus(processingState);
        }
    } catch (error) {
        console.error('[ERROR] Failed to initialize result page:', error);
        showError('Failed to load content. Please try reloading the page.');
    }
} 