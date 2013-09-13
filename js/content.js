var YouTube = (function() {
	yt = function(timer) {
		// Local variables to the instance/function
		id = null;
		metaSerial = null;
		meta = null;
		intervalIndex = -2;
		player = window['player-api'].children[0];
		// Edition is disabled by default
		editionMode = false;
		// Self reference for jQuery functions.
		yt = this;
		// Init couch db prefix.
		$.couch.urlPrefix = "http://127.0.0.1:5984";

		this.getPlayer = function() {
			return player;
		};
		this.getID = function() {
			return id;
		};
		this.setID = function(_id) {
			id = _id;
		}
		this.getMeta = function() {
			return meta;
		};
		this.setMeta = function(m) {
			meta = m;
			console.log("new meta:", meta);
		}
		this.getMetaSerial = function() {
			return metaSerial;
		}
		this.updateMetaSerial = function() {
			// This representation will be used to detect changes in the object later on.
			metaSerial = JSON.stringify(meta);
		}
		this.getIntervalIndex = function() {
			return intervalIndex;
		};
		this.setIntervalIndex = function(idx) {
			intervalIndex = idx;
		};
		this.isReady = function() {
			return (meta != null && typeof player.loadVideoById === 'function');
		};
		this.isInEditionMode = function() {
			return editionMode;
		};
		this.setEditionMode = function(flag) {
			editionMode = flag;
			console.log("edition mode:", editionMode);
			btn = $('#save-edit');
			if (editionMode) {
				btn.button('option', 'label', 'Done');
				$('.ui-slider-delete').css('display', 'block');
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
				$('.ui-slider-delete').css('display', 'none');
			}
			btn.prop('checked', editionMode).button('refresh');
		}
		this.init = function(newID) {
			// reset the playback index
			this.setIntervalIndex(-2);
			// If the new videoID differs from the one in the page set a timeout.
			if (id != null && $("meta[itemprop='videoId']").attr('content') != newID) {
				setTimeout(function() {
					yt.init.call(yt, newID);
				}, 50);
				return;
			}
			if ( id = newID || $("meta[itemprop='videoId']").attr('content')) {
				this.loadMeta();
			}
		};
		this.loadDefaultMeta = function() {
			// a = Util.getURLparam('test_key', $('#movie_player').attr('flashvars'));
			duration = (/(\d+)M(\d+)/.exec($("meta[itemprop='duration']").attr('content')) || []).splice(1).reduce(function(a, b) {
				return parseInt(a) * 60 + parseInt(b);
			}, 0);
			this.setMeta({
				videoID : id,
				playlist : [Util.getURLparam('list', location.href)],
				duration : duration,
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
			$.couch.db("ytsmartplaylists").view("videos/all", {
				key : id,
				success : function(data) {
					console.log("video data from DB: ", data);
					if (data.rows.length > 0) {
						m = data.rows[0].value;
						// Update Playlist info
						m.playlist = !Array.isArray(m.playlist) ? [] : ( l = Util.getURLparam('list', location.href)) && m.playlist.indexOf(l) == -1 && m.playlist.push(l) ? m.playlist : m.playlist;
						yt.setMeta(m);
						yt.saveDB();
					} else {
						console.log("Cannot retrieve " + id + " from server. Reading defaults..");
						yt.loadDefaultMeta();
					}
					yt.loadControls();
				},
				error : function(status) {
					console.log("Error retrieving " + id + " from server. Reading defaults..");
					yt.loadDefaultMeta();
					yt.loadControls();
				},
				reduce : false
			});
		};

		this.loadControls = function() {
			$('#sp_controls').remove();
			$('#player').append('<div id="sp_controls"><div id="sp_buttons"><a href="#" id="add-interval">+Add Interval</a><div class="yt-separator">.</div><a href="#" id="add-marker">Add Marker</a></div><input id="save-edit" type="checkbox"/><label for="save-edit" class="save-edit">Edit</label></div>');
			loadSlider = function() {
				$('.yt-multi-slider-cont').remove();
				$('#sp_controls').addClass("player-width").prepend('<div class="yt-multi-slider-cont"><div class="yt-multi-slider"></div></div>');
				ints = meta.intervals;
				maxVal = meta.duration;
				mslide = $(".yt-multi-slider");
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
							mslide.append($("<div></div>").addClass("ui-slider-range ui-widget-header ui-corner-all").css({
								left : l + "%",
								width : w + "%"
							}));
							// Add delete handles if there are more than 1 intervals.
							if (ints.length / 2 > 1) {
								$('.yt-multi-slider-cont').append($("<div></div>").addClass("ui-slider-delete").css({
									left : (l + ~~(w / 2)) + "%"
								}).click(function(evt) {
									evt.preventDefault();
									// Remove interval
									idx = $('.ui-slider-delete').index(evt.currentTarget) * 2;
									ints.splice(idx, 2);
									// Update the playback index
									if (yt.getIntervalIndex() == idx)
										yt.setIntervalIndex(idx - 2);
									loadSlider();
								}));
								if (!yt.isInEditionMode()) {
									$('.ui-slider-delete').css('display', 'none');
								}
							}
						}
						// Add Tooltips
						$('.ui-slider-handle').each(function(idx) {
							tooltip = '<div class="tooltip"><div class="tooltip-inner">' + Util.ftime(ints[idx]) + '</div><div class="tooltip-arrow"></div></div>';
							$(this).html(tooltip);
						});
					},
					slide : function(evt, ui) {
						v = ui.values;
						// Background ranges
						ranges = $('.ui-slider-range');
						// Tooltips
						tooltips = $('.tooltip-inner');
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
						$.grep(v, function(s) {
							if ($.inArray(s, ints) == -1)
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
			}
			loadSlider();

			$('#add-interval').button().click(function(e) {
				e.preventDefault();
				yt.addInterval();
			});
			$('#add-marker').button().click(function(e) {
				e.preventDefault();
				// TODO
			});
			$('#save-edit').button().click(function(e) {
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
			$.couch.db("ytsmartplaylists").saveDoc(yt.getMeta(), {
				success : function(data) {
					yt.getMeta()._id = data.id;
					yt.getMeta()._rev = data.rev;
					yt.updateMetaSerial();
					console.log("updated meta after saving to the DB: ", yt.getMeta());
				},
				error : function(status) {
					console.log("saving to DB failed: ", status);
				}
			});
		};
		this.watchControls = function() {
			if (!this.isReady() && $('#sp_controls').length == 0)
				return;
			t = player.getCurrentTime();
			disableAddInt = false;
			for ( i = 0; i <= meta.intervals.length - 2; i = i + 2) {
				if (t >= meta.intervals[i] && t <= meta.intervals[i + 1]) {
					disableAddInt = true;
					break;
				}
			}
			$('#add-interval').button("option", "disabled", disableAddInt);
		};
		this.watchPlayback = function() {
			if (!this.isReady() || this.isInEditionMode())
				return;
			t = player.getCurrentTime();
			//console.log(player.getPlayerState(), player.getCurrentTime(), intervalIndex, meta.intervals[intervalIndex]);
			if (intervalIndex == -2 || (t < meta.duration && t >= meta.intervals[intervalIndex + 1])) {
				if (intervalIndex + 2 < meta.intervals.length) {
					// next interval
					intervalIndex += 2;
					player.playVideo();
					// Avoid resetting the playback to 0
					if (meta.intervals[intervalIndex] > 0) {
						player.seekTo(meta.intervals[intervalIndex], true);
					}
				} else {
					// If playing a playlist seek to the end.
					if (Util.getURLparam('list', location.href)) {
						player.seekTo(meta.duration);
					} else {
						// Back to the beginning
						player.playVideo();
						player.seekTo(meta.intervals[0]);
					}
				}
			}
			if (( vid = Util.getURLparam('v', player.getVideoUrl())) && vid != this.getID()) {
				player.pauseVideo();
				this.setEditionMode(false);
				this.init(vid);
			}
		};
		this.init();
		// initialize the timer
		timer.add(this, this.watchControls);
		timer.add(this, this.watchPlayback);
		timer.run();
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
		}
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
		return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(stack)||[,""])[1].replace(/\+/g, '%20')) || null;
	};
	return u;
})();

// Run the app
yt = new YouTube(new Timer());
