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

  // メディア要素から現在の有効なソースURLを取得
  function getMediaElementSourceUrl(element) {
    if (!element) return '';
    let src = element.currentSrc || element.src;
    if (!src) {
      const sourceEl = element.querySelector('source');
      if (sourceEl) src = sourceEl.src;
    }
    return src || '';
  }

  // メディア要素がCORS制限によって無音化するリスクがあるかを汎用判定
  function isMediaElementCorsRestricted(element) {
    if (!element) return false;

    // srcObject (MediaStream / MediaSource) は同一コンテキストのためCORS制限なし
    if (element.srcObject) {
      return false;
    }

    const src = getMediaElementSourceUrl(element);
    if (!src) return false;

    // blob: や data: は同一コンテキストのためCORS制限なし
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      return false;
    }

    try {
      const mediaUrl = new URL(src, window.location.href);
      // 同一オリジンであればCORS制限なし
      if (mediaUrl.origin === window.location.origin) {
        return false;
      }
      // クロスオリジンかつ crossOrigin 属性が未設定の場合、createMediaElementSource で無音化する
      if (!element.crossOrigin) {
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  // メディア要素がWeb Audio API (DOM) に安全に接続可能かを判定
  function isMediaElementSafeForDOM(element) {
    if (!element) return false;

    // 1. CORS制限対象と確定している要素はDOM接続不可
    if (isMediaElementCorsRestricted(element)) {
      return false;
    }

    // 2. srcObject があれば確実に安全 (MSE / WebRTC)
    if (element.srcObject) {
      return true;
    }

    const src = getMediaElementSourceUrl(element);

    // 3. 有効なソースが存在する場合:
    if (src) {
      // blob: や data: は同一コンテキストのため安全
      if (src.startsWith('blob:') || src.startsWith('data:')) {
        return true;
      }
      try {
        const mediaUrl = new URL(src, window.location.href);
        if (mediaUrl.origin === window.location.origin || element.crossOrigin) {
          return true;
        }
      } catch (e) {}
      return false;
    }

    // 4. ソースURLが未取得(空)の場合:
    // すでに再生中またはメタデータ読み込み済みであれば、MSEや内部バッファで安全に再生中と判定
    if (element.readyState >= 1 || element.currentTime > 0 || !element.paused) {
      return true;
    }

    // まだ全くロードが始まっていない初期要素は保留（後からクロスオリジンURLが来る可能性があるため）
    return false;
  }

  // ページがDOM経由のWeb Audio APIで処理可能かを汎用自動判定
  function canHandleViaDOM() {
    const elements = document.querySelectorAll('video, audio');
    if (elements.length > 0) {
      for (const el of elements) {
        if (isMediaElementCorsRestricted(el)) {
          return false; // CORS制限あり（Twitchクリップ、X動画等） -> Tab Captureへ
        }
      }
      return true; // CORS制限なし（YouTube、Twitch本配信等） -> DOMモード
    }
    // メディア要素がまだDOMにない初期状態等は、DOMモードを前提として待機
    return true;
  }

  // Web Audio API のセットアップ
  function setupAudioContext() {
    if (audioContext) return;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Autoplay Policy 対策: suspended 状態ならユーザー操作時に resume する
      if (audioContext.state === 'suspended') {
        const resumeAudio = () => {
          if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
          }
          ['click', 'keydown', 'touchstart'].forEach(evt => 
            document.removeEventListener(evt, resumeAudio, { capture: true })
          );
        };
        ['click', 'keydown', 'touchstart'].forEach(evt => 
          document.addEventListener(evt, resumeAudio, { once: true, capture: true })
        );
      }

      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      processAllMediaElements();
    } catch (e) {
      console.error("Volume Booster: Could not create AudioContext.", e);
    }
  }

  // メディア要素をオーディオグラフに接続
  function processMediaElement(element) {
    if (!element || mediaElements.has(element)) return;

    // CORS制限のある要素は無音化を防ぐためDOM接続を行わず、Tab Captureへフォールバック
    if (isMediaElementCorsRestricted(element)) {
      if (currentBoost !== 100 && window.top === window) {
        chrome.runtime.sendMessage({
          type: 'UPDATE_TAB_VOLUME',
          volume: currentBoost
        }).catch(() => {});
      }
      return;
    }

    // 安全性が確認できていない要素（未ロード・src未確定など）は、createMediaElementSourceを呼ばずに保留
    if (!isMediaElementSafeForDOM(element)) {
      const handleSourceReady = () => {
        ['loadstart', 'loadedmetadata', 'canplay', 'playing', 'loadeddata'].forEach(evt => {
          element.removeEventListener(evt, handleSourceReady);
        });
        if (isMediaElementCorsRestricted(element)) {
          if (currentBoost !== 100 && window.top === window) {
            chrome.runtime.sendMessage({
              type: 'UPDATE_TAB_VOLUME',
              volume: currentBoost
            }).catch(() => {});
          }
        } else if (isMediaElementSafeForDOM(element)) {
          if (!gainNode && currentBoost !== 100) setupAudioContext();
          else if (gainNode) processMediaElement(element);
        }
      };

      ['loadstart', 'loadedmetadata', 'canplay', 'playing', 'loadeddata'].forEach(evt => {
        element.addEventListener(evt, handleSourceReady, { once: true });
      });
      return;
    }

    // ここまで来た要素は確実に isMediaElementSafeForDOM が true なので安全に接続可能
    if (!audioContext || !gainNode) return;

    try {
      const source = audioContext.createMediaElementSource(element);
      source.connect(gainNode);
      mediaElements.set(element, source);

      // 再生開始時に suspended であれば resume を試みる
      element.addEventListener('play', () => {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }
      });
    } catch (error) {
      console.error('Volume Booster: Error processing media element.', error);
    }
  }

  // ページ上のすべてのメディア要素を処理
  function processAllMediaElements() {
    document.querySelectorAll('video, audio').forEach(processMediaElement);
  }

  // 指定されたブースト率を保持および適用
  function applyBoost(boost) {
    currentBoost = boost;
    try {
      sessionStorage.setItem('volumeBoosterCache', boost);
    } catch (e) {
      // sessionStorage might be unavailable
    }

    if (canHandleViaDOM()) {
      if (!gainNode) {
        if (boost === 100) return; // 100%（デフォルト）時は不要なAudioContext接続を行わない
        setupAudioContext();
      }

      if (gainNode) {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }
        gainNode.gain.value = boost / 100;
        // 未接続のメディア要素があれば確実に処理
        processAllMediaElements();
      }

      // DOMモードで正常に動作しているため、もしTab Captureが起動中なら停止（メインフレームのみ）
      if (window.top === window) {
        chrome.runtime.sendMessage({ type: 'STOP_TAB_CAPTURE_IF_ANY' }).catch(() => {});
      }
    } else {
      // CORS制限またはメディアなし: メインフレームのみがTab Captureを要請
      if (window.top === window) {
        chrome.runtime.sendMessage({
          type: 'UPDATE_TAB_VOLUME',
          volume: boost
        }).catch(() => {});
      }
    }
  }

  // DOMの変更を監視して新しいメディア要素およびYouTube/Twitchプレイヤーの出現に対応
  function observeDOMChanges() {
    if (domObserver || window.top !== window) return;

    const handleNewMediaElement = (el) => {
      if (isMediaElementCorsRestricted(el)) {
        if (currentBoost !== 100 && window.top === window) {
          chrome.runtime.sendMessage({ type: 'UPDATE_TAB_VOLUME', volume: currentBoost }).catch(() => {});
        }
      } else if (isMediaElementSafeForDOM(el)) {
        if (gainNode) {
          processMediaElement(el);
        } else if (currentBoost !== 100) {
          setupAudioContext();
        }
      } else {
        // ソースがまだ未確定の場合は保留リスナーをセット
        processMediaElement(el);
      }
    };

    domObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
          if (mutation.target.matches && mutation.target.matches('video, audio')) {
            handleNewMediaElement(mutation.target);
          }
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // ELEMENT_NODE
            if (node.matches && node.matches('video, audio')) {
              handleNewMediaElement(node);
            }
            if (node.querySelectorAll) {
              node.querySelectorAll('video, audio').forEach(handleNewMediaElement);
            }

            if (window.location.hostname.includes('youtube.com')) {
              if (node.id === 'player' || (node.querySelector && node.querySelector('#player'))) {
                setupYouTubeVolumeScroll();
              }
            }
            if (window.location.hostname.includes('twitch.tv')) {
              if (node.tagName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
                setupTwitchVolumeScroll();
              }
            }
          }
        });
      });
    });

    const targetNode = document.documentElement || document.body;
    if (targetNode) {
      domObserver.observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
      });
    }
  }

  // ポップアップや設定ページからのメッセージを受信
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'UPDATE_VOLUME') {
      applyBoost(request.boost);
      const isDOM = canHandleViaDOM();
      sendResponse({ status: "ok", handledByDOM: isDOM });
    } else if (request.type === 'GET_CURRENT_VOLUME') {
      sendResponse({
        boost: currentBoost,
        accountName: currentAccountName,
        activeSource: activeSource,
        handledByDOM: canHandleViaDOM()
      });
    } else if (request.type === 'URL_CHANGED') {
      initializeFromStorage();
      sendResponse({ status: "ok" });
    } else if (request.type === 'SETTINGS_UPDATED') {
      initializeFromStorage();
      sendResponse({ status: "ok" });
    }
  });

  // URLの正規化（utils.js の normalizeUrl を利用）
  function getNormalizedUrl() {
    return normalizeUrl(window.location.href);
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

    // Inject script globally for YouTube
    function ensureInjectedScript() {
        if (!window.location.hostname.includes('youtube.com')) return;
        // Check if already injected by checking if the script tag exists
        if (document.getElementById('volume-booster-inject')) return;

        const script = document.createElement('script');
        script.id = 'volume-booster-inject';
        script.src = chrome.runtime.getURL('content/inject.js');
        script.onload = function() {
            this.remove(); 
        };
        (document.head || document.documentElement).appendChild(script);
    }

    // YouTube Live 判定 (Message based)
    function checkLiveStatusViaInjection() {
      return new Promise((resolve) => {
          if (!window.location.hostname.includes('youtube.com')) {
              resolve({ isLive: false, videoId: null });
              return;
          }
          
          ensureInjectedScript();

          const listener = (event) => {
              if (event.source === window && event.data.type === 'VOLUME_BOOSTER_LIVE_STATUS_RESULT') {
                  window.removeEventListener('message', listener);
                  resolve({ isLive: event.data.isLive, videoId: event.data.videoId });
              }
          };
          window.addEventListener('message', listener);
  
          // Send message to check status
          window.postMessage({ type: 'VOLUME_BOOSTER_CHECK_LIVE' }, '*');
  
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

    // Global event listener for YouTube scroll (Event Delegation)
    let isYouTubeScrollListenerAttached = false;
    
    function attachYouTubeGlobalScrollListener() {
        if (isYouTubeScrollListenerAttached) return;
        
        document.documentElement.addEventListener('wheel', (event) => {
             // 1. Basic Checks
             if (!window.location.hostname.includes('youtube.com')) return;
             if (!scrollSettings.enabled) return;
             if (window.location.pathname === '/') return;

             // 2. Target Check: Must be inside the player
             const player = event.target.closest('#movie_player') || 
                            event.target.closest('.html5-video-player') || 
                            event.target.closest('#player-container');
             
             if (!player) return;

             // 3. Ignore controls/popups
             if (event.target.closest('.ytp-chrome-bottom, .ytp-chrome-top, .ytp-popup, .ytp-settings-menu')) return;

             // Prevent default scrolling
             event.preventDefault();
             event.stopPropagation(); // Stop page scrolling

             const stepVal = (scrollSettings.step || 5);
             const direction = event.deltaY > 0 ? -1 : 1; 
             
             const delta = stepVal * direction;
             
             // 5. Send command to inject.js (which talks to movie_player API)
             ensureInjectedScript();
             window.postMessage({ type: 'VOLUME_BOOSTER_ADJUST_VOLUME', delta: delta }, '*');

        }, { passive: false, capture: true }); // Capture phase!

        // Listen for volume update result from inject.js to show overlay
        window.addEventListener('message', (event) => {
            if (event.source === window && event.data.type === 'VOLUME_BOOSTER_VOLUME_UPDATED') {
                const player = document.querySelector('#movie_player') || 
                               document.querySelector('.html5-video-player') || 
                               document.querySelector('#player-container');
                if (player) {
                    showVolumeOverlay(event.data.volume / 100, player);
                }
            }
        });

        isYouTubeScrollListenerAttached = true;
        
        // Listen for YouTube navigation events to re-ensure injection and settings
        document.addEventListener('yt-navigate-finish', () => {
             initializeFromStorage(); // Re-read settings on navigation
             if (scrollSettings.enabled) {
                 ensureInjectedScript();
             }
        });
    }

    function setupYouTubeVolumeScroll() {
        if (!window.location.hostname.includes('youtube.com')) return;
        
        // Just attach the global listener once
        attachYouTubeGlobalScrollListener();
        
        // Ensure script is injected on setup
        if (scrollSettings.enabled) {
            ensureInjectedScript();
        }
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
            ytLiveSettings: { enabled: false, targetVolume: 60 },
            ytAutoSettings: { enabled: false, volume: 30 },
            ytScrollSettings: { enabled: false, step: 5 },
            twitchScrollSettings: { enabled: false, step: 5 }
        });
        const settings = data.boostSettings || {};
        const accountSettings = data.accountSettings || {};
        const ytSettings = data.ytLiveSettings || { enabled: false, targetVolume: 60 };
        const ytAuto = data.ytAutoSettings || { enabled: false, volume: 30 };

        // Update global scroll settings
        scrollSettings = data.ytScrollSettings || { enabled: false, step: 5 };
        twitchScrollSettings = data.twitchScrollSettings || { enabled: false, step: 5 };        
        // メインフレーム限定でプレーヤー補助機能・アカウント判定を実行
        if (window.top === window) {
            if (window.location.hostname.includes('youtube.com')) {
                ensureInjectedScript();
            }

            setupYouTubeVolumeScroll();
            setupTwitchVolumeScroll(); // Initialize Twitch Scroll
            observeDOMChanges();

            // Apply YouTube Auto Volume (Player Volume)
            if (ytAuto.enabled && window.location.hostname.includes('youtube.com')) {
                 ensureInjectedScript();
                 window.__vbAutoVolumeValue = ytAuto.volume;

                 const setupAutoVolume = () => {
                     const video = document.querySelector('video');
                     if (!video) return;

                     if (!window.__vbAutoVolumeHandlerAttached) {
                         window.__vbAutoVolumeHandlerAttached = true;
                         window.__vbLastSetVolumeSrc = null;

                         video.addEventListener('playing', () => {
                             if (window.__vbLastSetVolumeSrc !== video.currentSrc) {
                                 window.__vbLastSetVolumeSrc = video.currentSrc;
                                 setTimeout(() => {
                                     window.postMessage({ type: 'VOLUME_BOOSTER_SET_VOLUME', volume: window.__vbAutoVolumeValue }, '*');
                                 }, 100);
                             }
                         });
                     }

                     if (!video.paused && video.readyState >= 3) {
                         if (window.__vbLastSetVolumeSrc !== video.currentSrc) {
                             window.__vbLastSetVolumeSrc = video.currentSrc;
                             window.postMessage({ type: 'VOLUME_BOOSTER_SET_VOLUME', volume: window.__vbAutoVolumeValue }, '*');
                         }
                     }
                 };

                 setupAutoVolume();
            }
        }
        
        let targetBoost = null;
        let source = 'default';
        let matchKey = null;

        // 1. YouTube Live Check (Highest Priority, Top frame only)
        let isLive = false;
        if (window.top === window && ytSettings.enabled && window.location.hostname.includes('youtube.com')) {
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

        // Always try to get account name if on YouTube, regardless of Live status (Top frame only)
        if (window.top === window) {
            currentAccountName = await getAccountInfo();
        }

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
            matchKey = findBestMatchingKey(currentUrl, settings);
            if (matchKey) {
                source = 'domain';
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
