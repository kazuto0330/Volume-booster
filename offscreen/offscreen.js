// offscreen.js - Web Audio API によるタブ音声キャプチャ処理モジュール
// Manifest V3 においてバックグラウンドで AudioContext を安全に実行する

const activeTabAudioMap = new Map();

/**
 * 特定のタブのキャプチャを安全に破棄する
 * @param {number} tabId
 */
async function cleanupTabAudio(tabId) {
  const session = activeTabAudioMap.get(tabId);
  if (!session) return;

  try {
    if (session.stream) {
      session.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
    }
    if (session.audioCtx && session.audioCtx.state !== 'closed') {
      await session.audioCtx.close();
    }
  } catch (e) {
    console.error('Volume Booster Offscreen: Cleanup error for tab', tabId, e);
  } finally {
    activeTabAudioMap.delete(tabId);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;

  const { action, tabId } = message;

  if (action === 'START_CAPTURE') {
    (async () => {
      try {
        // 既存のセッションがあればクリーンアップ
        await cleanupTabAudio(tabId);

        // タブの音声メディアストリームを取得
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'tab',
              chromeMediaSourceId: message.streamId,
            },
          },
          video: false,
        });

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const gainNode = audioCtx.createGain();

        const boost = typeof message.volume === 'number' ? message.volume : 100;
        gainNode.gain.value = boost / 100;

        // オーディオパイプライン接続: Source -> GainNode -> Destination (Speakers)
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // 音声トラック終了時のハンドリング
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.onended = () => {
            cleanupTabAudio(tabId);
            chrome.runtime.sendMessage({
              type: 'TAB_CAPTURE_STOPPED',
              tabId: tabId,
            }).catch(() => {});
          };
        }

        activeTabAudioMap.set(tabId, { stream, audioCtx, gainNode });
        sendResponse({ success: true });
      } catch (error) {
        console.error('Volume Booster Offscreen: Failed to start capture for tab', tabId, error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // 非同期レスポンスを維持
  }

  if (action === 'UPDATE_VOLUME') {
    const session = activeTabAudioMap.get(tabId);
    if (session && session.gainNode && session.audioCtx) {
      if (session.audioCtx.state === 'suspended') {
        session.audioCtx.resume().catch(() => {});
      }
      const boost = typeof message.volume === 'number' ? message.volume : 100;
      try {
        session.gainNode.gain.setTargetAtTime(boost / 100, session.audioCtx.currentTime, 0.01);
        sendResponse({ success: true });
      } catch (e) {
        session.gainNode.gain.value = boost / 100;
        sendResponse({ success: true });
      }
    } else {
      sendResponse({ success: false, error: 'Session not found' });
    }
    return true;
  }

  if (action === 'STOP_CAPTURE') {
    (async () => {
      await cleanupTabAudio(tabId);
      sendResponse({ success: true });
    })();
    return true;
  }

  if (action === 'IS_CAPTURING') {
    const isCapturing = activeTabAudioMap.has(tabId);
    sendResponse({ isCapturing });
    return true;
  }

  return false;
});
