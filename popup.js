document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tempSlider = document.getElementById('temp-boost-slider');
  const tempNumberInput = document.getElementById('temp-boost-input');
  const domainSlider = document.getElementById('domain-boost-slider');
  const domainNumberInput = document.getElementById('domain-boost-input');
  
  // Account Control Elements
  const accountGroup = document.getElementById('control-group-account');
  const accountSlider = document.getElementById('account-boost-slider');
  const accountNumberInput = document.getElementById('account-boost-input');
  const accountTitle = document.getElementById('account-title');

  // Reset Buttons & Indicators
  const globalResetBtn = document.getElementById('global-reset-btn');
  const resetMenu = document.getElementById('reset-menu');
  let domainResetItem; // Will be created dynamically
  let accountResetItem; // Will be created dynamically
  
  const domainActiveIndicator = document.getElementById('domain-active');
  const accountActiveIndicator = document.getElementById('account-active');
  const tempActiveIndicator = document.getElementById('temp-active');

  const optionsBtn = document.getElementById('options-btn');

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const languageSelectorContainer = document.getElementById('language-selector-container');
  let languageSelect; // Will be created dynamically

  const domainTitle = document.getElementById('domain-title');
  const domainDisplay = document.getElementById('current-domain-display');

  // State
  let currentTab = null;
  let currentDomain = null;
  let currentAccountName = null;
  let debounceTimer;
  let currentLang = 'en'; // Default to English
  let currentTheme = 'light';
  
  // Active Status Flags
  let hasAccountSetting = false;
  let hasDomainSetting = false;
  let isTempActive = false;

  // Available languages with display names
  const availableLanguages = {
    'en': 'English',
    'ja': '日本語'
  };

  // --- Initialization ---
  function initialize() {
    initializeLanguageSelector(); // Create and populate the language dropdown
    initializeResetMenu(); // Create reset menu items

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
    languageSelectorContainer.innerHTML = ''; // Clear existing content to prevent duplicates
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
      vertical-align: middle;
    `;

    for (const langCode in availableLanguages) {
      const option = document.createElement('option');
      option.value = langCode;
      option.textContent = availableLanguages[langCode];
      languageSelect.appendChild(option);
    }
    languageSelectorContainer.appendChild(languageSelect);
  }

  function initializeResetMenu() {
    resetMenu.innerHTML = '';

    // Domain Reset Item
    domainResetItem = document.createElement('button');
    domainResetItem.className = 'reset-menu-item';
    domainResetItem.addEventListener('click', () => {
        handleDomainReset();
        resetMenu.classList.remove('show');
    });
    resetMenu.appendChild(domainResetItem);

    // Account Reset Item
    accountResetItem = document.createElement('button');
    accountResetItem.className = 'reset-menu-item';
    accountResetItem.addEventListener('click', () => {
        handleAccountReset();
        resetMenu.classList.remove('show');
    });
    resetMenu.appendChild(accountResetItem);
  }

  function initializePopupContent() {
    isTempActive = false; // Reset temp active state on init
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      currentTab = tabs[0];
      if (currentTab.url && currentTab.url.startsWith('http')) {
        // URL正規化とホスト名の取得
        let url = currentTab.url;
        url = url.replace(/^https?:\/\//, '');
        url = url.replace(/^www\./, '');
        const normalizedUrl = url;
        const hostname = new URL(currentTab.url).hostname.replace('www.', '');

        // 1. 設定を読み込み、最適なキー（ドメインまたはパス）を決定
        chrome.storage.sync.get({ boostSettings: {} }, (data) => {
          const settings = data.boostSettings || {};
          
          // 最長一致検索
          let bestMatchKey = null;
          let maxLen = -1;

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
               if (key.length > maxLen) {
                 maxLen = key.length;
                 bestMatchKey = key;
               }
             }
          }

          // マッチする設定があればそれを採用、なければホスト名をデフォルトにする
          if (bestMatchKey) {
            currentDomain = bestMatchKey;
          } else {
            currentDomain = hostname;
          }

          domainDisplay.textContent = currentDomain;
          domainTitle.textContent = strings[currentLang].siteWide;

          const domainBoost = settings[currentDomain] ?? 100;
          hasDomainSetting = settings[currentDomain] !== undefined; // Check if domain setting exists
          updateControls(domainSlider, domainNumberInput, domainBoost);

          // 2. content.jsから現在のタブの音量を取得し、一時スライダーを設定
          chrome.tabs.sendMessage(currentTab.id, { type: 'GET_CURRENT_VOLUME' }, (response) => {
            if (chrome.runtime.lastError) {
              // content.jsが未注入の場合、ドメイン設定値をフォールバックとして使用
              updateControls(tempSlider, tempNumberInput, domainBoost);
              console.log("Content script not ready, using domain setting as fallback.");
              accountGroup.style.display = 'none';
              domainActiveIndicator.style.display = 'none';
              accountActiveIndicator.style.display = 'none';
              tempActiveIndicator.style.display = 'none'; // Ensure temp is hidden if error
            } else {
              // content.jsから取得した現在の値を使用
              updateControls(tempSlider, tempNumberInput, response.boost);
              
              if (response.accountName) {
                currentAccountName = response.accountName;
                accountGroup.style.display = 'block';
                accountTitle.textContent = strings[currentLang].accountSpecific(currentAccountName);
                
                chrome.storage.sync.get({ accountSettings: {} }, (accData) => {
                    const accSettings = accData.accountSettings || {};
                    const accKey = `youtube:${currentAccountName}`;
                    
                    if (accSettings[accKey] !== undefined) {
                        hasAccountSetting = true;
                        updateControls(accountSlider, accountNumberInput, accSettings[accKey]);
                        
                        // Check if current boost differs from account setting
                        if (response.boost !== accSettings[accKey]) {
                            isTempActive = true;
                        }
                    } else {
                        hasAccountSetting = false;
                        // Use domain setting as default if no account setting
                        updateControls(accountSlider, accountNumberInput, domainBoost);
                        
                        // Check if current boost differs from domain setting (if it exists)
                        if (hasDomainSetting && response.boost !== domainBoost) {
                            isTempActive = true;
                        }
                    }
                    updateActiveIndicators();
                });
              } else {
                accountGroup.style.display = 'none';
                accountActiveIndicator.style.display = 'none';
                
                // Check if current boost differs from domain setting
                if (hasDomainSetting && response.boost !== domainBoost) {
                    isTempActive = true;
                }
                
                updateActiveIndicators();
              }
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

    // Account listeners
    accountSlider.addEventListener('input', () => handleAccountChange(accountSlider.value));
    accountNumberInput.addEventListener('input', () => handleAccountChange(accountNumberInput.value));

    // Reset Listeners
    globalResetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetMenu.classList.toggle('show');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.reset-menu-container')) {
            resetMenu.classList.remove('show');
        }
    });

    // Select text on click for number inputs
    tempNumberInput.addEventListener('click', (e) => e.target.select());
    domainNumberInput.addEventListener('click', (e) => e.target.select());
    accountNumberInput.addEventListener('click', (e) => e.target.select());

    // Mouse wheel listeners for sliders
    tempSlider.addEventListener('wheel', (e) => handleSliderWheel(e, tempSlider, handleTempChange));
    domainSlider.addEventListener('wheel', (e) => handleSliderWheel(e, domainSlider, handleDomainChange));
    accountSlider.addEventListener('wheel', (e) => handleSliderWheel(e, accountSlider, handleAccountChange));

    // Other UI listeners
    themeToggleBtn.addEventListener('click', handleThemeToggle);
    languageSelect.addEventListener('change', handleLanguageChange);
    optionsBtn.addEventListener('click', () => {
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
    isTempActive = true;
    updateActiveIndicators();
  }

  function handleDomainChange(value) {
    const boost = sanitizeBoostValue(value);
    updateControls(domainSlider, domainNumberInput, boost);
    // ドメイン設定を変更したら、一時設定もそれに追従させる
    updateControls(tempSlider, tempNumberInput, boost);
    
    // Also update account slider if account setting doesn't exist
    if (!hasAccountSetting) {
        updateControls(accountSlider, accountNumberInput, boost);
    }

    applyBoostToTab(boost);
    hasDomainSetting = true; // Mark as having a setting (being edited/saved)
    isTempActive = false;
    updateActiveIndicators();
    saveDomainBoost(boost);
  }

  function handleAccountChange(value) {
    const boost = sanitizeBoostValue(value);
    updateControls(accountSlider, accountNumberInput, boost);
    updateControls(tempSlider, tempNumberInput, boost);
    applyBoostToTab(boost);
    hasAccountSetting = true; // Mark as having a setting
    isTempActive = false;
    updateActiveIndicators();
    saveAccountBoost(boost);
  }

  function saveAccountBoost(boost) {
    if (!currentAccountName) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      chrome.storage.sync.get({ accountSettings: {} }, (data) => {
        const settings = data.accountSettings || {};
        const key = `youtube:${currentAccountName}`;
        settings[key] = boost;
        chrome.storage.sync.set({ accountSettings: settings });
      });
    }, 500);
  }

  function handleDomainReset() {
      if (!currentDomain) return;
      chrome.storage.sync.get({ boostSettings: {} }, (data) => {
          const settings = data.boostSettings || {};
          if (settings[currentDomain]) {
              delete settings[currentDomain];
              chrome.storage.sync.set({ boostSettings: settings }, () => {
                  hasDomainSetting = false;
                  updateActiveIndicators();
                  // Note: We don't fully re-initialize here to avoid UI jump, 
                  // but ideally we should refresh values. 
                  // For now, let's at least update indicators.
                  // Re-initializing ensures correct fallback values are loaded.
                  initialize(); 
                  chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
              });
          }
      });
  }

  function handleAccountReset() {
      if (!currentAccountName) return;
      const key = `youtube:${currentAccountName}`;
      chrome.storage.sync.get({ accountSettings: {} }, (data) => {
          const settings = data.accountSettings || {};
          if (settings[key]) {
              delete settings[key];
              chrome.storage.sync.set({ accountSettings: settings }, () => {
                   hasAccountSetting = false;
                   updateActiveIndicators();
                   initialize();
                   chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
              });
          }
      });
  }

  function updateActiveIndicators() {
      domainActiveIndicator.style.display = 'none';
      accountActiveIndicator.style.display = 'none';
      tempActiveIndicator.style.display = 'none';
      
      if (isTempActive) {
          tempActiveIndicator.style.display = 'inline-block';
          return;
      }

      if (hasAccountSetting) {
          accountActiveIndicator.style.display = 'inline-block';
      } else if (hasDomainSetting) {
          domainActiveIndicator.style.display = 'inline-block';
      } else {
          tempActiveIndicator.style.display = 'inline-block';
      }
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
    accountSlider.disabled = !enabled;
    accountNumberInput.disabled = !enabled;
    
    globalResetBtn.disabled = !enabled;
    if (domainResetItem) domainResetItem.disabled = !enabled;
    if (accountResetItem) accountResetItem.disabled = !enabled;
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.body.classList.toggle('theme-dark', theme === 'dark');
    
    // SVG Icons
    const sunIcon = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="12" cy="12" r="5" /><g><rect x="11" y="1" width="2" height="4" rx="1" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(45 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(90 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(135 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(180 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(225 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(270 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(315 12 12)" /></g></svg>`;
    const moonIcon = `<svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>`;
    
    themeToggleBtn.innerHTML = theme === 'dark' ? moonIcon : sunIcon;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    document.getElementById('appName').textContent = strings[lang].appName;
    document.getElementById('temp-title').textContent = strings[lang].currentTab;
    document.getElementById('domain-title').textContent = strings[lang].siteWide;
    
    optionsBtn.title = strings[lang].manageSettings;
    
    domainActiveIndicator.textContent = strings[lang].active;
    accountActiveIndicator.textContent = strings[lang].active;
    tempActiveIndicator.textContent = strings[lang].active;
    
    globalResetBtn.title = strings[lang].reset;
    if (domainResetItem) domainResetItem.textContent = strings[lang].resetDomain;
    if (accountResetItem) accountResetItem.textContent = strings[lang].resetAccount;
  }

  // --- Run ---
  initialize();
});