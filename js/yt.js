/**
 * Created on Jun 24, 2013. Copyright 2014 Hugo Muriel Arriaran; GPL License v2.
 * 
 * https://smartt.yt
 * 
 * yt.js contains the core functionality of this extension. The YouTube object
 * is a collections of functions to handle the playback, events, communications
 * with the server and respond to user interactions.
 * 
 * The player wrapper is a middleware between wrapper (injected) in the YouTube
 * context and the functions of this file. It exposes similar methods and uses
 * messages to exchange data with the wrapper on the YouTube side.
 */

var YouTube = (function() {
	yt = function(player) {
		// Local variables to the instance/function
		id = null;
		user = {
			userID : null
		}
		metaSerial = null;
		meta = null;
		intervalIndex = -2;
		// Edition is disabled by default
		editionMode = false;
		// Enable interval playback option
		intervalsEnabled = true;
		// Data source querying
		isQueryingDatasource = false;

		this.getPlayer = function() {
			return player;
		};
		// Self reference for jQuery functions.
		yt = this;
		// API endpoint.
		apiURL = "https://smartt.yt/api";

		this.getID = function() {
			return id;
		};
		this.setID = function(_id) {
			id = _id;
		};
		this.getUser = function() {
			return user;
		};
		this.setUser = function(userData) {
			user = userData;
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
			console.log(meta);
		};
		this.getMetaSerial = function() {
			return metaSerial;
		};
		/**
		 * The metaserial is a JSON string encoding of the current metadata
		 * state. It is used as a signature to detect changes to the metadata.
		 */
		this.updateMetaSerial = function() {
			// This representation will be used to detect changes in the object
			// later on.
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
		this.isBusy = function() {
			return isQueryingDatasource == true;
		};
		this.isInEditionMode = function() {
			return editionMode;
		};
		this.setEditionMode = function(flag, cancel) {
			editionMode = flag;
			jQuery('#cancel-edit').toggle(editionMode);
			console.log("edition mode:", editionMode);
			btn = jQuery('#save-edit');
			if (editionMode) {
				btn.button('option', 'label', 'Done');
				jQuery('.ui-slider-delete').css('display', 'block');
			} else {
				if (!cancel) {
					if (JSON.stringify(yt.getMeta()) != yt.getMetaSerial())
						// Save changes to the DB
						yt.saveDB();
					// Set playback to the closest interval beginning.
					for (i = meta.intervals.length - 2, t = player
							.getCurrentTime(); i >= 0 & t > 0; i = i - 2) {
						if (t > meta.intervals[i]) {
							this.setIntervalIndex(i);
							player.seekTo(meta.intervals[i], true);
							break;
						}
					}
				} else {
					yt.setMeta(JSON.parse(yt.getMetaSerial()));
					// console.log('restored meta to', yt.getMeta());
					yt.metaBackup = null;
					yt.loadSlider();
				}
				btn.button('option', 'label', 'Edit');
				jQuery('.ui-slider-delete').css('display', 'none');
			}
			btn.prop('checked', editionMode).button('refresh');
		};
		this.isIntervalsEnabled = function() {
			return intervalsEnabled;
		};
		this.setIntervalsEnabled = function(flag) {
			intervalsEnabled = flag;
		};
		this.initVideo = function(newID) {
			/**
			 * Load the newID if any, try also to load the videoID from the
			 * page.
			 */
			if ((id = newID)
					|| (id = jQuery("meta[itemprop='videoId']").attr('content'))) {
				this.loadMeta();
			} else {
				console
						.log('init: no valid videoID received or found in the page');
			}
		};
		this.init = function(newID) {
			// reset the playback index
			this.setIntervalIndex(-2);

			// Retrieve the userID from local storage
			if (user.userID == null) {
				chrome.storage.sync
						.get(
								'userID',
								function(r) {
									if (!jQuery.isEmptyObject(r)) {
										user.userID = r.userID;
										// load video meta
										yt.initVideo(newID);
									} else {
										/*
										 * There is no userID in the local
										 * storage, request to create a new
										 * user.
										 */
										jQuery
												.ajax({
													type : "POST",
													url : apiURL + "/user",
													data : {},
													success : function(data) {
														if (data
																.hasOwnProperty('userID')) {
															user = data;
															chrome.storage.sync
																	.set({
																		'userID' : user.userID
																	});
															console
																	.log(user.userID);
														} else {
															console
																	.log('Invalid answer, no userID');
														}
														// load video meta
														yt.initVideo(newID);
													},
													error : function(xhr,
															status, error) {
														console
																.log(
																		'API error while trying to create a new user.',
																		xhr.responseText);
														// load video meta
														// anyways.
														yt.initVideo(newID);
													},
													contentType : "application/json",
													dataType : "json"
												});
									}
								});
			}
		};
		this.loadDefaultMeta = function() {
			/**
			 * Retrieve the duration in seconds from the page's metadata.
			 */
			duration = (/(\d+)M(\d+)/.exec(jQuery("meta[itemprop='duration']")
					.attr('content')) || []).splice(1).reduce(function(a, b) {
				return parseInt(a) * 60 + parseInt(b);
			}, 0);
			this
					.setMeta({
						videoID : id,
						/**
						 * Parse the playlist ID from the current URL TODO: Try
						 * to read the playlist ID from the page's meta.
						 */
						playlist : (l = Util.getURLparam('list',
								location.search)) ? [ l ] : [],
						duration : duration,
						/**
						 * YouTube Channel this video belongs to (added in
						 * v1.5).
						 */
						channelID : jQuery("meta[itemprop='channelId']").attr(
								'content'),
						/**
						 * By default there is a single interval matching the
						 * whole video duration.
						 */
						intervals : [ 0, duration ],
						tags : {},
						added: (new Date()).toString().substring(0, 33)
					});
			this.saveDB();
		};
		this.loadMeta = function() {
			isQueryingDatasource = true;
			/*
			 * Meta structure ============== {videoID: id, duration: duration,
			 * intervals: [init1, end1, init2, end2]}, tags: {t1: "tag 1", t2:
			 * "tag2"} }
			 */
			jQuery.ajax({
				type : "GET",
				url : apiURL + "/video/" + id + "/" + user.userID,
				success : function(m) {
					isQueryingDatasource = false;
					if (m) {
						serial = JSON.stringify(m);
						m.playlist = !Array.isArray(m.playlist) ? []
								: (l = Util.getURLparam('list', location.href))
										&& m.playlist.indexOf(l) == -1
										&& m.playlist.push(l) ? m.playlist
										: m.playlist;
						/**
						 * Update the channel ID for any video without this
						 * meta, typically those below v1.5
						 */
						m.channelID = !m.channelID ? jQuery(
								"meta[itemprop='channelId']").attr('content')
								: m.channelID;
						/*
						 * Replace the current metadata with the one of the
						 * retrieved video
						 */
						yt.setMeta(m);
						/* Update the doc in the database */
						/*
						 * Not necessary, the video is just retrieved. Instead
						 * update the metaserial to avoid saving it again
						 */
						yt.updateMetaSerial();
						if (yt.getMetaSerial() != serial) {
							// Update the DB
							yt.saveDB();
						}
					} else {
						console.log(id + " does not exist in the sever");
						yt.loadDefaultMeta();
					}
					yt.loadControls();
				},
				error : function(xhr, status, error) {
					console.log('API error');
					isQueryingDatasource = false;
					console.log("Error retrieving " + id
							+ " from server. Reading defaults..",
							xhr.responseText);
					yt.loadDefaultMeta();
					yt.loadControls();
				},
				contentType : "application/json",
				dataType : "json"
			});
		};
		this.loadSlider = function() {
			jQuery('.yt-multi-slider-cont').remove();
			jQuery('#sp_controls')
					.addClass("player-width")
					.prepend(
							'<div class="yt-multi-slider-cont"><div class="yt-multi-slider"></div></div>');
			ints = meta.intervals;
			maxVal = meta.duration;
			mslide = jQuery(".yt-multi-slider");
			seekPlayerTo = 0;
			mslide
					.slider({
						min : 0,
						max : maxVal,
						values : ints,
						step : 1,
						create : function(evt, ui) {
							// Add range backgrounds and delete handles.
							for (i = 0; i < ints.length - 1; i = i + 2) {
								l = ints[i] / maxVal * 100;
								w = ints[i + 1] / maxVal * 100 - l;
								mslide
										.append(jQuery("<div></div>")
												.addClass(
														"ui-slider-range ui-widget-header ui-corner-all")
												.css({
													left : l + "%",
													width : w + "%"
												}));
								// Add delete handles if there are more than
								// 1 intervals.
								if (ints.length / 2 > 1) {
									jQuery('.yt-multi-slider-cont')
											.append(
													jQuery("<div></div>")
															.addClass(
																	"ui-slider-delete")
															.css(
																	{
																		left : (l + ~~(w / 2))
																				+ "%"
																	})
															.click(
																	function(
																			evt) {
																		evt
																				.preventDefault();
																		// Remove
																		// interval
																		idx = jQuery(
																				'.ui-slider-delete')
																				.index(
																						evt.currentTarget) * 2;
																		ints
																				.splice(
																						idx,
																						2);
																		// Update
																		// the
																		// playback
																		// index
																		if (yt
																				.getIntervalIndex() == idx)
																			yt
																					.setIntervalIndex(idx - 2);
																		loadSlider();
																	}));
									if (!yt.isInEditionMode()) {
										jQuery('.ui-slider-delete').css(
												'display', 'none');
									}
								}
							}
							// Add Tooltips
							jQuery('.ui-slider-handle')
									.each(
											function(idx) {
												tooltip = '<div class="tooltip"><div class="tooltip-inner">'
														+ Util.ftime(ints[idx])
														+ '</div><div class="tooltip-arrow"></div></div>';
												jQuery(this).html(tooltip);
											});
						},
						slide : function(evt, ui) {
							v = ui.values;
							// Background ranges
							ranges = jQuery('.ui-slider-range');
							// Tooltips
							tooltips = jQuery('.tooltip-inner');
							for (i = 0; i < v.length; i++) {
								// Check boundaries to the left and to the
								// right if possible.
								if ((i > 0 && v[i] <= v[i - 1])
										|| (i < v.length - 1 && v[i] >= v[i + 1]))
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
							// Update the time where to seek the player on
							// stop.
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
		this.loadControls = function() {
			jQuery('#sp_controls').remove();
			jQuery('#placeholder-player')
					.append(
							'<div id="sp_controls"><div class="edit-buttons"><a href="#" id="cancel-edit"><span>Cancel</span></a><input id="save-edit" type="checkbox"/><label for="save-edit">Edit</label></div><div id="sp_buttons"><input id="on-off" type="checkbox" checked="checked"/><label for="on-off">On</label><a href="#" id="add-interval">+Add Interval</a><!--<div class="yt-separator">.</div><a href="#" id="add-marker">Add Marker</a>--></div></div>');
			yt.loadSlider();

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
			jQuery('#cancel-edit').click(function(e) {
				e.preventDefault();
				// Cancel the edition mode with the cancel flag set to true.
				yt.setEditionMode(false, true);
				jQuery(this).hide();
			});
			jQuery('#on-off').button({
				icons : {
					primary : 'ui-icon-power'
				}
			}).click(
					function(e) {
						e.preventDefault();
						yt.setIntervalsEnabled(!yt.isIntervalsEnabled());
						btn = jQuery('#on-off');
						btn.button('option', 'label',
								yt.isIntervalsEnabled() ? 'On' : 'Off');
						btn.prop('checked', yt.isIntervalsEnabled()).button(
								'refresh');
					});
		};

		this.addInterval = function() {
			t = yt.getPlayer().getCurrentTime();
			// find the closest interval edge
			ints = yt.getMeta().intervals;
			idxClosest = null;
			for (i = 0; i < ints.length; i++)
				if (idxClosest == null
						|| Math.abs(ints[i] - t) < Math.abs(ints[idxClosest]
								- t))
					idxClosest = i;
			idx = null;
			nxt = null;
			// Check if it is a beginning or end point.
			if (idxClosest % 2 == 0) {
				nxt = t + ~~((ints[idxClosest] - t) / 2);
				idx = idxClosest;
			} else {
				nxt = t
						+ ~~(((idxClosest + 1 < ints.length ? ints[idxClosest + 1]
								: yt.getMeta().duration) - t) / 2);
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
			jQuery.ajax({
				type : "POST",
				url : apiURL + "/video/" + user.userID,
				data : JSON.stringify(yt.getMeta()),
				success : function(data) {
					yt.updateMetaSerial();
				},
				error : function(xhr, status, error) {
					console.log('API error', xhr.responseText);
				},
				contentType : "application/json",
				dataType : "json"
			});
		};
		this.watchControls = function() {
			if (!this.isReady() || jQuery('#sp_controls').length == 0)
				return;
			t = player.getCurrentTime();
			disableAddInt = false;
			for (i = 0; i <= meta.intervals.length - 2; i = i + 2) {
				if (t >= meta.intervals[i] && t <= meta.intervals[i + 1]) {
					disableAddInt = true;
					break;
				}
			}
			jQuery('#add-interval').button("option", "disabled", disableAddInt);
		};
		this.canSavePlaybackHistory = function(date) {
			// Total time of the combined intervals
			totalIntervalsTime = 0;
			// Total played time with respect to the intervals.
			playedTime = 0;
			for (i = 0; i < meta.intervals.length - 1; i = i + 2) {
				totalIntervalsTime += meta.intervals[i + 1] - meta.intervals[i];
				// Already palyed intervals
				if (t > meta.intervals[i + 1])
					playedTime += meta.intervals[i + 1] - meta.intervals[i];
				// Currently playing interval
				if (t >= meta.intervals[i] && t <= meta.intervals[i + 1])
					playedTime += t - meta.intervals[i];
			}

			if (playedTime / totalIntervalsTime >= 0.75) {
				if (!this.getMeta().hasOwnProperty('history')) {
					return true;
				} else {
					if (this.getMeta().history.length == 0) {
						return true;
					} else {
						lastSaved = new Date(this.getMeta().history[this
								.getMeta().history.length - 1]);
						// The player must be playing (state 1).
						if (player.getPlayerState() == 1
								&& date.getTime() - lastSaved.getTime() > totalIntervalsTime * 1000)
							return true;
						else
							return false;
					}
				}
			} else {
				return false;
			}
		};
		this.userChange = function() {
			// User channel (if one exists)
			channel = jQuery('.guide-user-links a[href^="/channel/"]');
			if (channel.size() > 0) {
				chunks = channel.get(0).href.split('/channel/');
				if (chunks.length == 2)
					user.channelID = chunks[1];
			}
			// User email account
			email = jQuery('.yt-masthead-account-picker > a')
			if (email.size() > 0) {
				user.email = email.text().trim();
			}
			return user;
		};
		this.watchPlayback = function() {
			if (!this.isReady() || this.isInEditionMode())
				return;

			t = player.getCurrentTime();
			/**
			 * Watch to record playback history.
			 */

			// If the playback is over the threshold, then record it in the
			// user history.
			if (yt.canSavePlaybackHistory(new Date())) {
				m = yt.getMeta();
				if (!m.hasOwnProperty('history'))
					m.history = new Array();
				m.history[m.history.length] = (new Date()).toString()
						.substring(0, 33);
				yt.saveDB();
			}
			// console.log(timeToEndInterval, totalIntervalsTime,
			// playedTime,
			// playedTime / totalIntervalsTime);

			if (!intervalsEnabled)
				return;
			// console.log(player.getPlayerState(), player.getCurrentTime(),
			// intervalIndex, meta.intervals[intervalIndex]);
			/*
			 * Interval switch condition, if the playback has not startet yet or
			 * if the playback is yet not over and the the current interval is
			 * over.
			 */
			if (intervalIndex == -2
					|| (t < meta.duration && t >= meta.intervals[intervalIndex + 1])) {
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
					player.unMute();
					console.log('playing interval ' + (intervalIndex + 1));
				} else {
					console.log('last interval reached.');
					/**
					 * If it is a playlist, then play the next video. Otherwise
					 * loop the video.
					 */
					if (Util.getURLparam('list', location.search)) {
						console.log('switching to next video');
						player.pauseVideo();
						player.mute();
						// Try to find an anchor pointing to that video so
						// YouTube will handle the switching.
						a = jQuery(".playlist-videos-list a[href^='/watch?v="
								+ yt.getID() + "']");
						links = a.parent().next().children(
								"a[href^='/watch?v=']");
						if (links.size() > 0) {
							links.get(0).click();
						} else {
							// Do the replacement in the location object
							// directly.
							// TODO: verify how to get the next video from the
							// flash player.
							url = player.getVideoUrl().replace(/v=[^&#]+/,
									'v=' + player.playlistNextVideo()).concat(
									'&index='
											+ (player.playlistNextIndex() + 1));
							console.log('js location redirect to ' + url);
							location = url;
						}
					} else {
						/* Back to the beginning */
						console.log('playing back the same video');
						player.seekTo(meta.intervals[0]);
						player.playVideo();
					}
				}
			}
			/**
			 * Watch for video switching. This normally happens when the page or
			 * the player load a new video.
			 */
			if ((vid = Util.getURLparam('v', player.getVideoUrl()))
					&& vid != this.getID()) {
				console.log('vid switched to', Util.getURLparam('v', player
						.getVideoUrl()), 'from ', this.getID(),
						', reinitializing..');
				player.mute();
				player.pauseVideo();
				this.setEditionMode(false);
				this.init(vid);
			}
			/**
			 * Watch for user data change
			 */
			if (Math.floor(t) % 10 == 0) {
				userSerial = JSON.stringify(yt.getUser());
				userData = yt.userChange();
				if (userSerial != JSON.stringify(userData)) {
					console.log('user data changed..');
					jQuery.ajax({
						type : "PUT",
						url : apiURL + "/user/" + yt.getUser().userID,
						data : JSON.stringify(yt.getUser()),
						success : function(data) {
						},
						error : function(xhr, status, error) {
							console.log('API error while updating user.',
									xhr.responseText);
						},
						contentType : "application/json",
						dataType : "json"
					});
				}
			}
		};
	};
	return yt;
})();

var Util = (function() {
	u = function() {
	};
	u.ftime = function(sec) {
		h = ~~(sec / 3600);
		m = ~~((sec - h * 3600) / 60);
		sec = ~~(sec - h * 3600 - m * 60);
		return (h > 0 ? h + ":" : "") + (m > 0 ? m + ":" : "")
				+ (sec < 10 ? "0" + sec : sec);
	};
	u.getdbURL = function() {
		return dbURL;
	};
	u.getURLparam = function(name, stack) {
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex
				.exec(stack);
		return results == null ? null : decodeURIComponent(results[1].replace(
				/\+/g, " "));
		// return decodeURIComponent((new RegExp('[?|&]' + name + '=' +
		// '([^&;]+?)(&|#|;|jQuery)').exec(stack)||[,""])[1].replace(/\+/g,
		// '%20')) || null;
	};
	return u;
})();

/**
 * This a virtual player object that serves as a proxy for the YouTube HTML or
 * Flash player in the youtube website.
 */
var PlayerWrapper = (function() {
	p = function() {
		PLAYER_STATE_UNSTARTED = -1;
		playerMeta = {
			'currentTime' : 0,
			'state' : -1,
			'videoUrl' : ''
		};
		this.isReady = function() {
			return playerMeta.state != PLAYER_STATE_UNSTARTED;
		};
		this.getCurrentTime = function() {
			return playerMeta.currentTime;
		};
		this.getPlayerState = function() {
			return playerMeta.state;
		};
		this.seekTo = function(seconds, allowSeekAhead) {
			document.dispatchEvent(new CustomEvent('YT_player_seekTo', {
				detail : {
					'seconds' : seconds,
					'allowSeekAhead' : allowSeekAhead
				}
			}));
		};
		this.playVideo = function() {
			document.dispatchEvent(new CustomEvent('YT_player_playVideo'));
		};
		this.pauseVideo = function() {
			document.dispatchEvent(new CustomEvent('YT_player_pauseVideo'));
		};
		this.nextVideo = function() {
			document.dispatchEvent(new CustomEvent('YT_player_nextVideo'));
		};
		this.getVideoUrl = function() {
			return playerMeta.videoUrl;
		};
		this.getVideoID = function() {
			return Util.getURLparam('v', playerMeta.videoUrl);
		};
		this.setPlayerMeta = function(meta) {
			if (meta != null)
				playerMeta = meta;
		};
		this.getPlayerMeta = function() {
			return playerMeta;
		};
		this.unMute = function() {
			document.dispatchEvent(new CustomEvent('YT_player_unMute'));
		};
		this.mute = function() {
			document.dispatchEvent(new CustomEvent('YT_player_mute'));
		};
		this.playlistNextIndex = function() {
			return playerMeta.playlistNextIndex;
		};
		this.playlistNextVideo = function() {
			return playerMeta.playlistNextVideo;
		};
	};
	return p;
})();

ytPlayer = new PlayerWrapper();
/* Create the YouTube application */
ytApp = new YouTube(ytPlayer);
/**
 * Start the app right after at the risk the player is not yet ready on the
 * YouTube page. In such case, the app will get started again on the first
 * YT_player_update event.
 */
ytApp.init();

/**
 * This handler will be executed (normally) every second with new metadata
 * coming from the player. After updating the metadata it will fire the YouTube
 * watching controls.
 */
document.addEventListener('YT_player_update', function(e) {
	ytPlayer.setPlayerMeta(e.detail);
	/**
	 * The yt object might not be initialized. This happens when the videoID
	 * cannot be retrieved from the page. In such case, send the videoID
	 * retrieved from the player metadata.
	 */
	if (!ytApp.isReady() && !ytApp.isBusy() && !ytPlayer.getVideoID()) {
		console.log('initializing with video ' + ytPlayer.getVideoID()
				+ ", yt object readiness " + ytApp.isReady()
				+ ", yt player readiness" + ytPlayer.isReady() + ", yt meta:");
		console.log(ytApp.getMeta());
		ytApp.init(ytPlayer.getVideoID());
	}
	ytApp.watchPlayback();
	ytApp.watchControls();
});
