/**
 * This can be the HTML or Flash player object. YouTube exposes 
 * the same functionality for either of them.
 */
player = window['player-api'].children[0];

startPlayer = function(p){
	/**
	 * Mute the player to allow the YouTube app to take control over the playback. 
	 */
	p.pauseVideo();
	p.mute();
	/**
	 * Add all the event listeners that the YouTube app requires to communicate 
	 * with the player.
	 */
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
	updatePlayer = function(p){
		document.dispatchEvent(new CustomEvent('YT_player_update', {
			detail: {
				'currentTime': p.getCurrentTime(),
				'state': p.getPlayerState(),
				'videoUrl': p.getVideoUrl(),
				'playlistNextIndex': (plist = p.getPlaylist())?(p.getPlaylistIndex() + 1) % plist.length:-1,
				'playlistNextVideo': (plist = p.getPlaylist())?plist[(p.getPlaylistIndex() + 1) % plist.length]:null 
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
/**
 * Hook a click handler to all anchors that have an href starting with /watch?v. 
 * This handler should pause the video player to allow a smooth transition of the 
 * next video avoiding playback before the allowed intervals.
 */
for(idx in document.links){
	link = document.links[idx]; 
	if(link.href && link.href != location.href + "#" && link.href.indexOf('/watch?v=') > -1){
		link.onclick = function(){
			if(player){
				player.pauseVideo();
				player.mute();
			}
		};
	}
}