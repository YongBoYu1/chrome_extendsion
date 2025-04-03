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

export function setUIState(newState) {
    console.log('[DEBUG] UI State transition:', currentState, '->', newState);
    currentState = newState;
    updateUIVisibility();
}

function updateUIVisibility() {
    const processingContainer = document.getElementById('processingContainer');
    const contentContainer = document.getElementById('contentContainer');
    const errorContainer = document.getElementById('errorContainer');

    if (!processingContainer || !contentContainer || !errorContainer) {
        console.error('[ERROR] Required UI containers not found');
        return;
    }

    // First hide everything
    processingContainer.classList.add('hidden');
    processingContainer.style.display = 'none';
    
    contentContainer.classList.add('hidden');
    contentContainer.style.display = 'none';
    
    errorContainer.classList.add('hidden');
    errorContainer.style.display = 'none';

    // Then show only what's needed for current state
    console.log('[DEBUG] Setting UI visibility for state:', currentState);
    
    switch (currentState) {
        case UIState.PROCESSING:
            processingContainer.classList.remove('hidden');
            processingContainer.style.display = 'flex';
            console.log('[DEBUG] Processing container visible');
            break;
            
        case UIState.CONTENT:
            contentContainer.classList.remove('hidden');
            contentContainer.style.display = 'block';
            console.log('[DEBUG] Content container visible');
            break;
            
        case UIState.ERROR:
            errorContainer.classList.remove('hidden');
            errorContainer.style.display = 'flex';
            console.log('[DEBUG] Error container visible');
            break;
    }
}

export function showProcessingUI() {
    console.log('[DEBUG] Showing processing UI...');
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

export function hideProcessingUI() {
    if (currentState === UIState.PROCESSING) {
        setUIState(UIState.CONTENT);
    }
}

export function showContent() {
    setUIState(UIState.CONTENT);
}

export function updateProcessingUI(state) {
    if (currentState !== UIState.PROCESSING) {
        setUIState(UIState.PROCESSING);
    }

    // Update progress bar
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const progress = Math.min(Math.max(state.progress || 0, 0), 1);
        progressBar.style.width = `${progress * 100}%`;
        console.log('[DEBUG] Progress bar updated:', `${progress * 100}%`);
    }

    // Update status text
    const processingStatus = document.getElementById('processingStatus');
    if (processingStatus) {
        processingStatus.textContent = state.statusText || 'Processing...';
        console.log('[DEBUG] Status text updated:', state.statusText);
    }

    // Update step indicators
    if (state.stage) {
        updateStepIndicators(state.stage);
    }
}

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

export function updateStepIndicators(currentStage) {
    const stages = ['extract', 'analyze', 'generate'];
    const currentIndex = stages.indexOf(currentStage);
    
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

export function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    if (errorContainer && errorMessage) {
        errorMessage.textContent = message;
        setUIState(UIState.ERROR);
    }
}

export function hideError() {
    if (currentState === UIState.ERROR) {
        setUIState(UIState.CONTENT);
    }
}

export function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function formatReadingTime(minutes) {
    return minutes > 0 ? `${Math.round(minutes)} min read` : '';
} 