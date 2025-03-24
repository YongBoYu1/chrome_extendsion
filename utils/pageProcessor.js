// Functions for processing pages
export function processPage(mode, pageInfo) {
    console.log('Starting to process page:', {
        mode: mode,
        url: pageInfo.url,
        contentLength: pageInfo.content?.length || 0,
        title: pageInfo.title
    });

    if (mode === 'duplicate') {
        // Create a loading tab first
        const loadingUrl = chrome.runtime.getURL('pages/loading.html') + 
            `?url=${encodeURIComponent(pageInfo.url)}&mode=${encodeURIComponent(mode)}`;
        
        chrome.tabs.create({ url: loadingUrl }, (tab) => {
            // Use FireCrawl to scrape the content properly
            scrapeAndDisplayContent(pageInfo.url, tab);
        });
        return;
    }
    
    // For other modes (summarize, focus), use the loading page first
    const loadingUrl = chrome.runtime.getURL('pages/loading.html') + 
        `?url=${encodeURIComponent(pageInfo.url)}&mode=${encodeURIComponent(mode)}`;
    
    console.log('Loading URL:', loadingUrl);
    
    chrome.tabs.create({ url: loadingUrl }, (tab) => {
        console.log('Created new tab:', tab.id);
        if (mode === 'focus') {
            // For focus mode, use FireCrawl to get clean content
            scrapeAndDisplayFocused(pageInfo.url, tab);
        } else {
            // For summarize mode, use backend processing with the API
            handlePageProcessing(mode, pageInfo, tab);
        }
    });
}

// Scrape content with FireCrawl and display in a clean UI
async function scrapeAndDisplayContent(url, tab) {
    try {
        // Use FireCrawl to scrape the page with markdown format
        const response = await fetch('https://fire-crawl.fly.dev/api/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                formats: ['markdown', 'html'],
                onlyMainContent: true
            })
        });
        
        const data = await response.json();
        console.log('FireCrawl response:', data);
        
        if (data && data.markdown) {
            // Store the content in storage
            chrome.storage.local.set({
                'pageContent': {
                    content: data.markdown,
                    htmlContent: data.html,
                    url: url,
                    title: data.title || "Scraped Content"
                }
            }, () => {
                // Update the tab with the display page
                chrome.tabs.update(tab.id, {
                    url: chrome.runtime.getURL('pages/display.html')
                });
            });
        } else {
            handleError(new Error('Failed to scrape content'), 'duplicate', url, tab);
        }
    } catch (error) {
        console.error('Error scraping content:', error);
        handleError(error, 'duplicate', url, tab);
    }
}

// Scrape content with FireCrawl and display in focus mode
async function scrapeAndDisplayFocused(url, tab) {
    try {
        // Use FireCrawl to scrape the page with focus on main content
        const response = await fetch('https://fire-crawl.fly.dev/api/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                formats: ['markdown', 'html'],
                onlyMainContent: true,
                removeBase64Images: true
            })
        });
        
        const data = await response.json();
        console.log('FireCrawl response for focus mode:', data);
        
        if (data && data.html) {
            // Store the focused content
            chrome.storage.local.set({
                'focusContent': {
                    content: data.html,
                    url: url,
                    title: data.title || "Focus Mode"
                }
            }, () => {
                // Update the tab with the focus display page
                chrome.tabs.update(tab.id, {
                    url: chrome.runtime.getURL('pages/focus.html')
                });
            });
        } else {
            handleError(new Error('Failed to scrape content for focus mode'), 'focus', url, tab);
        }
    } catch (error) {
        console.error('Error scraping content for focus mode:', error);
        handleError(error, 'focus', url, tab);
    }
}

function handlePageProcessing(mode, pageInfo, tab) {
    console.log('Sending request to backend:', {
        mode,
        title: pageInfo.title,
        url: pageInfo.url,
        contentLength: pageInfo.content?.length || 0
    });

    // For summarize mode, we can either:
    // 1. Use the backend API if it supports summarization
    // 2. Use FireCrawl to get content and then use a summarization API

    // Option 1: Using backend API (original approach)
    const fetchPromise = fetch('http://localhost:5001/api/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            mode: mode,
            title: pageInfo.title,
            url: pageInfo.url,
            content: pageInfo.content,
            plainText: pageInfo.plainText
        })
    });

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000);
    });

    Promise.race([fetchPromise, timeoutPromise])
        .then(response => {
            console.log('Got response from backend:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Processed data:', data);
            return updateTabWithResults(data, mode, pageInfo.url, tab);
        })
        .catch(error => {
            console.error('Error processing page:', error);
            handleError(error, mode, pageInfo.url, tab);
        });
} 