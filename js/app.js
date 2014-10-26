/**
 * Created on Jun 24, 2013. Copyright 2014 Hugo Muriel Arriaran; GPL License v2.
 * 
 * https://smartt.yt
 * 
 * app.js is the delegate to handle user configurations using a panel and a
 * contextual menu.
 */

var app = {
	init : function(callback) {
		chrome.tabs.query({
			currentWindow : true,
			active : true
		}, function(tabs) {
			callback({
				isYouTube : tabs.length > 0
						&& /https?:\/\/www.youtube.com\/.*/i.test(tabs[0].url),
				videoID : (function() {
					return (v = /.*v=(.{11})/ig.exec(tabs[0].url)) != null ? v
							.pop() : null;
				})()
			});
		});
	},
};

document
		.addEventListener(
				'DOMContentLoaded',
				function() {
					app
							.init(function(yt) {
								if (yt.isYouTube) {
									// TODO: render the view with controls
								} else {
									jQuery('#notifications')
											.empty()
											.append(
													'<div class="notification">This only works on YouTube.com</div>');
								}
							});
				});
