// popup.js - ポップアップ画面のメインコントローラー

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tempSlider = document.getElementById('temp-boost-slider');
  const tempNumberInput = document.getElementById('temp-boost-input');
  const domainSlider = document.getElementById('domain-boost-slider');
  const domainNumberInput = document.getElementById('domain-boost-input');

  const accountGroup = document.getElementById('control-group-account');
  const accountSlider = document.getElementById('account-boost-slider');
  const accountNumberInput = document.getElementById('account-boost-input');
  const accountTitle = document.getElementById('account-title');

  const globalResetBtn = document.getElementById('global-reset-btn');
  const resetMenu = document.getElementById('reset-menu');

  const domainActiveIndicator = document.getElementById('domain-active');
  const accountActiveIndicator = document.getElementById('account-active');
  const tempActiveIndicator = document.getElementById('temp-active');

  const optionsBtn = document.getElementById('options-btn');
  const toggleExpandBtn = document.getElementById('toggle-expand-btn');
  const advancedSettingsContainer = document.getElementById('advanced-settings-container');

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const languageSelectorContainer = document.getElementById('language-selector-container');

  const domainTitle = document.getElementById('domain-title');
  const domainDisplay = document.getElementById('current-domain-display');

  const tooltipDomain = document.getElementById('tooltip-domain');
  const tooltipAccount = document.getElementById('tooltip-account');
  const tooltipTemp = document.getElementById('tooltip-temp');

  // State
  let currentTab = null;
  let currentDomain = null;
  let currentAccountName = null;
  let debounceTimer;
  let currentLang = 'en';
  let currentTheme = 'light';

  let hasAccountSetting = false;
  let hasDomainSetting = false;
  let isTempActive = false;

  const availableLanguages = {
    'en': 'English',
    'ja': '日本語'
  };

  const getCurrentLang = () => currentLang;

  // --- Submodule UI Init ---
  PopupUI.init({
    languageSelectorContainer,
    resetMenu,
    globalResetBtn,
    toggleExpandBtn,
    advancedSettingsContainer,
    themeToggleBtn,
    optionsBtn,
    domainActiveIndicator,
    accountActiveIndicator,
    tempActiveIndicator
  });

  PopupUI.initLanguageSelector(availableLanguages, handleLanguageChange);
  PopupUI.initResetMenu({
    onDomainReset: handleDomainReset,
    onAccountReset: handleAccountReset,
    onTempReset: handleTempReset
  });

  PopupUI.setupTooltip(domainSlider, tooltipDomain, 'tooltipDomain', getCurrentLang);
  PopupUI.setupTooltip(accountSlider, tooltipAccount, 'tooltipAccount', getCurrentLang);
  PopupUI.setupTooltip(tempSlider, tooltipTemp, 'tooltipTemp', getCurrentLang);

  // --- Initialization ---
  function initialize() {
    chrome.storage.sync.get(['theme', 'language', 'isExpanded'], (settings) => {
      currentTheme = settings.theme || 'dark';
      PopupUI.applyTheme(currentTheme);

      let initialLang = settings.language;
      if (!initialLang) {
        const browserUILang = chrome.i18n.getUILanguage();
        const shortLang = browserUILang.split('-')[0];
        initialLang = strings[shortLang] ? shortLang : 'en';
      }

      currentLang = initialLang;
      PopupUI.applyLanguage(currentLang);
      initializePopupContent();

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

  function initializePopupContent() {
    isTempActive = false;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      currentTab = tabs[0];
      if (currentTab.url && currentTab.url.startsWith('http')) {
        const normalizedUrl = normalizeUrl(currentTab.url);
        const hostname = new URL(currentTab.url).hostname.replace('www.', '');

        chrome.storage.sync.get({ boostSettings: {} }, (data) => {
          const settings = data.boostSettings || {};
          const bestMatchKey = findBestMatchingKey(normalizedUrl, settings);

          currentDomain = bestMatchKey || hostname;
          domainDisplay.textContent = currentDomain;
          domainTitle.textContent = strings[currentLang].siteWide;

          const domainBoost = settings[currentDomain] ?? 100;
          hasDomainSetting = settings[currentDomain] !== undefined;
          updateControls(domainSlider, domainNumberInput, domainBoost);

          // content.jsから現在のタブの音量を取得
          chrome.tabs.sendMessage(currentTab.id, { type: 'GET_CURRENT_VOLUME' }, (response) => {
            if (chrome.runtime.lastError) {
              updateControls(tempSlider, tempNumberInput, domainBoost);
              accountGroup.style.display = 'none';
              updateActiveIndicators();
            } else {
              updateControls(tempSlider, tempNumberInput, response.boost);

              if (response.accountName) {
                currentAccountName = response.accountName;
                accountGroup.style.display = 'block';
                accountTitle.textContent = strings[currentLang].accountSpecific(currentAccountName);

                chrome.storage.sync.get({ accountSettings: {} }, (accData) => {
                  const accSettings = accData.accountSettings || {};
                  const accountKey = `youtube:${currentAccountName}`;
                  const accountBoost = accSettings[accountKey] ?? 100;
                  hasAccountSetting = accSettings[accountKey] !== undefined;

                  updateControls(accountSlider, accountNumberInput, accountBoost);
                  updateActiveIndicators();
                  PopupUI.updateAccordionHeight();
                });
              } else {
                accountGroup.style.display = 'none';
                updateActiveIndicators();
                PopupUI.updateAccordionHeight();
              }
            }
          });
        });
      } else {
        // 非対応ページ
        domainDisplay.textContent = strings[currentLang].statusUnsupported;
        enableControls(false);
      }
    });
  }

  function addEventListeners() {
    // Temp Controls
    tempSlider.addEventListener('input', () => handleTempChange(tempSlider.value));
    tempNumberInput.addEventListener('input', () => handleTempChange(tempNumberInput.value));
    tempSlider.addEventListener('wheel', (e) => handleSliderWheel(e, tempSlider, handleTempChange));

    // Domain Controls
    domainSlider.addEventListener('input', () => handleDomainChange(domainSlider.value));
    domainNumberInput.addEventListener('input', () => handleDomainChange(domainNumberInput.value));
    domainSlider.addEventListener('wheel', (e) => handleSliderWheel(e, domainSlider, handleDomainChange));

    // Account Controls
    accountSlider.addEventListener('input', () => handleAccountChange(accountSlider.value));
    accountNumberInput.addEventListener('input', () => handleAccountChange(accountNumberInput.value));
    accountSlider.addEventListener('wheel', (e) => handleSliderWheel(e, accountSlider, handleAccountChange));

    // UI Buttons
    optionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    toggleExpandBtn.addEventListener('click', () => {
      PopupUI.toggleAdvancedSettings(getCurrentLang);
    });

    globalResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      PopupUI.closeAllMenus();
      resetMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => PopupUI.closeAllMenus());

    themeToggleBtn.addEventListener('click', handleThemeToggle);

    // Select text on click for number inputs
    [tempNumberInput, domainNumberInput, accountNumberInput].forEach(input => {
      input.addEventListener('click', (e) => e.target.select());
    });
  }

  // --- Wheel Handler ---
  function handleSliderWheel(event, slider, handler) {
    event.preventDefault();
    const currentValue = parseInt(slider.value, 10);
    let step = 0;

    if (event.deltaY < 0) {
      step = currentValue < 100 ? 10 : 20;
    } else {
      step = currentValue <= 100 ? -10 : -20;
    }

    const newValue = clamp(currentValue + step, 10, 600);
    if (newValue !== currentValue) {
      handler(newValue);
    }
  }

  // --- Slider Value Handlers ---
  function handleTempChange(value) {
    const boost = sanitizeBoostValue(value);
    updateControls(tempSlider, tempNumberInput, boost);
    isTempActive = true;
    applyBoostToTab(boost);
    updateActiveIndicators();
  }

  function handleDomainChange(value) {
    const boost = sanitizeBoostValue(value);
    updateControls(domainSlider, domainNumberInput, boost);
    hasDomainSetting = true;
    saveDomainBoost(boost);

    if (!hasAccountSetting && !isTempActive) {
      updateControls(tempSlider, tempNumberInput, boost);
      applyBoostToTab(boost);
    }
    updateActiveIndicators();
  }

  function handleAccountChange(value) {
    const boost = sanitizeBoostValue(value);
    updateControls(accountSlider, accountNumberInput, boost);
    hasAccountSetting = true;
    saveAccountBoost(boost);

    if (!isTempActive) {
      updateControls(tempSlider, tempNumberInput, boost);
      applyBoostToTab(boost);
    }
    updateActiveIndicators();
  }

  function saveAccountBoost(boost) {
    if (!currentAccountName) return;
    const accountKey = `youtube:${currentAccountName}`;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      chrome.storage.sync.get({ accountSettings: {} }, (data) => {
        const settings = data.accountSettings || {};
        settings[accountKey] = boost;
        chrome.storage.sync.set({ accountSettings: settings });
      });
    }, 500);
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
    }, 500);
  }

  // --- Reset Handlers ---
  function handleDomainReset() {
    if (!currentDomain) return;
    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings || {};
      delete settings[currentDomain];
      chrome.storage.sync.set({ boostSettings: settings }, () => {
        hasDomainSetting = false;
        updateControls(domainSlider, domainNumberInput, 100);

        if (!hasAccountSetting && !isTempActive) {
          updateControls(tempSlider, tempNumberInput, 100);
          applyBoostToTab(100);
        }
        updateActiveIndicators();
      });
    });
  }

  function handleAccountReset() {
    if (!currentAccountName) return;
    const accountKey = `youtube:${currentAccountName}`;
    chrome.storage.sync.get({ accountSettings: {} }, (data) => {
      const settings = data.accountSettings || {};
      delete settings[accountKey];
      chrome.storage.sync.set({ accountSettings: settings }, () => {
        hasAccountSetting = false;
        updateControls(accountSlider, accountNumberInput, 100);

        if (!isTempActive) {
          const fallbackBoost = parseInt(domainSlider.value, 10);
          updateControls(tempSlider, tempNumberInput, fallbackBoost);
          applyBoostToTab(fallbackBoost);
        }
        updateActiveIndicators();
      });
    });
  }

  function handleTempReset() {
    isTempActive = false;
    let fallbackBoost = 100;

    if (hasAccountSetting) {
      fallbackBoost = parseInt(accountSlider.value, 10);
    } else if (hasDomainSetting) {
      fallbackBoost = parseInt(domainSlider.value, 10);
    }

    updateControls(tempSlider, tempNumberInput, fallbackBoost);
    applyBoostToTab(fallbackBoost);
    updateActiveIndicators();
  }

  function updateActiveIndicators() {
    const currentEffectiveBoost = parseInt(tempSlider.value, 10);
    PopupUI.updateActiveIndicators({
      hasDomainSetting,
      hasAccountSetting,
      isTempActive,
      currentEffectiveBoost
    });
  }

  function handleThemeToggle() {
    const newTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    chrome.storage.sync.set({ theme: newTheme }, () => {
      PopupUI.applyTheme(newTheme);
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  function handleLanguageChange(newLang) {
    chrome.storage.sync.set({ language: newLang }, () => {
      currentLang = newLang;
      PopupUI.applyLanguage(newLang);
      initializePopupContent();
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  function applyBoostToTab(boost) {
    if (!currentTab || !currentTab.id) return;

    // content.js へ音量更新を送信（Content Script 側で DOM または必要時のみ Tab Capture を自律制御）
    chrome.tabs.sendMessage(currentTab.id, { type: 'UPDATE_VOLUME', boost: boost }, () => {
      if (chrome.runtime.lastError) {
        // Content script が未注入の保護ページ（chrome:// 等）は無視
      }
    });
  }

  function updateControls(slider, input, value) {
    slider.value = value;
    input.value = value;
  }

  function sanitizeBoostValue(value) {
    const num = parseInt(value, 10);
    return clamp(isNaN(num) ? 100 : num, 10, 600);
  }

  function enableControls(enabled) {
    tempSlider.disabled = !enabled;
    tempNumberInput.disabled = !enabled;
    domainSlider.disabled = !enabled;
    domainNumberInput.disabled = !enabled;
    accountSlider.disabled = !enabled;
    accountNumberInput.disabled = !enabled;
    globalResetBtn.disabled = !enabled;
  }

  // --- Run ---
  initialize();
});