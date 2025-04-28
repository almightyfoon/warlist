var _profile = null;

function onSignIn(googleUser) {
    // Useful data for your client-side scripts:

    if (_loginType == 'fb') {
        facebookSignOutQuiet();
    }


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
    _idToken = id_token;

    //console.log("ID Token: " + id_token);

    ajaxPost("CC_SURL/x.php", gotGooglePost,
        "type=g&arg=" + encodeURIComponent(id_token));
};

function gotGooglePost(resp) {
    //console.log("Got post");
    //console.log(resp);

    _loginType = 'g';

    document.getElementById("userDetails").style.display = "";
    document.getElementById("userPic").src = _profile.getImageUrl();

    loadStoredData(resp);
}

function onSignOut() {
    document.getElementById("userDetails").style.display = "none";
    _profile = null;
    _idToken = null;
    _loginType = null;
}

function googleSignOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(onSignOut);
}

function googleSignOutQuiet() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () { });
}


// function onSuccess(googleUser) {
//   console.log('Logged in as: ' + googleUser.getBasicProfile().getName());
// }

function onFailure(error) {
    console.log(error);
}

function renderButton() {
    gapi.signin2.render('my-signin2', {
        'scope': 'profile email',
        'width': 122,
        'height': 25,
        'longtitle': false,
        'theme': 'dark',
        'onsuccess': onSignIn,
        'onfailure': onFailure
    });
}                    
