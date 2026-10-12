// background.js
importScripts('common/utils.js');

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'welcome/welcome.html' });
  }
});

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
    const normalizedUrl = normalizeUrl(tab.url);

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
    const matchedKey = findBestMatchingKey(normalizedUrl, settings);

    if (matchedKey !== null) {
      // Inject utils.js and content.js into the tab
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['common/utils.js', 'content/content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error(`Script injection failed: ${chrome.runtime.lastError.message}`);
        }
      });
    }
  });
}