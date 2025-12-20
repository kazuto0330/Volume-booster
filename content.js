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

  // ページ読み込み時に保存された設定を適用
  async function initializeFromStorage() {
    const currentUrl = getNormalizedUrl();
    try {
      const data = await chrome.storage.sync.get({ boostSettings: {} });
      const settings = data.boostSettings || {};
      
      let bestMatchKey = null;
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
        console.log(`Volume Booster: Found saved setting for ${bestMatchKey} (applied to ${currentUrl}).`);
        applyBoost(settings[bestMatchKey]);
      } else {
        applyBoost(100); // デフォルト値
      }
    } catch (e) {
      console.error("Volume Booster: Error reading from storage.", e);
    }
  }

  initializeFromStorage();
}
