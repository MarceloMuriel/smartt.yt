/**
 * This can be the HTML or Flash player object. YouTube exposes 
 * the same functionality for either of them.
 */
player = window['player-api'].children[0];

startPlayer = function(p){
	document.addEventListener('YT_player_seekTo', function(e) {
	    p.seekTo(e.detail.seconds, e.detail.allowSeekAhead);
	});
	document.addEventListener('YT_player_playVideo', function(e) {
	    p.playVideo();
	});
	document.addEventListener('YT_player_pauseVideo', function(e) {
	    p.pauseVideo();
	});
	document.addEventListener('YT_player_nextVideo', function(e) {
	    p.nextVideo();
	});
	document.addEventListener('YT_player_unMute', function(e) {
	    p.unMute();
	});
	document.addEventListener('YT_player_mute', function(e) {
	    p.mute();
	});
	
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
	startPlayer(player);
}else{
	console.log('player is not loaded, waiting..');
	player_load_interval = setInterval(function(){
		player = window['player-api'].children[0];
		if(player && typeof(player.loadVideoById) === 'function'){
			clearInterval(player_load_interval);
			startPlayer(player);
		}
	}, 10);
}
