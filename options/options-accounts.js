// options-accounts.js - YouTubeアカウント別音量設定の管理モジュール

const OptionsAccounts = {
  accountSettingsList: null,
  accountEmptyState: null,
  getCurrentLang: null,
  closeAllDropdowns: null,

  init(elements, callbacks) {
    this.accountSettingsList = elements.accountSettingsList;
    this.accountEmptyState = elements.accountEmptyState;
    this.getCurrentLang = callbacks.getCurrentLang;
    this.closeAllDropdowns = callbacks.closeAllDropdowns;

    this.bindEvents();
  },

  bindEvents() {
    this.accountSettingsList.addEventListener('click', (e) => this.handleClick(e));
    this.accountSettingsList.addEventListener('change', (e) => this.handleChange(e));
  },

  handleClick(event) {
    // 1. ケバブメニューボタンのクリック
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

    // 2. 削除アクション
    const deleteBtn = event.target.closest('.delete-action');
    if (deleteBtn) {
      const keyToDelete = deleteBtn.dataset.key;
      this.deleteSetting(keyToDelete);
      if (this.closeAllDropdowns) this.closeAllDropdowns();
      return;
    }

    // 数値入力クリック時の全選択
    if (event.target.classList.contains('list-boost-input')) {
      event.target.select();
    }
  },

  handleChange(event) {
    if (event.target.classList.contains('list-boost-input')) {
      const keyToUpdate = event.target.dataset.key;
      const newBoost = parseInt(event.target.value, 10);

      chrome.storage.sync.get({ accountSettings: {} }, (data) => {
        const settings = data.accountSettings || {};
        settings[keyToUpdate] = newBoost;
        chrome.storage.sync.set({ accountSettings: settings }, () => {
          chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
        });
      });
    }
  },

  deleteSetting(key) {
    chrome.storage.sync.get({ accountSettings: {} }, (data) => {
      const settings = data.accountSettings || {};
      delete settings[key];
      chrome.storage.sync.set({ accountSettings: settings }, () => {
        this.render(settings);
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      });
    });
  },

  render(settings) {
    this.accountSettingsList.innerHTML = '';
    const accounts = Object.keys(settings || {});
    const lang = this.getCurrentLang ? this.getCurrentLang() : 'ja';

    if (accounts.length === 0) {
      this.accountEmptyState.style.display = 'block';
      return;
    }
    this.accountEmptyState.style.display = 'none';

    accounts.forEach(key => {
      const item = document.createElement('div');
      item.className = 'setting-item';

      const displayName = key.replace('youtube:', '');
      const kebabIcon = `<svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

      item.innerHTML = `
        <div class="col-domain">${escapeHTML(displayName)}</div>
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
                 <span>${strings[lang].deleteAction}</span>
               </button>
            </div>
          </div>
        </div>
      `;
      this.accountSettingsList.appendChild(item);
    });
  }
};
