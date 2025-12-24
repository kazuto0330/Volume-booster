// content.js

// スクリプトの多重実行を防止
if (typeof window.volumeBoosterAttached === 'undefined') {
  window.volumeBoosterAttached = true;

  let audioContext = null;
  let gainNode = null;
  const mediaElements = new WeakMap();
  let domObserver = null;
  let currentBoost = 100; // 現在のブースト値を保持

  // Web Audio APIのセットアップ
  function setupAudioContext() {
    if (audioContext) return;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      console.log("Volume Booster: Audio context initialized.");
      processAllMediaElements(); // 既存のメディア要素を接続
      observeDOMChanges(); // DOM監視を開始
    } catch (e) {
      console.error("Volume Booster: Could not create AudioContext.", e);
    }
  }

  // 指定されたブースト率を適用
  function applyBoost(boost) {
    currentBoost = boost; // 値を更新
    try {
      sessionStorage.setItem('volumeBoosterCache', boost);
    } catch (e) {
      // sessionStorage might be unavailable
    }

    if (!gainNode) {
      // gainNodeがない場合、AudioContextのセットアップがまだ
      setupAudioContext();
    }
    if (gainNode) {
      gainNode.gain.value = boost / 100;
    }
  }

  // メディア要素をオーディオグラフに接続
  function processMediaElement(element) {
    if (!audioContext || mediaElements.has(element)) return;
    try {
      const source = audioContext.createMediaElementSource(element);
      source.connect(gainNode);
      mediaElements.set(element, source);
      console.log('Volume Booster: Attached to media element.', element);
    } catch (error) {
      console.error('Volume Booster: Error processing media element.', error);
    }
  }

  // ページ上のすべてのメディア要素を処理
  function processAllMediaElements() {
    document.querySelectorAll('video, audio').forEach(processMediaElement);
  }

  // DOMの変更を監視して新しいメディア要素に対応
  function observeDOMChanges() {
    if (domObserver) return;
    domObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // ELEMENT_NODE
            if (node.matches('video, audio')) {
              processMediaElement(node);
            }
            node.querySelectorAll('video, audio').forEach(processMediaElement);
          }
        });
      });
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  // ポップアップや設定ページからのメッセージを受信
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'UPDATE_VOLUME') {
      applyBoost(request.boost);
      sendResponse({ status: "ok" });
    } else if (request.type === 'GET_CURRENT_VOLUME') {
      sendResponse({ boost: currentBoost });
    } else if (request.type === 'URL_CHANGED') {
      initializeFromStorage();
      sendResponse({ status: "ok" });
    } else if (request.type === 'SETTINGS_UPDATED') {
      initializeFromStorage();
      sendResponse({ status: "ok" });
    }
    return true; // 非同期レスポンスのためにtrueを返す
  });

  // URLの正規化（プロトコルとwww.を除去）
  function getNormalizedUrl() {
    let url = window.location.href;
    url = url.replace(/^https?:\/\//, '');
    url = url.replace(/^www\./, '');
    return url;
  }

  // キーがURLにマッチするか判定（ドメイン/パス境界を考慮）
  function isMatch(key, url) {
    if (!url.startsWith(key)) return false;
    if (url.length === key.length) return true;
    const nextChar = url[key.length];
    return ['/', '?', '#'].includes(nextChar);
  }

    // YouTube Live 判定 (Inject Script to access page context)
    function checkLiveStatusViaInjection() {
      return new Promise((resolve) => {
          if (!window.location.hostname.includes('youtube.com')) {
              resolve({ isLive: false, videoId: null });
              return;
          }
  
          const listener = (event) => {
              if (event.source === window && event.data.type === 'VOLUME_BOOSTER_LIVE_STATUS_RESULT') {
                  window.removeEventListener('message', listener);
                  resolve({ isLive: event.data.isLive, videoId: event.data.videoId });
              }
          };
          window.addEventListener('message', listener);
  
          // Inject script
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL('inject.js');
          script.onload = function() {
              this.remove();
          };
          (document.head || document.documentElement).appendChild(script);
  
          // Timeout fallback
          setTimeout(() => {
              window.removeEventListener('message', listener);
              resolve({ isLive: false, videoId: null }); // Default to false on timeout
          }, 1000);
      });
    }

    function getYouTubeVideoId(url) {
        try {
            const u = new URL(url);
            const vParam = u.searchParams.get('v');
            if (vParam) return vParam;
            
            const pathSegments = u.pathname.split('/').filter(p => p);
            if (pathSegments.length >= 2 && (pathSegments[0] === 'shorts' || pathSegments[0] === 'live')) {
                return pathSegments[1];
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    }
  
    // YouTube用: ライブ状態の変化を監視する (Re-run check on navigation/update)
    let liveObserver = null;
    function startLiveObserver(settings, ytSettings) {
        if (liveObserver) liveObserver.disconnect();
        // Observer logic removed/simplified as we rely on URL_CHANGED
    }
  
    // ページ読み込み時に保存された設定を適用
    async function initializeFromStorage() {
      const currentUrl = getNormalizedUrl();
      try {
        const data = await chrome.storage.sync.get({ boostSettings: {}, ytLiveSettings: { enabled: false, targetVolume: 100 } });
        const settings = data.boostSettings || {};
        const ytSettings = data.ytLiveSettings || { enabled: false, targetVolume: 100 };
        
        // 1. YouTube Live Check (Highest Priority)
        let isLive = false;
        // Check if feature enabled AND we are on YouTube
        if (ytSettings.enabled && window.location.hostname.includes('youtube.com')) {
            const targetVideoId = getYouTubeVideoId(window.location.href);
            
            if (targetVideoId) {
                let attempts = 0;
                while (attempts < 10) {
                    const status = await checkLiveStatusViaInjection();
                    
                    if (status.videoId === targetVideoId) {
                        isLive = status.isLive;
                        console.log(`Volume Booster: Video ID match (${status.videoId}). Live status: ${isLive}`);
                        break;
                    } else {
                        console.log(`Volume Booster: Video ID mismatch (Target: ${targetVideoId}, Player: ${status.videoId}). Retrying...`);
                    }
                    
                    await new Promise(r => setTimeout(r, 500));
                    attempts++;
                }
            }
        }

        if (isLive) {
            console.log(`Volume Booster: YouTube Live detected. Applying target volume: ${ytSettings.targetVolume}%`);
            sessionStorage.setItem('volumeBoosterIsLiveAutoBoost', 'true');
            applyBoost(ytSettings.targetVolume);
            return;
        }

        // YouTube Liveから遷移した場合、キャッシュされたブーストをリセット
        if (sessionStorage.getItem('volumeBoosterIsLiveAutoBoost') === 'true') {
             console.log("Volume Booster: Resetting boost from YouTube Live.");
             sessionStorage.removeItem('volumeBoosterCache');
             sessionStorage.removeItem('volumeBoosterIsLiveAutoBoost');
        }
        
        // 2. Domain Match Logic (Existing)      let bestMatchKey = null;
      let maxLen = -1;

      for (const key in settings) {
        if (isMatch(key, currentUrl)) {
          if (key.length > maxLen) {
            maxLen = key.length;
            bestMatchKey = key;
          }
        }
      }

      if (bestMatchKey) {
        const previousMatchKey = sessionStorage.getItem('volumeBoosterMatchKey');
        const cachedBoost = sessionStorage.getItem('volumeBoosterCache');
        
        // Save current match key for next navigation
        sessionStorage.setItem('volumeBoosterMatchKey', bestMatchKey);

        if (previousMatchKey === bestMatchKey && cachedBoost) {
          console.log(`Volume Booster: Keeping temporary setting ${cachedBoost}% (same domain setting ${bestMatchKey}).`);
          applyBoost(parseInt(cachedBoost, 10));
        } else {
          console.log(`Volume Booster: Found saved setting for ${bestMatchKey} (applied to ${currentUrl}).`);
          applyBoost(settings[bestMatchKey]);
        }
      } else {
        // Clear match key as there is no specific setting
        sessionStorage.removeItem('volumeBoosterMatchKey');

        const cachedBoost = sessionStorage.getItem('volumeBoosterCache');
        if (cachedBoost) {
          console.log(`Volume Booster: Restoring cached setting: ${cachedBoost}%`);
          applyBoost(parseInt(cachedBoost, 10));
        } else {
          applyBoost(100); // デフォルト値
        }
      }
    } catch (e) {
      console.error("Volume Booster: Error reading from storage.", e);
    }
  }

  initializeFromStorage();
}
