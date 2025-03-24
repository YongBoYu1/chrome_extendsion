// Handle page content display with markdown rendering
window.addEventListener('DOMContentLoaded', () => {
    // Set up the view toggle
    const formatToggle = document.getElementById('formatToggle');
    const rawToggle = document.getElementById('rawToggle');
    const markdownContent = document.getElementById('markdownContent');
    const rawContent = document.getElementById('rawContent');
    
    formatToggle.addEventListener('click', () => {
        formatToggle.classList.add('active');
        rawToggle.classList.remove('active');
        markdownContent.style.display = 'block';
        rawContent.style.display = 'none';
    });
    
    rawToggle.addEventListener('click', () => {
        rawToggle.classList.add('active');
        formatToggle.classList.remove('active');
        rawContent.style.display = 'block';
        markdownContent.style.display = 'none';
    });
    
    // Get content from storage
    chrome.storage.local.get(['pageContent'], (result) => {
        if (result.pageContent) {
            const { content, htmlContent, url, title } = result.pageContent;
            
            // Update page elements
            document.title = `${title} - Content`;
            document.getElementById('pageTitle').textContent = title;
            document.getElementById('sourceUrl').href = url;
            
            // Set the raw content
            rawContent.textContent = content;
            
            // Render markdown
            try {
                // Configure marked options
                marked.setOptions({
                    breaks: true,
                    gfm: true
                });
                
                // Render the markdown
                markdownContent.innerHTML = marked.parse(content);
                
                // Add target="_blank" to all links
                const links = markdownContent.querySelectorAll('a');
                links.forEach(link => {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                });
            } catch (error) {
                console.error('Error rendering markdown:', error);
                markdownContent.innerHTML = '<p>Error rendering content. Showing raw content instead.</p>';
                formatToggle.click(); // Switch to raw view
            }
            
            // Clean up storage
            chrome.storage.local.remove('pageContent');
        } else {
            document.getElementById('pageTitle').textContent = 'Error Loading Content';
            markdownContent.innerHTML = '<p>Could not load the content. Please try again.</p>';
        }
    });
}); 