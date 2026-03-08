document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const domainInput = document.getElementById('domain-input');
  const boostInput = document.getElementById('boost-input');
  const addButton = document.getElementById('add-btn');
  const settingsList = document.getElementById('settings-list');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  const resetSettingsBtn = document.getElementById('reset-settings-btn');
  
  // Icons
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');

  // Labels
  const labelDomain = document.getElementById('labelDomain');
  const labelBoost = document.getElementById('labelBoost');
  const headerDomain = document.getElementById('headerDomain');
  const headerBoost = document.getElementById('headerBoost');
  const headerAction = document.getElementById('headerAction');
  const emptyState = document.getElementById('empty-state');

  // Account Settings Elements
  const accountSettingsList = document.getElementById('account-settings-list');
  const accountEmptyState = document.getElementById('account-empty-state');
  const accountSettingsHeader = document.getElementById('accountSettingsHeader');
  const headerAccount = document.getElementById('headerAccount');
  const headerBoostAccount = document.getElementById('headerBoostAccount');
  const headerActionAccount = document.getElementById('headerActionAccount');

  // State
  let currentLang = 'ja';
  let currentTheme = 'dark';
  let ytLiveSettings = { enabled: false, targetVolume: 60 };
  let ytAutoSettings = { enabled: false, volume: 30 }; // Default values for Auto Set
  let ytScrollSettings = { enabled: false, step: 5 }; // Default values
  let twitchScrollSettings = { enabled: false, step: 5 }; // Twitch Default
  let ytSaveTimer;
  let ytAutoSaveTimer;
  let ytScrollSaveTimer;
  let twitchScrollSaveTimer;

  // --- Initialization ---
  function initialize() {
    chrome.storage.sync.get(['theme', 'language', 'boostSettings', 'accountSettings', 'ytLiveSettings', 'ytAutoSettings', 'ytScrollSettings', 'twitchScrollSettings'], (settings) => {
      currentTheme = settings.theme || 'dark';
      currentLang = settings.language || 'ja';
      ytLiveSettings = settings.ytLiveSettings || { enabled: false, targetVolume: 60 };
      ytAutoSettings = settings.ytAutoSettings || { enabled: false, volume: 30 };
      ytScrollSettings = settings.ytScrollSettings || { enabled: false, step: 5 };
      twitchScrollSettings = settings.twitchScrollSettings || { enabled: false, step: 5 };
      
      applyTheme(currentTheme);
      applyLanguage(currentLang);
      renderSettingsList(settings.boostSettings || {});
      renderAccountSettingsList(settings.accountSettings || {});
      
      // Update YT Live UI
      const ytToggle = document.getElementById('yt-live-toggle');
      const ytSlider = document.getElementById('yt-live-slider');
      const ytValueDisplay = document.getElementById('yt-live-value-display');
      
      if (ytToggle) ytToggle.checked = ytLiveSettings.enabled;
      if (ytSlider) ytSlider.value = ytLiveSettings.targetVolume;
      if (ytValueDisplay) ytValueDisplay.textContent = `${ytLiveSettings.targetVolume}%`;
      
      updatePanelState(ytToggle, 'yt-live-slider');

      // Update YT Auto UI
      const ytAutoToggle = document.getElementById('yt-auto-toggle');
      const ytAutoSlider = document.getElementById('yt-auto-slider');
      const ytAutoValueDisplay = document.getElementById('yt-auto-value-display');

      if (ytAutoToggle) ytAutoToggle.checked = ytAutoSettings.enabled;
      if (ytAutoSlider) ytAutoSlider.value = ytAutoSettings.volume;
      if (ytAutoValueDisplay) ytAutoValueDisplay.textContent = `${ytAutoSettings.volume}%`;

      updatePanelState(ytAutoToggle, 'yt-auto-slider');

      // Update YT Scroll UI
      const ytScrollToggle = document.getElementById('yt-scroll-toggle');
      const ytScrollStepSlider = document.getElementById('yt-scroll-step-slider');
      const ytScrollStepDisplay = document.getElementById('yt-scroll-step-display');

      if (ytScrollToggle) ytScrollToggle.checked = ytScrollSettings.enabled;
      if (ytScrollStepSlider) ytScrollStepSlider.value = ytScrollSettings.step;
      if (ytScrollStepDisplay) ytScrollStepDisplay.textContent = `${ytScrollSettings.step}%`;

      updatePanelState(ytScrollToggle, 'yt-scroll-step-slider');

      // Update Twitch Scroll UI
      const twitchScrollToggle = document.getElementById('twitch-scroll-toggle');
      const twitchScrollStepSlider = document.getElementById('twitch-scroll-step-slider');
      const twitchScrollStepDisplay = document.getElementById('twitch-scroll-step-display');

      if (twitchScrollToggle) twitchScrollToggle.checked = twitchScrollSettings.enabled;
      if (twitchScrollStepSlider) twitchScrollStepSlider.value = twitchScrollSettings.step;
      if (twitchScrollStepDisplay) twitchScrollStepDisplay.textContent = `${twitchScrollSettings.step}%`;

      updatePanelState(twitchScrollToggle, 'twitch-scroll-step-slider');
    });

    addEventListeners();
  }

  // --- Event Listeners ---
  function addEventListeners() {
    addButton.addEventListener('click', handleAdd);
    
    // Event delegation for list items
    settingsList.addEventListener('click', handleListClick);
    settingsList.addEventListener('dblclick', handleListDoubleClick);
    settingsList.addEventListener('change', handleListChange);

    // Event delegation for account list items
    accountSettingsList.addEventListener('click', handleAccountListClick);
    accountSettingsList.addEventListener('change', handleAccountListChange);
    
    // Global click to close dropdowns
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.menu-container')) {
        closeAllDropdowns();
      }
    });
    
    themeToggleBtn.addEventListener('click', handleThemeToggle);
    langToggleBtn.addEventListener('click', handleLangToggle);
    resetSettingsBtn.addEventListener('click', handleResetSettings);

    // Select text on click for number inputs
    boostInput.addEventListener('click', (e) => e.target.select());

    // Auto-clean domain input
    domainInput.addEventListener('input', () => {
      const originalValue = domainInput.value;
      const cleanedValue = cleanDomain(originalValue);
      if (originalValue !== cleanedValue && (originalValue.includes('://') || originalValue.startsWith('www.'))) {
        domainInput.value = cleanedValue;
      }
    });
    domainInput.addEventListener('blur', () => {
      domainInput.value = cleanDomain(domainInput.value);
    });

    // Slider value display logic
    const ytSlider = document.getElementById('yt-live-slider');
    const ytValueDisplay = document.getElementById('yt-live-value-display');
    const ytToggle = document.getElementById('yt-live-toggle');

    if (ytSlider && ytValueDisplay) {
        ytSlider.addEventListener('input', () => {
            ytValueDisplay.textContent = `${ytSlider.value}%`;
        });
        ytSlider.addEventListener('change', () => {
            saveYtLiveSettings();
        });
        ytSlider.addEventListener('wheel', handleYtSliderWheel);
    }

    if (ytToggle) {
        ytToggle.addEventListener('change', () => {
            saveYtLiveSettings();
            updatePanelState(ytToggle, 'yt-live-slider');
        });
    }

    // Auto Volume Settings Logic
    const ytAutoToggle = document.getElementById('yt-auto-toggle');
    const ytAutoSlider = document.getElementById('yt-auto-slider');
    const ytAutoValueDisplay = document.getElementById('yt-auto-value-display');

    if (ytAutoSlider && ytAutoValueDisplay) {
        ytAutoSlider.addEventListener('input', () => {
            ytAutoValueDisplay.textContent = `${ytAutoSlider.value}%`;
        });
        ytAutoSlider.addEventListener('change', () => {
            saveYtAutoSettings();
        });
        ytAutoSlider.addEventListener('wheel', handleYtAutoSliderWheel);
    }

    if (ytAutoToggle) {
        ytAutoToggle.addEventListener('change', () => {
            saveYtAutoSettings();
            updatePanelState(ytAutoToggle, 'yt-auto-slider');
        });
    }

    // Scroll Settings Logic
    const ytScrollToggle = document.getElementById('yt-scroll-toggle');
    const ytScrollStepSlider = document.getElementById('yt-scroll-step-slider');
    const ytScrollStepDisplay = document.getElementById('yt-scroll-step-display');

    if (ytScrollStepSlider && ytScrollStepDisplay) {
        ytScrollStepSlider.addEventListener('input', () => {
            ytScrollStepDisplay.textContent = `${ytScrollStepSlider.value}%`;
        });
        ytScrollStepSlider.addEventListener('change', () => {
            saveYtScrollSettings();
        });
        ytScrollStepSlider.addEventListener('wheel', handleScrollSliderWheel);
    }

    if (ytScrollToggle) {
        ytScrollToggle.addEventListener('change', () => {
            saveYtScrollSettings();
            updatePanelState(ytScrollToggle, 'yt-scroll-step-slider');
        });
    }

    // Twitch Scroll Settings Logic
    const twitchScrollToggle = document.getElementById('twitch-scroll-toggle');
    const twitchScrollStepSlider = document.getElementById('twitch-scroll-step-slider');
    const twitchScrollStepDisplay = document.getElementById('twitch-scroll-step-display');

    if (twitchScrollStepSlider && twitchScrollStepDisplay) {
        twitchScrollStepSlider.addEventListener('input', () => {
            twitchScrollStepDisplay.textContent = `${twitchScrollStepSlider.value}%`;
        });
        twitchScrollStepSlider.addEventListener('change', () => {
            saveTwitchScrollSettings();
        });
        twitchScrollStepSlider.addEventListener('wheel', handleTwitchScrollSliderWheel);
    }

    if (twitchScrollToggle) {
        twitchScrollToggle.addEventListener('change', () => {
            saveTwitchScrollSettings();
            updatePanelState(twitchScrollToggle, 'twitch-scroll-step-slider');
        });
    }

    chrome.runtime.onMessage.addListener((request) => {
      if (request.type === 'SETTINGS_UPDATED') {
        initialize();
      }
    });
  }

  // --- Handlers ---
  function updatePanelState(toggle, sliderId) {
      if (!toggle) return;
      
      const slider = document.getElementById(sliderId);
      const isScrollSetting = toggle.id === 'yt-scroll-toggle' || toggle.id === 'twitch-scroll-toggle';
      
      if (isScrollSetting) {
          // For scroll settings inside the consolidated panel
          // Instead of dimming the whole panel, we might just disable the slider visually
          // or target a specific wrapper div if we added one. 
          // Current HTML structure for scroll settings:
          // <div> <h3>...</h3> <toggle> ... </toggle> <range> ... </range> </div>
          
          const container = toggle.closest('div').parentElement; // The wrapper div inside panel-card
          // Actually, looking at HTML:
          // <div style="margin-bottom: 24px;"> ... </div> for YouTube
          // <div> ... </div> for Twitch
          // The toggle is inside .toggle-container
          
          const sectionWrapper = toggle.closest('.toggle-container').parentElement;
          
          if (!toggle.checked) {
              sectionWrapper.style.opacity = '0.6';
              sectionWrapper.style.filter = 'grayscale(0.2)';
              if (slider) slider.disabled = true;
          } else {
              sectionWrapper.style.opacity = '1';
              sectionWrapper.style.filter = 'none';
              if (slider) slider.disabled = false;
          }
      } else {
          // Original logic for standalone panels
          const panel = toggle.closest('.panel-card');
          if (!toggle.checked) {
              panel.classList.add('dimmed');
              if (slider) slider.disabled = true;
          } else {
              panel.classList.remove('dimmed');
              if (slider) slider.disabled = false;
          }
      }
  }

  function cleanDomain(value) {
    return value.trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');
  }

  function handleYtSliderWheel(event) {
    const slider = event.target;
    event.preventDefault();
    const currentValue = parseInt(slider.value, 10);
    let step = 0;

    if (event.deltaY < 0) { // Scrolling up
      step = currentValue < 100 ? 10 : 20;
    } else { // Scrolling down
      step = currentValue <= 100 ? -10 : -20;
    }

    let newValue = currentValue + step;
    
    // Clamp value
    if (newValue < 0) newValue = 0;
    if (newValue > 600) newValue = 600;
    
    if (newValue !== currentValue) {
        slider.value = newValue;
        
        // Update display
        const ytValueDisplay = document.getElementById('yt-live-value-display');
        if (ytValueDisplay) {
            ytValueDisplay.textContent = `${newValue}%`;
        }

        // Debounced save
        clearTimeout(ytSaveTimer);
        ytSaveTimer = setTimeout(() => {
            saveYtLiveSettings();
        }, 500);
    }
  }

  function handleYtAutoSliderWheel(event) {
    const slider = event.target;
    event.preventDefault();
    const currentValue = parseInt(slider.value, 10);
    const step = event.deltaY < 0 ? 5 : -5; // Scroll up +5, down -5

    let newValue = currentValue + step;
    
    // Clamp value (0-100)
    if (newValue < 0) newValue = 0;
    if (newValue > 100) newValue = 100;
    
    if (newValue !== currentValue) {
        slider.value = newValue;
        
        // Update display
        const ytAutoValueDisplay = document.getElementById('yt-auto-value-display');
        if (ytAutoValueDisplay) {
            ytAutoValueDisplay.textContent = `${newValue}%`;
        }

        // Debounced save
        clearTimeout(ytAutoSaveTimer);
        ytAutoSaveTimer = setTimeout(() => {
            saveYtAutoSettings();
        }, 500);
    }
  }

  function handleScrollSliderWheel(event) {
    const slider = event.target;
    event.preventDefault();
    const currentValue = parseInt(slider.value, 10);
    const step = event.deltaY < 0 ? 1 : -1; // Scroll up +1, down -1

    let newValue = currentValue + step;
    
    // Clamp value (min 1, max 20 based on HTML input)
    if (newValue < 1) newValue = 1;
    if (newValue > 20) newValue = 20;
    
    if (newValue !== currentValue) {
        slider.value = newValue;
        
        // Update display
        const ytScrollStepDisplay = document.getElementById('yt-scroll-step-display');
        if (ytScrollStepDisplay) {
            ytScrollStepDisplay.textContent = `${newValue}%`;
        }

        // Debounced save
        clearTimeout(ytScrollSaveTimer);
        ytScrollSaveTimer = setTimeout(() => {
            saveYtScrollSettings();
        }, 500);
    }
  }

  function handleTwitchScrollSliderWheel(event) {
    const slider = event.target;
    event.preventDefault();
    const currentValue = parseInt(slider.value, 10);
    const step = event.deltaY < 0 ? 1 : -1; // Scroll up +1, down -1

    let newValue = currentValue + step;
    
    // Clamp value (min 1, max 20 based on HTML input)
    if (newValue < 1) newValue = 1;
    if (newValue > 20) newValue = 20;
    
    if (newValue !== currentValue) {
        slider.value = newValue;
        
        // Update display
        const twitchScrollStepDisplay = document.getElementById('twitch-scroll-step-display');
        if (twitchScrollStepDisplay) {
            twitchScrollStepDisplay.textContent = `${newValue}%`;
        }

        // Debounced save
        clearTimeout(twitchScrollSaveTimer);
        twitchScrollSaveTimer = setTimeout(() => {
            saveTwitchScrollSettings();
        }, 500);
    }
  }

  function handleAdd() {
    const domain = cleanDomain(domainInput.value);
    const boost = parseInt(boostInput.value, 10);
    saveOrUpdateSetting(domain, boost);
    domainInput.value = '';
    boostInput.value = '150'; // Reset to default
  }
  
  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
      menu.classList.remove('show');
    });
  }

  function handleListClick(event) {
    // 1. Handle Kebab Menu Button Click
    const menuBtn = event.target.closest('.kebab-menu-btn');
    if (menuBtn) {
      const container = menuBtn.closest('.menu-container');
      const dropdown = container.querySelector('.dropdown-menu');
      
      // Close other dropdowns first
      document.querySelectorAll('.dropdown-menu.show').forEach(d => {
        if (d !== dropdown) d.classList.remove('show');
      });

      dropdown.classList.toggle('show');
      return;
    }

    // 2. Handle Edit Action
    const editBtn = event.target.closest('.edit-action');
    if (editBtn) {
      const domain = editBtn.dataset.domain;
      // Find the row element
      const row = editBtn.closest('.setting-item');
      const domainDiv = row.querySelector('.col-domain');
      startEditing(domainDiv);
      closeAllDropdowns();
      return;
    }

    // 3. Handle Delete Action
    const deleteBtn = event.target.closest('.delete-action');
    if (deleteBtn) {
      const domainToDelete = deleteBtn.dataset.domain;
      deleteSetting(domainToDelete);
      closeAllDropdowns();
      return;
    }
    
    // Select text on click for number inputs
    if (event.target.classList.contains('list-boost-input')) {
      event.target.select();
    }
  }

  function handleListChange(event) {
    if (event.target.classList.contains('list-boost-input')) {
      const domainToUpdate = event.target.dataset.domain;
      const newBoost = parseInt(event.target.value, 10);
      saveOrUpdateSetting(domainToUpdate, newBoost);
    }
  }

  function handleListDoubleClick(event) {
    const domainDiv = event.target.closest('.col-domain');
    if (!domainDiv) return;
    startEditing(domainDiv);
  }
  
  function startEditing(domainDiv) {
    if (domainDiv.querySelector('input')) return;

    const oldDomain = domainDiv.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldDomain;
    input.className = 'edit-domain-input'; 
    
    // Replace text with input
    domainDiv.innerHTML = '';
    domainDiv.appendChild(input);
    input.focus();

    // Handle save on blur or Enter
    const save = () => {
      const newDomain = cleanDomain(input.value);
      if (newDomain && newDomain !== oldDomain) {
        renameDomain(oldDomain, newDomain);
      } else {
        // Revert if empty or unchanged
        domainDiv.textContent = oldDomain;
      }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur(); // Triggers save via blur event
      } else if (e.key === 'Escape') {
        // Cancel edit
        input.removeEventListener('blur', save); // Prevent saving
        domainDiv.textContent = oldDomain;
      }
    });
  }

  function renameDomain(oldDomain, newDomain) {
    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings;
      // Handle overwrite scenario simply for now
      const boost = settings[oldDomain];
      delete settings[oldDomain];
      settings[newDomain] = boost;
      
      chrome.storage.sync.set({ boostSettings: settings }, () => {
        renderSettingsList(settings);
        notifyMatchingTabs(oldDomain, 100); // Reset old
        notifyMatchingTabs(newDomain, boost); // Apply new
      });
    });
  }
  
  // ... (rest of the file) ...

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
        renderSettingsList(data.boostSettings);
      });
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  function handleResetSettings() {
    if (confirm(strings[currentLang].resetConfirm)) {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          console.error("Error clearing storage: ", chrome.runtime.lastError);
        } else {
          initialize(); 
          chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
        }
      });
    }
  }

  // --- Core Logic ---
  function saveOrUpdateSetting(domain, boost) {
    if (!domain) {
      alert(strings[currentLang].alertDomain);
      return;
    }
    if (isNaN(boost) || boost < 0 || boost > 600) {
      alert(strings[currentLang].alertBoost);
      return;
    }

    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings;
      settings[domain] = boost;
      chrome.storage.sync.set({ boostSettings: settings }, () => {
        renderSettingsList(settings);
        notifyMatchingTabs(domain, boost);
      });
    });
  }

  function deleteSetting(domain) {
    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings;
      delete settings[domain];
      chrome.storage.sync.set({ boostSettings: settings }, () => {
        renderSettingsList(settings);
        notifyMatchingTabs(domain, 100); // Reset to default
      });
    });
  }

  function notifyMatchingTabs(domain, boost) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.url) return;
        
        let url = tab.url;
        // Simple domain extraction matching the logic in popup/background
        url = url.replace(/^https?:\/\//, '');
        url = url.replace(/^www\./, '');
        
        let isMatch = false;
        if (url.startsWith(domain)) {
             if (url.length === domain.length) {
                 isMatch = true;
             } else {
                 const nextChar = url[domain.length];
                 if (['/', '?', '#'].includes(nextChar)) isMatch = true;
             }
        }

        if (isMatch) {
          chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_VOLUME', boost: boost })
            .catch(() => {}); // Ignore errors if content script not ready
        }
      });
    });
  }

  function saveYtLiveSettings() {
    const ytToggle = document.getElementById('yt-live-toggle');
    const ytSlider = document.getElementById('yt-live-slider');
    
    const settings = {
        enabled: ytToggle.checked,
        targetVolume: parseInt(ytSlider.value, 10)
    };
    
    chrome.storage.sync.set({ ytLiveSettings: settings }, () => {
         // Notify tabs (especially YouTube tabs) about the setting change
         chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
         // Also direct message active tabs to re-check immediately
         chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
             tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }));
         });
    });
  }

  function saveYtAutoSettings() {
    const ytAutoToggle = document.getElementById('yt-auto-toggle');
    const ytAutoSlider = document.getElementById('yt-auto-slider');
    
    const settings = {
        enabled: ytAutoToggle.checked,
        volume: parseInt(ytAutoSlider.value, 10)
    };
    
    chrome.storage.sync.set({ ytAutoSettings: settings }, () => {
         chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
         chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
             tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }));
         });
    });
  }

  function saveYtScrollSettings() {
    const ytScrollToggle = document.getElementById('yt-scroll-toggle');
    const ytScrollStepSlider = document.getElementById('yt-scroll-step-slider');

    const settings = {
        enabled: ytScrollToggle.checked,
        step: parseInt(ytScrollStepSlider.value, 10)
    };

    chrome.storage.sync.set({ ytScrollSettings: settings }, () => {
         chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
         chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
             tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }));
         });
    });
  }

  function saveTwitchScrollSettings() {
    const twitchScrollToggle = document.getElementById('twitch-scroll-toggle');
    const twitchScrollStepSlider = document.getElementById('twitch-scroll-step-slider');

    const settings = {
        enabled: twitchScrollToggle.checked,
        step: parseInt(twitchScrollStepSlider.value, 10)
    };

    chrome.storage.sync.set({ twitchScrollSettings: settings }, () => {
         chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
         chrome.tabs.query({url: "*://*.twitch.tv/*"}, (tabs) => {
             tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }));
         });
    });
  }

  // --- UI Updates ---
  function applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    // Toggle icon visibility
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
    
    // Update headers and labels
    labelDomain.textContent = s.headerDomain;
    labelBoost.textContent = s.headerBoost;
    headerDomain.textContent = s.headerDomain;
    headerBoost.textContent = s.headerBoost;
    headerAction.textContent = s.headerAction;
    
    resetSettingsBtn.textContent = s.resetAllSettings;

    // New Sections Localization
    const generalSettingsHeader = document.getElementById('generalSettingsHeader');
    if (generalSettingsHeader) generalSettingsHeader.textContent = s.generalSettings;

    const youtubeLiveSettingsHeader = document.getElementById('youtubeLiveSettingsHeader');
    if (youtubeLiveSettingsHeader) youtubeLiveSettingsHeader.textContent = s.youtubeLiveSettings;

    const labelEnableYoutubeLive = document.getElementById('labelEnableYoutubeLive');
    if (labelEnableYoutubeLive) labelEnableYoutubeLive.textContent = s.enableYoutubeLiveLowering;

    const labelTargetVolume = document.getElementById('labelTargetVolume');
    if (labelTargetVolume) labelTargetVolume.textContent = s.targetVolume;

    // Auto Settings Localization
    const youtubeAutoSettingsHeader = document.getElementById('youtubeAutoSettingsHeader');
    if (youtubeAutoSettingsHeader) youtubeAutoSettingsHeader.textContent = s.youtubeAutoSettings;

    const labelEnableYoutubeAuto = document.getElementById('labelEnableYoutubeAuto');
    if (labelEnableYoutubeAuto) labelEnableYoutubeAuto.textContent = s.enableYoutubeAuto;

    const labelDefaultVolume = document.getElementById('labelDefaultVolume');
    if (labelDefaultVolume) labelDefaultVolume.textContent = s.defaultVolume;

    // Scroll Settings Localization
    const mouseWheelSettingsHeader = document.getElementById('mouseWheelSettingsHeader');
    if (mouseWheelSettingsHeader) mouseWheelSettingsHeader.textContent = s.mouseWheelSettings;

    const youtubeScrollSettingsHeader = document.getElementById('youtubeScrollSettingsHeader');
    if (youtubeScrollSettingsHeader) youtubeScrollSettingsHeader.textContent = s.youtubeScrollSettings;
    
    const labelEnableYoutubeScroll = document.getElementById('labelEnableYoutubeScroll');
    if (labelEnableYoutubeScroll) labelEnableYoutubeScroll.textContent = s.enableYoutubeScroll;
    
    const labelScrollStep = document.getElementById('labelScrollStep');
    if (labelScrollStep) labelScrollStep.textContent = s.scrollStep;

    // Twitch Scroll Settings Localization
    const twitchScrollSettingsHeader = document.getElementById('twitchScrollSettingsHeader');
    if (twitchScrollSettingsHeader) twitchScrollSettingsHeader.textContent = s.twitchScrollSettings;
    
    const labelEnableTwitchScroll = document.getElementById('labelEnableTwitchScroll');
    if (labelEnableTwitchScroll) labelEnableTwitchScroll.textContent = s.enableTwitchScroll;
    
    const labelTwitchScrollStep = document.getElementById('labelTwitchScrollStep');
    if (labelTwitchScrollStep) labelTwitchScrollStep.textContent = s.scrollStep;

    // Account Settings Localization
    if (accountSettingsHeader) accountSettingsHeader.textContent = s.accountSettings;
    if (headerAccount) headerAccount.textContent = s.headerAccount;
    if (headerBoostAccount) headerBoostAccount.textContent = s.headerBoost;
    if (headerActionAccount) headerActionAccount.textContent = s.headerAction;
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderSettingsList(settings) {
    settingsList.innerHTML = '';
    const domains = Object.keys(settings);
    
    if (domains.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    domains.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'setting-item';
      
      // Kebab Icon SVG
      const kebabIcon = `<svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

      item.innerHTML = `
        <div class="col-domain">${escapeHTML(domain)}</div>
        <div class="col-boost">
          <div class="boost-input-wrapper">
             <input type="number" class="list-boost-input" min="0" max="600" value="${settings[domain]}" data-domain="${escapeHTML(domain)}">
             <span>%</span>
          </div>
        </div>
        <div class="col-action">
          <div class="menu-container">
            <button class="kebab-menu-btn" title="Menu">
              ${kebabIcon}
            </button>
            <div class="dropdown-menu">
               <button class="dropdown-item edit-action" data-domain="${escapeHTML(domain)}">
                 <span>${strings[currentLang].editAction}</span>
               </button>
               <button class="dropdown-item danger delete-action" data-domain="${escapeHTML(domain)}">
                 <span>${strings[currentLang].deleteAction}</span>
               </button>
            </div>
          </div>
        </div>
      `;
      settingsList.appendChild(item);
    });
  }

  function renderAccountSettingsList(settings) {
    accountSettingsList.innerHTML = '';
    const accounts = Object.keys(settings);
    
    if (accounts.length === 0) {
        accountEmptyState.style.display = 'block';
        return;
    }
    accountEmptyState.style.display = 'none';

    accounts.forEach(key => {
      const item = document.createElement('div');
      item.className = 'setting-item';
      
      // Extract account name from key "youtube:AccountName"
      const accountName = key.replace('youtube:', '');
      
      // Kebab Icon SVG
      const kebabIcon = `<svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

      item.innerHTML = `
        <div class="col-domain">${escapeHTML(accountName)}</div>
        <div class="col-boost">
          <div class="boost-input-wrapper">
             <input type="number" class="list-boost-input" min="0" max="600" value="${settings[key]}" data-key="${escapeHTML(key)}">
             <span>%</span>
          </div>
        </div>
        <div class="col-action">
          <div class="menu-container">
            <button class="kebab-menu-btn" title="Menu">
              ${kebabIcon}
            </button>
            <div class="dropdown-menu">
               <button class="dropdown-item danger delete-action" data-key="${escapeHTML(key)}">
                 <span>${strings[currentLang].deleteAction}</span>
               </button>
            </div>
          </div>
        </div>
      `;
      accountSettingsList.appendChild(item);
    });
  }

  function handleAccountListClick(event) {
    // 1. Handle Kebab Menu Button Click
    const menuBtn = event.target.closest('.kebab-menu-btn');
    if (menuBtn) {
      const container = menuBtn.closest('.menu-container');
      const dropdown = container.querySelector('.dropdown-menu');
      
      document.querySelectorAll('.dropdown-menu.show').forEach(d => {
        if (d !== dropdown) d.classList.remove('show');
      });

      dropdown.classList.toggle('show');
      return;
    }

    // 2. Handle Delete Action
    const deleteBtn = event.target.closest('.delete-action');
    if (deleteBtn) {
      const keyToDelete = deleteBtn.dataset.key;
      deleteAccountSetting(keyToDelete);
      closeAllDropdowns();
      return;
    }
    
    if (event.target.classList.contains('list-boost-input')) {
      event.target.select();
    }
  }

  function handleAccountListChange(event) {
    if (event.target.classList.contains('list-boost-input')) {
      const keyToUpdate = event.target.dataset.key;
      const newBoost = parseInt(event.target.value, 10);
      
      chrome.storage.sync.get({ accountSettings: {} }, (data) => {
        const settings = data.accountSettings || {};
        settings[keyToUpdate] = newBoost;
        chrome.storage.sync.set({ accountSettings: settings }, () => {
             // Ideally notify tabs, but account matching is complex from here without knowing current URL/account.
             // Just reload to update UI. Content script will pick up on next load/message.
             // Actually we can send global update message
             chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
        });
      });
    }
  }

  function deleteAccountSetting(key) {
      chrome.storage.sync.get({ accountSettings: {} }, (data) => {
          const settings = data.accountSettings || {};
          delete settings[key];
          chrome.storage.sync.set({ accountSettings: settings }, () => {
              renderAccountSettingsList(settings);
              chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
          });
      });
  }

  // --- Run ---
  initialize();
});