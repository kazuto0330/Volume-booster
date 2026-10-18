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
  const tempLiveBadge = document.getElementById('temp-live-badge');

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
  let isLiveBoost = false;
  let liveMultiplier = null;

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
    tempActiveIndicator,
    tempLiveBadge
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
    isLiveBoost = false;
    liveMultiplier = null;
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

          function detectAccountNameDirectly(tabId) {
            return new Promise((resolve) => {
              if (!chrome.scripting || !tabId) return resolve(null);
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                  try {
                    // 1. YouTube構造化メタデータ (<span itemprop="author"> 内の itemprop="name")
                    const authorMeta = document.querySelector('[itemprop="author"] [itemprop="name"], [itemprop="author"] meta[itemprop="name"], link[itemprop="name"], meta[name="author"]');
                    if (authorMeta) {
                      const content = authorMeta.getAttribute('content') || authorMeta.textContent;
                      if (content && content.trim()) return content.trim();
                    }

                    // 2. DOM要素の探索
                    const selectors = [
                      '#owner ytd-channel-name yt-formatted-string#text',
                      'ytd-watch-metadata #owner #channel-name yt-formatted-string',
                      '#upload-info ytd-channel-name yt-formatted-string',
                      'ytd-video-owner-renderer ytd-channel-name yt-formatted-string',
                      '#channel-name yt-formatted-string#text',
                      'ytd-channel-name #text',
                      'ytd-watch-metadata #owner #channel-name a',
                      '#owner #channel-name a',
                      'ytd-video-owner-renderer #channel-name a',
                      '#channel-name a',
                      'ytd-channel-name a',
                      'ytd-reel-player-header-renderer .ytd-channel-name a',
                      '#reel-player-header #channel-name'
                    ];

                    for (const sel of selectors) {
                      const elements = document.querySelectorAll(sel);
                      for (const el of elements) {
                        const txt = el.textContent ? el.textContent.trim() : '';
                        if (txt.length > 0) {
                          const cleanTxt = txt.split('\n').map(s => s.trim()).filter(Boolean)[0];
                          if (cleanTxt && cleanTxt.length > 0) return cleanTxt;
                        }
                      }
                    }
                  } catch (e) {}
                  return null;
                }
              }, (results) => {
                if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
                  resolve(null);
                } else {
                  resolve(results[0].result);
                }
              });
            });
          }

          function setupAccountUI(accountName, tabTempOverride = null) {
            currentAccountName = accountName;
            accountGroup.style.display = 'block';
            accountTitle.textContent = strings[currentLang].accountSpecific(currentAccountName);

            chrome.storage.sync.get({ accountSettings: {} }, (accData) => {
              const accSettings = accData.accountSettings || {};
              const accountKey = `youtube:${currentAccountName}`;
              hasAccountSetting = accSettings[accountKey] !== undefined;
              const currentAccountBoost = hasAccountSetting ? accSettings[accountKey] : null;

              // 一時設定がある場合、アカウント設定の遷移前後一致条件を検証
              if (tabTempOverride && isTempActive && !isLiveBoost) {
                const isSameAccountBoost = tabTempOverride.accountBoost === currentAccountBoost;
                if (!isSameAccountBoost) {
                  // アカウント設定が遷移前と異なるため、一時設定を解除
                  isTempActive = false;
                  if (currentTab && currentTab.id) {
                    chrome.runtime.sendMessage({ type: 'CLEAR_TAB_TEMP_BOOST', tabId: currentTab.id });
                  }
                }
              }

              // アカウントに数値が設定されていない場合は、遷移前から数値が継承されているなら現在のタブのみ、なければサイト全体の数値をセット
              let accountBoost;
              if (hasAccountSetting) {
                accountBoost = accSettings[accountKey];
              } else if (isTempActive) {
                accountBoost = parseInt(tempSlider.value, 10);
              } else {
                accountBoost = parseInt(domainSlider.value, 10);
              }
              updateControls(accountSlider, accountNumberInput, accountBoost);

              // 現在のタブの初期値: 一時設定もライブブーストも有効でない場合のみ、設定されていればアカウント、なければサイト全体の数値を適用
              if (!isTempActive && !isLiveBoost) {
                const initialTempBoost = hasAccountSetting ? accountBoost : domainBoost;
                updateControls(tempSlider, tempNumberInput, initialTempBoost);
              }

              updateActiveIndicators();
              PopupUI.updateAccordionHeight();
            });
          }

          function fetchAccountWithRetry(tabId, attemptsLeft = 5, tabTempOverride = null) {
            if (attemptsLeft <= 0 || currentAccountName) return;
            setTimeout(async () => {
              if (currentAccountName) return;

              // 直接DOM探索を試行
              const directName = await detectAccountNameDirectly(tabId);
              if (directName) {
                setupAccountUI(directName, tabTempOverride);
                return;
              }

              chrome.tabs.sendMessage(tabId, { type: 'GET_CURRENT_VOLUME' }, { frameId: 0 }, (res) => {
                if (!chrome.runtime.lastError && res && res.accountName) {
                  if (res.activeSource === 'live') {
                    isLiveBoost = true;
                    liveMultiplier = typeof res.liveMultiplier === 'number' ? res.liveMultiplier : 1.0;
                    isTempActive = false;
                    updateControls(tempSlider, tempNumberInput, res.boost);
                  }
                  setupAccountUI(res.accountName, tabTempOverride);
                } else if (attemptsLeft > 1) {
                  fetchAccountWithRetry(tabId, attemptsLeft - 1, tabTempOverride);
                }
              });
            }, 300);
          }

          // バックグラウンドのセッションストレージからタブ一時設定を確認（超高速・安定）
          chrome.runtime.sendMessage({ type: 'GET_TAB_TEMP_BOOST', tabId: currentTab.id }, (tempResp) => {
            const tabTempOverride = tempResp ? tempResp.tempOverride : null;
            let preTempBoost = domainBoost;

            if (tabTempOverride && isSameDomain(tabTempOverride.domain, currentDomain)) {
              if (tabTempOverride.siteBoost === domainBoost) {
                // ドメインとサイト全体設定が一致しているため、一時設定を維持と判定
                isTempActive = true;
                preTempBoost = tabTempOverride.boost;
              }
            }

            // 初期表示として反映
            updateControls(tempSlider, tempNumberInput, preTempBoost);
            updateActiveIndicators();

            // content.jsから現在のタブの音量を取得（メインフレーム限定 frameId: 0）
            chrome.tabs.sendMessage(currentTab.id, { type: 'GET_CURRENT_VOLUME' }, { frameId: 0 }, async (response) => {
              if (chrome.runtime.lastError || !response) {
                isLiveBoost = false;
                liveMultiplier = null;
                if (!isTempActive) {
                  updateControls(tempSlider, tempNumberInput, domainBoost);
                }
                accountGroup.style.display = 'none';
                updateActiveIndicators();

                if (currentTab.url && currentTab.url.includes('youtube.com')) {
                  const directName = await detectAccountNameDirectly(currentTab.id);
                  if (directName) {
                    setupAccountUI(directName, tabTempOverride);
                  } else {
                    fetchAccountWithRetry(currentTab.id, 5, tabTempOverride);
                  }
                }
              } else {
                if (response.activeSource === 'live') {
                  isLiveBoost = true;
                  liveMultiplier = typeof response.liveMultiplier === 'number' ? response.liveMultiplier : 1.0;
                  isTempActive = false;
                  updateControls(tempSlider, tempNumberInput, response.boost);
                } else if (response.activeSource === 'temp') {
                  isLiveBoost = false;
                  liveMultiplier = null;
                  isTempActive = true;
                  updateControls(tempSlider, tempNumberInput, response.boost);
                } else if (response.activeSource === 'account' || response.activeSource === 'domain' || response.activeSource === 'default') {
                  isLiveBoost = false;
                  liveMultiplier = null;
                  if (!tabTempOverride || !isTempActive) {
                    isTempActive = false;
                    updateControls(tempSlider, tempNumberInput, response.boost);
                  }
                }

                if (response.accountName) {
                  setupAccountUI(response.accountName, tabTempOverride);
                } else if (currentTab.url && currentTab.url.includes('youtube.com')) {
                  const directName = await detectAccountNameDirectly(currentTab.id);
                  if (directName) {
                    setupAccountUI(directName, tabTempOverride);
                  } else {
                    accountGroup.style.display = 'none';
                    updateActiveIndicators();
                    PopupUI.updateAccordionHeight();
                    fetchAccountWithRetry(currentTab.id, 5, tabTempOverride);
                  }
                } else {
                  accountGroup.style.display = 'none';
                  updateActiveIndicators();
                  PopupUI.updateAccordionHeight();
                }
              }
            });
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
    isLiveBoost = false;
    liveMultiplier = null;
    applyBoostToTab(boost, true);
    updateActiveIndicators();
  }

  function handleDomainChange(value) {
    const boost = sanitizeBoostValue(value);
    updateControls(domainSlider, domainNumberInput, boost);
    hasDomainSetting = true;
    saveDomainBoost(boost);

    // アカウントとサイト全体のどちらかのスライダーを操作したら、現在のタブのみにもその数値を適用
    isTempActive = false;
    isLiveBoost = false;
    liveMultiplier = null;
    updateControls(tempSlider, tempNumberInput, boost);
    applyBoostToTab(boost, false);
    if (currentTab && currentTab.id) {
      chrome.tabs.sendMessage(currentTab.id, { type: 'CLEAR_TEMP_ONLY' }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
    updateActiveIndicators();
  }

  function handleAccountChange(value) {
    const boost = sanitizeBoostValue(value);
    updateControls(accountSlider, accountNumberInput, boost);
    hasAccountSetting = true;
    saveAccountBoost(boost);

    // アカウントとサイト全体のどちらかのスライダーを操作したら、現在のタブのみにもその数値を適用
    isTempActive = false;
    isLiveBoost = false;
    liveMultiplier = null;
    updateControls(tempSlider, tempNumberInput, boost);
    applyBoostToTab(boost, false);
    if (currentTab && currentTab.id) {
      chrome.tabs.sendMessage(currentTab.id, { type: 'CLEAR_TEMP_ONLY' }, () => {
        if (chrome.runtime.lastError) {}
      });
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

  // 設定削除後に次に適用されるべき音量を算出
  function getNextEffectiveBoost({ excludeType }) {
    const effHasAccount = excludeType === 'account' ? false : hasAccountSetting;
    const effHasDomain = excludeType === 'domain' ? false : hasDomainSetting;

    if (effHasAccount) {
      return parseInt(accountSlider.value, 10);
    } else if (effHasDomain) {
      return parseInt(domainSlider.value, 10);
    } else {
      return 100;
    }
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

        isTempActive = false;
        const nextBoost = getNextEffectiveBoost({ excludeType: 'domain' });
        updateControls(tempSlider, tempNumberInput, nextBoost);
        applyBoostToTab(nextBoost, false);

        if (currentTab && currentTab.id) {
          chrome.tabs.sendMessage(currentTab.id, {
            type: 'RESET_TEMP_VOLUME',
            fallbackBoost: nextBoost
          }, () => {
            if (chrome.runtime.lastError) {}
          });
          chrome.tabs.sendMessage(currentTab.id, { type: 'SETTINGS_UPDATED' }, () => {
            if (chrome.runtime.lastError) {}
          });
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

        isTempActive = false;
        const nextBoost = getNextEffectiveBoost({ excludeType: 'account' });
        updateControls(tempSlider, tempNumberInput, nextBoost);
        applyBoostToTab(nextBoost, false);

        if (currentTab && currentTab.id) {
          chrome.tabs.sendMessage(currentTab.id, {
            type: 'RESET_TEMP_VOLUME',
            fallbackBoost: nextBoost
          }, () => {
            if (chrome.runtime.lastError) {}
          });
          chrome.tabs.sendMessage(currentTab.id, { type: 'SETTINGS_UPDATED' }, () => {
            if (chrome.runtime.lastError) {}
          });
        }
        updateActiveIndicators();
      });
    });
  }

  function handleTempReset() {
    isTempActive = false;
    isLiveBoost = false;
    liveMultiplier = null;
    const fallbackBoost = getNextEffectiveBoost({ excludeType: 'temp' });

    updateControls(tempSlider, tempNumberInput, fallbackBoost);
    applyBoostToTab(fallbackBoost, false);

    if (currentTab && currentTab.id) {
      chrome.tabs.sendMessage(currentTab.id, {
        type: 'RESET_TEMP_VOLUME',
        fallbackBoost: fallbackBoost
      }, () => {
        if (chrome.runtime.lastError) {}
      });
    }

    updateActiveIndicators();
  }

  function updateActiveIndicators() {
    const currentEffectiveBoost = parseInt(tempSlider.value, 10);
    PopupUI.updateActiveIndicators({
      hasDomainSetting,
      hasAccountSetting,
      isTempActive,
      currentEffectiveBoost,
      isLiveBoost,
      liveMultiplier
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

  function applyBoostToTab(boost, isTemp = false) {
    if (!currentTab || !currentTab.id) return;

    // content.js へ音量更新を送信（Content Script 側で DOM または必要時のみ Tab Capture を自律制御）
    chrome.tabs.sendMessage(currentTab.id, {
      type: 'UPDATE_VOLUME',
      boost: boost,
      isTemp: isTemp
    }, () => {
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