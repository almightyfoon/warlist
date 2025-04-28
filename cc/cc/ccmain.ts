
import * as ccweb from "../ccweb/ccweb";
import * as ccapi from "../ccapi/ccapi";

import { loadStoredData, saveListInternal, openListInternal } from "./ccstorage";
import { showEvent, api } from "./cctourn";
import { MainFlow } from "./mainflow";
import { authAjax } from "./cclogin";


import { submitTournament, showATC, showTournaments,
    cleanupTournament, showDGIList } from "./ccsubtourn";

(<any>window)._loadStoredData = loadStoredData;

let _mainFlow : MainFlow = null;
let _editor: ccweb.Editor = null;
let _restoreFocus : HTMLElement = null;

export function setMainFocus(foc : HTMLElement) {
    _restoreFocus = foc;
}

function restoreFocus() {
    if( _restoreFocus ) {
        _restoreFocus.focus();
    }
}

function queryParameter(name : string, url?: string) : string {
    if( !url ) {
        url = window.location.href;
    }

    name = name.replace(/[\[\]]/g, "\\$&");

    let regex : RegExp = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)")
    let results : RegExpExecArray = regex.exec(url);

    if (!results) {
        return null;
    }

    if (!results[2]) {
        return "";
    }

    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function removeHash() {
    window.history.pushState("", document.title, window.location.pathname);
}

function route(search : string, skipHistory: boolean) : boolean {
    if( queryParameter("tournaments", search) != null ) {
        showTournaments(skipHistory);
        return true;
    }
    else if( queryParameter("atclists", search) != null ) {
        showATC(skipHistory);
        return true;
    }
    else if( queryParameter("submit", search) != null ) {
        submitTournament(skipHistory, true);
        return true;
    }
    else if( queryParameter("postevent", search) != null ) {
        submitTournament(skipHistory, false);
        return true;
    }
    else if( queryParameter("news", search) != null ) {
        showBlog(skipHistory);
        return true;
    }
    else if( queryParameter("dgilist", search) != null ) {
        showDGIList(skipHistory);
        return true;
    }
    else if ( queryParameter("event", search) != null) {
        let eid : number = parseInt(queryParameter("event", search));

        let regCode : string = queryParameter("regcode", search);

        if( !isNaN(eid) ) {
            showEvent(eid, skipHistory, regCode);
        }

        return true;
    }

    return false;
}

function resizeWindow() : void {
    let flow : ccweb.Flow = ccweb.Flow._activeFlow;
    let topBarMode : boolean = false;
    let emblemLeft : string = "";

    if( flow && flow.visible() ) {
        let gap : number = document.body.clientWidth - flow.container.offsetWidth;

        // Extra space to display current flow

        if( gap > 400 ) {
            // More than enough to fit the emblem menu
            // keep flow centered
            flow.container.style.marginLeft = "auto";
            flow.container.style.marginRight = "auto";
            flow.container.style.zoom = "";
            topBarMode = false;
        }
        else if( gap > 200 ) {
            // Can display emblem menu, but need to
            // push the flow off-center to fit everything
            flow.container.style.marginLeft = "200px";
            flow.container.style.marginRight = "0px";
            flow.container.style.zoom = "";
            topBarMode = false;
        }
        else if( gap < 0 ) {
            // Window is smaller than the flow, so shrink
            // the flow (and show top bar)
            flow.container.style.marginLeft = "0px";
            flow.container.style.marginRight = "0px";
            flow.container.style.zoom = "" + 
                (document.body.clientWidth / flow.container.offsetWidth);
            topBarMode = true;
        }
        else {
            // Window is larger than the flow but too small to show
            // the emblem menu, so use the top bar
            flow.container.style.marginLeft = "auto";
            flow.container.style.marginRight = "auto";
            flow.container.style.zoom = "";
            topBarMode = true;
        }

        if( !topBarMode ) {
            emblemLeft = "" + (flow.container.offsetLeft - 180) + "px";
        }
    }
    else if( _editor && _editor.visible() ) {
        _editor.windowResized();

        let rect : DOMRect | ClientRect = _editor.armyListHolder.getBoundingClientRect();

        if( window.innerWidth - rect.right > 195 ) {
            topBarMode = false;
            emblemLeft = "" + (rect.right + 25) + "px";
        }
        else {
            topBarMode = true;
        }
    }

    document.getElementById("cctop").style.display = topBarMode ? "inline-block" : "none";


    if( !_emblemDialogShown ) {
        _emblemMenu.style.display = topBarMode ? "none" : "inline-block";
        
        if( !topBarMode && _emblemMenu.parentElement != document.body ) {
            document.body.appendChild(_emblemMenu);
            _emblemMenu.className = "conflictchamber";
        }

        if( !topBarMode ) {
            _emblemMenu.style.left = emblemLeft;

            if( !_emblemInitialized ) {
                initializeEmblem();
            }
        }
    }

    let userPanel : HTMLElement = document.getElementById("userpanel");

    if( topBarMode ) {
        document.body.style.setProperty("--topbar-margin", "26px");
    }
    else {
        document.body.style.setProperty("--topbar-margin", "0px");
    }


    ccweb.CardViewer.windowResized();
}

function hideEmblemDialog() : void {
    if( ccweb.Dialog.active() ) {
        ccweb.Dialog.active().close();
    }

    _emblemDialogShown = false;
    resizeWindow();
}


function initializeEmblem() : void {
    _emblemInitialized = true;

    document.getElementById("emblem").onclick = quitToMain;

    let userPanel : HTMLElement = document.getElementById("emblemuserholder");

    _emblemMenu.insertBefore(new ccweb.Button({
        text: "Build a List!",
        size: "mediumfixed",
        click: () => { 
            hideEmblemDialog();
            defaultEditor().show(true);
        }
    }).container, userPanel);

    _emblemMenu.appendChild(new ccweb.Button({
        text: "Tournament Results",
        size: "mediumfixed",
        className: "trbutton",
        click: () => { 
            hideEmblemDialog();
            window.open("http://discountgamesinc.com/tournaments", "_blank"); 
        }
    }).container);


    _emblemMenu.appendChild(new ccweb.Button({
        text: "Post Event",
        size: "mediumfixed",
        click: () => { 
            hideEmblemDialog();
            submitTournament(false, false); 
        }
    }).container);

    let theme : ccweb.UIElement = new ccweb.UIElement("themesel");

    let sp : HTMLSpanElement = document.createElement("span");
    sp.appendChild(document.createTextNode("Theme:"));
    theme.add(sp);    

    theme.add(new ccweb.Button({
        text: "Light",
        size: "small",
        click: () => { lightTheme(); }
    }));

    theme.add(new ccweb.Button({
        text: "Dark",
        size: "small",
        click: () => { darkTheme(); }
    }));

    _emblemMenu.appendChild(theme.container);

    let loginOptions : HTMLElement = document.getElementById("loginoptions");

    loginOptions.appendChild(new ccweb.Button({
        text: "Load List",
        size: "small",
        click: openList
    }).container);
    
    loginOptions.appendChild(new ccweb.Button({
        text: "Save List",
        size: "small",
        click: saveList
    }).container);
    
    loginOptions.appendChild(new ccweb.Button({
        text: "Sign Out",
        size: "small",
        click: signOut
    }).container);


    let kofi : HTMLDivElement = document.createElement("div");
    kofi.className = "kofiholder";

    kofi.innerHTML = (<any>window).kofihtml;

    _emblemMenu.appendChild(kofi);
    
}

// defined in index.html
declare function setLightTheme() : void;
declare function setDarkTheme() : void;

function lightTheme() : void {
    //document.body.className = "";
    setLightTheme();
    localStorage.setItem("cctheme", "light");
}

function darkTheme() : void {
    setDarkTheme();
    //document.body.className = "ccdark";
    localStorage.setItem("cctheme", "dark");
}

let _emblemInitialized : boolean = false;
let _emblemDialogShown : boolean = false;

function clickMainMenu() : void {
    if( ccweb.Dialog.active() ) {
        return;
    }

    let dlg: ccweb.Dialog = new ccweb.Dialog(() =>{
            _emblemDialogShown = false;
            resizeWindow();
        }, 
        "Menu", 
        "menu", "emblemdialogholder");

    if( !_emblemInitialized ) {
        initializeEmblem();
    }

    dlg.card.content.appendChild(_emblemMenu);
    _emblemMenu.className = "conflictchamber emblemdialog";
    _emblemMenu.style.display = "inline-block";
    _emblemMenu.style.left = "0px";

    dlg.show();

    _emblemDialogShown = true;
}

let _emblemMenu : HTMLElement;

export function loadBody() : void {
    ccweb.Flow.showCallback = (flow : ccweb.Flow) => {
        resizeWindow();
    };

    authAjax(api("/cdn"), null, (loggedIn : boolean, s : string) => {
        //console.log("Got back from cdn: " + s);

        if( s != "false" && s != "null" ) {
            ccweb.CardViewer.cdn = s;
        }
    });

    _emblemMenu = document.getElementById("emblemmenu");

    document.getElementById("ccgearsbutton").onclick = clickMainMenu;
    document.getElementById("ccmenubutton").onclick = clickMainMenu;
    
    document.body.onfocus = restoreFocus;

    document.onkeydown = keyPress;

    window.onresize = resizeWindow;

    window.onpopstate = onPopState;

    ccapi.loadData(null);

    // Fix Facebook bullshit


    let search : string = window.location.search;

    //console.log("Search string: " + search);

    let fbStart = search.indexOf("fbclid=");
    let fbParanoid = search.indexOf("&fbclid=");

    if( fbParanoid >= 0 && fbParanoid == fbStart - 1) {
        fbStart = fbParanoid;
    }

    if( fbStart != -1 ) {
        let fbEnd = search.indexOf("&", fbStart + 1);

        if( fbEnd == -1 ) {
            search = search.substr(0, fbStart);
        }
        else {
            search = search.substr(0, fbStart) + search.substr(fbEnd + 1);
        }

    }

    if( search == "?" ) {
        search = null;
    }

    let routeGood : boolean = false;

    //console.log(search);

    if( search != null && search != "" )
    {
        routeGood = route(search, false);
    }

    //console.log(routeGood);


    let hash : string = window.location.hash;


    if( !routeGood && search != null && search != "" ) {
        hash = search;
    }

    //console.log("Using hash: " + hash);


    if (!routeGood && hash != null &&hash.length > 1) {
        if( hash == "#atclists"
                || hash == "/#atclists" ) {
            removeHash();
            showATC();
        }
        else if( hash.substring(1, 2) == "a" ||
                hash.substring(1,2) == "b" ||
                hash.substring(1,2) == "c"
                ) {

            let code : string = hash.substring(1);

            //console.log("Loading code " + code);

            document.title = "Conflict Chamber | Editor";
            window.history.replaceState({}, "Conflict Chamber | Editor", "/");
            showEditor(code, true);
        }
        else if( window.location.hash.substring(1,2) == "p" )
        {
            let code : string = "c" + window.location.hash.substring(2);
            document.title = "Conflict Chamber | Editor";
            window.history.replaceState({}, "Conflict Chamber | Editor", "/");
            showEditor(code, true);
            ccweb.Editor.printList(code);
        }
        else if( hash == "#tournaments"
                || hash == "/#tournaments") {
            removeHash();
            showTournaments();
        }
        else if( hash == "#news"
                || hash == "/#news" ) {
            removeHash();
            showBlog();
        }
        else if( hash == "#submit"
                || hash == "/#submit" ) {
            removeHash();
            submitTournament(false, true);
        }
    }
    else if( !routeGood ) {
        showEditor(null, true);
    }

    ccweb.ajax("https://conflictchamber.com/fbnews.php", gotFBNews);



    resizeWindow();
    //require(["cc/fb"], function(fb : any) { fb.checkLogin(); });
}

export function defaultEditor() : ccweb.Editor {
    if( _editor == null ) {
        _editor = new ccweb.Editor(
            quitToMain,
            -1,
            onListUpdate,
            null,
            ccweb.Editor.defaultRules
        );
    }

    return _editor;
}

function mainFactionSelectionCallback(fid : number, rules : ccapi.Rules, 
    fs : ccweb.FactionSelection) : void 
{
    ccweb.Flow.hideFlows();
    
    _editor = new ccweb.Editor(
        quitToMain,
        fid,
        onListUpdate,
        null,
        rules
    );

    _editor.show();

    resizeWindow();
}

function postFBNews(fbnews : HTMLDivElement, post : any) {
    let fbid : string = post[1];
    let loc : number = fbid.indexOf('_');

    if( loc == -1 ) {
        return;
    }

    let pageid : string = fbid.substr(0, loc);
    let postid : string = fbid.substr(loc + 1);

    let url : string = "https://www.facebook.com/" + pageid +
        "/posts/" + postid + "&width=576";

    let fbpost : HTMLDivElement = document.createElement("div");
    fbpost.className = "fb-post";
    fbpost.setAttribute("data-href", url);
    fbpost.setAttribute("data-width", "576");

    fbnews.appendChild(fbpost);
}

let _storedFBNews : string = null;

function gotFBNews(s : string) : void {
    let fbnews : HTMLDivElement =
        <HTMLDivElement>document.getElementById("fbnews");

    if( fbnews == null ) {
        _storedFBNews = s;
        return;
    }

    while( fbnews.hasChildNodes() ) {
        fbnews.removeChild(fbnews.lastChild);
    }


    let data : any[][] = null;

    try {
        data = JSON.parse(s);
    }
    catch(err )
    {
        fbnews.appendChild(document.createTextNode("Unable to load news"));
        return;
    }

    for( let i : number = 0; i < data.length && i < 7; i++ ) {
        postFBNews(fbnews, data[i]);
    }

    // facebook load more
    
    // if( false && data.length >= 7 ) {
    //     let loadMore : HTMLDivElement = document.createElement("div");
    //     loadMore.className = "lb bh fbloadmore";

    //     loadMore.onclick = ((holder : HTMLDivElement, button : HTMLDivElement, fbPosts : any) => {

    //         return () => {
    //             holder.removeChild(button);

    //             for( let i : number = 7; i < fbPosts.length; i++ ) {
    //                 postFBNews(holder, fbPosts[i]);
    //             }

	//             (<any>window).fbOb.XFBML.parse();
    //         };

    //     })(fbnews, loadMore, data);

    //     fbnews.appendChild(loadMore);

    // }


	(<any>window).fbOb.XFBML.parse();
}



export function hideAll(skipHistory? : boolean): void {
    //document.getElementById("mainMenu").style.display = "none";
    //document.getElementById("blog").style.display = "none";
    //document.getElementById("tournaments").style.display = "none";
    //document.getElementById("tournament_submission").style.display = "none";

    ccweb.Flow.hideFlows();

    let dgitourn : HTMLElement = document.getElementById("dgitourn");

    if( dgitourn ) {
        dgitourn.style.display = "none";
    }

    cleanupTournament();

    if (_editor) {
        _editor.hide();
    }

    ccweb.CardViewer.hide();
}

function showBlog(skipHistory? : boolean): void {
    hideAll();

    manageHistory("Updates", "news", skipHistory);


	document.getElementById("blog").innerHTML = `<div id="fbnews">
				<div class="loadholder">
					<span class="loadspinner"></span>
					<span class="loadtext">Loading update history...</span>
				</div>
			</div>`;


    document.getElementById("blog").style.display = "";
    setMainFocus(document.getElementById("blog"));
    ccweb.ajax("https://conflictchamber.com/blog.php", gotBlog);
}

function onListUpdate(ccode : string) : void {
    document.title = "Conflict Chamber | Editor";
    window.history.replaceState(
        {"ccode" : ccode}, 
        "Conflict Chamber | Editor", 
        "?" + ccode);

    resizeWindow();
}


export function manageHistory(title : string, search : string, skipHistory : boolean) {
    document.title = "Conflict Chamber | " + title;

    if( skipHistory ) {

    }
    else if( title == "Editor" ) {
        window.history.pushState({"ccode" : search}, "Conflict Chamber | " + title, "/");
    }
    else {
	    window.history.pushState({"search" : search}, "Conflict Chamber | " + title, "?" + search);
    }
}

function onPopState(event : PopStateEvent) : void {
    if( event.state && event.state.search ) {
        route("?" + event.state.search, true);
    }
    else if( event.state && event.state.ccode ) {
        document.title = "Conflict Chamber | Editor";
        showEditor(event.state.ccode, true);
    }
    else {
        document.title = "Conflict Chamber | Main";
        showEditor(null, true);
    }
}

let _myEventsHolder : HTMLDivElement = document.createElement("div");

export function buildEventLink(event : any) : HTMLDivElement {
    let eventDiv : HTMLDivElement = document.createElement("div");
    eventDiv.className = "myevent";

    let eventFade : HTMLAnchorElement = document.createElement("a");
    eventFade.className = "myeventfade";
    eventFade.href = "https://conflictchamber.com/?event=" + event.uid;
    eventDiv.appendChild(eventFade);

    if( event.cover ) {
        eventDiv.style.backgroundImage = "url(\"" + event.cover + "\")";
    }
    else {
        eventDiv.style.backgroundImage = "url(\"img/event_default.jpg\")";
    }

    eventFade.appendChild(document.createTextNode(event.name));

    let rules : any = JSON.parse(event.rules);

    if( rules ) {

        if( rules.preReleaseDate ) {
            let eventDate : HTMLDivElement = document.createElement("div");
            eventDate.className = "myeventdate";
            let date = new Date(rules.preReleaseDate)
            eventDate.appendChild(document.createTextNode(date.toLocaleDateString([], 
                { 
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                })));

            eventFade.appendChild(eventDate);
        }
    }


    return eventDiv;
}

export function showMyEvents(s : string) {
    if( s != "false" ) {
        let events : any = JSON.parse(s);

        if( events != null && events.length > 0 ) {
            let card : ccweb.Card = new ccweb.Card({
                size: "full",
                title: "My Events",
                icon: "view_list",
                expand: true
            });

            let extraHolder : HTMLDivElement = null;

            if( events.length > 3 ) {
                extraHolder = document.createElement("div");
                extraHolder.style.display = "none";
            }

            for( let i : number = events.length - 1; i >= 0; i-- ) {
                let eventDiv : HTMLDivElement = buildEventLink(events[i]);

                if( i < (events.length - 3) ) {
                    extraHolder.appendChild(eventDiv);
                }
                else {
                    card.add(eventDiv);
                }
            }

            if( events.length > 3 ) {
                let showMore : ccweb.Button = new ccweb.Button({
                    size: "mediumfixed",
                    text: "Load More",
                    click: (but : ccweb.Button) => {
                        but.hide();
                        extraHolder.style.display = "";
                    }
                });

                card.add(showMore);
                card.add(extraHolder);
            }

            _myEventsHolder.appendChild(card.container);
        }
    }
}

function initializeMainFlow() : void {
    let abovefold : HTMLDivElement =
        <HTMLDivElement>document.getElementById("abovefold");

    let dgiCard = new ccweb.Card({
        size: "half"
    });

    let dgiLink = document.createElement("a");
    dgiLink.href = "http://discountgamesinc.com";

    let dgiImg = document.createElement("div");
    dgiImg.className = "dgilogo";
    dgiLink.appendChild(dgiImg);

    dgiCard.add(dgiLink);

    dgiCard.add("Conflict Chamber is sponsored by Discount Games Inc.");


    abovefold.appendChild(dgiCard.container);

    let factionSel : ccweb.FactionSelection 
        = new ccweb.FactionSelection(mainFactionSelectionCallback, null, false);

    abovefold.appendChild(factionSel.card.container);
    abovefold.appendChild(_myEventsHolder);

}

function showMainFlow() : void {
    if( _mainFlow == null ) {
        _mainFlow = new MainFlow();

        initializeMainFlow();

        if( _storedFBNews ) {
            gotFBNews(_storedFBNews);
        }
    }

    _mainFlow.show();
    resizeWindow();
}


function showEditor(code? : string, skipHistory? : boolean): void {
    if( _editor && _editor.visible() ) {
        return;
    }

    hideAll();

    if( code || _editor ) {
        if( _mainFlow ) {
            _mainFlow.hide();
        }
    }
    else {
        showMainFlow();
        return;
    }

    if( code ) {

        if( !_editor ) {
            _editor = new ccweb.Editor(
                quitToMain,
                -1,
                onListUpdate,
                null,
                ccweb.Editor.defaultRules
            );
        }

        _editor.restoreCode(code);

        document.title = "Conflict Chamber | Main";
    }

    manageHistory("Editor", code, skipHistory);
}

function gotBlog(text: string): void {
    let blog: any = JSON.parse(text);

    let blogDiv: HTMLElement = document.getElementById("blog");

    while (blogDiv.hasChildNodes()) {
        blogDiv.removeChild(blogDiv.lastChild);
    }

    for (let i = 0; i < blog.length; i++) {
        if (blog[i].post_type == "1") {
            let outer: HTMLDivElement = document.createElement("div");
            outer.className = "blogOuter";

            let icon: HTMLDivElement = document.createElement("div");
            icon.className = "blogRevision";
            outer.appendChild(icon);

            let bd: HTMLDivElement = document.createElement("div");
            bd.className = "blogDate";
            bd.appendChild(document.createTextNode(blog[i].date_posted));
            outer.appendChild(bd);

            let rev: HTMLDivElement = document.createElement("div");
            rev.className = "blogRevNumber";
            rev.appendChild(document.createTextNode(blog[i].title));
            outer.appendChild(rev);

            let postText: HTMLDivElement = document.createElement("div");
            postText.className = "blogRevText";
            postText.appendChild(document.createTextNode(blog[i].post_text));
            outer.appendChild(postText);

            let sep: HTMLDivElement = document.createElement("div");
            sep.className = "blogSep";
            outer.appendChild(sep);

            blogDiv.appendChild(outer);

        }
    }

    let end: HTMLDivElement = document.createElement("div");
    end.className = "blogEnd";
    blogDiv.appendChild(end);
}


function keyPress(e: any): void {
    let evtobj: any = window.event ? event : e;

    if( ccweb.Editor.handleKeyPress(evtobj) ) {
        return;
    }

    if( ccweb.CardViewer.handleKeyPress(evtobj) ) {
        return;
    }
}





// Editor data





function clickHelp(): void {
    document.getElementById("helpDialog").style.display = "none";
}

function clickHelpInner(ev: Event): void {
    ev.stopPropagation();
}


function quitToMain(): void {

    document.title = "Conflict Chamber | Main";
    window.history.replaceState(
        {}, 
        "Conflict Chamber | Main", 
        ".");



    if( _editor ) {
        _editor.hide();
        _editor.remove();
        _editor = null;
    }

    showMainFlow();

    showEditor(null, true);
}





interface signOutInterface {
    (): void;
}

declare var googleSignOut: signOutInterface;
declare var facebookSignOut: signOutInterface;

function signOut(): void {

    //requirejs(['cc/ccmain'], function (cc: any) {
        //console.log(cc._loginType);

        if( (<any>window)._loginType == "fb" ) {
            (<any>window).fbSignOut();
        }

        else require(["cc/" + (<any>window)._loginType], function (lo: any) {
            //console.log(lo);
            lo.signOut();
        });


    //});
}


function closeEmblemDialog() : void {
    if( _emblemDialogShown ) {
        ccweb.Dialog.active().close();        
        _emblemDialogShown = false;
    }
}

export function openList(): void {
    closeEmblemDialog();
    //openListInternal(_editor);
    openListInternal(ccweb.Editor.currentEditor);
}

export function saveList(): void {
    closeEmblemDialog();
    saveListInternal(ccweb.Editor.currentEditor);
}
