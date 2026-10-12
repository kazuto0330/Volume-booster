// options-domains.js - ドメイン別音量設定の管理モジュール

const OptionsDomains = {
  domainInput: null,
  boostInput: null,
  addButton: null,
  settingsList: null,
  emptyState: null,
  getCurrentLang: null,
  closeAllDropdowns: null,

  init(elements, callbacks) {
    this.domainInput = elements.domainInput;
    this.boostInput = elements.boostInput;
    this.addButton = elements.addButton;
    this.settingsList = elements.settingsList;
    this.emptyState = elements.emptyState;
    this.getCurrentLang = callbacks.getCurrentLang;
    this.closeAllDropdowns = callbacks.closeAllDropdowns;

    this.bindEvents();
  },

  bindEvents() {
    this.addButton.addEventListener('click', () => this.handleAdd());
    this.settingsList.addEventListener('click', (e) => this.handleListClick(e));
    this.settingsList.addEventListener('dblclick', (e) => this.handleListDoubleClick(e));
    this.settingsList.addEventListener('change', (e) => this.handleListChange(e));

    this.boostInput.addEventListener('click', (e) => e.target.select());

    // 入力時の自動URL正規化
    this.domainInput.addEventListener('input', () => {
      this.domainInput.value = normalizeUrl(this.domainInput.value.trim());
    });
  },

  handleAdd() {
    const domain = normalizeUrl(this.domainInput.value.trim());
    const boost = parseInt(this.boostInput.value, 10);
    this.saveOrUpdateSetting(domain, boost);
    this.domainInput.value = '';
    this.boostInput.value = '150'; // デフォルト値に戻す
  },

  handleListClick(event) {
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

    // 2. 編集アクション
    const editBtn = event.target.closest('.edit-action');
    if (editBtn) {
      const row = editBtn.closest('.setting-item');
      const domainDiv = row.querySelector('.col-domain');
      this.startEditing(domainDiv);
      if (this.closeAllDropdowns) this.closeAllDropdowns();
      return;
    }

    // 3. 削除アクション
    const deleteBtn = event.target.closest('.delete-action');
    if (deleteBtn) {
      const domainToDelete = deleteBtn.dataset.domain;
      this.deleteSetting(domainToDelete);
      if (this.closeAllDropdowns) this.closeAllDropdowns();
      return;
    }

    // 数値入力クリック時の全選択
    if (event.target.classList.contains('list-boost-input')) {
      event.target.select();
    }
  },

  handleListChange(event) {
    if (event.target.classList.contains('list-boost-input')) {
      const domainToUpdate = event.target.dataset.domain;
      const newBoost = parseInt(event.target.value, 10);
      this.saveOrUpdateSetting(domainToUpdate, newBoost);
    }
  },

  handleListDoubleClick(event) {
    const domainDiv = event.target.closest('.col-domain');
    if (!domainDiv) return;
    this.startEditing(domainDiv);
  },

  startEditing(domainDiv) {
    if (domainDiv.querySelector('input')) return;

    const oldDomain = domainDiv.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldDomain;
    input.className = 'edit-domain-input';

    domainDiv.innerHTML = '';
    domainDiv.appendChild(input);
    input.focus();

    const save = () => {
      const newDomain = normalizeUrl(input.value.trim());
      if (newDomain && newDomain !== oldDomain) {
        this.renameDomain(oldDomain, newDomain);
      } else {
        domainDiv.textContent = oldDomain;
      }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        input.removeEventListener('blur', save);
        domainDiv.textContent = oldDomain;
      }
    });
  },

  renameDomain(oldDomain, newDomain) {
    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings || {};
      const boost = settings[oldDomain];
      delete settings[oldDomain];
      settings[newDomain] = boost;

      chrome.storage.sync.set({ boostSettings: settings }, () => {
        this.render(settings);
        this.notifyMatchingTabs(oldDomain, 100);
        this.notifyMatchingTabs(newDomain, boost);
      });
    });
  },

  saveOrUpdateSetting(domain, boost) {
    const lang = this.getCurrentLang ? this.getCurrentLang() : 'ja';
    if (!domain) {
      alert(strings[lang].alertDomain);
      return;
    }
    if (isNaN(boost) || boost < 10 || boost > 600) {
      alert(strings[lang].alertBoost);
      return;
    }

    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings || {};
      settings[domain] = boost;
      chrome.storage.sync.set({ boostSettings: settings }, () => {
        this.render(settings);
        this.notifyMatchingTabs(domain, boost);
      });
    });
  },

  deleteSetting(domain) {
    chrome.storage.sync.get({ boostSettings: {} }, (data) => {
      const settings = data.boostSettings || {};
      delete settings[domain];
      chrome.storage.sync.set({ boostSettings: settings }, () => {
        this.render(settings);
        this.notifyMatchingTabs(domain, 100);
      });
    });
  },

  notifyMatchingTabs(domain, boost) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.url) return;
        const normalizedUrl = normalizeUrl(tab.url);
        if (isUrlMatch(domain, normalizedUrl)) {
          chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_VOLUME', boost: boost })
            .catch(() => {});
        }
      });
    });
  },

  render(settings) {
    this.settingsList.innerHTML = '';
    const domains = Object.keys(settings || {});
    const lang = this.getCurrentLang ? this.getCurrentLang() : 'ja';

    if (domains.length === 0) {
      this.emptyState.style.display = 'block';
      return;
    }
    this.emptyState.style.display = 'none';

    domains.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'setting-item';

      const kebabIcon = `<svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

      item.innerHTML = `
        <div class="col-domain">${escapeHTML(domain)}</div>
        <div class="col-boost">
          <div class="boost-input-wrapper">
             <input type="number" class="list-boost-input" min="10" max="600" value="${settings[domain]}" data-domain="${escapeHTML(domain)}">
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
                 <span>${strings[lang].editAction}</span>
               </button>
               <button class="dropdown-item danger delete-action" data-domain="${escapeHTML(domain)}">
                 <span>${strings[lang].deleteAction}</span>
               </button>
            </div>
          </div>
        </div>
      `;
      this.settingsList.appendChild(item);
    });
  }
};
