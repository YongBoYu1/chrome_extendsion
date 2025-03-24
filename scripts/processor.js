// Handles all page processing and communication with backend
class PageProcessor {
    constructor() {
        this.backendUrl = 'http://localhost:5001';
    }

    async processPage(mode, pageInfo) {
        console.log('Processing page:', pageInfo.url, 'Mode:', mode);
        
        try {
            // Show loading page
            const loadingUrl = chrome.runtime.getURL('pages/loading.html') + 
                `?url=${encodeURIComponent(pageInfo.url)}&mode=${encodeURIComponent(mode)}`;
            
            const tab = await chrome.tabs.create({ url: loadingUrl });
            
            // Send request to backend
            const response = await this.sendToBackend(mode, pageInfo);
            
            // Update tab with results
            const resultHtml = this.generateResultPage(response, mode, pageInfo.url);
            await chrome.tabs.update(tab.id, {
                url: `data:text/html;charset=utf-8,${encodeURIComponent(resultHtml)}`
            });

        } catch (error) {
            console.error('Processing error:', error);
            const errorHtml = this.generateErrorPage(error.message, mode, pageInfo.url);
            await chrome.tabs.update(tab.id, {
                url: `data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`
            });
        }
    }

    async sendToBackend(mode, pageInfo) {
        const response = await fetch(`${this.backendUrl}/api/process`, {
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

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        return response.json();
    }

    generateResultPage(data, mode, originalUrl) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>${data.title || 'Processed Page'}</title>
            <link rel="stylesheet" href="${chrome.runtime.getURL('styles/main.css')}">
        </head>
        <body>
            <div class="header">
                <h1>${data.title || 'Processed Page'}</h1>
                <a href="${originalUrl}" class="source-link">View Original</a>
            </div>
            <div class="content">
                ${data.summary || ''}
                ${data.content || 'No content available'}
            </div>
            <div class="footer">
                Processed in ${mode} mode
            </div>
        </body>
        </html>`;
    }

    generateErrorPage(errorMessage, mode, originalUrl) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Error Processing Page</title>
            <link rel="stylesheet" href="${chrome.runtime.getURL('styles/main.css')}">
        </head>
        <body>
            <div class="error-container">
                <h1>Error Processing Page</h1>
                <div class="error-message">${errorMessage}</div>
                <div class="troubleshooting">
                    <p>Please check:</p>
                    <ul>
                        <li>Backend server is running (http://localhost:5001)</li>
                        <li>Page content is accessible</li>
                    </ul>
                </div>
                <a href="${originalUrl}" class="back-link">Return to original page</a>
            </div>
        </body>
        </html>`;
    }

    async checkBackendStatus() {
        try {
            const response = await fetch(`${this.backendUrl}/api/ping`);
            const data = await response.json();
            return data.status === 'ok';
        } catch (error) {
            console.error('Backend check failed:', error);
            return false;
        }
    }
}

// Export for use in popup.js
window.pageProcessor = new PageProcessor(); 