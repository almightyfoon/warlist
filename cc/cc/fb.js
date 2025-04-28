//define(['facebook'], function(){



/*
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
*/
  

  window.fbAsyncInit = function() {

    window.fbOb = FB;


    // fixme?
    // FB.init({
    //   appId      : '1825213381039783',
    //   cookie     : true,  // enable cookies to allow the server to access 
    //                       // the session
    //   xfbml      : true,  // parse social plugins on this page
    //   version    : 'v2.8' // use graph api version 2.8
    // });  



    // FB.init({
    //     appId      : '1825213381039783',
    //     xfbml      : true,
    //     cookie     : true,  
    //     version    : 'v2.5' 
    // });


    FB.Event.subscribe('auth.login', function(response) {
        statusChangeCallback(response);
    });


    // console.log("About to getLoginStatus");

    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    }, true);
    
}


function _fb_ajaxPost(url, callback, arg) {
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

// This function is called when someone finishes with the Login
// Button.  See the onlogin handler attached to it in the sample
// code below.
function checkLoginState() {
  //console.log("checkLoginState?");
  FB.getLoginStatus(function (response) {
    statusChangeCallback(response);
  }, true);
}


function statusChangeCallback(response) {
  // console.log('statusChangeCallback');
  // console.log(response);

  require(['cc/ccmain'], function(cc) {  
	//console.log(cc);	  
  

  // The response object is returned with a status field that lets the
  // app know the current login status of the person.
  // Full docs on the response object can be found in the documentation
  // for FB.getLoginStatus().
  if (response.status === 'connected') {
    //googleSignOutQuiet();

    // Logged into your app and Facebook.
    testAPI();

    //console.log("Attempting post.");
    window._idToken = response.authResponse.accessToken;
    //console.log(window._idToken);

    _fb_ajaxPost("https://conflictchamber.com/x.php", gotFacebookPost,
      "type=fb&arg=" + encodeURIComponent(response.authResponse.accessToken));
    //} else if (response.status === 'not_authorized') {
    // The person is logged into Facebook, but not your app.
    //document.getElementById('status').innerHTML = 'Please log ' +
    //'into this app.';
  } else {

    if (window._loginType == 'fb') {

      document.getElementById("userDetails").style.display = "none";
      document.getElementById("loginholder").style.display = "";

      window._idToken = null;
      window._loginType = null;

	    //console.log(cc);	  
	  
    }
    // The person is not logged into Facebook, so we're not sure if
    // they are logged into this app or not.
    //document.getElementById('status').innerHTML = 'Please log ' +
    //'into Facebook.';
  }

  });
}



function testAPI() {
  //console.log("testAPI");

  //console.log('Welcome!  Fetching your information.... ');
  FB.api('/me?fields=picture', function (response) {
    if (response && response.picture && response.picture.data) {
      document.getElementById("userPic").src =
        response.picture.data.url;
    }
    // console.log(response);
    // console.log('Successful login for: ' + response.name);
    // document.getElementById('status').innerHTML =
    //   'Thanks for logging in, ' + response.name + '!';
  });
}


function gotFacebookPost(resp) {
  //console.log("gotFacebookPost");
  //console.log(resp);

	if (window._loginType != null) {
		require(["cc/" + window._loginType], function (lo) {
			if (lo) {
				lo.signOutQuiet();
			}
		});
	}	  


	window._loginType = 'fb';

	//console.log(cc);	  
	

	document.getElementById("userDetails").style.display = "";
	document.getElementById("loginicon").innerText = "\uea91";
	document.getElementById("loginholder").style.display = "none";

	  //document.getElementById("userPic").src = _profile.getImageUrl();

  	window._loadStoredData(resp, window._loginType, window._idToken); 

//});
}



//return { 
function FBsignOut() {
  //console.log("Attempting facebook signout");

  FB.logout(function (response) {
    //console.log("Logged out of Facebook");
    document.getElementById("userDetails").style.display = "none";
    document.getElementById("loginholder").style.display = "";

    window._idToken = null;
    window._loginType = null;
  });

  //});
}

window.fbSignOut = FBsignOut;


//,

//checkLogin : function() {
function checkLogin() {
  console.log("Facebook checkLogin");
  FB.getLoginStatus(function (response) {
    statusChangeCallback(response);
  }, true);

}

//,

//getInfo : function() {
function getInfo() {
  console.log("getInfo called");

  FB.api("/50164954847", function(resp) { console.log(resp); });
}

//, 

//signOutQuiet : function () {
function signOutQuiet() {
  //console.log("Attempting facebook signout");

  FB.logout(function (response) {
    //console.log("Logged out of Facebook");
    //document.getElementById("userDetails").style.display = "none";
    //_idToken = null;
    //_loginType = null;
  });
} 

// return {
//   "signOut" : FBsignOut,
//   "signOutQuiet" : signOutQuiet,
//   "getInfo" : getInfo,
//   "checkLogin" : checkLogin,
// };


// });
