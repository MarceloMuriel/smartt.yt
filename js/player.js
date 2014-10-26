/**
 * Created on Jun 24, 2013. Copyright 2014 Hugo Muriel Arriaran; GPL License v2.
 * 
 * https://smartt.yt
 * 
 * Wrapper around the YouTube player that can be the HTML or Flash object.
 * YouTube exposes the same functionality for either of them.
 */

player = window['player-api'].children[0];

startPlayer = function(p) {
	/**
	 * Mute the player to allow the YouTube app to take control over the
	 * playback.
	 */
	p.pauseVideo();
	p.mute();
	/**
	 * Add all the event listeners that the YouTube app requires to communicate
	 * with the player.
	 */
	document.addEventListener('YT_player_seekTo', function(e) {
		console.log('YT_player_seekTo ' + e.detail.seconds);
		if (typeof (p.seekTo) === 'function') {
			p.seekTo(e.detail.seconds, e.detail.allowSeekAhead);
			if (player.type == 'application/x-shockwave-flash') {
				/*
				 * The player might not respond the first time. Give it another
				 * change some time after.
				 */
				setTimeout(function() {
					p.seekTo(e.detail.seconds, e.detail.allowSeekAhead)
				}, 100);
			}
		} else
			console.log('seekTo is not a function..');
	});
	document.addEventListener('YT_player_playVideo', function(e) {
		console.log('YT_player_playVideo');
		p.playVideo();
	});
	document.addEventListener('YT_player_pauseVideo', function(e) {
		console.log('YT_player_pauseVideo');
		p.pauseVideo();
	});
	document.addEventListener('YT_player_nextVideo', function(e) {
		console.log('YT_player_nextVideo');
		p.nextVideo();
	});
	document.addEventListener('YT_player_unMute', function(e) {
		console.log('YT_player_unMute');
		p.unMute();
	});
	document.addEventListener('YT_player_mute', function(e) {
		console.log('YT_player_mute');
		p.mute();
	});
	updatePlayer = function(p) {
		data = {
			'currentTime' : p.getCurrentTime(),
			'state' : p.getPlayerState(),
			'videoUrl' : p.getVideoUrl(),
			'playlistNextIndex' : (plist = p.getPlaylist()) ? (p
					.getPlaylistIndex() + 1)
					% plist.length : -1,
			'playlistNextVideo' : (plist = p.getPlaylist()) ? plist[(p
					.getPlaylistIndex() + 1)
					% plist.length] : null
		};
		// console.log(detail);
		ev = document.dispatchEvent(new CustomEvent('YT_player_update', {
			"detail" : data
		}));
	};
	interval_id = setInterval(updatePlayer, 1000, p);
	console.log('player loaded, interval id for update set to ', interval_id);
	/**
	 * Update the player meta right after having added all event listeners.
	 */
	updatePlayer(p);
};

if (player && typeof (player.loadVideoById) === 'function') {
	startPlayer(player);
} else {
	console.log('player is not loaded, waiting..');
	player_load_interval = setInterval(function() {
		player = window['player-api'].children[0];
		if (player && typeof (player.loadVideoById) === 'function') {
			clearInterval(player_load_interval);
			startPlayer(player);
		}
	}, 10);
}
/**
 * Hook a click handler to all anchors that have an href starting with /watch?v.
 * This handler should pause the video player to allow a smooth transition of
 * the next video avoiding playback before the allowed intervals.
 */
for (idx in document.links) {
	link = document.links[idx];
	if (link.href && link.href != location.href + "#"
			&& link.href.indexOf('/watch?v=') > -1) {
		link.onclick = function() {
			if (player) {
				player.pauseVideo();
				player.mute();
			}
		};
	}
}