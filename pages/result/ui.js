/**
 * UI state management and components for the result page
 */

// UI States
export const UIState = {
    INITIAL: 'initial',
    PROCESSING: 'processing',
    CONTENT: 'content',
    ERROR: 'error'
};

let currentState = UIState.INITIAL;

/**
 * Sets the UI state and handles transition animations
 * @param {string} newState - The new UI state to transition to
 */
export function setUIState(newState) {
    // If the state didn't change, no need to update UI
    if (currentState === newState) {
        return;
    }
    
    const previousState = currentState;
    currentState = newState;
    
    // Apply transitions based on state change
    updateUIVisibility(previousState);
}

/**
 * Updates UI container visibility with transitions
 * @param {string} previousState - The previous UI state
 */
function updateUIVisibility(previousState) {
    const processingContainer = document.getElementById('processingContainer');
    const contentContainer = document.getElementById('contentContainer');
    const errorContainer = document.getElementById('errorContainer');

    if (!processingContainer || !contentContainer || !errorContainer) {
        console.error('[ERROR] Required UI containers not found');
        return;
    }

    // Setup transition classes - adding to ensure smooth state changes
    const containers = [processingContainer, contentContainer, errorContainer];
    containers.forEach(container => {
        container.classList.add('state-transition');
    });

    // First hide everything
    processingContainer.classList.add('hidden');
    contentContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');

    // Clear any previous display styles
    processingContainer.style.display = 'none';
    contentContainer.style.display = 'none';
    errorContainer.style.display = 'none';

    // Then show only what's needed for current state
    switch (currentState) {
        case UIState.PROCESSING:
            processingContainer.classList.remove('hidden');
            processingContainer.style.display = 'flex';
            break;
            
        case UIState.CONTENT:
            contentContainer.classList.remove('hidden');
            contentContainer.style.display = 'block';
            break;
            
        case UIState.ERROR:
            errorContainer.classList.remove('hidden');
            errorContainer.style.display = 'flex';
            break;
    }

    // Scroll to top when changing state
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Shows the processing UI and resets progress indicators
 */
export function showProcessingUI() {
    setUIState(UIState.PROCESSING);
    
    // Reset progress bar
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
    
    // Reset status text
    const processingStatus = document.getElementById('processingStatus');
    if (processingStatus) {
        processingStatus.textContent = 'Starting processing...';
    }

    // Reset step indicators
    resetStepIndicators();
}

/**
 * Hides the processing UI
 */
export function hideProcessingUI() {
    if (currentState === UIState.PROCESSING) {
        setUIState(UIState.CONTENT);
    }
}

/**
 * Shows the content area
 */
export function showContent() {
    setUIState(UIState.CONTENT);
}

/**
 * Updates the processing UI with current state information
 * @param {Object} state - Processing state object with progress and status
 */
export function updateProcessingUI(state) {
    if (currentState !== UIState.PROCESSING) {
        setUIState(UIState.PROCESSING);
    }

    // Update progress bar with smooth transition
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const progress = Math.min(Math.max(state.progress || 0, 0), 1);
        progressBar.style.width = `${progress * 100}%`;
    }

    // Update status text
    const processingStatus = document.getElementById('processingStatus');
    if (processingStatus) {
        processingStatus.textContent = state.statusText || 'Processing...';
    }

    // Update step indicators
    if (state.stage) {
        updateStepIndicators(state.stage);
    }
}

/**
 * Resets all processing step indicators to pending state
 */
function resetStepIndicators() {
    const stages = ['extract', 'analyze', 'generate'];
    stages.forEach(stage => {
        const stepEl = document.getElementById(`processing-step-${stage}`);
        if (stepEl) {
            stepEl.classList.remove('completed', 'active');
            stepEl.classList.add('pending');
        }
    });
}

/**
 * Updates processing step indicators based on current stage
 * @param {string} currentStage - Current processing stage
 */
export function updateStepIndicators(currentStage) {
    const stages = ['extract', 'analyze', 'generate'];
    const currentIndex = stages.indexOf(currentStage);
    
    // If invalid stage, don't update
    if (currentIndex === -1) return;
    
    stages.forEach((stage, index) => {
        const stepEl = document.getElementById(`processing-step-${stage}`);
        if (stepEl) {
            stepEl.classList.remove('pending', 'active', 'completed');
            if (index < currentIndex) {
                stepEl.classList.add('completed');
            } else if (index === currentIndex) {
                stepEl.classList.add('active');
            } else {
                stepEl.classList.add('pending');
            }
        }
    });
}

/**
 * Shows error message with troubleshooting options
 * @param {string} message - Error message to display
 */
export function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    if (errorContainer && errorMessage) {
        errorMessage.textContent = message || 'An unknown error occurred';
        setUIState(UIState.ERROR);
        
        // Set up retry button if it exists
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
        
        // Set up report button if it exists
        const reportErrorBtn = document.getElementById('reportErrorBtn');
        if (reportErrorBtn) {
            reportErrorBtn.addEventListener('click', () => {
                // Send error report to background script
                chrome.runtime.sendMessage({
                    type: 'report_error',
                    error: message,
                    url: sessionStorage.getItem('targetUrl')
                });
                
                // Show confirmation to user
                alert('Error report sent. Thank you for helping improve the extension.');
            });
        }
    }
}

/**
 * Hides the error message
 */
export function hideError() {
    if (currentState === UIState.ERROR) {
        setUIState(UIState.CONTENT);
    }
}

/**
 * Safely escapes HTML to prevent XSS
 * @param {string} unsafe - String that might contain HTML
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Formats reading time in minutes
 * @param {number} minutes - Reading time in minutes
 * @returns {string} Formatted reading time
 */
export function formatReadingTime(minutes) {
    return minutes > 0 ? `${Math.round(minutes)} min read` : '';
} 