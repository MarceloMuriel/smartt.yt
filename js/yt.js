var YouTube = (function() {
	yt = function(player) {
		// Local variables to the instance/function
		id = null;
		metaSerial = null;
		meta = null;
		intervalIndex = -2;
		// Edition is disabled by default
		editionMode = false;
		
		this.getPlayer = function(){
			return player;
		};
		// Self reference for jQuery functions.
		yt = this;
		// Init couch db prefix.
		jQuery.couch.urlPrefix = "http://127.0.0.1:5984";
		
		this.getID = function() {
			return id;
		};
		this.setID = function(_id) {
			id = _id;
		};
		this.getMeta = function() {
			return meta;
		};
		/**
		 * Update the current metadata. This method is typically fired after 
		 * retrieving metadata from the database or the current page.
		 */
		this.setMeta = function(m) {
			meta = m;
			console.log("meta set:", meta);
		};
		this.getMetaSerial = function() {
			return metaSerial;
		};
		/**
		 * The metaserial is a JSON string encoding of the current metadata 
		 * state. It is used as a signature to detect changes to the metadata.
		 */
		this.updateMetaSerial = function() {
			// This representation will be used to detect changes in the object later on.
			metaSerial = JSON.stringify(meta);
		};
		this.getIntervalIndex = function() {
			return intervalIndex;
		};
		this.setIntervalIndex = function(idx) {
			intervalIndex = idx;
		};
		this.isReady = function() {
			return (meta != null && player.isReady());
		};
		this.isInEditionMode = function() {
			return editionMode;
		};
		this.setEditionMode = function(flag) {
			editionMode = flag;
			console.log("edition mode:", editionMode);
			btn = jQuery('#save-edit');
			if (editionMode) {
				btn.button('option', 'label', 'Done');
				jQuery('.ui-slider-delete').css('display', 'block');
			} else {
				if (JSON.stringify(yt.getMeta()) != yt.getMetaSerial())
					// Save changes to the DB
					yt.saveDB();
				// Set playback to the closest interval beginning.
				for ( i = meta.intervals.length - 2, t = player.getCurrentTime(); i >= 0 & t > 0; i = i - 2)
					if (t > meta.intervals[i]) {
						this.setIntervalIndex(i);
						player.seekTo(meta.intervals[i], true);
						break;
					}
				btn.button('option', 'label', 'Edit');
				jQuery('.ui-slider-delete').css('display', 'none');
			}
			btn.prop('checked', editionMode).button('refresh');
		};
		this.init = function(newID) {
			// reset the playback index
			this.setIntervalIndex(-2);
			/**
			 * Load the newID if any, try also to load the videoID from the page.
			 */
			if ((id = newID) || (id = jQuery("meta[itemprop='videoId']").attr('content'))) {
				this.loadMeta();
			}else{
				console.log('init: no valid videoID received or found in the page');
			}
		};
		this.loadDefaultMeta = function() {
			/**
			 * Retrieve the duration in seconds from the page's metadata.
			 */
			duration = (/(\d+)M(\d+)/.exec(jQuery("meta[itemprop='duration']").attr('content')) || []).splice(1).reduce(function(a, b) {
				return parseInt(a) * 60 + parseInt(b);
			}, 0);
			this.setMeta({
				videoID : id,
				/**
				 * Parse the playlist ID from the current URL
				 * TODO: Try to read the playlist ID from the page's meta.
				 */
				playlist : (l = Util.getURLparam('list', location.search))?[l]:[],
				duration : duration,
				/**
				 * YouTube Channel this video belongs to (added in v1.5).
				 */
				channelID : jQuery("meta[itemprop='channelId']").attr('content'),
				/**
				 * By default there is a single interval matching the whole video duration.
				 */
				intervals : [0, duration],
				tags : {}
			});
			this.saveDB();
		};
		this.loadMeta = function() {
			/*
			 * Meta structure
			 * ==============
			 * {videoID: id,
			 * 	duration: duration,
			 * intervals: [init1, end1, init2, end2]},
			 * tags: {t1: "tag 1", t2: "tag2"}
			 * }
			 */
			
			/**
			 * Call the videos/all view in CouchDB that retrieves all videos and filter 
			 * it by videoID. 
			 */
			jQuery.couch.db("ytsmartplaylists").view("videos/all", {
				key : id,
				success : function(data) {
					/**
					 * The retrieved data is a collection with multiple rows. Each 
					 * row value property contains the document itself, meaning the 
					 * video metadata.
					 */
					if (data.rows.length > 0) {
						/* The first row must contain the video metadata */
						m = data.rows[0].value;
						/**
						 * Update the playlist info. The same video can belong to multiple playlists 
						 * including the current one (if present).
						 */
						m.playlist = !Array.isArray(m.playlist) ? [] : ( l = Util.getURLparam('list', location.href)) && m.playlist.indexOf(l) == -1 && m.playlist.push(l) ? m.playlist : m.playlist;
						/**
						 * Update the channel ID for any video without this meta, typically those below v1.5
						 */
						m.channelID = !m.channelID ? jQuery("meta[itemprop='channelId']").attr('content'): m.channelID;
						/* Replace the current metadata with the one of the retrieved video */
						yt.setMeta(m);
						/* Update the doc in the database */
						yt.saveDB();
					} else {
						console.log("Cannot retrieve " + id + " from server. Reading defaults..");
						yt.loadDefaultMeta();
					}
					yt.loadControls();
				},
				/**
				 * If the database cannot be read, load the default meta (from the page) and start 
				 * the controls. 
				 */
				error : function(status) {
					console.log("Error retrieving " + id + " from server. Reading defaults..");
					yt.loadDefaultMeta();
					yt.loadControls();
				},
				reduce : false
			});
		};

		this.loadControls = function() {
			jQuery('#sp_controls').remove();
			jQuery('#player').append('<div id="sp_controls"><input id="save-edit" type="checkbox"/><label for="save-edit" class="save-edit">Edit</label><div id="sp_buttons"><a href="#" id="add-interval">+Add Interval</a><!--<div class="yt-separator">.</div><a href="#" id="add-marker">Add Marker</a>--></div></div>');
			loadSlider = function() {
				jQuery('.yt-multi-slider-cont').remove();
				jQuery('#sp_controls').addClass("player-width").prepend('<div class="yt-multi-slider-cont"><div class="yt-multi-slider"></div></div>');
				ints = meta.intervals;
				maxVal = meta.duration;
				mslide = jQuery(".yt-multi-slider");
				seekPlayerTo = 0;
				mslide.slider({
					min : 0,
					max : maxVal,
					values : ints,
					step : 1,
					create : function(evt, ui) {
						// Add range backgrounds and delete handles.
						for ( i = 0; i < ints.length - 1; i = i + 2) {
							l = ints[i] / maxVal * 100;
							w = ints[i + 1] / maxVal * 100 - l;
							mslide.append(jQuery("<div></div>").addClass("ui-slider-range ui-widget-header ui-corner-all").css({
								left : l + "%",
								width : w + "%"
							}));
							// Add delete handles if there are more than 1 intervals.
							if (ints.length / 2 > 1) {
								jQuery('.yt-multi-slider-cont').append(jQuery("<div></div>").addClass("ui-slider-delete").css({
									left : (l + ~~(w / 2)) + "%"
								}).click(function(evt) {
									evt.preventDefault();
									// Remove interval
									idx = jQuery('.ui-slider-delete').index(evt.currentTarget) * 2;
									ints.splice(idx, 2);
									// Update the playback index
									if (yt.getIntervalIndex() == idx)
										yt.setIntervalIndex(idx - 2);
									loadSlider();
								}));
								if (!yt.isInEditionMode()) {
									jQuery('.ui-slider-delete').css('display', 'none');
								}
							}
						}
						// Add Tooltips
						jQuery('.ui-slider-handle').each(function(idx) {
							tooltip = '<div class="tooltip"><div class="tooltip-inner">' + Util.ftime(ints[idx]) + '</div><div class="tooltip-arrow"></div></div>';
							jQuery(this).html(tooltip);
						});
					},
					slide : function(evt, ui) {
						v = ui.values;
						// Background ranges
						ranges = jQuery('.ui-slider-range');
						// Tooltips
						tooltips = jQuery('.tooltip-inner');
						for ( i = 0; i < v.length; i++) {
							// Check boundaries to the left and to the right if possible.
							if ((i > 0 && v[i] <= v[i - 1]) || (i < v.length - 1 && v[i] >= v[i + 1]))
								return false;
							// Adjust the tooltip
							tooltips.eq(i).html(Util.ftime(v[i]));
							// Adjust the range background
							if (i % 2 == 0) {
								l = v[i] / maxVal * 100;
								w = v[i + 1] / maxVal * 100 - l;
								ranges.eq(i / 2).css({
									left : l + "%",
									width : w + "%"
								});
							}
						}
						// Update the time where to seek the player on stop.
						jQuery.grep(v, function(s) {
							if (jQuery.inArray(s, ints) == -1)
								seekPlayerTo = v.indexOf(s);
						});
						// Update the intervals values
						ints = v;
					},
					stop : function(evt, ui) {
						yt.setEditionMode(true);
						player.seekTo(ints[seekPlayerTo], true);
					}
				});
			};
			loadSlider();

			jQuery('#add-interval').button().click(function(e) {
				e.preventDefault();
				yt.addInterval();
			});
			jQuery('#add-marker').button().click(function(e) {
				e.preventDefault();
				// TODO
			});
			jQuery('#save-edit').button().click(function(e) {
				e.preventDefault();
				yt.setEditionMode(!yt.isInEditionMode());
			});
		};

		this.addInterval = function() {
			t = yt.getPlayer().getCurrentTime();
			// find the closest interval edge
			ints = yt.getMeta().intervals;
			idxClosest = null;
			for ( i = 0; i < ints.length; i++)
				if (idxClosest == null || Math.abs(ints[i] - t) < Math.abs(ints[idxClosest] - t))
					idxClosest = i;
			idx = null;
			nxt = null;
			// Check if it is a beginning or end point.
			if (idxClosest % 2 == 0) {
				nxt = t + ~~((ints[idxClosest] - t) / 2);
				idx = idxClosest;
			} else {
				nxt = t + ~~(((idxClosest + 1 < ints.length ? ints[idxClosest + 1] : yt.getMeta().duration) - t) / 2);
				idx = idxClosest + 1;
			}
			if (nxt >= t + 5) {
				ints.splice(idx, 0, t, nxt);
				// Update the playback index
				yt.setIntervalIndex(idx);

				console.log("playing interval " + yt.getIntervalIndex() / 2);
				// Reload the multi-range slider
				loadSlider();
			} else {
				console.log("Cannot add interval, not enough space..");
			}
		};
		
		this.saveDB = function() {
			jQuery.couch.db("ytsmartplaylists").saveDoc(yt.getMeta(), {
				success : function(data) {
					/**
					 * Replicate the _id and _rev properties with the database data record returned.
					 * This is important to update the metadata on the next database saving, 
					 * instead of creating a new doc entry in the database.
					 */
					yt.getMeta()._id = data.id;
					yt.getMeta()._rev = data.rev;
					/* Generate the metadata signature again */
					yt.updateMetaSerial();
					//console.log("updated meta after saving to the DB: ", yt.getMeta());
				},
				error : function(status) {
					console.log("saving to DB failed: ", status);
				}
			});
		};
		this.watchControls = function() {
			if (!this.isReady() || jQuery('#sp_controls').length == 0)
				return;
			t = player.getCurrentTime();
			disableAddInt = false;
			for ( i = 0; i <= meta.intervals.length - 2; i = i + 2) {
				if (t >= meta.intervals[i] && t <= meta.intervals[i + 1]) {
					disableAddInt = true;
					break;
				}
			}
			jQuery('#add-interval').button("option", "disabled", disableAddInt);
		};
		this.watchPlayback = function() {
			if (!this.isReady() || this.isInEditionMode())
				return;
			t = player.getCurrentTime();
			//console.log(player.getPlayerState(), player.getCurrentTime(), intervalIndex, meta.intervals[intervalIndex]);
			if (intervalIndex == -2 || (t < meta.duration && t >= meta.intervals[intervalIndex + 1])) {
				if (intervalIndex + 2 < meta.intervals.length) {
					/* Next interval, an interval has 2 points: start and end */
					intervalIndex += 2;
					/**
					 * Seek the player to a non 0 position.
					 */
					if (meta.intervals[intervalIndex] > 0) {
						player.seekTo(meta.intervals[intervalIndex], true);
					}
					/* Inmediately start playing the video */
					player.unMute();
					player.playVideo();
					console.log('playing interval '+ (intervalIndex + 1));
				} else {
					console.log('last interval reached.');
					/**
					 * If it is a playlist, then play the next video. Otherwise loop the video. 
					 */
					if (Util.getURLparam('list', location.search)) {
						console.log('switching to next video');
						player.nextVideo();
					} else {
						/* Back to the beginning */
						console.log('playing back the same video');
						player.seekTo(meta.intervals[0]);
						player.playVideo();
					}
				}
			}
			/**
			 * Watch for video switching. This normally happens when the page or the player load a 
			 * new video. 
			 */
			if (( vid = Util.getURLparam('v', player.getVideoUrl())) && vid != this.getID()) {
				console.log('vid switched to',  Util.getURLparam('v', player.getVideoUrl()), 'from ', this.getID(), ', reinitializing..');
				player.pauseVideo();
				this.setEditionMode(false);
				this.init(vid);
			}
		};
	};
	return yt;
})();

Timer = (function() {
	t = function() {
		fxs = [];
		interval = 1000;
		_timerID = -1;
		this.getfxs = function() {
			return fxs;
		};
		this.run = function() {
			_timerID = setInterval(this.execute, interval, this);
		};
		this.add = function(obj, func, args) {
			f = {
				"obj" : arguments[0],
				"func" : arguments[1],
				"args" : Array.prototype.slice.call(arguments, 2)
			};
			// Call inmediately
			f.func.apply(f.obj, f.args);
			// Add to the list of functions for the following executions
			fxs.push(f);
		};
		/* function to be called in setInterval*/
		this.execute = function(timer) {
			timer.getfxs().forEach(function(f) {
				f.func.apply(f.obj, f.args);
			});
		};
		this.stop = function() {
			clearInterval(_timerID);
		};
	};
	return t;
})();

var Util = (function() {
	u = function() {
	};
	u.ftime = function(sec) {
		h = ~~(sec / 3600);
		m = ~~((sec - h * 3600) / 60);
		sec = ~~(sec - h * 3600 - m * 60);
		return (h > 0 ? h + ":" : "") + (m > 0 ? m + ":" : "") + (sec < 10 ? "0" + sec : sec);
	};
	u.getdbURL = function() {
		return dbURL;
	};
	u.getURLparam = function(name, stack) {
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	    results = regex.exec(stack);
	    return results == null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
		//return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|jQuery)').exec(stack)||[,""])[1].replace(/\+/g, '%20')) || null;
	};
	return u;
})();

ytPlayer = {
	PLAYER_STATE_UNSTARTED : -1,
	playerMeta : {
		'currentTime': 0,
		'state': -1,
		'videoUrl': ''
	},
	isReady : function(){
		return playerMeta.state != this.PLAYER_STATE_UNSTARTED;
	},
	getCurrentTime : function(){
		return playerMeta.currentTime;
	},
	getPlayerState : function(){
		return playerMeta.state;
	},
	seekTo : function(seconds, allowSeekAhead){
		document.dispatchEvent(new CustomEvent('YT_player_seekTo', {
			detail: {
				'seconds': seconds,
				'allowSeekAhead': allowSeekAhead
			}
		}));
	},
	playVideo: function(){
		document.dispatchEvent(new CustomEvent('YT_player_playVideo'));
	},
	pauseVideo: function(){
		document.dispatchEvent(new CustomEvent('YT_player_pauseVideo'));
	},
	nextVideo: function(){
		document.dispatchEvent(new CustomEvent('YT_player_nextVideo'));
	},
	getVideoUrl: function(){
		return playerMeta.videoUrl;
	},
	getVideoID: function(){
		return Util.getURLparam('v', playerMeta.videoUrl);
	},
	setPlayerMeta : function(meta){
		playerMeta = meta;
	},
	getPlayerMeta : function(){
		return playerMeta;
	},
	unMute: function(){
		document.dispatchEvent(new CustomEvent('YT_player_unMute'));
	}
};
		
/* Create the YouTube application */
ytCustom = new YouTube(ytPlayer);
ytCustom.init();

/**
 * This handler will be executed (normally) every second with new 
 * metadata coming from the player. After updating the metadata it 
 * will fire the YouTube watching controls.
 */
document.addEventListener('YT_player_update', function(e){
	ytPlayer.setPlayerMeta(e.detail);
	/**
	 * The yt object might not be initialized. This happens when the videoID cannot be 
	 * retrieved from the page. In such case, send the videoID retrieved from the player 
	 * metadata.
	 */
	if(!ytCustom.isReady()){
		ytCustom.init(ytPlayer.getVideoID());
	}
	ytCustom.watchControls();
	ytCustom.watchPlayback();
});
