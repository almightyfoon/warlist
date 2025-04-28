


import * as ccapi from "../ccapi/ccapi";
import * as ccweb from "../ccweb/ccweb";
import { api } from "./cctourn";
import { authAjax } from "./cclogin";


import { defaultEditor, showMyEvents } from "./ccmain";


//export let _idToken: string = null;
//export let _loginType: string = null;


export function openListInternal(editor: ccweb.Editor): void {

    let alist: ccweb.ArmyListView = editor ? editor.currentList : null;

    if (ccweb.Dialog.active()) {
        return;
    }

    let dlg: ccweb.Dialog = new ccweb.Dialog(null, "Load List", "folder_open");

    // let header: HTMLDivElement = document.createElement("div");
    // header.className = "dlgheader";
    // header.appendChild(document.createTextNode("Select an army list to open:"));

    // dlg.content.appendChild(header);

    //for (let i : number = 1; i <= 8; i++) {
    for (let i in _savedLists) {

        //if (_savedLists[i] == null) {
        //    let div = document.createElement("div");

        //    div.className = "savedlist lb";
        //    div.appendChild(document.createTextNode("Empty"));

        //    di.appendChild(div);
        //}
        //else {
        let div: HTMLDivElement = buildListDiv(_savedLists[i], parseInt(i));

        if (_savedLists[i] != null) {
            div.onclick = (function () {
                let myList = _savedLists[i].l;
                let myDlg: ccweb.Dialog = dlg;
                let myEditor: ccweb.Editor = editor;
                let myAList: ccweb.ArmyListView = alist;

                myList.f = parseInt("" + myList.f);

                return function () {
                    myDlg.close();
                    ccweb.Flow.hideFlows();

                    if( myEditor == null ) {
                        myEditor = defaultEditor();
                    }

                    myEditor.restoreStored(myList, true);
                    myEditor.endChange();
                    myEditor.show();
                };

            })();
        }

        dlg.content.appendChild(div);
        //}
    }


    dlg.show();
}

function saveSlot(offset: number, alist: ccapi.ArmyList): void {
    // let al: HTMLElement = alist.current().view.listInner;

    // if (!al.hasChildNodes())
    //     return;

    if( alist.current().armyEntries.length == 0 )
        return;

    let text = "New List";

    if (_savedLists[offset] != null) {
        text = _savedLists[offset].d;
    }

    let clickfunc: (s: string) => void = (function () {
        let myOffset: number = offset;
        let myList: ccapi.ArmyList = alist;

        return function (s: string) {
            postList(myOffset, s,
                JSON.stringify(myList.getState()));
        };
    })();

    ccweb.Dialog.getText("Enter a name for this army list:", text, "Save", clickfunc);
}


function buildListDiv(list: ccapi.SavedList, offset: number): HTMLDivElement {
    let div: HTMLDivElement = document.createElement("div");

    if (list == null) {
        div.className = "savedlist lb";

        let empty = document.createElement("div");
        empty.className = "slempty";
        div.appendChild(empty);

        return div;
    }

    div.className = "savedlist lb bh";

    let size: HTMLDivElement = document.createElement("div");
    size.className = "slsize f" + list.l.f;
    size.appendChild(document.createTextNode("" + list.l.c));
    div.appendChild(size);

    let desc: HTMLDivElement = document.createElement("div");
    desc.className = "sldesc";
    desc.appendChild(document.createTextNode(list.d));
    div.appendChild(desc);

    if (offset != null) {
        let xbut: HTMLDivElement = document.createElement("div");
        xbut.className = "listxbut";

        xbut.onclick = (function () {
            let myDiv = div;
            let myOffset = offset;

            return function (e: Event): void {
                myDiv.style.display = "none";
                deleteList(myOffset);
                e.stopPropagation();
            }

        })();
        div.appendChild(xbut);
    }

    var casters: string = "";


    if (list.l.l && list.l.l.list && list.l.l.list.length > 0
        && ccapi.isCaster(ccapi.Data.entries[list.l.l.list[0][0]]) ) {
        casters += ccapi.Data.entries[list.l.l.list[0][0]].v;
    }

    if (list.l.m && list.l.m.list && list.l.m.list.length > 0
        && ccapi.isCaster(ccapi.Data.entries[list.l.m.list[0][0]]) ) {
        if (casters.length > 0) {
            casters += " - ";
        }
        casters += ccapi.Data.entries[list.l.m.list[0][0]].v;
    }

    if (list.l.n && list.l.n.list && list.l.n.list.length > 0
        && ccapi.isCaster(ccapi.Data.entries[list.l.n.list[0][0]]))  {
        if (casters.length > 0) {
            casters += " - ";
        }
        casters += ccapi.Data.entries[list.l.n.list[0][0]].v;
    }


    if (casters.length > 0) {
        let caster: HTMLDivElement = document.createElement("div");
        caster.className = "slcaster";
        caster.appendChild(document.createTextNode(casters));
        div.appendChild(caster);
    }

    return div;
}



function newFolder(): void {
    ccweb.Dialog.getText("Enter folder name", null, "Create", postNewFolder);
}


export function saveListInternal(editor: ccweb.Editor): void {
    let alist: ccweb.ArmyListView = editor.currentList;
    // let al: HTMLElement = alist.current().view.listInner;

    // if (!al.hasChildNodes())
    //     return;

    if( alist.al.current().armyEntries.length == 0 )
        return;


    if (ccweb.Dialog.active()) {
        return;
    }

    let dlg: ccweb.Dialog = new ccweb.Dialog(null, "Save List", "save");

    // let header: HTMLDivElement = document.createElement("div");
    // header.className = "dlgheader";
    // header.appendChild(document.createTextNode("Select a slot to save your list:"));

    // dlg.content.appendChild(header);


    /*
        var newfolder : HTMLDivElement = document.createElement("div");
        newfolder.className = "folder lb bh";
        newfolder.onclick = newFolder;

        newfolder.appendChild(document.createTextNode("New Folder"));

        var foldericon : HTMLDivElement = document.createElement("div");
        foldericon.className = "newfoldericon";
        newfolder.appendChild(foldericon);

        dlg.content.appendChild(newfolder);
    */



    let maxindex: number = 0;

    //for (let i : number = 1; i <= 8; i++) {
    for (let i in _savedLists) {

        if (parseInt(i) > maxindex) {
            maxindex = parseInt(i);
        }


        //if (_savedLists[i] == null) {
        //    let div = document.createElement("div");
        //    div.className = "savedlist lb bh";
        //    div.appendChild(document.createTextNode("Empty"));

        //    div.onclick = (function () {
        //        let myOffset = i;

        //        return function () {
        //            saveSlot(myOffset);
        //        };
        //    })();


        //    di.appendChild(div);
        //}
        //else {

        //let div = document.createElement("div");
        let div: HTMLDivElement = buildListDiv(_savedLists[i], parseInt(i));

        //div.className = "savedlist lb bh";
        //div.appendChild(document.createTextNode(_savedLists[i].d));

        div.onclick = (function () {
            let myOffset: number = parseInt(i);
            let myDlg: ccweb.Dialog = dlg;
            let myList: ccapi.ArmyList = alist.al;

            return function () {
                myDlg.close();
                saveSlot(myOffset, myList);
            };
        })();

        if (_savedLists[i] == null) {
            div.className += " bh";
        }

        dlg.content.appendChild(div);
        //}
    }

    let div: HTMLDivElement = buildListDiv(null, null);

    div.onclick = (function () {
        let myOffset: number = maxindex + 1;
        let myDlg: ccweb.Dialog = dlg;
        let myList: ccapi.ArmyList = alist.al;

        return function () {
            myDlg.close();
            saveSlot(myOffset, myList);
        };
    })();

    div.className += " bh";

    dlg.content.appendChild(div);

    dlg.show();
}

function continueNewFolder(index: number) {
}

function postNewFolder(name: string) {
    let xhttp: XMLHttpRequest = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            //console.log(xhttp.responseText);
            continueNewFolder(parseInt(xhttp.responseText));
        }
    };

    //console.log("About to post list");

    xhttp.open("POST", "https://conflictchamber.com/newfolder.php", true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(
        "id=" + encodeURIComponent((<any>window)._idToken)
        + "&type=" + encodeURIComponent((<any>window)._loginType)
        + "&name=" + encodeURIComponent(name)
    );
}


function deleteList(index: number) {
    delete _savedLists[index];

    let xhttp: XMLHttpRequest = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        //if (xhttp.readyState == 4 && xhttp.status == 200) {
        //console.log(xhttp.responseText);
        //}
    };

    //console.log("About to post list");

    xhttp.open("POST", "https://conflictchamber.com/dl.php", true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(
        "id=" + encodeURIComponent((<any>window)._idToken)
        + "&type=" + encodeURIComponent((<any>window)._loginType)
        + "&index=" + encodeURIComponent(index.toString())
    );
}

function atcCallback(callback : (s : string) => void) {
    let idToken : string = (<any>window)._idToken;

    if( idToken )
    {
        //console.log("Fetching ATC lists");
        getATCLists(callback);
    }
    else
    {
        //console.log("idToken still invalid");
    }

}

export function getEvent(flow : ccweb.Flow,
            eid : number, skipHistory : boolean,
            callback : (f : ccweb.Flow, n : number, b: boolean, s : string, rc : string) => void,
            regCode : string) {

       let xhttp: XMLHttpRequest = new XMLHttpRequest();
        xhttp.onreadystatechange = (function () {
            let myFlow = flow;
            let myCallback = callback;
            let myXhttp = xhttp;
            let mySkip = skipHistory;
            let myEid = eid;
            let myRegCode = regCode;

            return function() {
                if( myXhttp.readyState == 4 && myXhttp.status == 200) {
                    myCallback(myFlow, myEid, mySkip, myXhttp.responseText, myRegCode);
                }
            };
        })();

        xhttp.open("GET", api("/event/" + eid), true);
        //xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send(
            //"eid=" + encodeURIComponent("" + eid)
        );
 }

export function getATCLists(callback : (s : string) => void, idToken? : string) {
    // if( idToken || (<any>window)._idToken )
    // {
    //     if( !idToken ) {
    //         idToken = (<any>window)._idToken;
    //     }

        //console.log("Sending ATC request");
        //console.log(idToken);


        let xhttp: XMLHttpRequest = new XMLHttpRequest();
        xhttp.onreadystatechange = (function () {
            //console.log(xhttp);
            // if (xhttp.readyState == 4 && xhttp.status == 200) {
            //     console.log(xhttp.responseText);

            //     if( xhttp.responseText != "OK" ) {
            //         console.log(xhttp);
            //     }
            // }
            let myCallback = callback;
            let myXhttp = xhttp;

            return function() {
                if( myXhttp.readyState == 4 && myXhttp.status == 200) {
                    myCallback(myXhttp.responseText);
                }
            };
        })();

        //console.log("About to post list");

        //console.log((<any>window)._idToken);

        xhttp.open("GET", "https://conflictchamber.com/atclists.php", true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send(
            // "id=" + encodeURIComponent(idToken)
            // + "&type=" + encodeURIComponent((<any>window)._loginType)
        );
    //}
    // else
    // {
    //     //console.log("Setting up callback");

    //     let closure : () => void = (function() {
    //         let myCallback = callback;

    //         return function() {
    //             atcCallback(myCallback);
    //         };

    //     })();

    //     if( (<any>window)._loginCallback )
    //     {
    //         (<any>window)._loginCallback.push(closure);
    //     }
    //     else
    //     {
    //         (<any>window)._loginCallback = [ closure ];
    //     }

    //     //console.log("Callback setup done");
    // }

}

function postList(index: number, desc: string, listData: string) {
    let xhttp: XMLHttpRequest = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        //console.log(xhttp);
        // if (xhttp.readyState == 4 && xhttp.status == 200) {
        //     console.log(xhttp.responseText);

        //     if( xhttp.responseText != "OK" ) {
        //         console.log(xhttp);
        //     }
        // }
    };

    //console.log("About to post list");

    //console.log((<any>window)._idToken);

    xhttp.open("POST", "https://conflictchamber.com/y.php", true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(
        "id=" + encodeURIComponent((<any>window)._idToken)
        + "&type=" + encodeURIComponent((<any>window)._loginType)
        + "&index=" + encodeURIComponent(index.toString())
        + "&listdata=" + encodeURIComponent(listData)
        + "&desc=" + encodeURIComponent(desc)
    );


    _savedLists[index] = {
        'o': index,
        'l': JSON.parse(listData),
        'd': desc,
        'f': null
    };
}


export function ajaxPost(url: string, callback: (resp: string) => void, arg: string) {

    //console.log("ajaxPost:" + url + ", " + arg);

    let xhttp: XMLHttpRequest = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            callback(xhttp.responseText);
        }
    };
    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhttp.send(arg);
}

export function restGet(url: string, callback: (resp: string) => void) {
    let xhttp: XMLHttpRequest = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            callback(xhttp.responseText);
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
}



export function loadStoredData(resp: string, loginType : string,
        loginToken : string) {

    let details = JSON.parse(resp);

    _savedLists = {};

    for (let i: number = 0; i < details.lists.length; i++) {
        //console.log(i);

        let list = JSON.parse(details.lists[i].listdata);
        let offset = parseInt(details.lists[i].offset);
        let desc = details.lists[i].description;
        let folder = -1;

        if (details.lists[i].folder) {
            folder = parseInt(details.lists[i].folder);
        }

        _savedLists[offset] = {
            'o': offset,
            'l': list,
            'd': desc,
            'f': folder
        };
    }


    if( (<any>window)._loginCallback )
    {
        for( let i : number = 0; i < (<any>window)._loginCallback.length;
                i++ ) {
            (<any>window)._loginCallback[i]();
        }
    }

    authAjax(api("/myevents"), null, (loggedIn : boolean, s : string) => {
        showMyEvents(s);
    });


}


let _savedLists: { [n: number]: ccapi.SavedList } = {};

