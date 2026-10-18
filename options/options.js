// options.js - オプション画面のメインコントローラー

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const domainInput = document.getElementById('domain-input');
  const boostInput = document.getElementById('boost-input');
  const addButton = document.getElementById('add-btn');
  const settingsList = document.getElementById('settings-list');
  const emptyState = document.getElementById('empty-state');

  const accountSettingsList = document.getElementById('account-settings-list');
  const accountEmptyState = document.getElementById('account-empty-state');

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');

  const resetMenuBtn = document.getElementById('reset-menu-btn');
  const resetDropdown = document.getElementById('reset-dropdown');
  const resetDomainsBtn = document.getElementById('reset-domains-btn');
  const resetAccountsBtn = document.getElementById('reset-accounts-btn');
  const resetFeaturesBtn = document.getElementById('reset-features-btn');
  const resetAllBtn = document.getElementById('reset-all-btn');

  // State
  let currentLang = 'ja';
  let currentTheme = 'dark';

  function getCurrentLang() {
    return currentLang;
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
      menu.classList.remove('show');
    });
  }

  // --- Submodules Initialization ---
  OptionsDomains.init(
    { domainInput, boostInput, addButton, settingsList, emptyState },
    { getCurrentLang, closeAllDropdowns }
  );

  OptionsAccounts.init(
    { accountSettingsList, accountEmptyState },
    { getCurrentLang, closeAllDropdowns }
  );

  OptionsFeatures.init();

  // --- Main Initialization ---
  function initialize() {
    chrome.storage.sync.get([
      'theme',
      'language',
      'boostSettings',
      'accountSettings',
      'ytLiveSettings',
      'ytAutoSettings',
      'ytScrollSettings',
      'twitchScrollSettings'
    ], (settings) => {
      currentTheme = settings.theme || 'dark';
      currentLang = settings.language || 'ja';

      applyTheme(currentTheme);
      applyLanguage(currentLang);

      OptionsDomains.render(settings.boostSettings || {});
      OptionsAccounts.render(settings.accountSettings || {});
      OptionsFeatures.load(settings);
    });
  }

  // --- Event Listeners ---
  function addEventListeners() {
    // グローバルクリックでドロップダウンを閉じる
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.menu-container')) {
        closeAllDropdowns();
      }
    });

    themeToggleBtn.addEventListener('click', handleThemeToggle);
    langToggleBtn.addEventListener('click', handleLangToggle);

    // リセットメニュー
    resetMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetDropdown.classList.toggle('show');
    });
    resetDomainsBtn.addEventListener('click', handleResetDomains);
    resetAccountsBtn.addEventListener('click', handleResetAccounts);
    resetFeaturesBtn.addEventListener('click', handleResetFeatures);
    resetAllBtn.addEventListener('click', handleResetAll);

    // 他タブ等からの設定更新通知を受信
    chrome.runtime.onMessage.addListener((request) => {
      if (request.type === 'SETTINGS_UPDATED') {
        initialize();
      }
    });
  }

  // --- Handlers ---
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
      chrome.storage.sync.get({ boostSettings: {} }, (data) => {
        OptionsDomains.render(data.boostSettings || {});
      });
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  function handleResetDomains() {
    if (confirm(strings[currentLang].resetDomainsConfirm)) {
      chrome.storage.sync.set({ boostSettings: {} }, () => {
        initialize();
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
        closeAllDropdowns();
      });
    }
  }

  function handleResetAccounts() {
    if (confirm(strings[currentLang].resetAccountsConfirm)) {
      chrome.storage.sync.set({ accountSettings: {} }, () => {
        initialize();
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
        closeAllDropdowns();
      });
    }
  }

  function handleResetFeatures() {
    if (confirm(strings[currentLang].resetFeaturesConfirm)) {
      const defaultFeatures = {
        ytLiveSettings: { enabled: false, multiplier: 1.0 },
        ytAutoSettings: { enabled: false, volume: 30 },
        ytScrollSettings: { enabled: false, step: 5 },
        twitchScrollSettings: { enabled: false, step: 5 }
      };
      chrome.storage.sync.set(defaultFeatures, () => {
        initialize();
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
        closeAllDropdowns();
      });
    }
  }

  function handleResetAll() {
    if (confirm(strings[currentLang].resetAllConfirm)) {
      chrome.storage.sync.remove([
        'boostSettings',
        'accountSettings',
        'ytLiveSettings',
        'ytAutoSettings',
        'ytScrollSettings',
        'twitchScrollSettings'
      ], () => {
        initialize();
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
        closeAllDropdowns();
      });
    }
  }

  // --- UI Updates ---
  function applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    if (theme === 'dark') {
      iconMoon.style.display = 'block';
      iconSun.style.display = 'none';
    } else {
      iconMoon.style.display = 'none';
      iconSun.style.display = 'block';
    }
  }

  function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    const s = strings[lang];

    document.title = s.optionsTitle;
    document.getElementById('optionsTitle-h1').textContent = s.optionsTitle;
    domainInput.placeholder = s.domainPlaceholder;
    addButton.textContent = s.add;

    document.getElementById('labelDomain').textContent = s.headerDomain;
    document.getElementById('labelBoost').textContent = s.headerBoost;
    document.getElementById('headerDomain').textContent = s.headerDomain;
    document.getElementById('headerBoost').textContent = s.headerBoost;
    document.getElementById('headerAction').textContent = s.headerAction;

    document.getElementById('accountSettingsHeader').textContent = s.accountSettings;
    document.getElementById('headerAccount').textContent = s.headerAccount;
    document.getElementById('headerBoostAccount').textContent = s.headerBoost;
    document.getElementById('headerActionAccount').textContent = s.headerAction;

    document.getElementById('generalSettingsHeader').textContent = s.generalSettings;
    document.getElementById('youtubeLiveSettingsHeader').textContent = s.youtubeLiveSettings;
    document.getElementById('youtubeAutoSettingsHeader').textContent = s.youtubeAutoSettings;
    document.getElementById('mouseWheelSettingsHeader').textContent = s.mouseWheelSettings;

    document.getElementById('labelEnableYoutubeLive').textContent = s.enableYoutubeLiveLowering;
    document.getElementById('labelTargetVolume').textContent = s.targetVolume;

    document.getElementById('labelEnableYoutubeAuto').textContent = s.enableYoutubeAuto;
    document.getElementById('labelDefaultVolume').textContent = s.defaultVolume;

    document.getElementById('labelEnableYoutubeScroll').textContent = s.enableYoutubeScroll;
    document.getElementById('labelScrollStep').textContent = s.scrollStep;

    document.getElementById('labelEnableTwitchScroll').textContent = s.enableTwitchScroll;
    document.getElementById('labelTwitchScrollStep').textContent = s.scrollStep;

    document.getElementById('labelResetSettings').textContent = s.resetSettings;
    resetMenuBtn.textContent = s.resetSettings;
    document.getElementById('textResetDomains').textContent = s.resetDomains;
    document.getElementById('textResetAccounts').textContent = s.resetAccounts;
    document.getElementById('textResetFeatures').textContent = s.resetFeatures;
    document.getElementById('textResetAll').textContent = s.resetAllSettings;

    document.getElementById('labelTheme').textContent = s.labelTheme;
    document.getElementById('labelLanguage').textContent = s.labelLanguage;
    themeToggleBtn.title = s.tooltipTheme;
    langToggleBtn.title = s.tooltipLanguage;
  }

  // --- Run ---
  addEventListeners();
  initialize();
});