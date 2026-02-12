(function() {
    // リスナーの重複登録を防ぐためのフラグチェック
    if (window.volumeBoosterScrollAttached) return;
    window.volumeBoosterScrollAttached = true;

    window.addEventListener('message', function(event) {
        // 信頼できるソースからのメッセージのみを受け付ける
        if (event.source !== window) return;

        if (event.data.type === 'VOLUME_BOOSTER_SET_VOLUME') {
            try {
                const player = document.getElementById('movie_player');
                if (player && typeof player.setVolume === 'function') {
                    const volume = event.data.volume; // 0-100
                    
                    // 音量が0より大きければミュート解除を試みる
                    if (volume > 0 && typeof player.isMuted === 'function' && player.isMuted()) {
                        player.unMute();
                    }

                    player.setVolume(volume);
                }
            } catch (e) {
                console.error("Volume Booster: Error setting volume via API", e);
            }
        }
    });
})();
