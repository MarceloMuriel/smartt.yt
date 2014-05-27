/**
 * This can be the HTML or Flash player object. YouTube exposes 
 * the same functionality for either of them.
 */
player = window['player-api'].children[0];
if(player && typeof(player.mute) === 'function'){
	player.mute();
}

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
document.addEventListener('YT_player_unMute', function(e) {
    player.unMute();
});

updatePlayer = function(){
	player = window['player-api'].children[0];
	if(player && typeof(player.loadVideoById) === 'function'){
		document.dispatchEvent(new CustomEvent('YT_player_update', {
			detail: {
				'currentTime': player.getCurrentTime(),
				'state': player.getPlayerState(),
				'videoUrl': player.getVideoUrl()
			}
		}));
	}else{
		console.log('updatePlayer: YouTube player is not ready yet..');
	}
};
interval_id = setInterval(updatePlayer, 1000);
console.log('player_update event interval ID ', interval_id);

/**
 * Update the player meta right after having added all event listeners.
 */
updatePlayer();