/**
 * Inject also the player.js script in the context of the page to have full access 
 * to the youtube player methods.
 */
var s = document.createElement('script');
s.src = chrome.extension.getURL('js/player.js');
(document.head||document.documentElement).appendChild(s);
s.onload = function(e) {
	console.log('player.js loaded..');
	s.parentNode.removeChild(s);
};