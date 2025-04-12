/**
 * API Client for Backend Communication
 * Handles all requests to the Python backend
 */

const CONFIG = {
    BACKEND_URL: 'http://localhost:5001',
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, {
                error: error.message,
                url,
                method,
                body: options.body
            });
            throw new Error(`Failed to ${method.toLowerCase()} ${endpoint}: ${error.message}`);
        }
    }
}

// Export singleton instance
export const apiClient = new APIClient(); 