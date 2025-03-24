document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageUrl = urlParams.get('url') || 'Unknown URL';
    const mode = urlParams.get('mode') || 'processing';
    
    document.getElementById('urlDisplay').textContent = pageUrl;
    document.title = `Processing: ${pageUrl.substring(0, 30)}${pageUrl.length > 30 ? '...' : ''}`;
    
    const statusUpdates = document.getElementById('statusUpdates');
    
    function addStatus(message) {
        const statusItem = document.createElement('div');
        statusItem.className = 'status-item';
        statusItem.textContent = message;
        statusUpdates.appendChild(statusItem);
        statusUpdates.scrollTop = statusUpdates.scrollHeight;
    }
    
    setTimeout(() => addStatus(`Connecting to backend server...`), 500);
    setTimeout(() => addStatus(`Fetching content from URL...`), 1200);
    setTimeout(() => addStatus(`Sending page content to processor...`), 2000);
    
    setTimeout(() => {
        if (mode === 'summarize') {
            addStatus(`Analyzing content for summary...`);
        } else if (mode === 'focus') {
            addStatus(`Removing distractions and formatting content...`);
        } else if (mode === 'duplicate') {
            addStatus(`Creating clean duplicate of the page...`);
        }
    }, 3000);
    
    setTimeout(() => {
        if (document.body.contains(statusUpdates)) {
            addStatus(`Still processing... If this takes too long, please check if the backend server is running.`);
        }
    }, 8000);
}); 