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



