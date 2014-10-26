/**
 * Inject also the player.js script in the context of the page to have full access 
 * to the youtube player methods.
 */
var s = document.createElement('script');
s.src = chrome.extension.getURL('js/player.js');
(document.head||document.documentElement).appendChild(s);
s.onload = function(e) {
	console.log('player.js file loaded..');
	s.parentNode.removeChild(s);
};

/**
 * Load the YT-Smartt comments if they are disabled.
 */
if(jQuery('#comments-view').length == 1){
	console.log('yt comments disabled, loading ytsmartt comments..');
	var s = document.createElement('script');
	s.src = chrome.extension.getURL('js/ytcomments.js');
	(document.head||document.documentElement).appendChild(s);
}