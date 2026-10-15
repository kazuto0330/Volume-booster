// background.js - Service Worker (Manifest V3)
importScripts('common/utils.js');

const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';

// キャプチャ中のタブ情報を管理するMap: tabId -> { volume: number }
const capturedTabs = new Map();

// Offscreen Document の生成
async function setupOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);

  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl],
    });
    if (contexts.length > 0) return;
  } else {
    const matchedClients = await clients.matchAll();
    if (matchedClients.find((c) => c.url === offscreenUrl)) return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['AUDIO_PLAYBACK', 'USER_MEDIA'],
    justification: 'Volume Booster requires audio processing via Web Audio API for tab audio boost',
  });
}

// Offscreen Document の破棄（キャプチャ中タブがゼロになったら閉じる）
async function closeOffscreenDocumentIfIdle() {
  if (capturedTabs.size === 0) {
    try {
      if (chrome.offscreen && chrome.offscreen.closeDocument) {
        const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
        const contexts = await chrome.runtime.getContexts({
          contextTypes: ['OFFSCREEN_DOCUMENT'],
          documentUrls: [offscreenUrl],
        });
        if (contexts.length > 0) {
          await chrome.offscreen.closeDocument();
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

// Offscreen Document への安全なメッセージ送信
function sendToOffscreen(message, callback) {
  try {
    chrome.runtime.sendMessage({ target: 'offscreen', ...message }, (resp) => {
      if (chrome.runtime.lastError) {
        // Offscreen document not ready or already closed
      }
      if (callback) callback(resp);
    });
  } catch (e) {
    if (callback) callback(null);
  }
}

/**
 * タブ音量の自動判定・自動適用
 * 100%超なら Tab Capture を自動起動、100%以下なら自動停止
 * @param {number} tabId
 * @param {number} volume (0〜600)
 * @returns {Promise<boolean>}
 */
async function updateTabVolumeAuto(tabId, volume) {
  if (!tabId) return false;

  // 保護ページ（chrome://, edge://, devtools:// 等）はキャプチャ不可のため事前に除外
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('devtools://') || tab.url.startsWith('chrome-extension://')) {
      return false;
    }
  } catch (e) {
    return false;
  }

  const isCapturing = capturedTabs.has(tabId);

  if (volume !== 100) {
    // 100%以外: 自動でキャプチャを起動または音量更新（10%〜600%）
    if (!isCapturing) {
      try {
        await setupOffscreenDocument();

        return new Promise((resolve) => {
          chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, async (streamId) => {
            if (chrome.runtime.lastError) {
              // ユーザー操作がない状況やキャプチャ不可時のエラーを安全に抑制
              resolve(false);
              return;
            }

            capturedTabs.set(tabId, { volume });

            sendToOffscreen({
              action: 'START_CAPTURE',
              tabId: tabId,
              streamId: streamId,
              volume: volume,
            }, (resp) => {
              resolve(resp ? resp.success : true);
            });
          });
        });
      } catch (err) {
        return false;
      }
    } else {
      // 既にキャプチャ中のためゲインのみ即時更新
      capturedTabs.set(tabId, { volume });
      sendToOffscreen({
        action: 'UPDATE_VOLUME',
        tabId: tabId,
        volume: volume,
      });
      return true;
    }
  } else {
    // 100%（通常音量）: キャプチャを自動停止して通常再生へ戻す
    if (isCapturing) {
      capturedTabs.delete(tabId);
      sendToOffscreen({
        action: 'STOP_CAPTURE',
        tabId: tabId,
      });
      closeOffscreenDocumentIfIdle();
    }
    return true;
  }
}

// インストール時の初期処理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'welcome/welcome.html' });
  }
});

// タブが閉じられたときのクリーンアップ
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (capturedTabs.has(tabId)) {
    capturedTabs.delete(tabId);
    sendToOffscreen({
      action: 'STOP_CAPTURE',
      tabId: tabId,
    });
    closeOffscreenDocumentIfIdle();
  }

  // タブ一時設定のクリーンアップ
  try {
    if (chrome.storage && chrome.storage.session) {
      chrome.storage.session.remove([`tab_temp_${tabId}`]);
    }
  } catch (e) {
    // ignore
  }
});

// メッセージハンドラー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SET_TAB_TEMP_BOOST') {
    const tabId = request.tabId || (sender.tab ? sender.tab.id : null);
    if (tabId) {
      const key = `tab_temp_${tabId}`;
      const data = {
        boost: request.boost,
        domain: request.domain,
        siteBoost: request.siteBoost,
        accountBoost: request.accountBoost
      };
      if (chrome.storage && chrome.storage.session) {
        chrome.storage.session.set({ [key]: data }, () => {
          sendResponse({ success: true });
        });
        return true;
      }
    }
    sendResponse({ success: false });
    return false;
  }

  if (request.type === 'GET_TAB_TEMP_BOOST') {
    const tabId = request.tabId || (sender.tab ? sender.tab.id : null);
    if (tabId && chrome.storage && chrome.storage.session) {
      const key = `tab_temp_${tabId}`;
      chrome.storage.session.get([key], (result) => {
        sendResponse({ tempOverride: result ? result[key] || null : null });
      });
      return true;
    }
    sendResponse({ tempOverride: null });
    return false;
  }

  if (request.type === 'CLEAR_TAB_TEMP_BOOST') {
    const tabId = request.tabId || (sender.tab ? sender.tab.id : null);
    if (tabId && chrome.storage && chrome.storage.session) {
      const key = `tab_temp_${tabId}`;
      chrome.storage.session.remove([key], () => {
        sendResponse({ success: true });
      });
      return true;
    }
    sendResponse({ success: false });
    return false;
  }

  if (request.type === 'UPDATE_TAB_VOLUME') {
    // 自動判定による音量更新（>100%なら自動起動、==100%なら自動停止）
    const tabId = request.tabId || (sender.tab ? sender.tab.id : null);
    if (!tabId) {
      sendResponse({ success: false, error: 'No tabId specified' });
      return false;
    }

    updateTabVolumeAuto(tabId, request.volume).then((success) => {
      sendResponse({ success });
    });
    return true;
  }

  if (request.type === 'STOP_TAB_CAPTURE_IF_ANY') {
    const tabId = request.tabId || (sender.tab ? sender.tab.id : null);
    if (tabId && capturedTabs.has(tabId)) {
      capturedTabs.delete(tabId);
      sendToOffscreen({
        action: 'STOP_CAPTURE',
        tabId: tabId,
      });
      closeOffscreenDocumentIfIdle();
    }
    sendResponse({ success: true });
    return false;
  }

  if (request.type === 'GET_TAB_CAPTURE_STATUS') {
    // バックグラウンドが自前でMap管理しているため、安全・同期的に即答可能
    const tabId = request.tabId || (sender.tab ? sender.tab.id : null);
    const isCapturing = tabId ? capturedTabs.has(tabId) : false;
    const currentVol = isCapturing ? capturedTabs.get(tabId).volume : 100;
    sendResponse({ isCapturing, volume: currentVol });
    return false;
  }

  if (request.type === 'TAB_CAPTURE_STOPPED') {
    // トラック終了等で外的に停止した場合
    if (capturedTabs.has(request.tabId)) {
      capturedTabs.delete(request.tabId);
      closeOffscreenDocumentIfIdle();
    }
    return false;
  }

  if (request.type === 'SETTINGS_UPDATED') {
    return false;
  }

  return false;
});

// タブのURL変化・ナビゲーション監視
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const isComplete = changeInfo.status === 'complete';
  const isUrlChanged = changeInfo.url !== undefined;

  if ((isComplete || isUrlChanged) && tab.url && tab.url.startsWith('http')) {
    const normalizedUrl = normalizeUrl(tab.url);

    // 既存のコンテンツスクリプトへ通知
    chrome.tabs.sendMessage(tabId, { type: 'URL_CHANGED', url: tab.url }, (response) => {
      if (chrome.runtime.lastError) {
        checkAndInject(tabId, normalizedUrl);
      }
    });
  }
});

function checkAndInject(tabId, normalizedUrl) {
  chrome.storage.sync.get({ boostSettings: {} }, (data) => {
    const settings = data.boostSettings || {};
    const matchedKey = findBestMatchingKey(normalizedUrl, settings);

    if (matchedKey !== null) {
      chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        files: ['common/utils.js', 'content/content.js'],
      }, () => {
        if (chrome.runtime.lastError) {
          // Injection may fail on protected pages
        }
      });
    }
  });
}