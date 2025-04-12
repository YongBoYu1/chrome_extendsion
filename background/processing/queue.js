/**
 * @class ProcessingQueue
 * @description Manages a queue of URLs to be processed sequentially.
 * Focuses solely on queue management and processing coordination.
 */
import { storageManager } from '../../utils/storage.js';

class ProcessingQueue {
    constructor(apiClient, stateManager) {
        this.queue = new Map();
        this.activeProcessing = false;
        this.apiClient = apiClient;
        this.stateManager = stateManager;
        this.processingLock = false; // Simple mutex for race condition prevention
        
        // Verify apiClient is available
        if (!this.apiClient || !this.apiClient.summarize) {
            console.error('[Queue] API client not properly initialized:', this.apiClient);
            throw new Error('API client not properly initialized');
        }
    }

    /**
     * Add a URL to the processing queue
     * @param {string} url - URL to process
     * @param {Object} info - Processing information
     */
    async enqueue(url, info) {
        if (this.queue.has(url)) {
            console.log('[Queue] Skipping duplicate URL:', url);
            return;
        }

        this.queue.set(url, {
            ...info,
            enqueueTime: Date.now() // Track when URL was added to ensure FIFO order
        });
        
        if (!this.activeProcessing) {
            // Start processing in a way that doesn't block the caller
            this.startProcessing().catch(error => {
                console.error('[Queue] Error during processing:', error);
            });
        }
    }

    /**
     * Start processing the queue
     */
    async startProcessing() {
        if (this.activeProcessing) {
            return;
        }
        
        console.log('[Queue] Starting queue processing');
        
        try {
            this.activeProcessing = true;
            while (this.queue.size > 0) {
                // Check if another operation is in progress
                if (this.processingLock) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }
                
                console.log('[Queue] Processing next URL. Remaining:', this.queue.size);
                await this.processOne();
                
                // Wait for state updates to propagate before processing next URL
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('[Queue] Processing error:', error);
        } finally {
            console.log('[Queue] Queue processing complete');
            this.activeProcessing = false;
        }
    }

    /**
     * Process a single URL from the queue
     */
    async processOne() {
        if (this.queue.size === 0) {
            return;
        }

        // Acquire lock to prevent concurrent processing
        this.processingLock = true;
        
        try {
            // Get URLs in FIFO order based on enqueue time
            const entries = Array.from(this.queue.entries())
                .sort((a, b) => a[1].enqueueTime - b[1].enqueueTime);
            
            const [url, info] = entries[0];
            
            // Remove from queue early to prevent reprocessing
            this.queue.delete(url);
            
            // Clear state completely between URLs to prevent cross-contamination
            await this.stateManager.setState(null);
            
            // Use a transaction-like approach: prepare all data first, then update state
            try {
                // Step 1: Set initial state
                await this.stateManager.setState({
                    stage: 'extracting',
                    progress: 0.2,
                    statusText: 'Extracting content from webpage...',
                    url: url,
                    title: info.title,
                    queueSize: this.queue.size,
                    tabId: info.tabId,
                    resultTabId: info.resultTabId,
                    timestamp: Date.now()
                });
                
                console.log('[Queue] Processing URL:', url);
                
                // Step 2: Process URL
                const result = await this.apiClient.summarize(url, {
                    mode: info.mode || 'summarize'
                });
                
                // Step 3: Store content first to ensure it's available
                await storageManager.storeContent({
                    url: url,
                    title: info.title,
                    summary: result.summary || result.text,
                    keyPoints: result.keyPoints,
                    markdown: result.markdown,
                    html: result.html,
                    wordCount: result.wordCount,
                    readingTime: result.readingTime,
                    timestamp: Date.now()
                });
                
                // Step 4: Update state only after content is stored
                await this.stateManager.setState({
                    stage: 'completed',
                    progress: 1,
                    statusText: 'Summary generated successfully!',
                    url: url,
                    title: info.title,
                    tabId: info.tabId,
                    resultTabId: info.resultTabId,
                    queueSize: this.queue.size,
                    timestamp: Date.now()
                });
                
                console.log('[Queue] Successfully processed URL:', url);
            } catch (processingError) {
                console.error('[Queue] Processing failed:', processingError);
                
                // Handle error state explicitly
                await this.stateManager.setState({
                    stage: 'error',
                    progress: 0,
                    statusText: processingError.message || 'Processing failed',
                    url: url,
                    title: info.title,
                    tabId: info.tabId,
                    resultTabId: info.resultTabId,
                    queueSize: this.queue.size,
                    error: processingError.message || 'Unknown error',
                    timestamp: Date.now()
                });
            }
        } finally {
            // Always release lock in finally block to prevent deadlocks
            this.processingLock = false;
        }
    }

    /**
     * Get current queue status
     */
    getStatus() {
        return {
            size: this.queue.size,
            activeProcessing: this.activeProcessing,
            urls: Array.from(this.queue.keys())
        };
    }

    /**
     * Clear the queue
     */
    clear() {
        this.queue.clear();
        this.activeProcessing = false;
        this.processingLock = false; // Also clear the lock
    }
}

export { ProcessingQueue }; 