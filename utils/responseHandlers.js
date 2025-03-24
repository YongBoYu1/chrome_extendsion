// Functions for handling responses and errors
export function handleResponse(response) {
    console.log('Received response:', response.status);
    if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
    }
    return response.json();
}

export function updateTabWithResults(data, mode, originalUrl, tab) {
    console.log('Successfully processed data');
    const resultHtml = generateResultPage(data, mode, originalUrl);
    chrome.tabs.update(tab.id, {
        url: `data:text/html;charset=utf-8,${encodeURIComponent(resultHtml)}`
    });
}

export function handleError(error, mode, originalUrl, tab) {
    console.error('Processing error:', error);
    const errorMessage = error.message || 'Unknown error occurred';
    const errorHtml = generateErrorPage(
        `Failed to process page: ${errorMessage}\n\n` +
        `Debug info:\n` +
        `- Mode: ${mode}\n` +
        `- URL: ${originalUrl}\n` +
        `- Backend: http://localhost:5001/api/process`,
        mode,
        originalUrl
    );
    chrome.tabs.update(tab.id, {
        url: `data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`
    });
} 