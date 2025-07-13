document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tempSlider = document.getElementById('temp-boost-slider');
  const tempNumberInput = document.getElementById('temp-boost-input');
  const domainSlider = document.getElementById('domain-boost-slider');
  const domainNumberInput = document.getElementById('domain-boost-input');
  
  const optionsLink = document.getElementById('options-link');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  const domainTitle = document.getElementById('domain-title');
  const domainDisplay = document.getElementById('current-domain-display');

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
        domainDisplay.textContent = currentDomain;
        domainTitle.textContent = strings[currentLang].siteWide;

        // 1. ドメイン設定を読み込み、ドメインスライダーを設定
        chrome.storage.sync.get({ boostSettings: {} }, (data) => {
          const domainBoost = data.boostSettings?.[currentDomain] ?? 100;
          updateControls(domainSlider, domainNumberInput, domainBoost);

          // 2. content.jsから現在のタブの音量を取得し、一時スライダーを設定
          chrome.tabs.sendMessage(currentTab.id, { type: 'GET_CURRENT_VOLUME' }, (response) => {
            if (chrome.runtime.lastError) {
              // content.jsが未注入の場合、ドメイン設定値をフォールバックとして使用
              updateControls(tempSlider, tempNumberInput, domainBoost);
              console.log("Content script not ready, using domain setting as fallback.");
            } else {
              // content.jsから取得した現在の値を使用
              updateControls(tempSlider, tempNumberInput, response.boost);
            }
          });
        });
        
        enableControls(true);
      } else {
        domainDisplay.textContent = strings[currentLang].statusUnsupported;
        domainTitle.textContent = strings[currentLang].siteWide;
        enableControls(false);
      }
    });
  }

  // --- Event Listeners ---
  function addEventListeners() {
    tempSlider.addEventListener('input', () => handleTempChange(tempSlider.value));
    tempNumberInput.addEventListener('input', () => handleTempChange(tempNumberInput.value));

    domainSlider.addEventListener('input', () => handleDomainChange(domainSlider.value));
    domainNumberInput.addEventListener('input', () => handleDomainChange(domainNumberInput.value));
    
    themeToggleBtn.addEventListener('click', handleThemeToggle);
    langToggleBtn.addEventListener('click', handleLangToggle);

    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    chrome.runtime.onMessage.addListener((request) => {
      if (request.type === 'SETTINGS_UPDATED') {
        initialize();
      }
    });
  }

  // --- Handlers ---
  function handleTempChange(value) {
    const boost = sanitizeBoostValue(value);
    updateControls(tempSlider, tempNumberInput, boost);
    applyBoostToTab(boost);
  }

  function handleDomainChange(value) {
    const boost = sanitizeBoostValue(value);
    updateControls(domainSlider, domainNumberInput, boost);
    // ドメイン設定を変更したら、一時設定もそれに追従させる
    updateControls(tempSlider, tempNumberInput, boost);
    applyBoostToTab(boost);
    saveDomainBoost(boost);
  }

  function handleThemeToggle() {
    const newTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    chrome.storage.sync.set({ theme: newTheme }, () => {
      applyTheme(newTheme);
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  function handleLangToggle() {
    const newLang = currentLang === 'ja' ? 'en' : 'ja';
    chrome.storage.sync.set({ language: newLang }, () => {
      currentLang = newLang;
      applyLanguage(newLang);
      initializePopupContent();
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  // --- Core Logic ---
  function applyBoostToTab(boost) {
    if (!currentTab || !currentTab.id) return;

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error(`Script injection failed: ${chrome.runtime.lastError.message}`);
        return;
      }
      chrome.tabs.sendMessage(currentTab.id, { type: 'UPDATE_VOLUME', boost: boost });
    });
  }

  function saveDomainBoost(boost) {
    if (!currentDomain) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      chrome.storage.sync.get({ boostSettings: {} }, (data) => {
        const settings = data.boostSettings || {};
        settings[currentDomain] = boost;
        chrome.storage.sync.set({ boostSettings: settings });
      });
    }, 500); // 保存処理のデバウンス
  }

  // --- UI Updates & Helpers ---
  function updateControls(slider, input, value) {
    slider.value = value;
    input.value = value;
  }
  
  function sanitizeBoostValue(value) {
    let boost = parseInt(value, 10);
    if (isNaN(boost)) return 100;
    if (boost < 10) boost = 10;
    if (boost > 600) boost = 600;
    return boost;
  }

  function enableControls(enabled) {
    tempSlider.disabled = !enabled;
    tempNumberInput.disabled = !enabled;
    domainSlider.disabled = !enabled;
    domainNumberInput.disabled = !enabled;
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.body.classList.toggle('theme-dark', theme === 'dark');
    themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  function applyLanguage(lang) {
    currentLang = lang;
    document.getElementById('appName').textContent = strings[lang].appName;
    document.getElementById('temp-title').textContent = strings[lang].currentTab;
    document.getElementById('domain-title').textContent = strings[lang].siteWide;
    document.getElementById('options-link').textContent = strings[lang].manageSettings;
    langToggleBtn.textContent = lang === 'ja' ? '🇺🇸' : '🇯🇵';
  }

  // --- Run ---
  initialize();
});