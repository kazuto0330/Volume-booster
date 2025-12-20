// background.js

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // This listener is currently empty but is required to prevent errors
  // when other parts of the extension (like popup.js) send messages.
  // It's good practice to return true for asynchronous message handling.
  if (request.type === 'SETTINGS_UPDATED') {
    // In the future, you could add logic here to react to settings changes.
    console.log('Settings updated message received in background.');
  }
  return true;
});

// background.js

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // This listener is currently empty but is required to prevent errors
  // when other parts of the extension (like popup.js) send messages.
  // It's good practice to return true for asynchronous message handling.
  if (request.type === 'SETTINGS_UPDATED') {
    // In the future, you could add logic here to react to settings changes.
    console.log('Settings updated message received in background.');
  }
  return true;
});

// Listen for tab updates (e.g., navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the tab has a URL and the page is fully loaded
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    let url = tab.url;
    url = url.replace(/^https?:\/\//, '');
    url = url.replace(/^www\./, '');
    const normalizedUrl = url;

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
          } else {
              console.log(`Injected content.js into ${normalizedUrl} due to matching setting.`);
          }
        });
      }
    });
  }
});
