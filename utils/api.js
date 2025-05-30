/**
 * API Client for Backend Communication
 * Handles all requests to the Python backend
 */

const CONFIG = {
    BACKEND_URL: 'https://summary-extension-backend-518552901017.us-central1.run.app',
    API_PREFIX: '/api', // Define the common prefix
    PING_ENDPOINT: '/ping',
    SUMMARIZE_ENDPOINT: '/summarize',
    FIRECRAWL_STATUS_ENDPOINT: '/firecrawl/status',
    FIRECRAWL_SCRAPE_ENDPOINT: '/firecrawl/scrape',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BACKEND_TIMEOUT: 30000  // Increased to 30 seconds
};

class APIClient {
    async ping() {
        // Construct endpoint using config
        const endpoint = `${CONFIG.API_PREFIX}${CONFIG.PING_ENDPOINT}`;
        return this.#makeRequest(endpoint);
    }

    async summarize(url, mode = 'summarize') {
        // Construct endpoint using config
        const endpoint = `${CONFIG.API_PREFIX}${CONFIG.SUMMARIZE_ENDPOINT}`;
        return this.#makeRequest(endpoint, {
            method: 'POST',
            body: { url, mode }
        });
    }

    async checkFireCrawlStatus() {
        // Construct endpoint using config
        const endpoint = `${CONFIG.API_PREFIX}${CONFIG.FIRECRAWL_STATUS_ENDPOINT}`;
        return this.#makeRequest(endpoint);
    }

    async scrape(url, options = {}) {
        // Construct endpoint using config
        const endpoint = `${CONFIG.API_PREFIX}${CONFIG.FIRECRAWL_SCRAPE_ENDPOINT}`;
        return this.#makeRequest(endpoint, {
            method: 'POST',
            body: { url, ...options }
        });
    }

    async #makeRequest(endpoint, { method = 'GET', body = null } = {}) {
        const url = `${CONFIG.BACKEND_URL}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                
                // Provide more specific error messages
                switch (response.status) {
                    case 400:
                        errorMessage = 'Invalid request. Please check the URL and try again.';
                        break;
                    case 403:
                        errorMessage = 'Access denied. The page may be protected.';
                        break;
                    case 404:
                        errorMessage = 'Page not found. Please check the URL.';
                        break;
                    case 429:
                        errorMessage = 'Too many requests. Please wait a moment and try again.';
                        break;
                    case 500:
                        errorMessage = 'Server error. The page may not be supported or our service is temporarily unavailable.';
                        break;
                    case 502:
                    case 503:
                    case 504:
                        errorMessage = 'Service temporarily unavailable. Please try again later.';
                        break;
                    default:
                        errorMessage = `Service error (${response.status}). Please try again.`;
                }
                
                throw new Error(errorMessage);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, {
                error: error.message,
                url,
                method,
                body: options.body
            });
            
            // Re-throw with the more user-friendly message if it's an HTTP error
            if (error.message.includes('HTTP error!') || error.message.includes('error (')) {
                throw error;
            }
            
            // For network errors, provide a generic message
            throw new Error('Network error. Please check your internet connection and try again.');
        }
    }
}

// Export singleton instance
export const apiClient = new APIClient(); 