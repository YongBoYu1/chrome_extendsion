/**
 * @class MessageHandler
 * @description Handles all message processing and coordinates between queue and state.
 * Follows Single Responsibility Principle by focusing only on message handling and
 * Open/Closed Principle by allowing new message types without modifying existing code.
 */
class MessageHandler {
    constructor(queue, state) {
        this.queue = queue;
        this.state = state;
    }

    /**
     * Handle incoming messages
     * @param {Object} message - Message to handle
     * @param {Object} sender - Message sender information
     * @returns {Promise<Object>} - Response to send back
     */
    async handleMessage(message, sender) {
        console.log('[DEBUG] Message received:', message.type);

        try {
            switch (message.type) {
                case 'ping':
                    return this.handlePing();

                case 'get_processing_state':
                    return this.handleGetState();

                case 'start_processing':
                    return this.handleStartProcessing(message, sender);

                case 'update_processing':
                    return this.handleUpdateProcessing(message);

                case 'end_processing':
                    return this.handleEndProcessing();

                case 'result_page_ready':
                    return this.handleResultPageReady(sender, message);

                case 'update_result_tab':
                    return this.handleUpdateResultTab(message);

                default:
                    throw new Error(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error('[ERROR] Message handling failed:', error);
            throw error;
        }
    }

    /**
     * Handle ping message
     * @returns {Object} - Ready status
     */
    handlePing() {
        return { ready: true };
    }

    /**
     * Handle get_processing_state message
     * @returns {Object} - Current processing state
     */
    handleGetState() {
        const state = this.state.getState();
        return {
            status: state ? 'processing' : 'idle',
            state: state
        };
    }

    /**
     * Handle start_processing message
     * @param {Object} message - Start processing message
     * @param {Object} sender - Message sender
     * @returns {Promise<Object>} - Processing status
     */
    async handleStartProcessing(message, sender) {
        console.log('[DEBUG] Starting processing:', message.url);

        // Set initial state
        this.state.setState({
            tabId: message.tabId,
            resultTabId: message.resultTabId,
            url: message.url,
            title: message.title,
            stage: 'starting',
            progress: 0,
            statusText: 'Starting processing...',
            timestamp: message.timestamp,
            mode: message.mode
        });

        const info = {
            tabId: message.tabId,
            resultTabId: message.resultTabId,
            title: message.title,
            timestamp: message.timestamp,
            mode: message.mode
        };

        await this.queue.enqueue(message.url, info);
        return { status: 'processing_started', state: this.state.getState() };
    }

    /**
     * Handle update_processing message
     * @param {Object} message - Update processing message
     * @returns {Object} - Update status
     */
    handleUpdateProcessing(message) {
        this.state.update({
            stage: message.stage,
            progress: message.progress,
            statusText: message.statusText
        });
        return { status: 'processing_updated', state: this.state.getState() };
    }

    /**
     * Handle end_processing message
     * @returns {Object} - End status
     */
    handleEndProcessing() {
        this.state.clear();
        this.queue.clear();
        return { status: 'processing_ended' };
    }

    /**
     * Handle result_page_ready message
     * @param {Object} sender - Message sender
     * @param {Object} message - Message with optional URL
     * @returns {Object} - Ready status
     */
    handleResultPageReady(sender, message) {
        if (sender.tab && sender.tab.id) {
            const update = { resultTabId: sender.tab.id };
            
            // If the message contains a URL, associate it with this tab
            if (message && message.url) {
                console.log(`[DEBUG] Registering tab ${sender.tab.id} for URL: ${message.url}`);
                // We don't need to update the URL in state, just acknowledge it
            }
            
            this.state.update(update);
        }
        return { acknowledged: true };
    }

    /**
     * Handle update_result_tab message
     * @param {Object} message - Update result tab message
     * @returns {Object} - Update status
     */
    handleUpdateResultTab(message) {
        if (this.state.getState()?.url === message.url) {
            this.state.update({ resultTabId: message.resultTabId });
            return { status: 'updated' };
        }
        return { status: 'no_matching_state' };
    }
}

export { MessageHandler };