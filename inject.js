(function() {
  // すでに注入済みなら何もしない
  if (window.volumeBoosterInjected) return;
  window.volumeBoosterInjected = true;

  function getPlayer() {
    return document.getElementById('movie_player');
  }

  function checkLiveStatus() {
    let isLive = false;
    let currentVideoId = null;
    try {
      // 1. Try to get from the Movie Player API (works for SPA navigation)
      const player = getPlayer();
      if (player && typeof player.getPlayerResponse === 'function') {
        const resp = player.getPlayerResponse();
        if (resp && resp.videoDetails) {
            if (resp.videoDetails.isLiveContent) isLive = true;
            currentVideoId = resp.videoDetails.videoId;
        }
      } 
      // 2. Fallback to global variable (works for initial load if player api not ready)
      else if (window.ytInitialPlayerResponse) {
        if (window.ytInitialPlayerResponse.videoDetails) {
            if (window.ytInitialPlayerResponse.videoDetails.isLiveContent) isLive = true;
            currentVideoId = window.ytInitialPlayerResponse.videoDetails.videoId;
        }
      }
    } catch (e) {
      console.error("Volume Booster Inject: Error checking live status", e);
    }

    // Send result back to content script
    window.postMessage({ type: 'VOLUME_BOOSTER_LIVE_STATUS_RESULT', isLive: isLive, videoId: currentVideoId }, '*');
  }

  function setVolume(volume) {
    try {
      const player = getPlayer();
      if (player && typeof player.setVolume === 'function') {
        player.setVolume(volume);
      }
    } catch (e) {
      console.error("Volume Booster Inject: Error setting volume", e);
    }
  }

  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    
    if (event.data.type === 'VOLUME_BOOSTER_CHECK_LIVE') {
      checkLiveStatus();
    } else if (event.data.type === 'VOLUME_BOOSTER_SET_VOLUME') {
      setVolume(event.data.volume);
    }
  });
})();
