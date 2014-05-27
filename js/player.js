/**
 * This can be the HTML or Flash player object. YouTube exposes 
 * the same functionality for either of them.
 */
player = window['player-api'].children[0];

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
document.addEventListener('YT_player_mute', function(e) {
    player.mute();
});

startPlayer = function(p){
	p.mute();
	updatePlayer = function(p){
		document.dispatchEvent(new CustomEvent('YT_player_update', {
			detail: {
				'currentTime': p.getCurrentTime(),
				'state': p.getPlayerState(),
				'videoUrl': p.getVideoUrl()
			}
		}));
	};
	interval_id = setInterval(updatePlayer, 1000, p);
	console.log('player loaded, interval id for update set to ', interval_id);
	/**
	 * Update the player meta right after having added all event listeners.
	 */
	updatePlayer(p);
};

if(player && typeof(player.loadVideoById) === 'function'){
	console.log('player is not loaded, waiting..');
	player_load_interval = setInterval(function(){
		player = window['player-api'].children[0];
		if(player && typeof(player.loadVideoById) === 'function'){
			clearInterval(player_load_interval);
			startPlayer(player);
		}
	}, 10);
}else{
	startPlayer(player);
}
