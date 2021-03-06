/* 
Copyright 2013, BroadSoft, Inc.

Licensed under the Apache License,Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
 
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "ASIS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

var MODULE = "dotabs.js";
 
// Google OAuth stuff for contacts API
var oauth = ChromeExOAuth.initBackgroundPage({
	'request_url' : 'https://www.google.com/accounts/OAuthGetRequestToken',
	'authorize_url' : 'https://www.google.com/accounts/OAuthAuthorizeToken',
	'access_url' : 'https://www.google.com/accounts/OAuthGetAccessToken',
	'consumer_key' : 'anonymous',
	'consumer_secret' : 'anonymous',
	'scope' : 'http://www.google.com/m8/feeds/',
	'app_name' : 'BroadSoft Xtended Dialer for Google Chrome'
});

oauth.authorize(function() {
});

// retrieve stored name
$("#name").text(localStorage["name"]);


function formatTimestamp(timestamp) {
	var today = new Date();
	var dt = new Date(timestamp);
	if (today.getDay() == dt.getDay() && today.getMonth() == dt.getMonth() && today.getFullYear() == dt.getFullYear()) {
		var hours = dt.getHours();
		var minutes = dt.getMinutes();
		var ampm = hours >= 12 ? 'pm' : 'am';
		hours = hours % 12;
		hours = hours ? hours : 12;
		return hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + " " + ampm;
	}
	return dt.getMonth() + "/" + dt.getDay() + "/" + dt.getFullYear();
}

// Event Listeners
// call history
$("#calllogentries").disableSelection();
$("#calllogentries").on("dblclick", "tr", function(e) {
	e.preventDefault();
	var number = $(this).attr("id").replace(/calllogentry.*_/g, "");
	XSIACTIONS.API.call(number);
});

// dialer
$("#destination").autocomplete({
	minLength : 2,
	source : function(request, response) {
		var suggestions = [];
		var contacts = XSIACTIONS.API.searchEnterpriseDirectory(request.term);
		$(contacts).find("directoryDetails").each(function() {
			var name = $(this).find("firstName").text() + " " + $(this).find("lastName").text();
			var number = $(this).find("number").text();
			var mobile = $(this).find("mobile").text();
			if (number != "") {
				suggestions.push({
					value : number,
					label : name + " (work: " + number + ")"
				});
			}
			if (mobile != "") {
				suggestions.push({
					value : mobile,
					label : name + " (mobile: " + mobile + ")"
				});
			}
		});

		var url = "https://www.google.com/m8/feeds/contacts/default/full";
		var params = {
			"parameters" : {
				"v" : "3.0",
				"q" : request.term,
				"max-results" : 50
			}
		};
		oauth.sendSignedRequest(url, function(text, xhr) {
			$(text).find("entry").each(function() {
				var title = $(this).find("title").text();
				if (title == "") {
					title = "Unknown";
				}
				$(this).find("gd\\:phoneNumber").each(function() {
					var number = $(this).text();
					var type = $(this).attr("rel").replace("http://schemas.google.com/g/2005#", "");
					suggestions.push({
						value : number,
						label : title + " (" + type + ": " + number + ")"
					});
				});
			});
			response(suggestions);
		}, params);
	}
});
$("#destination").keyup(function(e) {
	if (e.keyCode == 13) {
		try {
			var number = $("#destination").val();
			var re = new RegExp();
			re.compile("((([2-9][0-8][0-9])|([\(][2-9][0-8][0-9][\)]))(.|-| )?([2-9][0-9]{2})(.|-| )?([0-9]{4}))");
			var tokens = number.match(re);
			LOGGER.API.log(MODULE,"number:" + number + " tokens:" + tokens);
			if (tokens) {
				XSIACTIONS.API.call(tokens[0]);
			}
		} catch (error) {
			LOGGER.API.error(MODULE,error.message);
		}
		$("#destination").val("");
	}
});

// signout
document.querySelector('#signout').addEventListener('click', signout);

// about
document.querySelector('#about_link_tabs').addEventListener('click', showAboutBox);

// Click to dial checkbox
document.querySelector('#clicktodialbox').addEventListener('click', function() {
	var clicktodial = $("#clicktodialbox").prop("checked");
	localStorage["clicktodial"] = clicktodial;
});

// Notifications checkbox
document.querySelector('#notificationsbox').addEventListener('click', function() {
	var notifications = $("#notificationsbox").prop("checked");
	localStorage["notifications"] = notifications;
	// disable text to speech if notifications are disabled
	if (notifications) {
		$("#texttospeechbox").removeAttr("disabled");
	} else {
		$("#texttospeechbox").attr('disabled', true);
		$("#texttospeechbox").prop('checked', false);
		localStorage["texttospeech"] = "false";
	}
});

// Text to speech checkbox
document.querySelector('#texttospeechbox').addEventListener('click', function() {
	var texttospeech = $("#texttospeechbox").prop("checked");
	localStorage["texttospeech"] = texttospeech;
});

// Do Not disturb button
document.querySelector('#dndbutton').addEventListener('click', function() {
	var dnd = localStorage["dnd"];
	if (dnd == "true") {
		dnd = "false";
	} else {
		dnd = "true";
	}
	try {
		XSIACTIONS.API.setDoNotDisturb(dnd);
	} catch (error) {
		if (textToSpeechEnabled() == "true") {
			chrome.tts.speak('An error occured saving your DND settings.');
			LOGGER.API.error(MODULE,error.message);
		}
	}
});

// CFA button
document.querySelector('#cfabutton').addEventListener('click', function() {
	var cfa = localStorage["cfa"];
	if (cfa == "true") {
		cfa = "false";
	} else {
		cfa = "true";
	}
	try {
		XSIACTIONS.API.setCallForwardAlways(cfa);
	} catch (error) {
		if (textToSpeechEnabled() == "true") {
			chrome.tts.speak('An error occured saving your Call Forwarding Always settings.');
			LOGGER.API.error(MODULE,error.message);
		}
	}
});
// Remote Office button
document.querySelector('#robutton').addEventListener('click', function() {
	var ro = localStorage["ro"];
	if (ro == "true") {
		ro = "false";
	} else {
		ro = "true";
	}
	try {
		XSIACTIONS.API.setRemoteOffice(ro);
	} catch (error) {
		if (textToSpeechEnabled() == "true") {
			chrome.tts.speak('An error occured saving your Remote Office settings.');
			LOGGER.API.error(MODULE,error.message);
		}
	}
});

// hangup button
document.querySelector('#hangupbutton').addEventListener("click", function() {
	XSIACTIONS.API.hangup(localStorage["callId"]);
});

// hold button
document.querySelector('#holdbutton').addEventListener("click", function() {
	if (localStorage["callHold"] == "true") {
		XSIACTIONS.API.talk(localStorage["callId"]);
	} else {
		XSIACTIONS.API.hold(localStorage["callId"]);
	}
});

function signout() {
	localStorage["url"] = "";
	localStorage["username"] = "";
	localStorage["password"] = "";
	localStorage["name"] = "";
	localStorage["cfa"] = "";
	localStorage["ro"] = "";
	localStorage["dnd"] = "";
	localStorage["clicktodial"] = "";
	localStorage["notifications"] = "";
	localStorage["texttospeech"] = "";
	localStorage["dnd"] = "";
	localStorage["currentTab"] = "";
	localStorage["connectionStatus"] = "signedOut";
	$("#url").val("");
	$("#username").val("");
	$("#password").val("");
	$("#status").text("");
	top.location.assign("options.html");
}

var services = {
	dnd : {
		buttonId : "#dndbutton",
		activeImage : "images/dnd_active.png",
		normalImage : "images/dnd_normal.png",
		disabledImage : "images/dnd_disabled.png",
		textToSpeech : "Do not disturb is "
	},
	ro : {
		buttonId : "#robutton",
		activeImage : "images/remoteoffice_active.png",
		normalImage : "images/remoteoffice_normal.png",
		disabledImage : "images/remoteoffice_disabled.png",
		textToSpeech : "Remote office is "
	},
	cfa : {
		buttonId : "#cfabutton",
		activeImage : "images/callforward_active.png",
		normalImage : "images/callforward_normal.png",
		disabledImage : "images/callforward_disabled.png",
		textToSpeech : "Call forward always is "
	},
	hold : {
		buttonId : "#holdbutton",
		activeImage : "images/hold_active.png",
		normalImage : "images/hold_normal.png",
		disabledImage : "", // never shown disabled
		textToSpeech : "" // no annoucement
	}
};

function setButtonState(service, value) {
	if (value == "true") {
		$(services[service].buttonId).removeAttr("disabled");
		$(services[service].buttonId).attr("src", services[service].activeImage);
		$(services[service].buttonId).css("background-color", "#F7A300");
	} else if (value == "false") {
		$(services[service].buttonId).removeAttr("disabled");
		$(services[service].buttonId).attr("src", services[service].normalImage);
		$(services[service].buttonId).css("background-color", "transparent");
	} else {
		$(services[service].buttonId).attr("disabled", "disabled");
		$(services[service].buttonId).attr("src", services[service].disabledImage);
		$(services[service].buttonId).css("background-color", "transparent");
	}
}

function announceServiceState(service, value) {
	if (textToSpeechEnabled() == "true") {
		if (value == "true") {
			chrome.tts.speak(services[service].textToSpeech + "on");
		} else if (value == "false") {
			chrome.tts.speak(services[service].textToSpeech + "off");
		} else {
			chrome.tts.speak(services[service].textToSpeech + "unknown");
		}
	}
}

function restoreTabs() {

	// restore Xsi-Actions
	var xsiactions_options = {
		host : localStorage["url"],
		username : localStorage["username"],
		password : localStorage["password"],
	};
	XSIACTIONS.API.init(xsiactions_options);

	// create tabs
	$("#tabs").tabs();

	// add activate(select) event handler for tabs
	$("#tabs").tabs({
		activate : function(event, ui) {
			if (ui.newPanel.attr("id") == "history") {
				localStorage["currentTab"] = "history";
				var callLogs = XSIACTIONS.API.getCallLogs();
				var list = [];
				$(callLogs).find("callLogsEntry").each(function() {
					var name = $(this).find("name").text();
					var number = $(this).find("phoneNumber").text();
					var time = $(this).find("time").text();
					var type = $(this).parent()[0].nodeName;
					list.push({
						name : name,
						number : number,
						time : time,
						type : type
					});
				});
				list.sort(function(a, b) {
					a = new Date(a.time);
					b = new Date(b.time);
					return b.getTime() - a.getTime();
				});
				$("#calllogentries").empty();
				for ( var i = 0; i < list.length; i++) {
					var row = "<tr id='calllogentry" + i + "_" + list[i].number + "'>";
					row = row + "<td><p>" + list[i].name + "</p>" + list[i].number + "</td>";
					row = row + "<td>" + formatTimestamp(list[i].time) + "</td>";
					if (list[i].type == "placed") {
						row = row + "<td><img src='images/history_outgoing_normal.png'/></td>";
					} else if (list[i].type == "received") {
						row = row + "<td><img src='images/history_incoming_normal.png'/></td>";
					} else {
						row = row + "<td><img src='images/history_missed_normal.png'/></td>";
					}
					$("#calllogentries").append(row);
				}
			} else if (ui.newPanel.attr("id") == "dialer") {
				localStorage["currentTab"] = "dialer";
				$('#destination').focus();
			} else if (ui.newPanel.attr("id") == "preferences") {
				localStorage["currentTab"] = "preferences";
			}
		}

	});

	// restore current tab
	var currentTab = localStorage["currentTab"];
	if (currentTab == "dialer") {
		$("#tabs").tabs("option", "active", 0);
		$('#destination').focus();
	} else if (currentTab == "history") {
		$("#tabs").tabs("option", "active", 1);
	} else if (currentTab == "preferences") {
		$("#tabs").tabs("option", "active", 2);
	} else {
		$("#tabs").tabs("option", "active", 0);
		$('#destination').focus();
	}

	// restore service button states
	setButtonState("dnd", localStorage["dnd"]);
	setButtonState("ro", localStorage["ro"]);
	setButtonState("cfa", localStorage["cfa"]);

	// restore call control button states
	if (localStorage["callId"] == "unknown" || localStorage["callId"] == "") {
		$("#hangupbutton").hide();
		$("#holdbutton").hide();
	} else {
		$("#hangupbutton").show();
		$("#holdbutton").show();
		setButtonState("hold", localStorage["callHold"]);
	}

	var clicktodial = localStorage["clicktodial"];
	if (clicktodial == "true") {
		$("#clicktodialbox").prop('checked', true);
	} else {
		$("#clicktodialbox").prop('checked', false);
	}

	var notifications = localStorage["notifications"];
	if (notifications == "true") {
		$("#notificationsbox").prop('checked', true);
		// text to speech is child of notifications. Only enable if
		// notifications is enabled.
		$("#texttospeechbox").removeAttr("disabled");
		var texttospeech = localStorage["texttospeech"];
		if (texttospeech == "true") {
			$("#texttospeechbox").prop('checked', true);
		} else {
			$("#texttospeechbox").prop('checked', false);
		}
	} else {
		$("#notificationsbox").prop('checked', false);
		$("#texttospeechbox").attr('disabled', true);
		$("#texttospeechbox").attr('checked', false);
	}

	if (localStorage["callId"] == "unknown" || localStorage["callId"] == "") {
		$("#hangupbutton").hide();
		$("#holdbutton").hide();
	} else {
		$("#hangupbutton").show();
		$("#holdbutton").show();
	}

	$(window).bind("storage", function(e) {
		LOGGER.API.log(MODULE,"Event received with key: " + e.originalEvent.key);
		if (e.originalEvent.key == "dnd" || e.originalEvent.key == "ro" || e.originalEvent.key == "cfa") {
			setButtonState(e.originalEvent.key, localStorage[e.originalEvent.key]);
			announceServiceState(e.originalEvent.key, e.originalEvent.newValue);
		} else if (e.originalEvent.key == "callId") {
			if (e.originalEvent.newValue == "unknown" || e.originalEvent.newValue == "") {
				$("#hangupbutton").hide();
				$("#holdbutton").hide();
			} else {
				$("#hangupbutton").show();
				$("#holdbutton").show();
			}
		} else if (e.originalEvent.key == "callHold") {
			if (e.originalEvent.newValue == "true") {
				$("#holdbutton").attr("src", "images/hold_active.png");
				$("#holdbutton").css("background-color", "#F7A300");
				$("#holdbutton").attr("title", "Unhold");
			} else {
				$("#holdbutton").attr("src", "images/hold_normal.png");
				$("#holdbutton").css("background-color", "transparent");
				$("#holdbutton").attr("title", "Hold");
			}
		}
	});
}

function textToSpeechEnabled() {
	var texttospeech = localStorage["texttospeech"];
	return texttospeech;
}

function showAboutBox() {
	top.location.assign("about.html");
}

document.addEventListener('DOMContentLoaded', restoreTabs);
