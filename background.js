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
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const domain = url.hostname.replace('www.', ''); // a.com and www.a.com are treated the same

    // Get the saved settings
    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings;
      
      // Check if the current domain is in our settings
      if (domain in settings) {
        const boostValue = settings[domain];
        
        // Inject the content script into the tab
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }, () => {
          // After injecting, send the boost value to the content script
          // Note: It's often better for content.js to fetch this itself,
          // but sending a message is also a valid approach.
          // For simplicity, we'll let content.js fetch it from storage.
          console.log(`Injected content.js into ${domain}.`);
        });
      }
    });
  }
});
