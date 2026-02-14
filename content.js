// content.js

// スクリプトの多重実行を防止
if (typeof window.volumeBoosterAttached === 'undefined') {
  window.volumeBoosterAttached = true;

  let audioContext = null;
  let gainNode = null;
  const mediaElements = new WeakMap();
  let domObserver = null;
  let currentBoost = 100; // 現在のブースト値を保持
  let currentAccountName = null; // 現在のYouTubeアカウント名を保持
  let activeSource = 'default'; // 現在適用されている設定のソース ('live', 'account', 'domain', 'default')

  // Web Audio APIのセットアップ
  function setupAudioContext() {
    if (audioContext) return;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
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
      // ブーストが100%（デフォルト）の場合は、AudioContextをセットアップしない
      // これにより、不要なオーディオグラフの接続とそれに伴うCORSエラーを回避する
      if (boost === 100) return;
      
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

            // New: Check for YouTube player
            if (window.location.hostname.includes('youtube.com')) {
                if (node.id === 'player') {
                    setupYouTubeVolumeScroll();
                } else if (node.querySelector && node.querySelector('#player')) {
                    setupYouTubeVolumeScroll();
                }
            }
            // New: Check for Twitch player (simple heuristic)
            if (window.location.hostname.includes('twitch.tv')) {
                if (node.tagName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
                    setupTwitchVolumeScroll();
                }
            }
            // New: Check for Twitch player (simple heuristic)
            if (window.location.hostname.includes('twitch.tv')) {
                if (node.tagName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
                    setupTwitchVolumeScroll();
                }
            }
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
      sendResponse({ boost: currentBoost, accountName: currentAccountName, activeSource: activeSource });
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

  // YouTube Account Info via oEmbed
  async function getAccountInfo() {
      if (!window.location.hostname.includes('youtube.com')) return null;
      if (!location.href.match(/youtube\.com\/(watch|shorts|live)/)) return null;

      try {
          const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(window.location.href)}&format=json`;
          const response = await fetch(oembedUrl);
          if (!response.ok) return null;
          const data = await response.json();
          return data.author_name;
      } catch (e) {
          return null;
      }
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

    let overlayTimeout = null;

    function showVolumeOverlay(volume, container) {
        let overlay = container.querySelector('.volume-booster-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'volume-booster-overlay';
            container.appendChild(overlay);
        }

        overlay.textContent = `${Math.round(volume * 100)}`;
        overlay.classList.add('visible');

        if (overlayTimeout) {
            clearTimeout(overlayTimeout);
        }

        overlayTimeout = setTimeout(() => {
            overlay.classList.remove('visible');
        }, 1000);
    }

    // YouTube Player Scroll Volume Control
    let scrollSettings = { enabled: false, step: 5 }; // Default
    let twitchScrollSettings = { enabled: false, step: 5 }; // Twitch Default

    function setupYouTubeVolumeScroll() {
        if (!window.location.hostname.includes('youtube.com')) return;
        
        // Check if enabled
        if (!scrollSettings.enabled) {
             // If disabled, we should remove the listener if it was attached.
             // However, removing anonymous listeners is hard. 
             // We can just rely on the flag inside the listener or reload the page for disable to take effect cleanly,
             // or simply check the global 'scrollSettings' inside the event handler.
             return;
        }

        // Prefer 'movie_player' as it is the main interactive container, fallback to 'player'
        const player = document.getElementById('movie_player') || document.getElementById('player');
        if (!player) return;

        if (player.dataset.volumeScrollAttached === 'true') return;

        player.addEventListener('wheel', (event) => {
             // Check enabled status dynamically
             if (!scrollSettings.enabled) return;

             // Ignore if scrolling over the control bar, top bar, or popups (like settings menu)
             if (event.target.closest('.ytp-chrome-bottom, .ytp-chrome-top, .ytp-popup')) return;

             const video = document.querySelector('video.html5-main-video') || player.querySelector('video');
             if (!video) return;
             
             event.preventDefault();
             event.stopPropagation(); // Stop page scrolling

             // Sensitivity (convert percent step to 0-1 range)
             const stepVal = (scrollSettings.step || 5) / 100;
             const direction = event.deltaY > 0 ? -1 : 1; 
             
             let newVol = video.volume + (stepVal * direction);
             // Clamp
             if (newVol > 1) newVol = 1;
             if (newVol < 0) newVol = 0;
             
             video.volume = newVol;
             
             showVolumeOverlay(newVol, player);

        }, { passive: false, capture: true }); // Capture phase!

        player.dataset.volumeScrollAttached = 'true';
    }

    function setupTwitchVolumeScroll() {
        if (!window.location.hostname.includes('twitch.tv')) return;
        
        // Check if enabled
        if (!twitchScrollSettings.enabled) return;

        // Look for the video player container
        const videos = document.getElementsByTagName('video');
        if (videos.length === 0) return;
        
        const video = videos[0]; // Main video
        
        // We need a stable container to attach the event listener. 
        // The .video-player__container seems to be a good candidate if available, or just use the video parent.
        const playerContainer = video.closest('.video-player') || video.closest('[data-a-target="video-player"]');
        
        if (!playerContainer) return;
        
        if (playerContainer.dataset.volumeScrollAttached === 'true') return;

        playerContainer.addEventListener('wheel', (event) => {
             // Check enabled status
             if (!twitchScrollSettings.enabled) return;

             // Ignore if scrolling over controls
             if (event.target.closest('button, input, [role="button"], [role="slider"]')) return;

             // Ensure video is still there
             if (!video) return;

             event.preventDefault();
             event.stopPropagation();

             const stepVal = (twitchScrollSettings.step || 5) / 100;
             const direction = event.deltaY > 0 ? -1 : 1;

             let newVol = video.volume + (stepVal * direction);
             if (newVol > 1) newVol = 1;
             if (newVol < 0) newVol = 0;

             // 1. Directly set video volume (Audio source of truth)
             video.volume = newVol;
             if (newVol > 0 && video.muted) video.muted = false;

             // 2. Sync with Twitch UI Slider (React)
             try {
                 const volumeSlider = document.querySelector('input[data-a-target="player-volume-slider"]');
                 if (volumeSlider) {
                     // React hack: Call native setter to ensure React detects the change
                     const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                     nativeInputValueSetter.call(volumeSlider, newVol);
                     
                     volumeSlider.dispatchEvent(new Event('input', { bubbles: true }));
                     volumeSlider.dispatchEvent(new Event('change', { bubbles: true }));
                 }
             } catch (e) {
                 // Fallback or ignore if UI update fails
             }

             // Show overlay
             showVolumeOverlay(newVol, playerContainer);

        }, { passive: false, capture: true });

        playerContainer.dataset.volumeScrollAttached = 'true';
    }
  
    // ページ読み込み時に保存された設定を適用
    async function initializeFromStorage() {
      const currentUrl = getNormalizedUrl();
      try {
        const data = await chrome.storage.sync.get({ 
            boostSettings: {}, 
            accountSettings: {},
            ytLiveSettings: { enabled: false, targetVolume: 100 },
            ytAutoSettings: { enabled: false, volume: 30 },
            ytScrollSettings: { enabled: false, step: 5 },
            twitchScrollSettings: { enabled: false, step: 5 }
        });
        const settings = data.boostSettings || {};
        const accountSettings = data.accountSettings || {};
        const ytSettings = data.ytLiveSettings || { enabled: false, targetVolume: 100 };
        const ytAuto = data.ytAutoSettings || { enabled: false, volume: 30 };
        
        // Update global scroll settings
        scrollSettings = data.ytScrollSettings || { enabled: false, step: 5 };
        twitchScrollSettings = data.twitchScrollSettings || { enabled: false, step: 5 };
        
        setupYouTubeVolumeScroll();
        setupTwitchVolumeScroll(); // Initialize Twitch Scroll

        // Apply YouTube Auto Volume (Player Volume)
        if (ytAuto.enabled && window.location.hostname.includes('youtube.com')) {
             // Only apply if we haven't applied it for this "session" (url match) to avoid fighting user?
             // Or simply apply on every navigation/load as requested ("when opening YouTube").
             // Since URL_CHANGED calls this, it will apply on every video load.
             
             // Send message to set volume.
             // We use a slight delay to ensure the player is ready and to override any YouTube saved volume.
             setTimeout(() => {
                 const video = document.querySelector('video');
                 if (video) {
                     video.volume = ytAuto.volume / 100;
                 }
             }, 1000); 
        }
        
        let targetBoost = null;
        let source = 'default';
        let matchKey = null;

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
                        break;
                    }
                    
                    await new Promise(r => setTimeout(r, 500));
                    attempts++;
                }
            }
        }

        // Always try to get account name if on YouTube, regardless of Live status
        currentAccountName = await getAccountInfo();

        if (isLive) {
            sessionStorage.setItem('volumeBoosterIsLiveAutoBoost', 'true');
            activeSource = 'live';
            applyBoost(ytSettings.targetVolume);
            return;
        }

        // YouTube Liveから遷移した場合、キャッシュされたブーストをリセット
        if (sessionStorage.getItem('volumeBoosterIsLiveAutoBoost') === 'true') {
             sessionStorage.removeItem('volumeBoosterCache');
             sessionStorage.removeItem('volumeBoosterIsLiveAutoBoost');
        }
        
        // 2. Account Check (High Priority)
        if (currentAccountName) {
            const accountKey = `youtube:${currentAccountName}`;
            if (accountSettings[accountKey] !== undefined) {
                targetBoost = accountSettings[accountKey];
                matchKey = accountKey;
                source = 'account';
            }
        }

        // 3. Domain Match Logic (Low Priority - only if no account setting found)
        if (targetBoost === null) {
            let maxLen = -1;
            for (const key in settings) {
                if (isMatch(key, currentUrl)) {
                    if (key.length > maxLen) {
                        maxLen = key.length;
                        matchKey = key;
                        source = 'domain';
                    }
                }
            }
            if (matchKey) {
                targetBoost = settings[matchKey];
            }
        }

        // Apply Logic
        if (matchKey) {
            const previousMatchKey = sessionStorage.getItem('volumeBoosterMatchKey');
            const cachedBoost = sessionStorage.getItem('volumeBoosterCache');
            
            sessionStorage.setItem('volumeBoosterMatchKey', matchKey);

            if (previousMatchKey === matchKey && cachedBoost) {
                applyBoost(parseInt(cachedBoost, 10));
                activeSource = source; 
            } else {
                applyBoost(targetBoost);
                activeSource = source;
            }
        } else {
            // No specific setting found
            const previousMatchKey = sessionStorage.getItem('volumeBoosterMatchKey');
            
            // If we had a match key previously but now we don't, it means we transitioned 
            // from a managed context (Account/Domain) to an unmanaged one.
            // In this case, we should NOT restore the cache (which belongs to the managed context),
            // but instead reset to default.
            if (previousMatchKey) {
                sessionStorage.removeItem('volumeBoosterCache');
                sessionStorage.removeItem('volumeBoosterMatchKey');
                applyBoost(100);
                activeSource = 'default';
            } else {
                // If we didn't have a match key previously either, then any cache is a manual user override
                // that should persist.
                sessionStorage.removeItem('volumeBoosterMatchKey'); // Ensure it's cleared
                
                const cachedBoost = sessionStorage.getItem('volumeBoosterCache');
                if (cachedBoost) {
                    applyBoost(parseInt(cachedBoost, 10));
                    activeSource = 'temp'; 
                } else {
                    applyBoost(100); // デフォルト値
                    activeSource = 'default';
                }
            }
        }
    } catch (e) {
      console.error("Volume Booster: Error reading from storage.", e);
    }
  }

  initializeFromStorage();
}
