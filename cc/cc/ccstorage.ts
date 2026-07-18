// Network helpers for saved lists. All Mk3 UI removed.

export function ajaxPost(url: string, callback: (resp: string) => void, arg: string, onError?: () => void): void {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4) {
            if (xhttp.status === 200) callback(xhttp.responseText);
            else onError?.();
        }
    };
    xhttp.open('POST', url, true);
    xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhttp.send(arg);
}

export function restGet(url: string, callback: (resp: string) => void, onError?: () => void): void {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4) {
            if (xhttp.status === 200) callback(xhttp.responseText);
            else onError?.();
        }
    };
    xhttp.open('GET', url, true);
    xhttp.send();
}

function postList(index: number, desc: string, listData: string, onError?: () => void): void {
    ajaxPost('/y', () => {},
        'token='     + encodeURIComponent((<any>window)._idToken)
        + '&logintype=' + encodeURIComponent((<any>window)._loginType)
        + '&index='     + encodeURIComponent(String(index))
        + '&listdata='  + encodeURIComponent(listData)
        + '&desc='      + encodeURIComponent(desc),
        onError
    );
}

export function deleteList(index: number, onSuccess?: () => void): void {
    ajaxPost('/dl',
        () => { delete savedLists[index]; onSuccess?.(); },
        'token='        + encodeURIComponent((<any>window)._idToken)
        + '&logintype=' + encodeURIComponent((<any>window)._loginType)
        + '&index='     + encodeURIComponent(String(index)),
        () => console.error('Failed to delete list at index', index)
    );
}

// Saved list index (offset → {desc, listdata json string})
export interface SavedListMeta { offset: number; description: string; listdata: string; }
export let savedLists: { [offset: number]: SavedListMeta } = {};

// Save a Mk4 list blob to the next available slot.
export function saveMk4List(desc: string, data: string, onError?: () => void): void {
    let max = 0;
    for (const k in savedLists) { if (+k > max) max = +k; }
    const slot = max + 1;
    postList(slot, desc, data,
        () => {
            delete savedLists[slot];
            onError?.();
        }
    );
    savedLists[slot] = { offset: slot, description: desc, listdata: data };
}

// Called by the Google login flow after loading user data from /x.
export function loadStoredData(resp: string, _loginType: string, _loginToken: string): void {
    let details: any;
    try { details = JSON.parse(resp); } catch {
        const cbs: Function[] = (<any>window)._loginCallback ?? [];
        (<any>window)._loginCallback = [];
        for (const cb of cbs) cb();
        return;
    }
    savedLists = {};
    for (const item of (details.lists ?? [])) {
        const offset = parseInt(item.offset, 10);
        savedLists[offset] = { offset, description: item.description, listdata: item.listdata };
    }

    // Auto-save any list that was staged before the user was signed in.
    const pending = sessionStorage.getItem('warlist_pending_save');
    if (pending) {
        sessionStorage.removeItem('warlist_pending_save');
        try {
            const { desc, data } = JSON.parse(pending);
            saveMk4List(desc, data);
        } catch { /* ignore malformed */ }
    }

    const cbs: Function[] = (<any>window)._loginCallback ?? [];
    (<any>window)._loginCallback = [];
    for (const cb of cbs) cb();
}
