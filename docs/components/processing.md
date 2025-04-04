# Processing System

## Overview

The processing system is a core component of the Chrome extension that manages the queue of URLs to be processed and handles communication between different parts of the extension. It follows SOLID principles with a clear separation of concerns and modular design.

## Key Components

### 1. Processing Queue (`background/processing/queue.js`)

The `ProcessingQueue` class is responsible for managing a queue of URLs to be processed sequentially and ensuring proper handling of the processing flow.

```javascript
class ProcessingQueue {
    constructor(apiClient, stateManager) {
        this.queue = new Map();
        this.activeProcessing = false;
        this.apiClient = apiClient;
        this.stateManager = stateManager;
        this.processingLock = false; // Simple mutex for race condition prevention
    }
    
    // Methods for queue management
    async enqueue(url, info) { /* ... */ }
    async startProcessing() { /* ... */ }
    async processOne() { /* ... */ }
    getStatus() { /* ... */ }
    clear() { /* ... */ }
}
```

#### Responsibilities

- Maintaining the queue of URLs to be processed
- Processing URLs in FIFO (First-In-First-Out) order
- Handling state transitions during processing
- Managing locks to prevent race conditions
- Coordinating with the API client for content processing
- Storing processing results

#### Processing Flow

1. **URL Enqueue**: When a URL is added to the queue:
   ```javascript
   await queue.enqueue(url, {
       tabId: /* tab ID */,
       resultTabId: /* result tab ID */,
       title: /* page title */,
       timestamp: /* timestamp */,
       mode: /* processing mode */
   });
   ```

2. **Queue Processing**: The queue automatically starts processing if not already active:
   ```javascript
   async startProcessing() {
       // ...
       while (this.queue.size > 0) {
           await this.processOne();
           // Wait for state updates to propagate
           await new Promise(resolve => setTimeout(resolve, 500));
       }
       // ...
   }
   ```

3. **URL Processing**: Each URL is processed in sequence:
   ```javascript
   async processOne() {
       // Get URLs in FIFO order
       const entries = Array.from(this.queue.entries())
           .sort((a, b) => a[1].enqueueTime - b[1].enqueueTime);
       
       const [url, info] = entries[0];
       
       // Remove from queue early to prevent reprocessing
       this.queue.delete(url);
       
       // Process URL with API client
       const result = await this.apiClient.summarize(url, {
           mode: info.mode || 'summarize'
       });
       
       // Store content
       await storageManager.storeContent({
           url: url,
           title: info.title,
           summary: result.summary || result.text,
           // Other content fields...
       });
       
       // Update state
       await this.stateManager.setState({
           stage: 'completed',
           progress: 1,
           // Other state fields...
       });
   }
   ```

### 2. Message Handler (`background/processing/handler.js`)

The `MessageHandler` class is responsible for handling messages from different parts of the extension and coordinating with the queue and state manager.

```javascript
class MessageHandler {
    constructor(queue, state) {
        this.queue = queue;
        this.state = state;
    }
    
    // Methods for message handling
    async handleMessage(message, sender) { /* ... */ }
    handlePing() { /* ... */ }
    handleGetState() { /* ... */ }
    async handleStartProcessing(message, sender) { /* ... */ }
    handleUpdateProcessing(message) { /* ... */ }
    handleEndProcessing() { /* ... */ }
    handleResultPageReady(sender, message) { /* ... */ }
    handleUpdateResultTab(message) { /* ... */ }
}
```

#### Responsibilities

- Routing messages to appropriate handlers
- Initiating URL processing
- Updating processing state
- Managing result tabs
- Providing status information

#### Message Types

1. **ping**: Check if background script is ready
   ```javascript
   handlePing() {
       return { ready: true };
   }
   ```

2. **get_processing_state**: Get current processing state
   ```javascript
   handleGetState() {
       const state = this.state.getState();
       return {
           status: state ? 'processing' : 'idle',
           state: state
       };
   }
   ```

3. **start_processing**: Start processing a URL
   ```javascript
   async handleStartProcessing(message, sender) {
       // Set initial state
       this.state.setState({
           tabId: message.tabId,
           resultTabId: message.resultTabId,
           url: message.url,
           // Other state fields...
       });

       // Add to queue
       await this.queue.enqueue(message.url, {
           tabId: message.tabId,
           resultTabId: message.resultTabId,
           // Other info fields...
       });
       
       return { status: 'processing_started', state: this.state.getState() };
   }
   ```

4. **result_page_ready**: Register a result tab
   ```javascript
   handleResultPageReady(sender, message) {
       if (sender.tab && sender.tab.id) {
           const update = { resultTabId: sender.tab.id };
           
           // If message contains URL, associate tab with URL
           if (message && message.url) {
               console.log(`[DEBUG] Registering tab ${sender.tab.id} for URL: ${message.url}`);
           }
           
           this.state.update(update);
       }
       return { acknowledged: true };
   }
   ```

## Tab-URL Association

To support independent tabs, each result tab maintains its own association with a specific URL, allowing for independent processing and display.

1. **URL Parameter**: When creating a result tab, the URL parameter is included:
   ```javascript
   chrome.tabs.create({
       url: chrome.runtime.getURL(`pages/result.html?url=${encodeURIComponent(tab.url)}`),
       active: true
   });
   ```

2. **Session Storage**: The result page stores the URL in session storage:
   ```javascript
   const urlParams = new URLSearchParams(window.location.search);
   const targetUrl = urlParams.get('url');
   if (targetUrl) {
       sessionStorage.setItem('targetUrl', targetUrl);
   }
   ```

3. **Message Filtering**: Result pages filter updates based on their target URL:
   ```javascript
   if (targetUrl && message.state && message.state.url !== targetUrl) {
       console.log('[DEBUG] Ignoring update for different URL:', message.state.url);
       return;
   }
   ```

4. **Content Loading**: Result pages load content specific to their target URL:
   ```javascript
   const targetUrl = sessionStorage.getItem('targetUrl');
   if (targetUrl) {
       contentToDisplay = contents.find(item => item.url === targetUrl);
   }
   ```

## State Management

The processing system uses a dedicated state manager to maintain and broadcast the current processing state.

1. **State Updates**: State is updated at each processing stage:
   ```javascript
   await this.stateManager.setState({
       stage: 'extracting',
       progress: 0.2,
       statusText: 'Extracting content from webpage...',
       url: url,
       // Other state fields...
   });
   ```

2. **State Broadcasting**: Updates are broadcasted to all tabs, but filtered by the tabs:
   ```javascript
   // In state manager
   async broadcastState() {
       chrome.runtime.sendMessage({
           type: 'processing_update',
           state: this.state
       });
   }
   
   // In result page
   if (targetUrl && message.state && message.state.url !== targetUrl) {
       // Ignore updates for other URLs
       return;
   }
   ```

## Error Handling

The processing system implements comprehensive error handling at multiple levels:

1. **Queue Level**: Errors during processing are caught and reported:
   ```javascript
   try {
       // Processing code
   } catch (processingError) {
       console.error('[Queue] Processing failed:', processingError);
       
       // Update state with error
       await this.stateManager.setState({
           stage: 'error',
           progress: 0,
           statusText: processingError.message || 'Processing failed',
           // Other state fields...
       });
   }
   ```

2. **Message Handler Level**: Message handling errors are caught and reported:
   ```javascript
   try {
       // Message handling code
   } catch (error) {
       console.error('[ERROR] Message handling failed:', error);
       throw error;
   }
   ```

## Implementation Details

### Queue Implementation

The queue is implemented using a JavaScript `Map` with URLs as keys:

```javascript
this.queue = new Map();

// Add to queue
this.queue.set(url, {
    ...info,
    enqueueTime: Date.now() // Track when URL was added to ensure FIFO order
});

// Remove from queue
this.queue.delete(url);

// Get queue size
this.queue.size
```

### Locking Mechanism

To prevent race conditions, a simple locking mechanism is implemented:

```javascript
// Acquire lock
this.processingLock = true;

try {
    // Processing code
} finally {
    // Always release lock
    this.processingLock = false;
}
```

### Content Storage

Processed content is stored using the `storageManager`:

```javascript
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