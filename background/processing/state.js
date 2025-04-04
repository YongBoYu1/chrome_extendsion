/**
 * @class ProcessingState
 * @description Manages the current processing state and implements the observer pattern.
 * Follows Single Responsibility Principle by focusing only on state management and
 * Open/Closed Principle by allowing new observers without modifying existing code.
 */
class ProcessingState {
    constructor() {
        this.state = null;
        this.observers = new Set();
    }

    /**
     * Set the current processing state
     * @param {Object} newState - New state to set
     */
    setState(newState) {
        this.state = newState;
        this.notifyObservers();
    }

    /**
     * Add an observer to be notified of state changes
     * @param {Function} observer - Observer function
     */
    addObserver(observer) {
        this.observers.add(observer);
        // Notify new observer of current state
        if (this.state) {
            observer(this.state);
        }
    }

    /**
     * Remove an observer
     * @param {Function} observer - Observer function to remove
     */
    removeObserver(observer) {
        this.observers.delete(observer);
    }

    /**
     * Notify all observers of state changes
     */
    notifyObservers() {
        this.observers.forEach(observer => {
            try {
                observer(this.state);
            } catch (error) {
                console.error('[ERROR] Observer notification failed:', error);
            }
        });
    }

    /**
     * Get the current processing state
     * @returns {Object|null} - Current state
     */
    getState() {
        return this.state;
    }

    /**
     * Clear the current processing state
     */
    clear() {
        this.state = null;
        this.notifyObservers();
    }

    /**
     * Update specific properties of the current state
     * @param {Object} updates - Properties to update
     */
    update(updates) {
        if (this.state) {
            this.state = {
                ...this.state,
                ...updates
            };
            this.notifyObservers();
        }
    }

    /**
     * Store processed content and update state
     * @param {Object} content - Content to store
     * @returns {Promise<string>} Content ID
     */
    async storeContent(content) {
        if (!this.state) {
            throw new Error('No active processing state');
        }

        // Generate a unique ID for the content
        const contentId = `content_${Date.now()}`;
        
        // Update state with content
        this.state = {
            ...this.state,
            contentId,
            content,
            timestamp: Date.now()
        };

        this.notifyObservers();
        return contentId;
    }
}

export { ProcessingState }; 