// background.js

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // This listener is required to handle messages from popup.js or options.js
  if (request.type === 'SETTINGS_UPDATED') {
    // Settings were updated, potentially react here if needed.
  }
});

// Listen for tab updates (e.g., navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the tab has a URL and either the status is complete OR the URL changed (SPA navigation)
  const isComplete = changeInfo.status === 'complete';
  const isUrlChanged = changeInfo.url !== undefined;

  if ((isComplete || isUrlChanged) && tab.url && tab.url.startsWith('http')) {
    let url = tab.url;
    url = url.replace(/^https?:\/\//, '');
    url = url.replace(/^www\./, '');
    const normalizedUrl = url;

    // Try to notify existing content script first
    chrome.tabs.sendMessage(tabId, { type: 'URL_CHANGED', url: tab.url }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not present, proceed to check settings and inject if needed
        checkAndInject(tabId, normalizedUrl);
      }
    });
  }
});

function checkAndInject(tabId, normalizedUrl) {
    // Get the saved settings
    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings || {};
      
      // Check if any setting matches the current URL
      let shouldInject = false;
      for (const key in settings) {
         let isMatch = false;
         if (normalizedUrl.startsWith(key)) {
            if (normalizedUrl.length === key.length) {
                isMatch = true;
            } else {
                const nextChar = normalizedUrl[key.length];
                if (['/', '?', '#'].includes(nextChar)) isMatch = true;
            }
         }
         if (isMatch) {
           shouldInject = true;
           break;
         }
      }

      if (shouldInject) {
        // Inject the content script into the tab
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
              console.error(`Script injection failed: ${chrome.runtime.lastError.message}`);
          }
        });
      }
    });
}