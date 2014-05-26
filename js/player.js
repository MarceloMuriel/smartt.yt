player = window['player-api'].children[0];
player.pauseVideo();

updateMeta = function(){
	document.dispatchEvent(new CustomEvent('YT_player_meta', {
		detail: {
			'currentTime': player.getCurrentTime(),
			'state': player.getPlayerState(),
			'videoUrl': player.getVideoUrl()
		}
	}));
};
updateMeta();
setInterval(updateMeta, 1000);

document.addEventListener('YT_player_seekTo', function(e) {
    player.seekTo(e.detail.seconds, e.detail.allowSeekAhead);
});
document.addEventListener('YT_player_playVideo', function(e) {
    player.playVideo();
});
document.addEventListener('YT_player_pauseVideo', function(e) {
    player.pauseVideo();
});