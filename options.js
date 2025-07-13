document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const domainInput = document.getElementById('domain-input');
  const boostInput = document.getElementById('boost-input');
  const addButton = document.getElementById('add-btn');
  const settingsTableBody = document.querySelector('#settings-table tbody');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  const resetSettingsBtn = document.getElementById('reset-settings-btn'); // New element

  // State
  let currentLang = 'ja';
  let currentTheme = 'light';

  // --- Initialization ---
  function initialize() {
    chrome.storage.sync.get(['theme', 'language', 'boostSettings'], (settings) => {
      currentTheme = settings.theme || 'light';
      currentLang = settings.language || 'ja';
      applyTheme(currentTheme);
      applyLanguage(currentLang);
      renderTable(settings.boostSettings || {});
    });

    addEventListeners();
  }

  // --- Event Listeners ---
  function addEventListeners() {
    addButton.addEventListener('click', handleAdd);
    settingsTableBody.addEventListener('click', handleTableClick);
    settingsTableBody.addEventListener('change', handleTableChange);
    
    themeToggleBtn.addEventListener('click', handleThemeToggle);
    langToggleBtn.addEventListener('click', handleLangToggle);
    resetSettingsBtn.addEventListener('click', handleResetSettings); // New event listener

    chrome.runtime.onMessage.addListener((request) => {
      if (request.type === 'SETTINGS_UPDATED') {
        initialize();
      }
    });
  }

  // --- Handlers ---
  function handleAdd() {
    const domain = domainInput.value.trim();
    const boost = parseInt(boostInput.value, 10);
    saveOrUpdateSetting(domain, boost);
    domainInput.value = '';
    boostInput.value = '';
  }

  function handleTableClick(event) {
    if (event.target.classList.contains('delete-btn')) {
      const domainToDelete = event.target.dataset.domain;
      if (confirm(strings[currentLang].deleteConfirm(domainToDelete))) {
        deleteSetting(domainToDelete);
      }
    }
  }

  function handleTableChange(event) {
    if (event.target.classList.contains('boost-input')) {
      const domainToUpdate = event.target.dataset.domain;
      const newBoost = parseInt(event.target.value, 10);
      saveOrUpdateSetting(domainToUpdate, newBoost);
    }
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
      chrome.storage.sync.get({ boostSettings: {} }, (data) => {
        renderTable(data.boostSettings);
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
          console.log("All settings cleared.");
          // Re-initialize the page to reflect default settings
          initialize(); 
          // Notify other parts of the extension (e.g., popup) to update
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
    if (isNaN(boost) || boost < 10 || boost > 600) {
      alert(strings[currentLang].alertBoost);
      return;
    }

    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings;
      settings[domain] = boost;
      chrome.storage.sync.set({ boostSettings: settings }, () => {
        renderTable(settings);
        notifyMatchingTabs(domain, boost);
      });
    });
  }

  function deleteSetting(domain) {
    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings;
      delete settings[domain];
      chrome.storage.sync.set({ boostSettings: settings }, () => {
        renderTable(settings);
        notifyMatchingTabs(domain, 100); // Reset to default
      });
    });
  }

  function notifyMatchingTabs(domain, boost) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && new URL(tab.url).hostname.includes(domain)) {
          chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_VOLUME', boost: boost });
        }
      });
    });
  }

  // --- UI Updates ---
  function applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  function applyLanguage(lang) {
    currentLang = lang;
    const s = strings[lang];
    document.title = s.optionsTitle;
    document.getElementById('optionsTitle-h1').textContent = s.optionsTitle;
    domainInput.placeholder = s.domainPlaceholder;
    boostInput.placeholder = s.boostPlaceholder;
    addButton.textContent = s.add;
    document.getElementById('headerDomain').textContent = s.headerDomain;
    document.getElementById('headerBoost').textContent = s.headerBoost;
    document.getElementById('headerAction').textContent = s.headerAction;
    resetSettingsBtn.textContent = s.resetAllSettings; // Set text for new button
  }

  function renderTable(settings) {
    settingsTableBody.innerHTML = '';
    for (const domain in settings) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${domain}</td>
        <td><input type="number" class="boost-input" min="10" max="600" value="${settings[domain]}" data-domain="${domain}"></td>
        <td><span class="delete-btn" data-domain="${domain}">${strings[currentLang].deleteAction}</span></td>
      `;
      settingsTableBody.appendChild(row);
    }
  }

  // --- Run ---
  initialize();
});
