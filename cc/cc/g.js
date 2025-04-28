define(function (require) {
	var renderButton;
	var _profile = null;

	//console.log("Google signin");

	require(['https://apis.google.com/js/platform.js'], function () {


		// window.gapi.signin2.render('my-signin2', {
		// 	'scope': 'https://www.googleapis.com/auth/plus.login',
		// 	'width': 151,
		// 	'height': 25,
		// 	'longtitle': true,
		// 	'theme': 'dark',
		// 	'onsuccess': onSuccess,
		// 	'onfailure': onFailure
		// });

		function _g_ajaxPost(url, callback, arg) {
			let xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function () {
				if (xhttp.readyState == 4 && xhttp.status == 200) {
					callback(xhttp.responseText);
				}
			};
			xhttp.open("POST", url, true);
			xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhttp.send(arg);
		}

		function gotGooglePost(resp) {
			//console.log("gotGooglePost");
			
			require(['cc/ccmain'], function (cc) {
				//console.log("Got post");
				//console.log(resp);

				if (window._loginType != null) {
					require(["cc/" + window._loginType], function (lo) {
						if (lo) {
							lo.signOutQuiet();
						}
					});
				}

				window._loginType = 'g';

				document.getElementById("userDetails").style.display = "";
				document.getElementById("loginholder").style.display = "none";
				document.getElementById("loginicon").innerText = "\uea89";

				document.getElementById("userPic").src = _profile.getImageUrl();

				window._loadStoredData(resp, window._loginType, 
					window._idToken);
			});
		}


		function onSignIn(googleUser) {
			//console.log("Google onSignIn");
			
			require(['cc/ccmain'], function (cc) {

				var profile = googleUser.getBasicProfile();
				_profile = profile;
				//console.log("ID: " + profile.getId()); // Don't send this directly to your server!
				//console.log('Full Name: ' + profile.getName());
				//console.log('Given Name: ' + profile.getGivenName());
				//console.log('Family Name: ' + profile.getFamilyName());
				//console.log("Image URL: " + profile.getImageUrl());
				//console.log("Email: " + profile.getEmail());

				// The ID token you need to pass to your backend:
				var id_token = googleUser.getAuthResponse().id_token;
				window._idToken = id_token;

				//console.log("ID Token: " + id_token);

				_g_ajaxPost("https://conflictchamber.com/x.php", gotGooglePost,
					"type=g&arg=" + encodeURIComponent(id_token));

			});
		}


		function onFailure(error) {
			console.log(error);
		}

		window.gapi.signin2.render('my-signin2', {
			'scope': 'profile email',
			'width': 122,
			'height': 24,
			'longtitle': false,
			'theme': 'dark',
			'onsuccess': onSignIn,
			'onfailure': onFailure
		});

	});

	//console.log("About to return");

	return {
		signOut: function () {
			require(['cc/ccmain'], function (cc) {
				document.getElementById("userDetails").style.display = "none";
				document.getElementById("loginholder").style.display = "";
				_profile = null;
				window._idToken = null;
				window._loginType = null;

				var auth2 = window.gapi.auth2.getAuthInstance();
				auth2.signOut().then(function () { });
			});
		},

		signOutQuiet: function () {
			var auth2 = window.gapi.auth2.getAuthInstance();
			auth2.signOut().then(function () { });
		}
	};

});
