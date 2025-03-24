// Global state
let pageData = {
  title: '',
  url: '',
  content: '',
  summary: '' // Will be populated in Phase 2
};

let currentView = 'full'; // or 'summary'

console.log("New tab page loaded");

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  console.log("New tab DOM loaded");
  
  // Display a loading message
  const contentContainer = document.getElementById('content');
  if (contentContainer) {
    contentContainer.innerHTML = '<div class="loading"><p>Loading content...</p><p>Please wait while we process the page. This may take a few seconds.</p></div>';
  } else {
    console.error("Content container not found in newtab.html");
    // Create the content container if it doesn't exist
    const newContainer = document.createElement('div');
    newContainer.id = 'content';
    newContainer.innerHTML = '<div class="loading"><p>Loading content...</p><p>Please wait while we process the page. This may take a few seconds.</p></div>';
    document.body.appendChild(newContainer);
  }
  
  // Set up listener for messages from the popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Message received in new tab:", request.action);
    
    if (request.action === 'displayProcessedContent') {
      displayContent(request.data);
      sendResponse({status: "content received"});
    } else if (request.action === 'displayError') {
      displayError(request.error);
      sendResponse({status: "error received"});
    }
    
    return true; // Indicates async response
  });
  
  // Create toggle button if it doesn't exist
  if (!document.getElementById('toggleView')) {
    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggleView';
    toggleButton.textContent = 'Show Summary';
    toggleButton.style.display = 'none'; // Hide until content is loaded
    toggleButton.addEventListener('click', toggleView);
    
    // Insert the button at the top of the body
    document.body.insertBefore(toggleButton, document.body.firstChild);
  } else {
    // Toggle between views
    document.getElementById('toggleView').addEventListener('click', toggleView);
  }
});

// Function to display the processed content
function displayContent(data) {
  console.log("Displaying processed content");
  const contentContainer = document.getElementById('content');
  
  if (!contentContainer) {
    console.error("Content container not found");
    return;
  }
  
  // Store the data for later use
  pageData = data;
  
  // Clear loading message
  contentContainer.innerHTML = '';
  
  // Create containers for full and summary views
  const fullContent = document.createElement('div');
  fullContent.id = 'fullContent';
  fullContent.className = 'active';
  
  const summaryContent = document.createElement('div');
  summaryContent.id = 'summaryContent';
  
  // Display the title
  if (data.title) {
    const titleElement = document.createElement('h1');
    titleElement.textContent = data.title;
    contentContainer.appendChild(titleElement);
  }
  
  // Add the toggle button
  const toggleButton = document.getElementById('toggleView');
  if (toggleButton) {
    toggleButton.style.display = 'block';
  }
  
  // Populate the full content
  if (data.content) {
    fullContent.innerHTML = data.content;
    contentContainer.appendChild(fullContent);
  }
  
  // Populate the summary content if available
  if (data.summary) {
    summaryContent.innerHTML = data.summary;
    contentContainer.appendChild(summaryContent);
  } else {
    // If no summary, create a placeholder
    summaryContent.innerHTML = '<p>No summary available for this content.</p>';
    contentContainer.appendChild(summaryContent);
  }
  
  // Display any additional information
  if (data.metadata) {
    const metadataElement = document.createElement('div');
    metadataElement.className = 'metadata';
    metadataElement.innerHTML = `<p>Source: ${data.metadata.url || 'Unknown'}</p>`;
    contentContainer.appendChild(metadataElement);
  }
  
  // Update the view based on current state
  updateViewToggle();
}

// Function to display errors
function displayError(errorMessage) {
  console.error("Displaying error:", errorMessage);
  const contentContainer = document.getElementById('content');
  
  if (!contentContainer) {
    console.error("Content container not found");
    return;
  }
  
  contentContainer.innerHTML = `
    <div class="error">
      <h2>Error Processing Content</h2>
      <p>${errorMessage}</p>
      <p>Please try again or check if the Python backend is running at http://localhost:5001.</p>
    </div>
  `;
  
  // Hide the toggle button
  const toggleButton = document.getElementById('toggleView');
  if (toggleButton) {
    toggleButton.style.display = 'none';
  }
}

// Toggle between full and summary views
function toggleView() {
  console.log("Toggle view clicked, current view:", currentView);
  
  const fullContent = document.getElementById('fullContent');
  const summaryContent = document.getElementById('summaryContent');
  const toggleButton = document.getElementById('toggleView');
  
  if (!fullContent || !summaryContent) {
    console.error("Content divs not found");
    return;
  }
  
  if (currentView === 'full') {
    currentView = 'summary';
    fullContent.style.display = 'none';
    summaryContent.style.display = 'block';
    if (toggleButton) toggleButton.textContent = 'Show Full Content';
  } else {
    currentView = 'full';
    summaryContent.style.display = 'none';
    fullContent.style.display = 'block';
    if (toggleButton) toggleButton.textContent = 'Show Summary';
  }
  
  console.log("New view:", currentView);
}

// Update the toggle button based on current view
function updateViewToggle() {
  const fullContent = document.getElementById('fullContent');
  const summaryContent = document.getElementById('summaryContent');
  const toggleButton = document.getElementById('toggleView');
  
  if (!fullContent || !summaryContent || !toggleButton) {
    console.error("UI elements not found");
    return;
  }
  
  if (currentView === 'full') {
    fullContent.style.display = 'block';
    summaryContent.style.display = 'none';
    toggleButton.textContent = 'Show Summary';
  } else {
    summaryContent.style.display = 'block';
    fullContent.style.display = 'none';
    toggleButton.textContent = 'Show Full Content';
  }
} 