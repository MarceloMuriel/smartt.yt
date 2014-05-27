/**
 * This can be the HTML or Flash player object. YouTube exposes 
 * the same functionality for either of them.
 */
player = window['player-api'].children[0];
player.pauseVideo();

document.addEventListener('YT_player_seekTo', function(e) {
    player.seekTo(e.detail.seconds, e.detail.allowSeekAhead);
});
document.addEventListener('YT_player_playVideo', function(e) {
    player.playVideo();
});
document.addEventListener('YT_player_pauseVideo', function(e) {
    player.pauseVideo();
});
document.addEventListener('YT_player_nextVideo', function(e) {
    player.nextVideo();
});

updateMeta = function(){
	document.dispatchEvent(new CustomEvent('YT_player_meta', {
		detail: {
			'currentTime': player.getCurrentTime(),
			'state': player.getPlayerState(),
			'videoUrl': player.getVideoUrl()
		}
	}));
};
setInterval(updateMeta, 1000);

/**
 * Update the player meta right after having added all event listeners.
 */
updateMeta();