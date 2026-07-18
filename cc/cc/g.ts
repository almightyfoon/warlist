let _userEmail: string | null = null;

function ajaxPost(url: string, callback: (resp: string) => void, body: string, onError?: () => void) {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4) {
            if (xhttp.status == 200) callback(xhttp.responseText);
            else onError?.();
        }
    };
    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(body);
}

function fireLoginCallbacks() {
    const cbs: Function[] = (window as any)._loginCallback ?? [];
    (window as any)._loginCallback = [];
    for (const cb of cbs) cb();
}

function handleCredentialResponse(response: any) {
    const token: string = response.credential;
    const parts = token.split('.');
    if (parts.length < 3) { console.error('Malformed credential token'); return; }
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    (window as any)._idToken    = token;
    (window as any)._loginType  = 'g';
    (window as any)._userEmail  = payload.email;
    _userEmail = payload.email;

    try {
        localStorage.setItem('warlist_auth_email', payload.email);
        localStorage.setItem('warlist_auth_token', token);
        localStorage.setItem('warlist_auth_exp',   String(payload.exp));
        localStorage.setItem('warlist_auth_pic',   payload.picture || '');
    } catch {}

    document.getElementById("userDetails")!.style.display = "";
    document.getElementById("loginholder")!.style.display = "none";
    document.getElementById("loginicon")!.innerText = "";
    (document.getElementById("userPic") as HTMLImageElement).src = payload.picture || '';

    ajaxPost("/x", function (resp) {
        (window as any)._loadStoredData(resp, 'g', token);
    }, "logintype=g&token=" + encodeURIComponent(token),
    () => {
        // /x failed on fresh sign-in — user is still authenticated; fire callbacks so UI updates
        fireLoginCallbacks();
    });
}

export function init() {
    const goog = (window as any).google;
    if (typeof goog === 'undefined' || !goog.accounts) {
        setTimeout(init, 100);
        return;
    }

    goog.accounts.id.initialize({
        client_id: (window as any).WARLIST_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: true,
    });

    const btn = document.getElementById("my-signin2");
    if (btn) {
        goog.accounts.id.renderButton(btn, {
            theme: 'outline',
            size: 'medium',
            type: 'standard',
        });
    }
}

export function restoreSession() {
    let token: string | null, email: string | null, exp: number;
    try {
        token = localStorage.getItem('warlist_auth_token');
        email = localStorage.getItem('warlist_auth_email');
        exp   = parseInt(localStorage.getItem('warlist_auth_exp') ?? '0', 10);
    } catch {
        return;
    }
    if (!token || !email || exp <= Math.floor(Date.now() / 1000)) {
        try {
            localStorage.removeItem('warlist_auth_token');
            localStorage.removeItem('warlist_auth_exp');
            localStorage.removeItem('warlist_auth_pic');
        } catch {}
        return;
    }
    (window as any)._idToken   = token;
    (window as any)._loginType = 'g';
    (window as any)._userEmail = email;
    _userEmail = email;

    const uD = document.getElementById("userDetails");
    const lH = document.getElementById("loginholder");
    if (uD) uD.style.display = "";
    if (lH) lH.style.display = "none";
    const icon = document.getElementById("loginicon");
    if (icon) icon.innerText = "";
    const pic = localStorage.getItem('warlist_auth_pic');
    const userPic = document.getElementById("userPic") as HTMLImageElement | null;
    if (userPic && pic) userPic.src = pic;

    ajaxPost("/x", function (resp) {
        (window as any)._loadStoredData(resp, 'g', token);
    }, "logintype=g&token=" + encodeURIComponent(token),
    () => {
        // /x failed during session restore — stale or invalid token; sign out cleanly
        signOut();
        fireLoginCallbacks();
    });
}

export function signOut() {
    try {
        if ((window as any).google?.accounts?.id) {
            (window as any).google.accounts.id.disableAutoSelect();
        }
    } catch (_) {}
    const uD = document.getElementById("userDetails");
    const lH = document.getElementById("loginholder");
    if (uD) uD.style.display = "none";
    if (lH) lH.style.display = "";
    try {
        localStorage.removeItem('warlist_auth_email');
        localStorage.removeItem('warlist_auth_token');
        localStorage.removeItem('warlist_auth_exp');
        localStorage.removeItem('warlist_auth_pic');
    } catch {}
    (window as any)._idToken   = null;
    (window as any)._loginType = null;
    (window as any)._userEmail = null;
    _userEmail = null;
}

export function signOutQuiet() {
    if (_userEmail && typeof (window as any).google !== 'undefined') {
        (window as any).google.accounts.id.revoke(_userEmail, function () {});
    }
    _userEmail = null;
}
