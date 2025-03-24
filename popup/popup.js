/**
 * Popup Controller for Page Processor Extension
 * Handles user interactions in the extension popup and communicates with the Python backend
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI
    initializeUI();
    
    // Check backend status
    checkBackendStatus();
    
    // Connect to background script for state management
    connectToBackgroundScript();
    
    // Check for existing processing
    checkForExistingProcessing();
    
    // Add event listeners
    document.getElementById('summarizeBtn').addEventListener('click', function() {
        startProgressiveLoading('summarize');
    });
    
    document.getElementById('focusBtn').addEventListener('click', function() {
        processActiveTab('focus');
    });
    
    document.getElementById('duplicateBtn').addEventListener('click', function() {
        duplicateContent();
    });
    
    // Cancel button for progressive loading
    document.getElementById('cancelBtn').addEventListener('click', function() {
        resetUI();
    });
});

/**
 * Initialize UI elements
 */
function initializeUI() {
    // Update UI to emphasize summarize feature
    const summarizeBtn = document.getElementById('summarizeBtn');
    if (summarizeBtn) {
        summarizeBtn.classList.add('primary-action');
        summarizeBtn.innerHTML = '<span class="highlight">AI Summarize</span>';
        
        // Add tooltip
        summarizeBtn.setAttribute('title', 'Use AI to create a smart summary of the page content');
    }
    
    // Set initial status
    showStatus('Checking backend status...', 'info');
}

/**
 * Start progressive loading process for active tab
 */
function startProgressiveLoading(mode) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        if (isValidUrl(currentTab.url)) {
            // Show loading UI
            showLoadingUI(mode, currentTab.title);
            
            // Notify background script about starting the process
            chrome.runtime.sendMessage({
                type: 'start_processing',
                mode: mode,
                tabId: currentTab.id,
                title: currentTab.title,
                url: currentTab.url
            });
            
            // Start extraction process
            updateProgressStep('extract', 'active');
            extractPageContentProgressively(currentTab, mode);
        } else {
            showError(`Cannot process this type of page: ${currentTab.url}`);
        }
    });
}

/**
 * Show the loading UI and hide action buttons
 */
function showLoadingUI(mode, title) {
    // Hide action buttons
    document.getElementById('actionsContainer').style.display = 'none';
    
    // Show loading container
    document.getElementById('loadingContainer').style.display = 'block';
    
    // Set title based on mode
    const loadingTitle = document.getElementById('loadingTitle');
    switch(mode) {
        case 'summarize':
            loadingTitle.textContent = `Summarizing: ${title.substring(0, 25)}${title.length > 25 ? '...' : ''}`;
            break;
        case 'focus':
            loadingTitle.textContent = `Creating Focus View: ${title.substring(0, 20)}${title.length > 20 ? '...' : ''}`;
            break;
        default:
            loadingTitle.textContent = `Processing: ${title.substring(0, 25)}${title.length > 25 ? '...' : ''}`;
    }
}

/**
 * Reset UI to initial state
 */
function resetUI() {
    // Show action buttons
    document.getElementById('actionsContainer').style.display = 'flex';
    
    // Hide loading container
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('preview-content').style.display = 'none';
    document.getElementById('preview-content').innerHTML = '';
    
    // Reset progress steps
    updateProgressStep('extract', 'pending');
    updateProgressStep('analyze', 'pending');
    updateProgressStep('generate', 'pending');
    
    // Clear status messages
    showStatus('', '');
    document.getElementById('status').style.display = 'none';
    
    // Notify background script to clear processing state
    chrome.runtime.sendMessage({
        type: 'end_processing'
    });
    
    // Clear local storage processing info
    chrome.storage.local.remove('processingInfo');
}

/**
 * Update a progress step's status
 */
function updateProgressStep(stepId, status) {
    const step = document.getElementById(`step-${stepId}`);
    
    // Remove existing status classes
    step.classList.remove('active', 'completed', 'pending');
    
    // Add new status class
    step.classList.add(status);
    
    // Update the indicator content
    const indicator = step.querySelector('.step-indicator');
    
    if (status === 'active') {
        indicator.innerHTML = '<div class="spinner"></div>';
    } else if (status === 'completed') {
        indicator.innerHTML = '✓';
    } else {
        // Reset to number
        indicator.textContent = stepId === 'extract' ? '1' : (stepId === 'analyze' ? '2' : '3');
    }
}

/**
 * Show preview content
 */
function showPreviewContent(content) {
    const previewEl = document.getElementById('preview-content');
    previewEl.style.display = 'block';
    previewEl.innerHTML = content;
}

/**
 * Process the active tab with the specified mode
 */
function processActiveTab(mode) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        if (isValidUrl(currentTab.url)) {
            showStatus(`Processing with ${mode} mode...`, 'info');
            extractPageContent(currentTab, mode);
        } else {
            showError(`Cannot process this type of page: ${currentTab.url}`);
        }
    });
}

/**
 * Check if URL is valid for processing
 */
function isValidUrl(url) {
    return url && !url.startsWith('chrome:') && !url.startsWith('chrome-extension:');
}

/**
 * Extract content from the current page with progressive updates
 */
function extractPageContentProgressively(tab, mode) {
    // Update background state
    chrome.runtime.sendMessage({
        type: 'update_processing',
        stage: 'extracting',
        progress: 0.1,
        statusText: 'Extracting page content...'
    });
    
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getPageContent
    }, function(results) {
        if (chrome.runtime.lastError) {
            showError(`Error: ${chrome.runtime.lastError.message}`);
            resetUI();
            
            // Notify background script about error
            chrome.runtime.sendMessage({
                type: 'end_processing',
                error: chrome.runtime.lastError.message
            });
            return;
        }
        
        if (results && results[0]) {
            const data = results[0].result;
            
            // Mark extraction as complete
            updateProgressStep('extract', 'completed');
            
            // Show a preview of the title
            showPreviewContent(`<strong>${data.title}</strong><br><em>Content extracted successfully!</em>`);
            
            // Update background state
            chrome.runtime.sendMessage({
                type: 'update_processing',
                stage: 'analyzing',
                progress: 0.3,
                statusText: `<strong>${data.title}</strong><br><em>Analyzing content...</em>`
            });
            
            // Start analyzing content
            updateProgressStep('analyze', 'active');
            setTimeout(() => {
                // Simulate analysis completion (this would be more sophisticated in a real implementation)
                updateProgressStep('analyze', 'completed');
                
                // Update background state
                chrome.runtime.sendMessage({
                    type: 'update_processing',
                    stage: 'generating',
                    progress: 0.6,
                    statusText: `<strong>${data.title}</strong><br><em>Generating AI summary...</em>`
                });
                
                // Start generation
                updateProgressStep('generate', 'active');
                
                // Process with backend and show progressive updates
                processWithBackendProgressively(data, mode, tab.url, tab.title);
            }, 1000); // Simulate a delay for the analysis step
        } else {
            showError('Failed to extract page content');
            resetUI();
            
            // Notify background script about error
            chrome.runtime.sendMessage({
                type: 'end_processing',
                error: 'Failed to extract page content'
            });
        }
    });
}

/**
 * Get page content from current tab
 */
function getPageContent() {
    return {
        url: window.location.href,
        title: document.title,
        html: document.documentElement.outerHTML,
        plainText: document.body.innerText
    };
}

/**
 * Process content with backend with progressive updates
 */
function processWithBackendProgressively(data, mode, url, title) {
    // Update background state
    chrome.runtime.sendMessage({
        type: 'update_processing',
        stage: 'generating',
        progress: 0.7,
        statusText: `<strong>${title}</strong><br><em>Sending content to AI for processing...</em>`
    });
    
    // Store info in progress variable
    const processingInfo = {
        mode: mode,
        title: title,
        url: url,
        startTime: new Date()
    };
    
    // Store in chrome storage for retrieval if popup closes
    chrome.storage.local.set({
        processingInfo: processingInfo
    });
    
    // Update preview content
    showPreviewContent(`<strong>${title}</strong><br><em>Sending content to AI for processing...</em>`);
    
    fetch('http://localhost:5001/api/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            mode: mode,
            content: data.html,
            plainText: data.plainText,
            url: url,
            title: title
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || `Server responded with status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(result => {
        // Mark generation as completed
        updateProgressStep('generate', 'completed');
        
        // Show completion message
        showPreviewContent(`<strong>${title}</strong><br><em>Summary completed! Opening results...</em>`);
        
        // Update background state
        chrome.runtime.sendMessage({
            type: 'update_processing',
            stage: 'completed',
            progress: 1.0,
            statusText: `<strong>${title}</strong><br><em>Summary completed!</em>`
        });
        
        // Store processed content and navigate to result page
        chrome.storage.local.set({
            processedContent: {
                mode: mode,
                title: title,
                sourceUrl: url,
                content: result.processed_content
            }
        }, function() {
            // Clear processing info
            chrome.storage.local.remove('processingInfo');
            
            // Open the result in a new tab
            setTimeout(() => {
                chrome.tabs.create({ url: chrome.runtime.getURL('pages/result.html') });
                
                // Notify background script about completion
                chrome.runtime.sendMessage({
                    type: 'end_processing'
                });
                
                // Reset UI after a short delay to show completion
                setTimeout(resetUI, 300);
            }, 800);
        });
    })
    .catch(error => {
        console.error('Processing error:', error);
        showError(`Processing error: ${error.message}`);
        resetUI();
        
        // Notify background script about error
        chrome.runtime.sendMessage({
            type: 'end_processing',
            error: error.message
        });
        
        // Clear processing info on error
        chrome.storage.local.remove('processingInfo');
    });
}

/**
 * Duplicate content (either with FireCrawl or local processing)
 */
function duplicateContent() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        if (isValidUrl(currentTab.url)) {
            // Try FireCrawl first if backend is available
            if (window.backendAvailable) {
                duplicateWithFireCrawl(currentTab.url);
            } else {
                // Fall back to local processing if backend is unavailable
                extractPageContent(currentTab, 'duplicate');
            }
        } else {
            showError('Cannot duplicate this type of page');
        }
    });
}

/**
 * Duplicate page content using FireCrawl for clean extraction
 */
async function duplicateWithFireCrawl(url) {
    showStatus('Duplicating page...', 'info');
    
    try {
        const response = await fetch('http://localhost:5001/api/firecrawl/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                formats: ["markdown", "html"],
                onlyMainContent: true,
                removeBase64Images: true,
                mobile: true,
                waitFor: 1500,
                excludeTags: ["iframe", "script", "button", "form", "aside", "nav", "footer", "header", "style"]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Store duplicated content and navigate to result page
        chrome.storage.local.set({
            processedContent: {
                mode: 'duplicate',
                title: result.title || 'Duplicated Content',
                sourceUrl: url,
                content: result.html || result.markdown
            }
        }, function() {
            chrome.tabs.create({ url: chrome.runtime.getURL('pages/result.html') });
        });
        
    } catch (error) {
        console.error('Duplication error with FireCrawl:', error);
        showStatus('FireCrawl unavailable, using local duplicate...', 'info');
        
        // Fall back to using the regular backend duplicate method
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            if (isValidUrl(currentTab.url)) {
                extractPageContent(currentTab, 'duplicate');
            } else {
                showError('Cannot duplicate this type of page');
            }
        });
    }
}

/**
 * Check if the backend server is running
 */
function checkBackendStatus() {
    showStatus('Checking backend...', 'info');
    
    // Try to ping the backend server
    Promise.race([
        fetch('http://localhost:5001/api/ping'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ])
    .then(response => {
        if (!response.ok) {
            throw new Error(`Backend responded with status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        window.backendAvailable = true;
        showStatus('Backend connected', 'success');
        // Also check FireCrawl API availability
        checkFireCrawlStatus();
    })
    .catch(error => {
        window.backendAvailable = false;
        showStatus('Backend disconnected - limited features available', 'error');
        console.error('Backend connection error:', error);
        
        // Disable buttons that require backend
        document.getElementById('summarizeBtn').classList.add('disabled');
        document.getElementById('summarizeBtn').title += ' (Backend required)';
    });
}

/**
 * Check if FireCrawl API is configured and available
 */
function checkFireCrawlStatus() {
    fetch('http://localhost:5001/api/firecrawl/status')
    .then(response => {
        if (!response.ok) {
            throw new Error(`FireCrawl status check failed: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        window.fireCrawlAvailable = data.available;
        if (data.available) {
            document.getElementById('duplicateBtn').classList.add('firecrawl-available');
            document.getElementById('duplicateBtn').title = 'Uses FireCrawl for enhanced content extraction';
        }
    })
    .catch(error => {
        console.error('FireCrawl status check error:', error);
        window.fireCrawlAvailable = false;
    });
}

/**
 * Show a status message to the user
 */
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }
}

/**
 * Show an error message to the user
 */
function showError(message) {
    showStatus(message, 'error');
}

/**
 * Connect to background script for state management
 */
function connectToBackgroundScript() {
    // Create a connection to the background script
    const port = chrome.runtime.connect({ name: "popup" });
    
    // Listen for messages from the background script
    port.onMessage.addListener(function(message) {
        if (message.type === 'processing_state_update') {
            // Restore UI state from background
            restoreProcessingState(message.state);
        }
    });
    
    // Check if there's an ongoing process
    chrome.runtime.sendMessage({ type: 'get_processing_state' }, function(response) {
        if (response && response.status === 'processing') {
            // Restore UI state from background
            restoreProcessingState(response.state);
        }
    });
}

/**
 * Restore processing state from background script
 */
function restoreProcessingState(state) {
    if (!state) return;
    
    // Show loading UI
    showLoadingUI(state.mode, state.title);
    
    // Set appropriate step based on stage
    if (state.stage === 'extracting') {
        updateProgressStep('extract', 'active');
    } else if (state.stage === 'analyzing') {
        updateProgressStep('extract', 'completed');
        updateProgressStep('analyze', 'active');
    } else if (state.stage === 'generating') {
        updateProgressStep('extract', 'completed');
        updateProgressStep('analyze', 'completed');
        updateProgressStep('generate', 'active');
    }
    
    // Show status text if available
    if (state.statusText) {
        showPreviewContent(state.statusText);
    }
}

/**
 * Check for existing processing
 */
function checkForExistingProcessing() {
    // Check local storage for processing info
    chrome.storage.local.get('processingInfo', function(data) {
        if (data.processingInfo) {
            const processingInfo = data.processingInfo;
            const now = new Date();
            const startTime = new Date(processingInfo.startTime);
            const elapsedTime = now - startTime;
            
            // If processing started within the last 5 minutes, restore UI
            if (elapsedTime < 5 * 60 * 1000) {
                showLoadingUI(processingInfo.mode, processingInfo.title);
                
                // Set all steps to reflect ongoing process
                updateProgressStep('extract', 'completed');
                updateProgressStep('analyze', 'completed');
                updateProgressStep('generate', 'active');
                
                showPreviewContent(`<strong>${processingInfo.title}</strong><br><em>Processing in progress... (${Math.round(elapsedTime / 1000)}s)</em>`);
            } else {
                // Processing has been going on too long, probably stalled
                chrome.storage.local.remove('processingInfo');
            }
        }
    });
} 