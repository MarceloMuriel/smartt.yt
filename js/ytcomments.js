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

comments = document.getElementById('watch-discussion');
comments.id = 'ytsmartt';
while (comments.firstChild) {
    comments.removeChild(comments.firstChild);
}
console.log(comments);

/**
 * Load pusher.js
 */
var s = document.createElement('script');
s.src = '//js.pusher.com/2.2/pusher.min.js';
(document.head||document.documentElement).appendChild(s);
s.onload = function(e) {
	console.log('pusher.js loaded');
	s.parentNode.removeChild(s);
	
	var pusher = new Pusher('415c1dd7ebe39d37a685');
	var channel = pusher.subscribe('ytsmartt');
	channel.bind('new-comment', function(data) {
	  alert('An event was triggered with message: ' + data.message);
	});	
};



