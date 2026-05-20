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
  let tempResetItem; // Will be created dynamically
  let noSettingsItem; // Will be created dynamically
  
  const domainActiveIndicator = document.getElementById('domain-active');
  const accountActiveIndicator = document.getElementById('account-active');
  const tempActiveIndicator = document.getElementById('temp-active');

  const optionsBtn = document.getElementById('options-btn');
  const toggleExpandBtn = document.getElementById('toggle-expand-btn');
  const advancedSettingsContainer = document.getElementById('advanced-settings-container');

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const languageSelectorContainer = document.getElementById('language-selector-container');
  let languageBtn;
  let languageMenu;

  const domainTitle = document.getElementById('domain-title');
  const domainDisplay = document.getElementById('current-domain-display');

  // Tooltips
  const tooltipDomain = document.getElementById('tooltip-domain');
  const tooltipAccount = document.getElementById('tooltip-account');
  const tooltipTemp = document.getElementById('tooltip-temp');

  // State
  let currentTab = null;
  let currentDomain = null;
  let currentAccountName = null;
  let debounceTimer;
  let tooltipTimer;
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

    chrome.storage.sync.get(['theme', 'language', 'isExpanded'], (settings) => {
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
      // languageSelect.value = currentLang; // No longer select element
      applyLanguage(currentLang);
      initializePopupContent();

      // Determine initial advanced settings expanded state
      const isExpanded = settings.isExpanded || false;
      if (isExpanded) {
        advancedSettingsContainer.classList.add('no-transition');
        advancedSettingsContainer.classList.add('expanded');
        toggleExpandBtn.classList.add('expanded');
      } else {
        advancedSettingsContainer.style.maxHeight = '0px';
      }
    });

    addEventListeners();
  }

  function initializeLanguageSelector() {
    languageSelectorContainer.innerHTML = '';
    
    // Create Button
    languageBtn = document.createElement('button');
    languageBtn.className = 'icon-btn';
    languageBtn.title = 'Language';
    languageBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.91-4.33-3.56zm2.95-8H5.08c.96-1.65 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>`;
    
    // Create Menu
    languageMenu = document.createElement('div');
    languageMenu.className = 'popup-menu';
    languageMenu.style.left = '0'; // Align left for this one
    languageMenu.style.right = 'auto';

    for (const langCode in availableLanguages) {
      const item = document.createElement('button');
      item.className = 'menu-item';
      item.textContent = availableLanguages[langCode];
      item.dataset.value = langCode;
      item.addEventListener('click', () => {
          handleLanguageChange(langCode);
          languageMenu.classList.remove('show');
      });
      languageMenu.appendChild(item);
    }

    languageSelectorContainer.appendChild(languageBtn);
    languageSelectorContainer.appendChild(languageMenu);

    languageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus(); // Close other menus
        languageMenu.classList.toggle('show');
    });
  }

  function initializeResetMenu() {
    resetMenu.innerHTML = '';

    // Domain Reset Item
    domainResetItem = document.createElement('button');
    domainResetItem.className = 'menu-item';
    domainResetItem.addEventListener('click', () => {
        handleDomainReset();
        resetMenu.classList.remove('show');
    });
    resetMenu.appendChild(domainResetItem);

    // Account Reset Item
    accountResetItem = document.createElement('button');
    accountResetItem.className = 'menu-item';
    accountResetItem.style.display = 'none'; // Hidden by default
    accountResetItem.addEventListener('click', () => {
        handleAccountReset();
        resetMenu.classList.remove('show');
    });
    resetMenu.appendChild(accountResetItem);

    // Temp Reset Item
    tempResetItem = document.createElement('button');
    tempResetItem.className = 'menu-item';
    tempResetItem.addEventListener('click', () => {
        handleTempReset();
        resetMenu.classList.remove('show');
    });
    resetMenu.appendChild(tempResetItem);

    // No Settings Item
    noSettingsItem = document.createElement('div');
    noSettingsItem.className = 'menu-item';
    noSettingsItem.style.cursor = 'default';
    noSettingsItem.style.color = 'var(--secondary-text-color)';
    // Prevent hover effect or click
    noSettingsItem.style.pointerEvents = 'none'; 
    resetMenu.appendChild(noSettingsItem);
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
              updateActiveIndicators();
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
        closeAllMenus();
        resetMenu.classList.toggle('show');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.menu-container')) {
            closeAllMenus();
        }
    });

    // Tooltip Listeners
    setupTooltip(domainSlider, tooltipDomain, 'tooltipDomain');
    setupTooltip(accountSlider, tooltipAccount, 'tooltipAccount');
    setupTooltip(tempSlider, tooltipTemp, 'tooltipTemp');

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
    // languageSelect.addEventListener('change', handleLanguageChange); // Removed
    optionsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    toggleExpandBtn.addEventListener('click', toggleAdvancedSettings);

    // Listener for updates from other parts of the extension
    chrome.runtime.onMessage.addListener((request) => {
      if (request.type === 'SETTINGS_UPDATED') {
        initialize();
      }
    });
  }

  function setupTooltip(element, tooltipElement, stringKey) {
      element.addEventListener('mouseenter', () => {
          tooltipTimer = setTimeout(() => {
              tooltipElement.textContent = strings[currentLang][stringKey];
              tooltipElement.style.opacity = '1';
          }, 500); // 0.5s delay
      });
      element.addEventListener('mouseleave', () => {
          clearTimeout(tooltipTimer);
          tooltipElement.style.opacity = '0';
      });
      element.addEventListener('input', () => {
          // Hide tooltip while dragging
          clearTimeout(tooltipTimer);
          tooltipElement.style.opacity = '0';
      });
  }

  function closeAllMenus() {
      resetMenu.classList.remove('show');
      if (languageMenu) languageMenu.classList.remove('show');
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

  function handleTempReset() {
      let targetBoost = 100;
      if (hasAccountSetting) {
          targetBoost = parseInt(accountSlider.value, 10);
      } else if (hasDomainSetting) {
          targetBoost = parseInt(domainSlider.value, 10);
      }
      
      updateControls(tempSlider, tempNumberInput, targetBoost);
      applyBoostToTab(targetBoost);
      isTempActive = false;
      updateActiveIndicators();
  }

  function updateActiveIndicators() {
      // Update accordion height if it's expanded
      updateAccordionHeight();

      domainActiveIndicator.style.display = 'none';
      accountActiveIndicator.style.display = 'none';
      tempActiveIndicator.style.display = 'none';
      
      const showDomainReset = hasDomainSetting;
      const showAccountReset = (currentAccountName && hasAccountSetting);
      const showTempReset = isTempActive;

      // Control visibility of reset menu items
      if (domainResetItem) domainResetItem.style.display = showDomainReset ? 'block' : 'none';
      if (accountResetItem) accountResetItem.style.display = showAccountReset ? 'block' : 'none';
      if (tempResetItem) tempResetItem.style.display = showTempReset ? 'block' : 'none';
      
      if (noSettingsItem) {
          noSettingsItem.style.display = (!showDomainReset && !showAccountReset && !showTempReset) ? 'block' : 'none';
      }

      // If everything is default (100% and no special settings), don't show ACTIVE tags
      // Check if effective volume is 100 AND no overrides are active
      
      // Determine effective boost
      let currentEffectiveBoost = 100;
      if (isTempActive) {
          currentEffectiveBoost = parseInt(tempSlider.value, 10);
      } else if (hasAccountSetting) {
          currentEffectiveBoost = parseInt(accountSlider.value, 10);
      } else if (hasDomainSetting) {
          currentEffectiveBoost = parseInt(domainSlider.value, 10);
      }
      
      // "All default" condition:
      // 1. No temp activity (or temp is 100, but logic usually sets isTempActive=false if it matches saved)
      // 2. No account setting
      // 3. No domain setting
      // 4. Boost is 100
      
      // However, user simply said "If all default".
      // If we have a domain setting of 100, is it "default"? Technically it's a setting.
      // But let's assume "all default" means "no saved settings and current boost is 100".
      
      const isAllDefault = !hasDomainSetting && !hasAccountSetting && !isTempActive && currentEffectiveBoost === 100;

      if (isAllDefault) return; 

      if (isTempActive) {
          tempActiveIndicator.style.display = 'inline-block';
          return;
      }

      if (hasAccountSetting) {
          accountActiveIndicator.style.display = 'inline-block';
      } else if (hasDomainSetting) {
          domainActiveIndicator.style.display = 'inline-block';
      } else {
          // Only show temp active if it's not 100 or if we want to explicitly show it's controlling
          // But if we are here, it means no account/domain setting.
          // If boost is 100, we probably returned above at `isAllDefault`.
          // If boost != 100, it should be caught by `isTempActive` ideally.
          // But `isTempActive` might be false if the user just opened the popup and volume is 100.
          
          if (currentEffectiveBoost !== 100) {
              tempActiveIndicator.style.display = 'inline-block';
          }
      }
  }

  function toggleAdvancedSettings() {
    const isExpanded = advancedSettingsContainer.classList.contains('expanded');
    if (isExpanded) {
      // Collapse
      advancedSettingsContainer.style.maxHeight = '0px';
      advancedSettingsContainer.classList.remove('expanded');
      toggleExpandBtn.classList.remove('expanded');
      chrome.storage.sync.set({ isExpanded: false });
      toggleExpandBtn.title = strings[currentLang].expandSettings;
    } else {
      // Expand
      advancedSettingsContainer.classList.add('expanded');
      advancedSettingsContainer.style.maxHeight = advancedSettingsContainer.scrollHeight + 'px';
      toggleExpandBtn.classList.add('expanded');
      chrome.storage.sync.set({ isExpanded: true });
      toggleExpandBtn.title = strings[currentLang].collapseSettings;
    }
  }

  function updateAccordionHeight() {
    if (advancedSettingsContainer.classList.contains('expanded')) {
      advancedSettingsContainer.style.maxHeight = advancedSettingsContainer.scrollHeight + 'px';
      
      // Remove no-transition class if present so subsequent transitions work smoothly
      if (advancedSettingsContainer.classList.contains('no-transition')) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            advancedSettingsContainer.classList.remove('no-transition');
          }, 50);
        });
      }
    }
  }

  function handleThemeToggle() {
    const newTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    chrome.storage.sync.set({ theme: newTheme }, () => {
      applyTheme(newTheme);
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  function handleLanguageChange(newLang) {
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
    if (tempResetItem) tempResetItem.disabled = !enabled;
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
    document.documentElement.lang = lang;
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
    if (tempResetItem) tempResetItem.textContent = strings[lang].resetTemp;
    if (noSettingsItem) noSettingsItem.textContent = strings[lang].noSettingsToReset;

    if (toggleExpandBtn) {
      const isExpanded = advancedSettingsContainer.classList.contains('expanded');
      toggleExpandBtn.title = isExpanded ? strings[lang].collapseSettings : strings[lang].expandSettings;
    }
  }

  // --- Run ---
  initialize();
});