var templates = {
	
};
var pageHandler = {
	youtube : {
		videoID : (function() {
			return ( v = /.*v=(.{11})/ig.exec(window.location)) != null ? v.pop() : null;
		})(),
		loadVideo : function() {
			// Try to load the video with custom start and end points.
			setTimeout(function() {
				player = window['player-api'].children[0];
				if ( typeof player.loadVideoById === 'function') {
					player.loadVideoById({
						'videoId' : pageHandler.youtube.videoID,
						'startSeconds' : 5,
						'endSeconds' : player.getDuration() - 5,
						'suggestedQuality' : 'large'
					});
				} else {
					console.log("loadVideoById not yet ready.");
					this.loadVideo();
				}
			}, 100);

		},
		loadControls : function() {
			controls = document.getElementById('smartplaylists_controls');
			if (!controls){
				controls = document.createElement('div');
				controls.setAttribute('id', 'smartplaylists_controls');
				controls.setAttribute('class', 'yt-controls player-width');
				controls.innerHTML = "<h2>Here comes the controls</h2>";
				document.getElementById('player').appendChild(controls);
			}
		}
	},
	init : function() {
		if (this.youtube.videoID) {
			this.youtube.loadVideo();
			this.youtube.loadControls();
		}
	}
}
pageHandler.init();

console.log("content script");
script = document.createElement('script');
script.type = 'text/javascript';
script.src = chrome.extension.getURL('js/youtube.js');
document.body.appendChild(script);
