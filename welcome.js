document.addEventListener('DOMContentLoaded', () => {
  // Determine language (fallback to ja)
  let currentLang = 'ja';
  
  // Initialize
  chrome.storage.sync.get(['theme', 'language'], (settings) => {
    // Theme
    const currentTheme = settings.theme || 'dark';
    document.body.classList.toggle('theme-dark', currentTheme === 'dark');

    // Language
    if (settings.language) {
      currentLang = settings.language;
    } else {
      const uiLang = chrome.i18n.getUILanguage();
      if (uiLang.startsWith('en')) {
        currentLang = 'en';
      }
    }

    applyLanguage(currentLang);
  });

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    const s = strings[lang] || strings['ja'];

    // Tab title
    document.getElementById('welcomeTitle-tab').textContent = s.welcomeTitle;

    // Header
    document.getElementById('welcomeTitle').textContent = s.welcomeTitle;
    document.getElementById('welcomeSubtitle').textContent = s.welcomeSubtitle;

    // Section 1
    document.getElementById('welcomeSection1Title').textContent = s.welcomeSection1Title;
    document.getElementById('welcomeSection1Desc1').textContent = s.welcomeSection1Desc1;
    document.getElementById('welcomeSection1Desc2').textContent = s.welcomeSection1Desc2;
    document.getElementById('welcomeSection1Desc3').textContent = s.welcomeSection1Desc3;

    // Section 2
    document.getElementById('welcomeSection2Title').textContent = s.welcomeSection2Title;
    document.getElementById('welcomeSection2Intro').textContent = s.welcomeSection2Intro;
    
    document.getElementById('welcomeFeature1Title').textContent = s.welcomeFeature1Title;
    document.getElementById('welcomeFeature1Desc').textContent = s.welcomeFeature1Desc;
    
    document.getElementById('welcomeFeature2Title').textContent = s.welcomeFeature2Title;
    document.getElementById('welcomeFeature2Desc').textContent = s.welcomeFeature2Desc;
    
    document.getElementById('welcomeFeature3Title').textContent = s.welcomeFeature3Title;
    document.getElementById('welcomeFeature3Desc').textContent = s.welcomeFeature3Desc;

    // Button
    document.getElementById('getStartedBtn').textContent = s.getStartedBtn;
    document.getElementById('openOptionsBtn').textContent = s.openOptionsBtn;
  }

  // Button logic: Close current tab
  document.getElementById('getStartedBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.remove(tabs[0].id);
      }
    });
  });

  // Button logic: Open options page
  document.getElementById('openOptionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
