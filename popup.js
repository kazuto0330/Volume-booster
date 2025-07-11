document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const slider = document.getElementById('boost-slider');
  const numberInput = document.getElementById('boost-input');
  const optionsLink = document.getElementById('options-link');
  const statusMessage = document.getElementById('status-message');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const langToggleBtn = document.getElementById('lang-toggle-btn');

  // State
  let currentTab = null;
  let currentDomain = null;
  let debounceTimer;
  let currentLang = 'ja';
  let currentTheme = 'light';

  // --- Initialization ---
  function initialize() {
    chrome.storage.sync.get(['theme', 'language'], (settings) => {
      currentTheme = settings.theme || 'light';
      currentLang = settings.language || 'ja';
      applyTheme(currentTheme);
      applyLanguage(currentLang);
      initializePopupContent();
    });

    addEventListeners();
  }

  function initializePopupContent() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      currentTab = tabs[0];
      if (currentTab.url && currentTab.url.startsWith('http')) {
        currentDomain = new URL(currentTab.url).hostname.replace('www.', '');
        
        chrome.storage.sync.get({ boostSettings: {} }, (data) => {
          const settings = data.boostSettings;
          const boost = settings[currentDomain] || 100;
          
          slider.value = boost;
          numberInput.value = boost;

          if (settings[currentDomain]) {
            statusMessage.textContent = strings[currentLang].statusSet(boost);
          } else {
            statusMessage.textContent = strings[currentLang].statusNotSet;
          }
        });
      } else {
        statusMessage.textContent = strings[currentLang].statusUnsupported;
        slider.disabled = true;
        numberInput.disabled = true;
      }
    });
  }

  // --- Event Listeners ---
  function addEventListeners() {
    slider.addEventListener('input', () => handleControlChange(slider.value));
    numberInput.addEventListener('input', () => handleControlChange(numberInput.value));
    
    themeToggleBtn.addEventListener('click', handleThemeToggle);
    langToggleBtn.addEventListener('click', handleLangToggle);

    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    // Listen for updates from other parts of the extension
    chrome.runtime.onMessage.addListener((request) => {
      if (request.type === 'SETTINGS_UPDATED') {
        initialize();
      }
    });
  }

  // --- Handlers ---
  function handleControlChange(value) {
    let boost = parseInt(value, 10);
    if (isNaN(boost)) return;
    if (boost < 10) boost = 10;
    if (boost > 600) boost = 600;
    
    updateAndSave(boost);
  }

  function handleThemeToggle() {
    const newTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    chrome.storage.sync.set({ theme: newTheme }, () => {
      applyTheme(newTheme);
      // Notify other extension pages
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  function handleLangToggle() {
    const newLang = currentLang === 'ja' ? 'en' : 'ja';
    chrome.storage.sync.set({ language: newLang }, () => {
      currentLang = newLang;
      applyLanguage(newLang);
      initializePopupContent(); // Re-render text content
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  // --- Core Logic ---
  function updateAndSave(boost) {
    slider.value = boost;
    numberInput.value = boost;

    if (!currentTab || !currentTab.id) return;

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['content.js']
    }, () => {
      if (chrome.runtime.lastError) return;
      chrome.tabs.sendMessage(currentTab.id, { type: 'UPDATE_VOLUME', boost: boost });
    });

    if (!currentDomain) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      chrome.storage.sync.get({ boostSettings: {} }, (data) => {
        const settings = data.boostSettings;
        settings[currentDomain] = parseInt(boost, 10);
        chrome.storage.sync.set({ boostSettings: settings }, () => {
          statusMessage.textContent = strings[currentLang].statusSaved(boost);
        });
      });
    }, 300);
  }

  // --- UI Updates ---
  function applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  function applyLanguage(lang) {
    currentLang = lang;
    document.getElementById('appName').textContent = strings[lang].appName;
    document.getElementById('options-link').textContent = strings[lang].manageSettings;
    langToggleBtn.textContent = lang === 'ja' ? '🇺🇸' : '🇯🇵';
  }

  // --- Run ---
  initialize();
});


