var templates = {

};
var pageHandler = {
	youtube : {
		videoMeta : (function(videoID) {
			id = ( v = /.*v=(.{11})/ig.exec(window.location)) != null ? v.pop() : false;
			if (id) {
				// TODO: Retrieve video json metadata from remote storage
				videoMeta = {
					videoID : id,
					duration : 179,
					intervals : [],
					tags : [{
						"15" : "Here she drops the bowl",
						"55" : "This is funny!"
					}]
				};
				return videoMeta;
			}
			return false;
		})(),
		player : window['player-api'].children[0],
		intervalIndex : -2,
		_timer : -1,
		watchPlayer : function() {
			if (!this.videoMeta.intervals.length)
				return;
			clearInterval(this._timer);
			checkInterval = function() {
				yt = pageHandler.youtube;
				if ( typeof yt.player.loadVideoById === 'function') {
					//console.log(yt.player.getPlayerState() + "; " + yt.player.getCurrentTime() + ";" + yt.intervalIndex);
					intervals = yt.videoMeta.intervals;
					t = yt.player.getCurrentTime();
					if (yt.intervalIndex == -2 || (t < yt.videoMeta.duration && t >= intervals[yt.intervalIndex + 1])) {
						// next interval
						yt.intervalIndex += 2;
						if (yt.intervalIndex < intervals.length)
							yt.loadAndPlay(intervals[yt.intervalIndex], intervals[yt.intervalIndex + 1]);
					}
				} else {
					console.log("YouTube player not yet ready.");
				}
			};
			checkInterval();
			this._timer = setInterval(checkInterval, 1000);
		},
		loadAndPlay : function(start, end) {
			player = window['player-api'].children[0];
			player.loadVideoById({
				'videoId' : this.videoMeta.videoID,
				'startSeconds' : start,
				'endSeconds' : end,
				'suggestedQuality' : 'large'
			});
		},
		loadControls : function() {
			if (!$('.sp_controls').length) {
				$('#player').append(new EJS({
					url : chrome.extension.getURL('js/content.ejs')
				}).render(this.videoMeta));
				$('.btn_control').button().click(function(e) {
					e.preventDefault();
				})
				$(function() {
					$("#range").colResizable({
						liveDrag : true,
						draggingClass : "rangeDrag",
						hoverCursor : "pointer",
						dragCursor : "e-resize",
						gripInnerHtml : "<div class='rangeGrip'></div>",
						onResize : function() {
						},
						minWidth : 8
					});
				});
			}
		}
	},
	init : function() {
		if (this.youtube.videoMeta) {
			this.youtube.loadControls();
			this.youtube.watchPlayer();
		}
	}
}
pageHandler.init();
