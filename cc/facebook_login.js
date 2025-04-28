// This is called with the results from from FB.getLoginStatus().
function statusChangeCallback(response) {
  //console.log('statusChangeCallback');
  //console.log(response);

  // The response object is returned with a status field that lets the
  // app know the current login status of the person.
  // Full docs on the response object can be found in the documentation
  // for FB.getLoginStatus().
  if (response.status === 'connected') {
    googleSignOutQuiet();
    // Logged into your app and Facebook.
    testAPI();

    //console.log("Attempting post.");
    _idToken = response.authResponse.accessToken;

    ajaxPost("CC_SURL/x.php", gotFacebookPost,
      "type=fb&arg=" + encodeURIComponent(response.authResponse.accessToken));
    //} else if (response.status === 'not_authorized') {
    // The person is logged into Facebook, but not your app.
    //document.getElementById('status').innerHTML = 'Please log ' +
    //'into this app.';
  } else {

    if (_loginType == 'fb') {
      document.getElementById("userDetails").style.display = "none";
      document.getElementById("loginholder").style.display = "";

      _idToken = null;
      _loginType = null;
    }
    // The person is not logged into Facebook, so we're not sure if
    // they are logged into this app or not.
    //document.getElementById('status').innerHTML = 'Please log ' +
    //'into Facebook.';
  }
}

// This function is called when someone finishes with the Login
// Button.  See the onlogin handler attached to it in the sample
// code below.
function checkLoginState() {
  console.log("checkLoginState?");
  FB.getLoginStatus(function (response) {
    statusChangeCallback(response);
  });
}

//   window.fbAsyncInit = function() {
//   FB.init({
//     appId      : '1825213381039783',
//     cookie     : true,  // enable cookies to allow the server to access 
//                         // the session
//     xfbml      : true,  // parse social plugins on this page
//     version    : 'v2.5' // use graph api version 2.5
//   });

//   // Now that we've initialized the JavaScript SDK, we call 
//   // FB.getLoginStatus().  This function gets the state of the
//   // person visiting this page and can return one of three states to
//   // the callback you provide.  They can be:
//   //
//   // 1. Logged into your app ('connected')
//   // 2. Logged into Facebook, but not your app ('not_authorized')
//   // 3. Not logged into Facebook and can't tell if they are logged into
//   //    your app or not.
//   //
//   // These three cases are handled in the callback function.

//   FB.getLoginStatus(function(response) {
//     statusChangeCallback(response);
//   });

//   };

//   // Load the SDK asynchronously
//   (function(d, s, id) {
//     var js, fjs = d.getElementsByTagName(s)[0];
//     if (d.getElementById(id)) return;
//     js = d.createElement(s); js.id = id;
//     js.src = "//connect.facebook.net/en_US/sdk.js";
//     fjs.parentNode.insertBefore(js, fjs);
//   }(document, 'script', 'facebook-jssdk'));

// Here we run a very simple test of the Graph API after login is
// successful.  See statusChangeCallback() for when this call is made.
function testAPI() {
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
  // console.log("gotFacebookPost");
  // console.log(resp);

  _loginType = 'fb';

  document.getElementById("userDetails").style.display = "";
  document.getElementById("loginholder").style.display = "none";

  //document.getElementById("userPic").src = _profile.getImageUrl();

  loadStoredData(resp);
}

function facebookSignOut() {
  //console.log("Attempting facebook signout");

  FB.logout(function (response) {
    //console.log("Logged out of Facebook");
    document.getElementById("userDetails").style.display = "none";
    document.getElementById("loginholder").style.display = "";

    _idToken = null;
    _loginType = null;
  });
}

function facebookSignOutQuiet() {
  //console.log("Attempting facebook signout");

  FB.logout(function (response) {
    //console.log("Logged out of Facebook");
    //document.getElementById("userDetails").style.display = "none";
    //_idToken = null;
    //_loginType = null;
  });
}  