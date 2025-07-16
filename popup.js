document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tempSlider = document.getElementById('temp-boost-slider');
  const tempNumberInput = document.getElementById('temp-boost-input');
  const domainSlider = document.getElementById('domain-boost-slider');
  const domainNumberInput = document.getElementById('domain-boost-input');
  
  const optionsLink = document.getElementById('options-link');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const languageSelectorContainer = document.getElementById('language-selector-container');
  let languageSelect; // Will be created dynamically

  const domainTitle = document.getElementById('domain-title');
  const domainDisplay = document.getElementById('current-domain-display');

  // State
  let currentTab = null;
  let currentDomain = null;
  let debounceTimer;
  let currentLang = 'en'; // Default to English
  let currentTheme = 'light';

  // Available languages with display names
  const availableLanguages = {
    'en': 'English',
    'ja': '日本語'
  };

  // --- Initialization ---
  function initialize() {
    initializeLanguageSelector(); // Create and populate the language dropdown

    chrome.storage.sync.get(['theme', 'language'], (settings) => {
      // Determine initial theme
      currentTheme = settings.theme || 'dark'; // Default to dark
      applyTheme(currentTheme);

      // Determine initial language
      let initialLang = settings.language;
      if (!initialLang) {
        const browserUILang = chrome.i18n.getUILanguage();
        // Use the first two characters for language code (e.g., 'en-US' -> 'en')
        const shortLang = browserUILang.split('-')[0]; 
        if (strings[shortLang]) {
          initialLang = shortLang;
        } else {
          initialLang = 'en'; // Fallback to English if browser language not supported
        }
      }
      
      currentLang = initialLang;
      languageSelect.value = currentLang; // Set dropdown value
      applyLanguage(currentLang);
      initializePopupContent();
    });

    addEventListeners();
  }

  function initializeLanguageSelector() {
    languageSelect = document.createElement('select');
    languageSelect.id = 'language-select';
    languageSelect.style.cssText = `
      padding: 5px 8px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background-color: var(--input-bg-color);
      color: var(--text-color);
      font-size: 12px;
      cursor: pointer;
      outline: none;
      vertical-align: middle; /* Added for better alignment */
    `;

    for (const langCode in availableLanguages) {
      const option = document.createElement('option');
      option.value = langCode;
      option.textContent = availableLanguages[langCode];
      languageSelect.appendChild(option);
    }
    languageSelectorContainer.appendChild(languageSelect);
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
        
        const controlGroups = document.querySelectorAll('.control-group');
        controlGroups.forEach(element => {
          element.style.display = 'none';
        });
      }
    });
  }

  // --- Event Listeners ---
  function addEventListeners() {
    // Slider and number input listeners
    tempSlider.addEventListener('input', () => handleTempChange(tempSlider.value));
    tempNumberInput.addEventListener('input', () => handleTempChange(tempNumberInput.value));
    domainSlider.addEventListener('input', () => handleDomainChange(domainSlider.value));
    domainNumberInput.addEventListener('input', () => handleDomainChange(domainNumberInput.value));

    // Select text on click for number inputs
    tempNumberInput.addEventListener('click', (e) => e.target.select());
    domainNumberInput.addEventListener('click', (e) => e.target.select());

    // Mouse wheel listeners for sliders
    tempSlider.addEventListener('wheel', (e) => handleSliderWheel(e, tempSlider, handleTempChange));
    domainSlider.addEventListener('wheel', (e) => handleSliderWheel(e, domainSlider, handleDomainChange));

    // Other UI listeners
    themeToggleBtn.addEventListener('click', handleThemeToggle);
    languageSelect.addEventListener('change', handleLanguageChange);
    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    // Listener for updates from other parts of the extension
    chrome.runtime.onMessage.addListener((request) => {
      if (request.type === 'SETTINGS_UPDATED') {
        initialize();
      }
    });
  }

  // --- Handlers ---
  function handleSliderWheel(event, slider, handler) {
    event.preventDefault();
    const currentValue = parseInt(slider.value, 10);
    let step = 0;

    if (event.deltaY < 0) { // Scrolling up
      step = currentValue < 100 ? 10 : 20;
    } else { // Scrolling down
      step = currentValue <= 100 ? -10 : -20;
    }

    const newValue = currentValue + step;
    handler(newValue);
  }
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

  function handleLanguageChange() {
    const newLang = languageSelect.value;
    chrome.storage.sync.set({ language: newLang }, () => {
      currentLang = newLang;
      applyLanguage(newLang);
      initializePopupContent(); // Re-initialize content to apply new language strings
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
    if (boost < 0) boost = 0;
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
    // No longer updating a button text for language
  }

  // --- Run ---
  initialize();
});