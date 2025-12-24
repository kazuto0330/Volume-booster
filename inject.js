(function() {
  function checkLiveStatus() {
    let isLive = false;
    let currentVideoId = null;
    try {
      // 1. Try to get from the Movie Player API (works for SPA navigation)
      const player = document.getElementById('movie_player');
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

  checkLiveStatus();
})();