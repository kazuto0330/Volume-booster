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

  // State
  let currentLang = 'ja';
  let currentTheme = 'dark';

  // --- Initialization ---
  function initialize() {
    chrome.storage.sync.get(['theme', 'language', 'boostSettings'], (settings) => {
      currentTheme = settings.theme || 'dark';
      currentLang = settings.language || 'ja';
      applyTheme(currentTheme);
      applyLanguage(currentLang);
      renderSettingsList(settings.boostSettings || {});
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

    chrome.runtime.onMessage.addListener((request) => {
      if (request.type === 'SETTINGS_UPDATED') {
        initialize();
      }
    });
  }

  // --- Handlers ---
  function cleanDomain(value) {
    return value.trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');
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
        <div class="col-domain">${domain}</div>
        <div class="col-boost">
          <div class="boost-input-wrapper">
             <input type="number" class="list-boost-input" min="0" max="600" value="${settings[domain]}" data-domain="${domain}">
             <span>%</span>
          </div>
        </div>
        <div class="col-action">
          <div class="menu-container">
            <button class="kebab-menu-btn" title="Menu">
              ${kebabIcon}
            </button>
            <div class="dropdown-menu">
               <button class="dropdown-item edit-action" data-domain="${domain}">
                 <span>${strings[currentLang].editAction}</span>
               </button>
               <button class="dropdown-item danger delete-action" data-domain="${domain}">
                 <span>${strings[currentLang].deleteAction}</span>
               </button>
            </div>
          </div>
        </div>
      `;
      settingsList.appendChild(item);
    });
  }

  // --- Run ---
  initialize();
});