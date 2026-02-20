(function() {
  // すでに注入済みなら何もしない
  if (window.volumeBoosterInjected) return;
  window.volumeBoosterInjected = true;

  function getPlayer() {
    const players = document.querySelectorAll('#movie_player, .html5-video-player');
    for (const p of players) {
      if (p.offsetWidth > 0 && p.offsetHeight > 0) {
        return p;
      }
    }
    return document.getElementById('movie_player') || 
           document.querySelector('.html5-video-player') || 
           document.querySelector('#player-container #movie_player');
  }

  function checkLiveStatus() {
    let isLive = false;
    let currentVideoId = null;
    try {
      const player = getPlayer();
      if (player && typeof player.getPlayerResponse === 'function') {
        const resp = player.getPlayerResponse();
        if (resp && resp.videoDetails) {
            if (resp.videoDetails.isLiveContent) isLive = true;
            currentVideoId = resp.videoDetails.videoId;
        }
      } else if (window.ytInitialPlayerResponse) {
        if (window.ytInitialPlayerResponse.videoDetails) {
            if (window.ytInitialPlayerResponse.videoDetails.isLiveContent) isLive = true;
            currentVideoId = window.ytInitialPlayerResponse.videoDetails.videoId;
        }
      }
    } catch (e) {
      // Silent error
    }
    window.postMessage({ type: 'VOLUME_BOOSTER_LIVE_STATUS_RESULT', isLive: isLive, videoId: currentVideoId }, '*');
  }

  function setVolume(volume) {
    try {
      const player = getPlayer();
      if (player && typeof player.setVolume === 'function') {
        player.setVolume(volume);
      }
    } catch (e) {
      // Silent error
    }
  }

  function adjustVolume(delta) {
    try {
      const player = getPlayer();
      if (player && typeof player.getVolume === 'function' && typeof player.setVolume === 'function') {
        const currentVol = player.getVolume();
        let newVol = currentVol + delta;
        if (newVol > 100) newVol = 100;
        if (newVol < 0) newVol = 0;
        
        player.setVolume(newVol);
        window.postMessage({ type: 'VOLUME_BOOSTER_VOLUME_UPDATED', volume: newVol }, '*');
      }
    } catch (e) {
      // Silent error
    }
  }

  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    
    if (event.data.type === 'VOLUME_BOOSTER_CHECK_LIVE') {
      checkLiveStatus();
    } else if (event.data.type === 'VOLUME_BOOSTER_SET_VOLUME') {
      setVolume(event.data.volume);
    } else if (event.data.type === 'VOLUME_BOOSTER_ADJUST_VOLUME') {
      adjustVolume(event.data.delta);
    }
  });

  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    
    if (event.data.type === 'VOLUME_BOOSTER_CHECK_LIVE') {
      checkLiveStatus();
    } else if (event.data.type === 'VOLUME_BOOSTER_SET_VOLUME') {
      setVolume(event.data.volume);
    }
  });
})();
