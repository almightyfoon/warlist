import { ajaxPost } from "./ccstorage";


export function requireLogin(loggedOut : () => void, loggedIn : () => void) : void {

    if( (<any>window)._idToken ) {
        loggedIn();
    }
    else {
        loggedOut();

        if( !(<any>window)._loginCallback ) {
            (<any>window)._loginCallback = [];
        }

        (<any>window)._loginCallback.push(((cb : () => void) => {

            return function() {
                if( (<any>window)._idToken ) {
                    cb();
                }
            };

        })(loggedIn));

    }
    

}

export function authAjax(url : string, postData : string,
        callback : (loggedIn : boolean, s : string) => void) : void {

    // console.log((<any>window)._loginType);
    // console.log((<any>window)._idToken);
    // console.log(postData);

    if( (<any>window)._idToken ) {
        // console.log((<any>window)._loginType);
        // console.log((<any>window)._idToken);

        ajaxPost(url,
            (( cb : (li : boolean, s : string) => void ) => {
                return function(resp : string) {
                    cb && cb(true, resp);
                };

            })(callback),
            (postData ? postData + "&" : "")
            + "logintype=" + encodeURIComponent((<any>window)._loginType)
            + "&token=" + encodeURIComponent((<any>window)._idToken));
    }
    else {
        if( !(<any>window)._loginCallback ) {
            (<any>window)._loginCallback = [];
        }

        (<any>window)._loginCallback.push(((u : string, pd : string,
                cb : (li : boolean, s : string) => void) => {

            return function() {
                if( (<any>window)._idToken ) {
                    // console.log((<any>window)._loginType);
                    // console.log((<any>window)._idToken);

                    ajaxPost(url,
                        (( cbx : (li : boolean, s : string) => void ) => {
                            return function(resp : string) {
                                cbx && cbx(true, resp);
                            };

                        })(cb),
                        (pd ? pd + "&" : "")
                        + "logintype=" + encodeURIComponent((<any>window)._loginType)
                        + "&token=" + encodeURIComponent((<any>window)._idToken));

                }
                else {
                    cb && cb(false, null);
                }

            };

        })(url, postData, callback));

    }
}
