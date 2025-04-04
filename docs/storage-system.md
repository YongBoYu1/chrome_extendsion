# Storage System

## Overview

The Chrome extension uses a dedicated storage system to persist processed content, processing state, and other important data. The system is built around Chrome's storage APIs, providing reliable data persistence across browser sessions and consistent access patterns for different components of the extension.

## Storage Manager (`utils/storage.js`)

The central component of the storage system is the `StorageManager` class, which provides a unified interface for all storage operations:

```javascript
class StorageManager {
    // Content Storage Operations
    async storeContent(content) { /* ... */ }
    async getContent(contentId) { /* ... */ }
    async getAllContent() { /* ... */ }
    async deleteContent(contentId) { /* ... */ }

    // Processing State Operations
    async setProcessingState(state) { /* ... */ }
    async getProcessingState() { /* ... */ }
    async clearProcessingState() { /* ... */ }

    // Pending Processing Operations
    async setPendingProcessing(info) { /* ... */ }
    async getPendingProcessing() { /* ... */ }
    async clearPendingProcessing() { /* ... */ }

    // Private helper
    async handleStorageOp(operation) { /* ... */ }
}

// Export singleton instance
export const storageManager = new StorageManager();
```

## Storage Categories

### 1. Content Storage

The content storage manages processed page content:

```javascript
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
```

Content objects have the following structure:

```javascript
{
    id: "1649876543210", // Generated timestamp-based ID
    url: "https://example.com/article",
    title: "Example Article",
    summary: "This is a summary of the article...",
    markdown: "# Example Article\n\nContent in markdown format...",
    html: "<h1>Example Article</h1><p>Content in HTML format...</p>",
    keyPoints: ["Key point 1", "Key point 2", "Key point 3"],
    timestamp: "2023-04-13T15:30:45.123Z",
    readingTime: 5, // in minutes
    wordCount: 1200
}
```

### 2. Processing State Storage

The processing state storage manages the current state of processing operations:

```javascript
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
```

Processing state objects have the following structure:

```javascript
{
    url: "https://example.com/article",
    title: "Example Article",
    stage: "extracting", // extracting, processing, summarizing, completed, error
    progress: 0.45, // 0 to 1
    statusText: "Extracting content from webpage...",
    tabId: 123, // Source tab ID
    resultTabId: 456, // Result tab ID
    timestamp: 1649876543210,
    queueSize: 2, // Number of URLs in queue
    error: "Error message" // Only present if stage is "error"
}
```

### 3. Pending Processing Storage

The pending processing storage manages information about processing operations that are queued or pending:

```javascript
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
```

## Storage Operations

### Content Storage Implementation

The content storage is implemented using a helper method that handles different operations:

```javascript
async handleStorageOp(operation) {
    try {
        if (operation.op === 'store') {
            // Validate input
            if (!operation.content || !operation.content.url) {
                throw new Error('Invalid content for storage');
            }

            // Get existing content list
            const data = await chrome.storage.local.get(['processedContent']);
            let contentList = Array.isArray(data.processedContent) ? data.processedContent : [];

            // Limit list size to 50 items
            if (contentList.length >= 50) {
                contentList = contentList.slice(0, 49);
            }

            // Create content object with ID and timestamp
            const contentToStore = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                ...operation.content
            };
            
            // Add to the beginning of the list (newest first)
            contentList.unshift(contentToStore);

            // Store updated list
            await chrome.storage.local.set({ processedContent: contentList });
            return contentToStore;
        }

        if (operation.op === 'get') {
            // Get content list
            const data = await chrome.storage.local.get(['processedContent']);
            const contentList = Array.isArray(data.processedContent) ? data.processedContent : [];
            
            // Return specific content or all content
            if (operation.id) {
                return contentList.find(item => item.id === operation.id);
            }
            return contentList;
        }

        if (operation.op === 'delete') {
            // Validate input
            if (!operation.id) {
                throw new Error('No content ID provided for deletion');
            }

            // Get content list
            const data = await chrome.storage.local.get(['processedContent']);
            let contentList = Array.isArray(data.processedContent) ? data.processedContent : [];
            
            // Filter out the content to delete
            contentList = contentList.filter(item => item.id !== operation.id);
            
            // Store updated list
            await chrome.storage.local.set({ processedContent: contentList });
            return true;
        }

        throw new Error('Invalid storage operation');
    } catch (error) {
        console.error('Storage operation failed:', error);
        throw error;
    }
}
```

## Common Usage Patterns

### 1. Storing Processed Content

When content is processed, it is stored for later retrieval:

```javascript
// In ProcessingQueue.processOne()
await storageManager.storeContent({
    url: url,
    title: info.title,
    summary: result.summary || result.text,
    keyPoints: result.keyPoints,
    markdown: result.markdown,
    html: result.html,
    timestamp: Date.now()
});
```

### 2. Managing Processing State

The processing state is updated at various stages:

```javascript
// In ProcessingQueue.processOne()
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
```

### 3. Loading Content

Content is loaded for display in result tabs:

```javascript
// In content.js
export async function loadAndDisplayLatestContent() {
    const targetUrl = sessionStorage.getItem('targetUrl');
    const contents = await storageManager.getAllContent();
    
    if (targetUrl) {
        contentToDisplay = contents.find(item => item.url === targetUrl);
    }
    
    // Display content
    // ...
}
```

### 4. Loading Content by ID

Specific content items can be loaded by ID:

```javascript
export async function loadContentById(contentId) {
    try {
        const content = await storageManager.getContent(contentId);
        if (content) {
            await displayProcessedContent(content);
        } else {
            showError('Content not found');
        }
    } catch (error) {
        console.error('Error loading content:', error);
        showError('Failed to load content');
    }
}
```

## Storage Limits and Performance

Chrome storage has certain limitations:

1. **Storage Limit**: Chrome extensions have a storage limit of 5MB per extension.
2. **Performance**: Chrome storage operations are asynchronous and may impact performance if not managed correctly.

To address these limitations, the storage system:

1. **Limits Content History**: Only the most recent 50 processed items are stored.
2. **Uses Asynchronous Operations**: All storage operations are asynchronous to avoid blocking the UI.
3. **Batches Operations**: Where possible, operations are batched to reduce the number of storage calls.

## Error Handling

The storage system includes robust error handling:

```javascript
try {
    // Storage operations
} catch (error) {
    console.error('Storage operation failed:', error);
    throw error;
}
```

Errors are logged to the console and then propagated to the caller for appropriate handling.

## Security Considerations

The storage system follows these security practices:

1. **Data Validation**: Input data is validated before storage.
2. **Error Handling**: All errors are caught and properly handled.
3. **Cross-Origin Protection**: Chrome's storage APIs provide built-in protection against cross-origin access.

## Data Migration

For future updates, the storage system is designed to support data migration through versioning:

```javascript
async migrateStorage(fromVersion, toVersion) {
    // Migration logic would be implemented here
}
```

## Session Storage for Tab-Specific Data

In addition to chrome.storage, the extension uses sessionStorage for tab-specific data:

```javascript
// Store URL for tab
sessionStorage.setItem('targetUrl', targetUrl);

// Retrieve URL for tab
const targetUrl = sessionStorage.getItem('targetUrl');
```

This allows each tab to maintain its own state independent of other tabs. 