// options-features.js - メディア機能設定（YouTube Live, Auto Volume, Wheel Scroll）管理モジュール

const OptionsFeatures = {
  ytSaveTimer: null,
  ytAutoSaveTimer: null,
  ytScrollSaveTimer: null,
  twitchScrollSaveTimer: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // 1. YouTube Live
    const ytToggle = document.getElementById('yt-live-toggle');
    const ytSlider = document.getElementById('yt-live-slider');
    const ytValueDisplay = document.getElementById('yt-live-value-display');

    if (ytSlider && ytValueDisplay) {
      ytSlider.addEventListener('input', () => {
        ytValueDisplay.textContent = `${ytSlider.value}%`;
      });
      ytSlider.addEventListener('change', () => this.saveYtLiveSettings());
      ytSlider.addEventListener('wheel', (e) => this.handleYtSliderWheel(e));
    }
    if (ytToggle) {
      ytToggle.addEventListener('change', () => {
        this.saveYtLiveSettings();
        this.updatePanelState(ytToggle, 'yt-live-slider');
      });
    }

    // 2. YouTube Auto Volume
    const ytAutoToggle = document.getElementById('yt-auto-toggle');
    const ytAutoSlider = document.getElementById('yt-auto-slider');
    const ytAutoValueDisplay = document.getElementById('yt-auto-value-display');

    if (ytAutoSlider && ytAutoValueDisplay) {
      ytAutoSlider.addEventListener('input', () => {
        ytAutoValueDisplay.textContent = `${ytAutoSlider.value}%`;
      });
      ytAutoSlider.addEventListener('change', () => this.saveYtAutoSettings());
      ytAutoSlider.addEventListener('wheel', (e) => this.handleYtAutoSliderWheel(e));
    }
    if (ytAutoToggle) {
      ytAutoToggle.addEventListener('change', () => {
        this.saveYtAutoSettings();
        this.updatePanelState(ytAutoToggle, 'yt-auto-slider');
      });
    }

    // 3. YouTube Scroll
    const ytScrollToggle = document.getElementById('yt-scroll-toggle');
    const ytScrollStepSlider = document.getElementById('yt-scroll-step-slider');
    const ytScrollStepDisplay = document.getElementById('yt-scroll-step-display');

    if (ytScrollStepSlider && ytScrollStepDisplay) {
      ytScrollStepSlider.addEventListener('input', () => {
        ytScrollStepDisplay.textContent = `${ytScrollStepSlider.value}%`;
      });
      ytScrollStepSlider.addEventListener('change', () => this.saveYtScrollSettings());
      ytScrollStepSlider.addEventListener('wheel', (e) => this.handleScrollSliderWheel(e));
    }
    if (ytScrollToggle) {
      ytScrollToggle.addEventListener('change', () => {
        this.saveYtScrollSettings();
        this.updatePanelState(ytScrollToggle, 'yt-scroll-step-slider');
      });
    }

    // 4. Twitch Scroll
    const twitchScrollToggle = document.getElementById('twitch-scroll-toggle');
    const twitchScrollStepSlider = document.getElementById('twitch-scroll-step-slider');
    const twitchScrollStepDisplay = document.getElementById('twitch-scroll-step-display');

    if (twitchScrollStepSlider && twitchScrollStepDisplay) {
      twitchScrollStepSlider.addEventListener('input', () => {
        twitchScrollStepDisplay.textContent = `${twitchScrollStepSlider.value}%`;
      });
      twitchScrollStepSlider.addEventListener('change', () => this.saveTwitchScrollSettings());
      twitchScrollStepSlider.addEventListener('wheel', (e) => this.handleTwitchScrollSliderWheel(e));
    }
    if (twitchScrollToggle) {
      twitchScrollToggle.addEventListener('change', () => {
        this.saveTwitchScrollSettings();
        this.updatePanelState(twitchScrollToggle, 'twitch-scroll-step-slider');
      });
    }
  },

  updatePanelState(toggle, sliderId) {
    if (!toggle) return;
    const slider = document.getElementById(sliderId);
    const isScrollSetting = toggle.id === 'yt-scroll-toggle' || toggle.id === 'twitch-scroll-toggle';

    if (isScrollSetting) {
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
      const panel = toggle.closest('.panel-card');
      if (!toggle.checked) {
        panel.classList.add('dimmed');
        if (slider) slider.disabled = true;
      } else {
        panel.classList.remove('dimmed');
        if (slider) slider.disabled = false;
      }
    }
  },

  load(data) {
    const ytLiveSettings = data.ytLiveSettings || { enabled: false, targetVolume: 60 };
    const ytAutoSettings = data.ytAutoSettings || { enabled: false, volume: 30 };
    const ytScrollSettings = data.ytScrollSettings || { enabled: false, step: 5 };
    const twitchScrollSettings = data.twitchScrollSettings || { enabled: false, step: 5 };

    // YT Live
    const ytToggle = document.getElementById('yt-live-toggle');
    const ytSlider = document.getElementById('yt-live-slider');
    const ytValueDisplay = document.getElementById('yt-live-value-display');
    if (ytToggle) ytToggle.checked = ytLiveSettings.enabled;
    if (ytSlider) ytSlider.value = ytLiveSettings.targetVolume;
    if (ytValueDisplay) ytValueDisplay.textContent = `${ytLiveSettings.targetVolume}%`;
    this.updatePanelState(ytToggle, 'yt-live-slider');

    // YT Auto
    const ytAutoToggle = document.getElementById('yt-auto-toggle');
    const ytAutoSlider = document.getElementById('yt-auto-slider');
    const ytAutoValueDisplay = document.getElementById('yt-auto-value-display');
    if (ytAutoToggle) ytAutoToggle.checked = ytAutoSettings.enabled;
    if (ytAutoSlider) ytAutoSlider.value = ytAutoSettings.volume;
    if (ytAutoValueDisplay) ytAutoValueDisplay.textContent = `${ytAutoSettings.volume}%`;
    this.updatePanelState(ytAutoToggle, 'yt-auto-slider');

    // YT Scroll
    const ytScrollToggle = document.getElementById('yt-scroll-toggle');
    const ytScrollStepSlider = document.getElementById('yt-scroll-step-slider');
    const ytScrollStepDisplay = document.getElementById('yt-scroll-step-display');
    if (ytScrollToggle) ytScrollToggle.checked = ytScrollSettings.enabled;
    if (ytScrollStepSlider) ytScrollStepSlider.value = ytScrollSettings.step;
    if (ytScrollStepDisplay) ytScrollStepDisplay.textContent = `${ytScrollSettings.step}%`;
    this.updatePanelState(ytScrollToggle, 'yt-scroll-step-slider');

    // Twitch Scroll
    const twitchScrollToggle = document.getElementById('twitch-scroll-toggle');
    const twitchScrollStepSlider = document.getElementById('twitch-scroll-step-slider');
    const twitchScrollStepDisplay = document.getElementById('twitch-scroll-step-display');
    if (twitchScrollToggle) twitchScrollToggle.checked = twitchScrollSettings.enabled;
    if (twitchScrollStepSlider) twitchScrollStepSlider.value = twitchScrollSettings.step;
    if (twitchScrollStepDisplay) twitchScrollStepDisplay.textContent = `${twitchScrollSettings.step}%`;
    this.updatePanelState(twitchScrollToggle, 'twitch-scroll-step-slider');
  },

  handleYtSliderWheel(event) {
    const slider = event.target;
    event.preventDefault();
    const currentValue = parseInt(slider.value, 10);
    const step = event.deltaY < 0 ? (currentValue < 100 ? 10 : 20) : (currentValue <= 100 ? -10 : -20);
    const newValue = clamp(currentValue + step, 0, 600);

    if (newValue !== currentValue) {
      slider.value = newValue;
      const ytValueDisplay = document.getElementById('yt-live-value-display');
      if (ytValueDisplay) ytValueDisplay.textContent = `${newValue}%`;

      clearTimeout(this.ytSaveTimer);
      this.ytSaveTimer = setTimeout(() => this.saveYtLiveSettings(), 500);
    }
  },

  handleYtAutoSliderWheel(event) {
    const slider = event.target;
    event.preventDefault();
    const currentValue = parseInt(slider.value, 10);
    const step = event.deltaY < 0 ? 5 : -5;
    const newValue = clamp(currentValue + step, 0, 100);

    if (newValue !== currentValue) {
      slider.value = newValue;
      const ytAutoValueDisplay = document.getElementById('yt-auto-value-display');
      if (ytAutoValueDisplay) ytAutoValueDisplay.textContent = `${newValue}%`;

      clearTimeout(this.ytAutoSaveTimer);
      this.ytAutoSaveTimer = setTimeout(() => this.saveYtAutoSettings(), 500);
    }
  },

  handleScrollSliderWheel(event) {
    const slider = event.target;
    event.preventDefault();
    const currentValue = parseInt(slider.value, 10);
    const step = event.deltaY < 0 ? 1 : -1;
    const newValue = clamp(currentValue + step, 1, 20);

    if (newValue !== currentValue) {
      slider.value = newValue;
      const ytScrollStepDisplay = document.getElementById('yt-scroll-step-display');
      if (ytScrollStepDisplay) ytScrollStepDisplay.textContent = `${newValue}%`;

      clearTimeout(this.ytScrollSaveTimer);
      this.ytScrollSaveTimer = setTimeout(() => this.saveYtScrollSettings(), 500);
    }
  },

  handleTwitchScrollSliderWheel(event) {
    const slider = event.target;
    event.preventDefault();
    const currentValue = parseInt(slider.value, 10);
    const step = event.deltaY < 0 ? 1 : -1;
    const newValue = clamp(currentValue + step, 1, 20);

    if (newValue !== currentValue) {
      slider.value = newValue;
      const twitchScrollStepDisplay = document.getElementById('twitch-scroll-step-display');
      if (twitchScrollStepDisplay) twitchScrollStepDisplay.textContent = `${newValue}%`;

      clearTimeout(this.twitchScrollSaveTimer);
      this.twitchScrollSaveTimer = setTimeout(() => this.saveTwitchScrollSettings(), 500);
    }
  },

  saveYtLiveSettings() {
    const ytToggle = document.getElementById('yt-live-toggle');
    const ytSlider = document.getElementById('yt-live-slider');
    const settings = {
      enabled: ytToggle.checked,
      targetVolume: parseInt(ytSlider.value, 10)
    };

    chrome.storage.sync.set({ ytLiveSettings: settings }, () => {
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
        tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }));
      });
    });
  },

  saveYtAutoSettings() {
    const ytAutoToggle = document.getElementById('yt-auto-toggle');
    const ytAutoSlider = document.getElementById('yt-auto-slider');
    const settings = {
      enabled: ytAutoToggle.checked,
      volume: parseInt(ytAutoSlider.value, 10)
    };

    chrome.storage.sync.set({ ytAutoSettings: settings }, () => {
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
        tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }));
      });
    });
  },

  saveYtScrollSettings() {
    const ytScrollToggle = document.getElementById('yt-scroll-toggle');
    const ytScrollStepSlider = document.getElementById('yt-scroll-step-slider');
    const settings = {
      enabled: ytScrollToggle.checked,
      step: parseInt(ytScrollStepSlider.value, 10)
    };

    chrome.storage.sync.set({ ytScrollSettings: settings }, () => {
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
        tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }));
      });
    });
  },

  saveTwitchScrollSettings() {
    const twitchScrollToggle = document.getElementById('twitch-scroll-toggle');
    const twitchScrollStepSlider = document.getElementById('twitch-scroll-step-slider');
    const settings = {
      enabled: twitchScrollToggle.checked,
      step: parseInt(twitchScrollStepSlider.value, 10)
    };

    chrome.storage.sync.set({ twitchScrollSettings: settings }, () => {
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      chrome.tabs.query({ url: "*://*.twitch.tv/*" }, (tabs) => {
        tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }));
      });
    });
  }
};
