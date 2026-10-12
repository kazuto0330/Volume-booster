// popup-ui.js - ポップアップ画面のUIコンポーネント（メニュー・アコーディオン・ツールチップ・テーマ/言語）管理モジュール

const PopupUI = {
  languageSelectorContainer: null,
  languageBtn: null,
  languageMenu: null,

  resetMenu: null,
  globalResetBtn: null,
  domainResetItem: null,
  accountResetItem: null,
  tempResetItem: null,
  noSettingsItem: null,

  toggleExpandBtn: null,
  advancedSettingsContainer: null,
  themeToggleBtn: null,
  optionsBtn: null,

  domainActiveIndicator: null,
  accountActiveIndicator: null,
  tempActiveIndicator: null,

  init(elements) {
    this.languageSelectorContainer = elements.languageSelectorContainer;
    this.resetMenu = elements.resetMenu;
    this.globalResetBtn = elements.globalResetBtn;
    this.toggleExpandBtn = elements.toggleExpandBtn;
    this.advancedSettingsContainer = elements.advancedSettingsContainer;
    this.themeToggleBtn = elements.themeToggleBtn;
    this.optionsBtn = elements.optionsBtn;

    this.domainActiveIndicator = elements.domainActiveIndicator;
    this.accountActiveIndicator = elements.accountActiveIndicator;
    this.tempActiveIndicator = elements.tempActiveIndicator;
  },

  initLanguageSelector(availableLanguages, onLanguageSelect) {
    this.languageSelectorContainer.innerHTML = '';

    this.languageBtn = document.createElement('button');
    this.languageBtn.className = 'icon-btn';
    this.languageBtn.title = 'Language';
    this.languageBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.91-4.33-3.56zm2.95-8H5.08c.96-1.65 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>`;

    this.languageMenu = document.createElement('div');
    this.languageMenu.className = 'popup-menu';
    this.languageMenu.style.left = '0';
    this.languageMenu.style.right = 'auto';

    for (const langCode in availableLanguages) {
      const item = document.createElement('button');
      item.className = 'menu-item';
      item.textContent = availableLanguages[langCode];
      item.dataset.value = langCode;
      item.addEventListener('click', () => {
        onLanguageSelect(langCode);
        this.languageMenu.classList.remove('show');
      });
      this.languageMenu.appendChild(item);
    }

    this.languageSelectorContainer.appendChild(this.languageBtn);
    this.languageSelectorContainer.appendChild(this.languageMenu);

    this.languageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllMenus();
      this.languageMenu.classList.toggle('show');
    });
  },

  initResetMenu(handlers) {
    this.resetMenu.innerHTML = '';

    // ドメインリセット
    this.domainResetItem = document.createElement('button');
    this.domainResetItem.className = 'menu-item';
    this.domainResetItem.addEventListener('click', () => {
      handlers.onDomainReset();
      this.resetMenu.classList.remove('show');
    });
    this.resetMenu.appendChild(this.domainResetItem);

    // アカウントリセット
    this.accountResetItem = document.createElement('button');
    this.accountResetItem.className = 'menu-item';
    this.accountResetItem.style.display = 'none';
    this.accountResetItem.addEventListener('click', () => {
      handlers.onAccountReset();
      this.resetMenu.classList.remove('show');
    });
    this.resetMenu.appendChild(this.accountResetItem);

    // 一時設定リセット
    this.tempResetItem = document.createElement('button');
    this.tempResetItem.className = 'menu-item';
    this.tempResetItem.addEventListener('click', () => {
      handlers.onTempReset();
      this.resetMenu.classList.remove('show');
    });
    this.resetMenu.appendChild(this.tempResetItem);

    // 設定なし表示
    this.noSettingsItem = document.createElement('div');
    this.noSettingsItem.className = 'menu-item';
    this.noSettingsItem.style.cursor = 'default';
    this.noSettingsItem.style.color = 'var(--secondary-text-color)';
    this.noSettingsItem.style.pointerEvents = 'none';
    this.resetMenu.appendChild(this.noSettingsItem);
  },

  setupTooltip(element, tooltipElement, stringKey, getCurrentLang) {
    let tooltipTimer;
    element.addEventListener('mouseenter', () => {
      const currentLang = getCurrentLang();
      tooltipElement.textContent = strings[currentLang][stringKey];
      tooltipElement.classList.add('visible');
    });

    element.addEventListener('mouseleave', () => {
      tooltipElement.classList.remove('visible');
    });

    element.addEventListener('input', () => {
      tooltipElement.classList.remove('visible');
      clearTimeout(tooltipTimer);
    });

    element.addEventListener('change', () => {
      clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(() => {
        tooltipElement.classList.remove('visible');
      }, 1000);
    });
  },

  closeAllMenus() {
    if (this.resetMenu) this.resetMenu.classList.remove('show');
    if (this.languageMenu) this.languageMenu.classList.remove('show');
  },

  toggleAdvancedSettings(getCurrentLang, onExpandedChange) {
    const isExpanded = this.advancedSettingsContainer.classList.contains('expanded');
    const lang = getCurrentLang();

    if (isExpanded) {
      this.advancedSettingsContainer.style.maxHeight = '0px';
      this.advancedSettingsContainer.classList.remove('expanded');
      this.toggleExpandBtn.classList.remove('expanded');
      chrome.storage.sync.set({ isExpanded: false });
      this.toggleExpandBtn.title = strings[lang].expandSettings;
      if (onExpandedChange) onExpandedChange(false);
    } else {
      this.advancedSettingsContainer.classList.add('expanded');
      this.advancedSettingsContainer.style.maxHeight = this.advancedSettingsContainer.scrollHeight + 'px';
      this.toggleExpandBtn.classList.add('expanded');
      chrome.storage.sync.set({ isExpanded: true });
      this.toggleExpandBtn.title = strings[lang].collapseSettings;
      if (onExpandedChange) onExpandedChange(true);
    }
  },

  updateAccordionHeight() {
    if (this.advancedSettingsContainer.classList.contains('expanded')) {
      this.advancedSettingsContainer.style.maxHeight = this.advancedSettingsContainer.scrollHeight + 'px';
      if (this.advancedSettingsContainer.classList.contains('no-transition')) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            this.advancedSettingsContainer.classList.remove('no-transition');
          }, 50);
        });
      }
    }
  },

  updateActiveIndicators(state) {
    const { hasDomainSetting, hasAccountSetting, isTempActive, currentEffectiveBoost } = state;

    this.domainActiveIndicator.style.display = 'none';
    this.accountActiveIndicator.style.display = 'none';
    this.tempActiveIndicator.style.display = 'none';

    // リセットメニュー項目の表示制御
    let visibleItemsCount = 0;

    if (hasDomainSetting) {
      this.domainResetItem.style.display = 'block';
      visibleItemsCount++;
    } else {
      this.domainResetItem.style.display = 'none';
    }

    if (hasAccountSetting) {
      this.accountResetItem.style.display = 'block';
      visibleItemsCount++;
    } else {
      this.accountResetItem.style.display = 'none';
    }

    if (isTempActive) {
      this.tempResetItem.style.display = 'block';
      visibleItemsCount++;
    } else {
      this.tempResetItem.style.display = 'none';
    }

    if (visibleItemsCount === 0) {
      this.noSettingsItem.style.display = 'block';
    } else {
      this.noSettingsItem.style.display = 'none';
    }

    const isAllDefault = !hasDomainSetting && !hasAccountSetting && !isTempActive && currentEffectiveBoost === 100;
    if (isAllDefault) return;

    if (isTempActive) {
      this.tempActiveIndicator.style.display = 'inline-block';
      return;
    }

    if (hasAccountSetting) {
      this.accountActiveIndicator.style.display = 'inline-block';
    } else if (hasDomainSetting) {
      this.domainActiveIndicator.style.display = 'inline-block';
    } else if (currentEffectiveBoost !== 100) {
      this.tempActiveIndicator.style.display = 'inline-block';
    }
  },

  applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');

    const sunIcon = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="12" cy="12" r="5" /><g><rect x="11" y="1" width="2" height="4" rx="1" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(45 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(90 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(135 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(180 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(225 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(270 12 12)" /><rect x="11" y="1" width="2" height="4" rx="1" transform="rotate(315 12 12)" /></g></svg>`;
    const moonIcon = `<svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>`;

    if (this.themeToggleBtn) {
      this.themeToggleBtn.innerHTML = theme === 'dark' ? moonIcon : sunIcon;
    }
  },

  applyLanguage(lang) {
    document.documentElement.lang = lang;
    const s = strings[lang];

    document.getElementById('appName').textContent = s.appName;
    document.getElementById('temp-title').textContent = s.currentTab;
    document.getElementById('domain-title').textContent = s.siteWide;

    if (this.optionsBtn) this.optionsBtn.title = s.manageSettings;

    if (this.domainActiveIndicator) this.domainActiveIndicator.textContent = s.active;
    if (this.accountActiveIndicator) this.accountActiveIndicator.textContent = s.active;
    if (this.tempActiveIndicator) this.tempActiveIndicator.textContent = s.active;

    if (this.globalResetBtn) this.globalResetBtn.title = s.reset;
    if (this.domainResetItem) this.domainResetItem.textContent = s.resetDomain;
    if (this.accountResetItem) this.accountResetItem.textContent = s.resetAccount;
    if (this.tempResetItem) this.tempResetItem.textContent = s.resetTemp;
    if (this.noSettingsItem) this.noSettingsItem.textContent = s.noSettingsToReset;

    if (this.themeToggleBtn) this.themeToggleBtn.title = s.tooltipTheme;
    if (this.languageBtn) this.languageBtn.title = s.tooltipLanguage;

    if (this.toggleExpandBtn) {
      const isExpanded = this.advancedSettingsContainer.classList.contains('expanded');
      this.toggleExpandBtn.title = isExpanded ? s.collapseSettings : s.expandSettings;
    }
  }
};
