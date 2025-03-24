// Handle focus mode content display
window.addEventListener('DOMContentLoaded', () => {
    // Get content from storage
    chrome.storage.local.get(['focusContent'], (result) => {
        if (result.focusContent) {
            const { content, url, title } = result.focusContent;
            
            // Update page elements
            document.title = `${title} - Focus Mode`;
            document.getElementById('pageTitle').textContent = title;
            document.getElementById('sourceUrl').textContent = 'Original Article';
            document.getElementById('sourceUrl').href = url;
            
            // Insert the HTML content
            document.getElementById('pageContent').innerHTML = content;
            
            // Clean up storage
            chrome.storage.local.remove('focusContent');
            
            // Add event listener for dark mode toggle
            setupDarkModeToggle();
        } else {
            document.getElementById('pageTitle').textContent = 'Error Loading Content';
            document.getElementById('pageContent').innerHTML = '<p>Could not load the content. Please try again.</p>';
        }
    });
});

// Setup dark mode toggle
function setupDarkModeToggle() {
    const toggle = document.getElementById('darkModeToggle');
    
    // Check for saved preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    
    // Apply initial state
    if (darkMode) {
        document.body.classList.add('dark-mode');
        toggle.checked = true;
    }
    
    // Add event listener
    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
        }
    });
} 