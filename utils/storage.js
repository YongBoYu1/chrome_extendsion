/**
 * Storage Manager for Chrome Extension
 * Handles all chrome.storage operations
 */

class StorageManager {
    // Content Storage Operations
    async storeContent(content) {
        return this.handleStorageOp({ op: 'store', content });
    }

    async getContent(contentId) {
        return this.handleStorageOp({ op: 'get', id: contentId });
    }

    async getAllContent() {
        return this.handleStorageOp({ op: 'get' });
    }

    async deleteContent(contentId) {
        return this.handleStorageOp({ op: 'delete', id: contentId });
    }

    // Processing State Operations
    async setProcessingState(state) {
        await chrome.storage.local.set({ processingInfo: state });
    }

    async getProcessingState() {
        const data = await chrome.storage.local.get(['processingInfo']);
        return data.processingInfo;
    }

    async clearProcessingState() {
        await chrome.storage.local.remove('processingInfo');
    }

    // Pending Processing Operations
    async setPendingProcessing(info) {
        await chrome.storage.local.set({ pendingProcessing: info });
    }

    async getPendingProcessing() {
        const data = await chrome.storage.local.get(['pendingProcessing']);
        return data.pendingProcessing;
    }

    async clearPendingProcessing() {
        await chrome.storage.local.remove(['pendingProcessing']);
    }

    // Private helper for storage operations
    async handleStorageOp(operation) {
        try {
            if (operation.op === 'store') {
                if (!operation.content || !operation.content.url) {
                    throw new Error('Invalid content for storage');
                }

                const data = await chrome.storage.local.get(['processedContent']);
                let contentList = Array.isArray(data.processedContent) ? data.processedContent : [];

                if (contentList.length >= 50) {
                    contentList = contentList.slice(0, 49);
                }

                const contentToStore = {
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    ...operation.content
                };
                contentList.unshift(contentToStore);

                await chrome.storage.local.set({ processedContent: contentList });
                return contentToStore;
            }

            if (operation.op === 'get') {
                const data = await chrome.storage.local.get(['processedContent']);
                const contentList = Array.isArray(data.processedContent) ? data.processedContent : [];
                
                if (operation.id) {
                    return contentList.find(item => item.id === operation.id);
                }
                return contentList;
            }

            if (operation.op === 'delete') {
                if (!operation.id) {
                    throw new Error('No content ID provided for deletion');
                }

                const data = await chrome.storage.local.get(['processedContent']);
                let contentList = Array.isArray(data.processedContent) ? data.processedContent : [];
                contentList = contentList.filter(item => item.id !== operation.id);
                
                await chrome.storage.local.set({ processedContent: contentList });
                return true;
            }

            throw new Error('Invalid storage operation');
        } catch (error) {
            console.error('Storage operation failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const storageManager = new StorageManager(); 