import * as ccweb from "../ccweb/ccweb";
import * as g from "./g";

import { loadStoredData, saveMk4List, savedLists, deleteList } from "./ccstorage";
import { MainFlow } from "./mainflow";
import { requireLogin } from "./cclogin";
import { Mk4Data } from "../ccapi/mk4data";
import { decodeList } from "../ccapi/mk4export";
import { serialise } from "../ccapi/mk4list";

(<any>window)._loadStoredData = loadStoredData;

function localStorageGet(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}

let _mainFlow: MainFlow = null;
let _authAreaDiv: HTMLDivElement | null = null;
let _dataReady: Promise<void>;

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

function lightTheme(): void {
    document.documentElement.setAttribute('data-theme', 'light');
    try { localStorage.setItem('cctheme', 'light'); } catch {}
}
function darkTheme(): void {
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('cctheme', 'dark'); } catch {}
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

// Render a Google Sign-In button into an element; retries until the SDK is ready.
function renderSignInButton(element: HTMLElement): void {
    const goog = (<any>window).google;
    if (goog?.accounts?.id) {
        goog.accounts.id.renderButton(element,
            { theme: 'outline', size: 'medium', type: 'standard' });
    } else {
        setTimeout(() => renderSignInButton(element), 150);
    }
}

function getSavedLists(): { offset: number; description: string; listdata: string }[] {
    return Object.values(savedLists).sort((a, b) => a.offset - b.offset);
}

function saveListWithAuth(desc: string, data: string, onResult?: (msg: string) => void): void {
    requireLogin(
        () => {
            try { sessionStorage.setItem('warlist_pending_save', JSON.stringify({ desc, data })); } catch {}
            onResult?.('Sign in via the ☰ menu — your list will save automatically after sign-in.');
        },
        () => {
            saveMk4List(desc, data, () => {
                onResult?.('Save failed — check your connection and try again.');
                renderMainAuthArea();
            });
            onResult?.('Saved!');
            renderMainAuthArea();
        }
    );
}

function openBuilderWithList(listdata: string): void {
    closeEmblemDialog();
    manageHistory('Builder', 'builder');
    const builder = new ccweb.BuilderFlow(saveListWithAuth, quitToMain, getSavedLists, deleteList);
    builder.loadList(listdata);
    resizeWindow();
}

function showMk4Builder(skipHistory?: boolean): void {
    closeEmblemDialog();
    manageHistory('Builder', 'builder', skipHistory);
    new ccweb.BuilderFlow(saveListWithAuth, quitToMain, getSavedLists, deleteList);
    resizeWindow();
}

// ---------------------------------------------------------------------------
// Emblem / menu
// ---------------------------------------------------------------------------

let _emblemMenu: HTMLElement;
let _emblemInitialized  = false;
let _emblemDialogShown  = false;

function closeEmblemDialog(): void {
    if (_emblemDialogShown && ccweb.Dialog.active()) {
        ccweb.Dialog.active().close();
        _emblemDialogShown = false;
    }
}

function initializeEmblem(): void {
    _emblemInitialized = true;

    document.getElementById('emblem').onclick = quitToMain;

    const userPanel = document.getElementById('emblemuserholder');

    _emblemMenu.insertBefore(new ccweb.Button({
        text: 'Build a List!',
        size: 'mediumfixed',
        click: () => showMk4Builder(),
    }).container, userPanel);

    const theme = new ccweb.UIElement('themesel');
    const sp = document.createElement('span');
    sp.textContent = 'Theme:';
    theme.add(sp);
    theme.add(new ccweb.Button({ text: 'Light', size: 'small', click: lightTheme }));
    theme.add(new ccweb.Button({ text: 'Dark',  size: 'small', click: darkTheme  }));
    _emblemMenu.appendChild(theme.container);

    const loginOptions = document.getElementById('loginoptions');
    loginOptions.appendChild(new ccweb.Button({
        text: 'Sign Out', size: 'small', click: () => { g.signOut(); renderMainAuthArea(); },
    }).container);
}

function clickMainMenu(): void {
    if (ccweb.Dialog.active()) return;

    const dlg = new ccweb.Dialog(
        () => { _emblemDialogShown = false; resizeWindow(); },
        'Menu', 'menu', 'emblemdialogholder'
    );

    if (!_emblemInitialized) initializeEmblem();

    dlg.card.content.appendChild(_emblemMenu);
    _emblemMenu.className = 'conflictchamber emblemdialog';
    _emblemMenu.style.display = 'inline-block';
    _emblemMenu.style.left = '0px';
    dlg.show();
    _emblemDialogShown = true;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function resizeWindow(): void {
    const flow = ccweb.Flow._activeFlow;
    if (flow && flow.visible()) {
        const gap = document.body.clientWidth - flow.container.offsetWidth;
        flow.container.style.marginLeft  = gap > 200 ? 'auto' : '0px';
        flow.container.style.marginRight = 'auto';
    }
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

function showBlog(skipHistory?: boolean): void {
    quitToMain();
    manageHistory('Updates', 'news', skipHistory);

    document.getElementById('blog').innerHTML = `<div id="fbnews">
        <div class="loadholder">
            <span class="loadspinner"></span>
            <span class="loadtext">Loading update history...</span>
        </div>
    </div>`;
    document.getElementById('blog').style.display = '';
    ccweb.ajax('/blog', gotBlog, () => {
        const blogDiv = document.getElementById('blog');
        if (blogDiv) blogDiv.innerHTML = '<div class="mk4-empty-slot">Could not load updates — check your connection.</div>';
    });
}

function makeDiv(cls: string, text?: string): HTMLDivElement {
    const d = document.createElement('div');
    d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
}

function gotBlog(text: string): void {
    let blog: any[];
    try { blog = JSON.parse(text); } catch { return; }
    const blogDiv = document.getElementById('blog');
    if (!blogDiv) return;
    blogDiv.innerHTML = '';

    for (const post of blog) {
        if (post.post_type !== '1') continue;
        const outer = makeDiv('blogOuter');
        outer.appendChild(makeDiv('blogRevision'));
        outer.appendChild(makeDiv('blogDate',      String(post.date_posted ?? '')));
        outer.appendChild(makeDiv('blogRevNumber', String(post.title       ?? '')));
        outer.appendChild(makeDiv('blogRevText',   String(post.post_text   ?? '')));
        outer.appendChild(makeDiv('blogSep'));
        blogDiv.appendChild(outer);
    }
    blogDiv.appendChild(makeDiv('blogEnd'));
}

// ---------------------------------------------------------------------------
// Routing / history
// ---------------------------------------------------------------------------

function queryParameter(name: string): string | null {
    const regex = new RegExp('[?&]' + name.replace(/[\[\]]/g, '\\$&') + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(window.location.href);
    if (!results) return null;
    return decodeURIComponent((results[2] ?? '').replace(/\+/g, ' '));
}

export function manageHistory(title: string, search: string, skipHistory?: boolean): void {
    document.title = 'Warlist | ' + title;
    if (!skipHistory) {
        window.history.pushState({ search }, 'Warlist | ' + title, '?' + search);
    }
}

function openBuilderFromLink(encoded: string, skipHistory?: boolean): void {
    _dataReady.then(() => {
        const list = decodeList(encoded);
        if (list) openBuilderWithList(serialise(list));
        else showMainFlow();
    }).catch(() => showMainFlow());
}

function route(skipHistory: boolean): boolean {
    if (queryParameter('news')    !== null) { showBlog(skipHistory);        return true; }
    if (queryParameter('builder') !== null) { showMk4Builder(skipHistory);  return true; }
    const listCode = queryParameter('list');
    if (listCode !== null) { openBuilderFromLink(listCode, skipHistory);   return true; }
    return false;
}

function onPopState(event: PopStateEvent): void {
    if (event.state?.search) route(true);
    else quitToMain();
}

function quitToMain(): void {
    document.title = 'Warlist | Main';
    window.history.replaceState({}, 'Warlist | Main', '.');
    ccweb.Flow.hideFlows();
    showMainFlow();
}

// ---------------------------------------------------------------------------
// Main flow — auth area
// ---------------------------------------------------------------------------

function renderMainAuthArea(): void {
    if (!_authAreaDiv) return;
    _authAreaDiv.innerHTML = '';

    if ((<any>window)._idToken) {
        const lists = getSavedLists();
        const email = (<any>window)._userEmail as string | null;

        const hdr = document.createElement('div');
        hdr.className = 'mk4-auth-header';
        const userInfo = document.createElement('div');
        userInfo.className = 'mk4-auth-userinfo';
        const title = document.createElement('span');
        title.className = 'mk4-section-title';
        title.textContent = 'My Saved Lists';
        userInfo.appendChild(title);
        if (email) {
            const emailSpan = document.createElement('span');
            emailSpan.className = 'mk4-auth-email';
            emailSpan.textContent = email;
            userInfo.appendChild(emailSpan);
        }
        hdr.appendChild(userInfo);
        const signOutBtn = document.createElement('button');
        signOutBtn.className = 'mk4-signout-btn';
        signOutBtn.textContent = 'Sign Out';
        signOutBtn.onclick = () => { g.signOut(); renderMainAuthArea(); };
        hdr.appendChild(signOutBtn);
        _authAreaDiv.appendChild(hdr);

        if (lists.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'mk4-empty-slot';
            empty.textContent = 'No saved lists yet — build one!';
            _authAreaDiv.appendChild(empty);
        } else {
            for (const meta of lists) {
                const row = document.createElement('div');
                row.className = 'mk4-saved-list-row';
                const name = document.createElement('span');
                name.className = 'mk4-saved-list-name';
                name.textContent = meta.description;
                row.appendChild(name);
                const loadBtn = document.createElement('button');
                loadBtn.className = 'mk4-list-load-btn';
                loadBtn.textContent = 'Load';
                loadBtn.onclick = () => openBuilderWithList(meta.listdata);
                row.appendChild(loadBtn);
                const delBtn = document.createElement('button');
                delBtn.className = 'mk4-list-delete-btn';
                delBtn.textContent = '✕';
                delBtn.title = 'Delete list';
                delBtn.onclick = () => { deleteList(meta.offset, () => renderMainAuthArea()); };
                row.appendChild(delBtn);
                _authAreaDiv!.appendChild(row);
            }
        }
    } else if (localStorageGet('warlist_auth_email') !== null) {
        const blurb = document.createElement('div');
        blurb.className = 'mk4-signin-blurb';
        blurb.textContent = 'Restoring session…';
        _authAreaDiv.appendChild(blurb);
    } else {
        const blurb = document.createElement('div');
        blurb.className = 'mk4-signin-blurb';
        blurb.textContent = 'Sign in to save and load your lists';
        _authAreaDiv.appendChild(blurb);
        const signinDiv = document.createElement('div');
        signinDiv.className = 'mk4-main-signin-btn';
        _authAreaDiv.appendChild(signinDiv);
        renderSignInButton(signinDiv);
    }
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

function initializeMainFlow(): void {
    const abovefold = document.getElementById('abovefold') as HTMLDivElement;
    abovefold.appendChild(new ccweb.Button({
        text: 'Build a List',
        size: 'mediumfixed',
        click: () => showMk4Builder(),
    }).container);

    _authAreaDiv = document.createElement('div');
    _authAreaDiv.className = 'mk4-main-auth-area';
    abovefold.appendChild(_authAreaDiv);

    renderMainAuthArea();

    // Refresh auth area after sign-in completes (works for first sign-in on this page load).
    if (!(<any>window)._loginCallback) (<any>window)._loginCallback = [];
    (<any>window)._loginCallback.push(() => renderMainAuthArea());
}

function showMainFlow(): void {
    if (_mainFlow === null) {
        _mainFlow = new MainFlow();
        initializeMainFlow();
    }
    _mainFlow.show();
    resizeWindow();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function loadBody(): void {
    ccweb.Flow.showCallback = () => resizeWindow();

    document.getElementById('cctop').style.display = '';
    _emblemMenu = document.getElementById('emblemmenu');
    document.getElementById('ccgearsbutton').onclick = clickMainMenu;
    document.getElementById('ccmenubutton').onclick  = clickMainMenu;

    g.init();
    g.restoreSession();
    window.onresize   = resizeWindow;
    window.onpopstate = onPopState;

    _dataReady = Mk4Data.load().catch(err => { console.error('Failed to load Mk4 data:', err); throw err; });

    const search = window.location.search.replace(/[?&]fbclid=[^&]*/g, '').replace(/^&/, '?') || null;
    if (search && route(false)) { /* routed */ }
    else showMainFlow();

    ccweb.ajax('/blog', gotBlog);
    resizeWindow();
}

// Auto-start when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBody);
} else {
    loadBody();
}
