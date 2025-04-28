//namespace ccapi {

import { IEntryCallback, ArmyList } from "../ccapi/armylist";
import { SubList } from "../ccapi/sublist";
import { Entry, canAttach, isWarnoun, companyOfIron,
    isPreRelease, isExpired, isCID, subtitle, isCaster, isNarrative, validateRules } from "../ccapi/entry";
import { Rules, StoredList, Faction, ArmyEntry, ListState, ThemeData, Const } from "../ccapi/defines";
import { Data, _factions, loadData } from "../ccapi/data";
import { parseCode } from "../ccapi/ccapi";

//import { FactionList } from "./factionlist";

import { ArmyListView } from "./armylistview";
import { saveAsImage } from "./image";
import { Search } from "./search";
import { Dialog } from "./dialog";
import { EntryOption } from "./builddiv";
import { Clipboard } from "./clipboard";
import { Card, Button, FactionSelection } from "./ccweb";
import { Flow } from "./widgets";
import { CardViewer } from "./cardviewer";
import { buildPDFSheet } from "./pdfsheet";
import { entryStaticData } from "../ccapi/entrystatic";


interface EntryDiv {
    div: HTMLDivElement;
    entry: Entry;
    parent: HTMLDivElement;
}


export class Editor implements IEntryCallback {
    divs: EntryDiv[];
    options: EntryOption[];
    limitedOptions: EntryOption[];
    //builder: DivBuilder;
    srCategory: HTMLDivElement;
    entryListHolder: HTMLDivElement;
    armyListHolder: HTMLDivElement;
    entryInner: HTMLDivElement;
    entryScroll: HTMLDivElement;
    undoStack: StoredList[] = [];
    undoIndex: number = 0;
    currentList: ArmyListView = null;
    quitCallback: () => void = null;
    submitCallback: () => void = null;
    printCallback: (al : ArmyList) => void = null;
    listCallback: (ccode: string) => void = null;
    //factionList: FactionList = null;
    eventMode : boolean = false;
    //preListSize: number = 75;

    setEventMode(b : boolean) : void {
        this.eventMode = b;
    }

    getEventMode() : boolean {
        return this.eventMode;
    }

    rules : Rules = null;

    factionMode: boolean = true;
    editorOuter: HTMLDivElement;
    exitIcon: string;
    exitTooltip: string;

    static defaultSize: number = 75;
    static defaultSteamroller: boolean = false;
    static defaultRules: Rules = {
        listSize: 75,
        listType: {
            steamroller: false,
            adr: false,
            champions: false,
            season: 0,
            minLists: 1,
            maxLists: 3,
        }
    };

    entryLists: Card[] = [];

    static currentEditor: Editor = null;

    constructor(quitCallback: () => void,
        fid: number,
        listUpdate: (s: string) => void,
        exitTooltip?: string,
        rules?: Rules,
        submitCallback? : () => void) 
    {
        this.rules = rules;
        this.submitCallback = submitCallback;

        this.exitIcon = "\uea13";
        this.exitTooltip = exitTooltip || "Exit to main";

        let editor: Editor = this;

        this.listCallback = listUpdate;

        if (Data.entries == null) {
            loadData(null);
        }

        this.divs = [];
        this.options = [];
        this.limitedOptions = [];
        this.srCategory = null;


        let newQuitCallback: () => void =
            (function (): () => void {
                let myCallback = quitCallback;
                let myEditor = editor;

                return function (): void {
                    myEditor.factionMode = true;
                    myEditor.hide();
                    myCallback && myCallback();
                };
            })();


        this.quitCallback = newQuitCallback;

        this.editorOuter = document.createElement("div");
        this.editorOuter.className = "conflictchamber";


        this.entryListHolder = document.createElement("div");
        this.entryListHolder.className = "entryList";

        let collapse = new Button({
            text: "Collapse All",
            size: "large",
            className: "collapsebutton",
            click: () => { this.collapseAll(); }
        });

        this.entryListHolder.appendChild(collapse.container);

        let editSettings = new Button({
            text: this.rules.enforce ? "Change Faction" : "List Options",
            size: "large",
            className: "editsettingsbutton",
            click: () => { this.listOptions(); },
        });

        this.entryListHolder.appendChild(editSettings.container);

        let search = new Button({
            text: "",
            icon: "search",
            size: "large",
            className: "searchbutton",
            click: () => { this.launchSearch(); }
        });


        this.entryListHolder.appendChild(search.container);

        

        this.entryScroll = document.createElement("div");
        this.entryScroll.className = "entryScroll";

        this.entryInner = document.createElement("div");
        this.entryInner.className = "entryInner";

        this.entryScroll.appendChild(this.entryInner);
        this.entryListHolder.appendChild(this.entryScroll);

        this.editorOuter.appendChild(this.entryListHolder);
        this.editorOuter.style.display = "none";

        document.body.appendChild(this.editorOuter);


        this.armyListHolder = document.createElement("div");
        this.armyListHolder.className = "armyListOuter";

        this.editorOuter.appendChild(this.armyListHolder);


        document.body.appendChild(this.editorOuter);

        if( fid > 0 ) {
            this.loadFaction(fid, true);
            this.endChange();
        }
    }


    hide(): void {
        this.editorOuter.style.display = "none";

        if (Editor.currentEditor == this) {
            Editor.currentEditor = null;
        }
    }

    remove(): void {
        document.body.removeChild(this.editorOuter);

        if (Editor.currentEditor == this) {
            Editor.currentEditor = null;
        }
    }

    visible() : boolean {
        return this.editorOuter.style.display != "none";
    }

    show(makeExclusive? : boolean): void {
        if (!this.currentList) {

            this.editorOuter.style.display = "none";

            let fs : FactionSelection = new FactionSelection(
                (fid : number, rules : Rules, fs : FactionSelection) => {
                    if( fid != -1 && (!this.currentList || !this.currentList.al
                            || fid != this.currentList.al.factionID) ) {
                        this.loadFaction(fid, true);
                        this.show(makeExclusive);
                    }
    
                    this.endChange();
                },
                this.rules,
                true);
    
            fs.showDialog();

        }
        else {
            this.editorOuter.style.display = "";

            if( makeExclusive ) {
                Flow.hideFlows();
            }

            this.adjustScroll();
        }

        Editor.currentEditor = this;
    }

    reset(): void {
        this.factionMode = true;
        this.undoStack = [];
        this.undoIndex = 0;
        this.options = [];
        this.limitedOptions = [];
        this.divs = [];
        this.entryLists = [];

        if (this.currentList) {
            this.currentList.al.reset();
        }

    }

    undo(): void {
        let alist: ArmyList = this.currentList.al;

        if (this.undoIndex < 1)
            return;

        this.undoIndex--;
        alist.restoreState(this.undoStack[this.undoIndex]);
        this.syncOptions();
        alist.updateHeaders();
    }

    redo(): void {
        let alist: ArmyList = this.currentList.al;

        if (this.undoIndex >= this.undoStack.length - 1)
            return;

        this.undoIndex++;
        alist.restoreState(this.undoStack[this.undoIndex]);
        this.syncOptions();
        alist.updateHeaders();
    }

    pushState(): void {
        let alist: ArmyList = this.currentList.al;

        if (this.undoIndex != this.undoStack.length - 1) {
            this.undoStack = this.undoStack.slice(0, this.undoIndex + 1);
        }

        this.undoStack.push(alist.getState())
        this.undoIndex = this.undoStack.length - 1;
    }

    setSize(size: number, skipinput: boolean = false): void {
        Editor.defaultSize = size;
    }




    loadFaction(fid: number, interactive: boolean): ArmyListView {
        this.factionMode = false;

        let alv : ArmyListView = new ArmyListView(interactive, fid,
            this, this.rules);


        while (this.armyListHolder.hasChildNodes()) {
            this.armyListHolder.removeChild(this.armyListHolder.lastChild);
        }

        this.armyListHolder.appendChild(alv.rootNode);

        //this.show();

        Editor.initializeFaction(fid, alv.al, this);
        this.currentList = alv;
        this.syncOptions();


        return alv;
    }

    static initializeFaction(fid: number, al: ArmyList, ed: Editor): void {
        let types: { [s: string]: HTMLDivElement } = {};

        let fact: Faction = _factions[fid];

        let el: HTMLElement = null;

        if (ed) {
            el = ed.entryInner;

            while (el.hasChildNodes())
                el.removeChild(el.lastChild);
        }

        // console.log(fact       );

        let sortedType: string[] = Object.keys(fact.types).sort(function (a, b) {
            if (a == b || Data.typeDetails[a] == null || Data.typeDetails[b] == null)
                return 0;

            if (Data.typeDetails[a].order == Data.typeDetails[b].order)
                return 0;
            else if (Data.typeDetails[a].order > Data.typeDetails[b].order)
                return 1;
            else
                return -1;
        });

        for (let iType: number = 0; iType < sortedType.length; iType++) {
            let typename: string = sortedType[iType];

            let sortedEntry: string[] = Object.keys(fact.types[typename]);

            sortedEntry.sort(function (a, b) {

                if (fact.entries[parseInt(a)].v != null && fact.entries[parseInt(b)].v != null) {
                    let av: string = fact.entries[parseInt(a)].v;
                    let bv: string = fact.entries[parseInt(b)].v;

                    return av == bv ? 0 : (av > bv ? 1 : -1);
                }
                else {
                    let an: string = fact.entries[parseInt(a)].n;
                    let bn: string = fact.entries[parseInt(b)].n;

                    if (an.substring(0, 4) == "The ")
                        an = an.substring(4);

                    if (bn.substring(0, 4) == "The ")
                        bn = bn.substring(4);

                    return an > bn ? 1 : -1;
                }
            });

            for (let i: number = 0; i < sortedEntry.length; i++) {
                let entryId: number = parseInt(sortedEntry[i]);
                let entry: Entry = fact.entries[entryId];

                if( entry.fr ) {
                    continue;
                }

                if( ed && ed.rules && ed.rules.enforce ) {
                    if( isPreRelease(entry, ed.rules) ) {
                        continue;
                    }

                    if( isExpired(entry, ed.rules) ) {
                        continue;
                    }

                    if( entry.pr == 2 && ed.rules.forbidCID ) {
                        continue;
                    }

                    if( entry.pr == 3 && !ed.rules.allowNarrative ) {
                        continue;
                    }
                }

                let entryDiv: HTMLDivElement =
                    ed ? ed.buildEntryDiv(al, entry, false) : null;

                entry.typename = typename;

                //console.log(entry);

                if (entryDiv != null) {
                    let parentDiv: HTMLDivElement = null;

                    if (types[typename] == null) {
                        parentDiv = document.createElement("div");

                        if (typename == "Steamroller Objectives" && ed) {
                            ed.srCategory = parentDiv;
                        }

                        let header = new Card({
                            title: typename,
                            icon: Data.typeDetails[typename].icon,
                            expand: true,
                            startClosed: true
                        });

                        if (ed) {
                            ed.entryLists.push(header);
                        }

                        parentDiv.appendChild(header.container);

                        let editor: Editor = ed;

                        header.setOpen((function () {
                            let myEditor: Editor = editor;

                            return function (card : Card) {
                                myEditor.adjustScroll();
                            }
                        })());

                        header.setClose((function () {
                            let myEditor: Editor = editor;

                            return function (card : Card) {
                                myEditor.adjustScroll();
                            }
                        })());
                        

                        if (el) {
                            el.appendChild(parentDiv);
                        }

                        types[typename] = header.content;
                    }

                    types[typename].appendChild(entryDiv);

                    if (ed) {
                        ed.divs.push({
                            "div": entryDiv,
                            "entry": entry,
                            "parent": <HTMLDivElement>(types[typename].parentElement)
                        });
                    }
                }
            }
        }

        al.current().updateThemeList(null, null);
    }

    pickRandom() : boolean {
        let al : ArmyList = this.currentList.al;
        let slist : SubList = al.current();

        let nonbgp: number = slist.nonbgCost();

        let validOptions : EntryOption[] = [];

        for (let i: number = 0; i < this.options.length; i++) {
            let eo: EntryOption = this.options[i];

            let validRet: [boolean, number, boolean] =
                slist.optionValid(eo.entry, eo.choice, null, nonbgp);
            let valid: boolean = validRet[0];
            let cost: number = validRet[1];
            let modified: boolean = validRet[2];

            valid = valid && (modified || cost >= 0);

            if( valid ) {
                validOptions.push(eo);
            }
        }

        if( validOptions.length == 0 ) {
            return false;
        }


        let eo : EntryOption = validOptions[Math.floor(Math.random()*validOptions.length)];        

        slist.insertEntry(eo.entry, eo.choice, null, false, null, false);

        return true;
    }

    syncOptions(al?: ArmyList): void {
        
        // console.log("Synching options");



        if (al == undefined || al == null) {
            al = this.currentList.al;
        }

        let adr : boolean = al.inADR();

        let slist: SubList = al.current();

        //let casteral: ArmyEntry = null;

        // for (let i: number = 0; i < slist.armyEntries.length; i++) {
        //     if ( isCaster(slist.armyEntries[i].entry) ) {
        //         //casteral = slist.armyEntries[i];
        //         break;
        //     }
        // }

        for (let i: number = 0; i < this.divs.length; i++) {
            this.divs[i].parent.style.display =
                slist.inTheme() ? "none" : "";

            this.divs[i].div.style.display =
                slist.inTheme() ? "none" : "";
        }

        let bgp: number = slist.bgTotalCost();
        let nonbgp: number = slist.nonbgCost();

        for (let i: number = 0; i < slist.armyEntries.length; i++) {

            if( slist.armyEntries[i].viewData["specbut"] ) {
                slist.armyEntries[i].viewData["specbut"].style.display = adr ? "" : "none";
            }

            for (let j: number = 0; j < slist.armyEntries[i].children.length; j++) {
                if( slist.armyEntries[i].children[j].viewData["specbut"] ) {
                    slist.armyEntries[i].children[j].viewData["specbut"].style.display = adr ? "" : "none";
                }


                let before: boolean = false;
                let after: boolean = false;

                for (let k: number = 0; k < slist.armyEntries.length; k++) {
                    if (k == i || (k < i && before) || (k > i && after))
                        continue;

                    if (canAttach(slist.armyEntries[i].children[j].entry,
                        slist.armyEntries[i].children[j].choice,
                        slist.armyEntries[k], slist.theme)) {
                        if (k < i)
                            before = true;
                        else
                            after = true;
                    }
                }

                let cpc : number = slist.armyEntries[i].children[j].listCost();

                if (cpc != null && isCaster(slist.armyEntries[i].entry)
                    && isWarnoun(slist.armyEntries[i].children[j].entry)) {
                    let bgp2: number = bgp - cpc;
                    let nonbgp2: number = nonbgp + cpc;

                    if (Math.max(bgp2 - (slist.armyEntries[i].entry.bgp || 0), 0)
                        + nonbgp2 > al.getListSize()) {
                        before = false;
                        after = false;
                    }
                }


                for (let k: number = 0; k < slist.armyEntries[i].children[j].viewData['div'].children.length; k++) {
                    if (slist.armyEntries[i].children[j].viewData['div'].children[k].className == "ubut") {
                        (<HTMLElement>slist.armyEntries[i].children[j].viewData['div'].children[k]).style.display =
                            before ? "" : "none";
                    }
                    else if (slist.armyEntries[i].children[j].viewData['div'].children[k].className == "dbut") {
                        (<HTMLElement>slist.armyEntries[i].children[j].viewData['div'].children[k]).style.display =
                            after ? "" : "none";

                    }
                }

            }
        }

        let displayed : { [n : number] : boolean } = {};


        for (let i: number = 0; i < this.divs.length; i++) {
            let entry : Entry = this.divs[i].entry;

            if (slist.inTheme()) {
                //console.log(this.divs[i].entry.n);

                let valid: boolean = true;

                if( slist.theme.forceMercBond 
                    && this.divs[i].entry.fid != slist.theme.fid() 
                    && isWarnoun(this.divs[i].entry) 
                    && this.divs[i].entry.fa == "C" 
                    && !slist.isBondable(this.divs[i].entry)) 
                {
                    valid = false;
                }


                if (valid && (slist.theme.isAllowed(this.divs[i].entry, slist.pal.rules)
                    || slist.isBondable(this.divs[i].entry) ) ) 
                {

                    this.divs[i].div.style.display = "";
                    this.divs[i].parent.style.display = "";

                    let fa : string = slist.entryFA(this.divs[i].entry);

                    (<HTMLElement>this.divs[i].div.children[1].firstChild)
                        .children[1].firstChild.nodeValue = fa;

                    let divName = (<HTMLElement>this.divs[i].div.children[0])

                    let className : string = divName.className;

                    divName.className = className;
                }
            }
            else {

                if(entry.themeExtra &&
                        entry.fid != slist.pal.factionID 
                        && (!entry.wf || entry.wf.indexOf(slist.pal.factionID) == -1 )
                        )
                {
                    this.divs[i].div.style.display = "none";
                    this.divs[i].parent.style.display = "none";
                }
                else if (entry.themeunique &&
                    (!slist.inTheme() || entry.themeunique != slist.theme.id()) ) 
                {
                    this.divs[i].div.style.display = "none";
                    this.divs[i].parent.style.display = "none";
                }
                else if (slist.pal.getListType() && slist.pal.getListType().coi && 
                    (!companyOfIron(entry)
                        || entry.fid != slist.pal.factionID
                    ) ) {
                    this.divs[i].div.style.display = "none";
                    this.divs[i].parent.style.display = "none";
                }
                else {
                    let fa : string = slist.entryFA(entry);

                    (<HTMLElement>this.divs[i].div.children[1].firstChild)
                        .children[1].firstChild.nodeValue = fa;

                    displayed[i] = true;
                }
            }

            if( al.getListType() && al.getListType().champions && isCaster(entry) ) {
                if( !entry.adr
                    || entry.adr.indexOf(al.getListType().season) == -1 ) {
                        this.divs[i].div.style.display = "none";
                    }
            }
        }

        for( let i in displayed ) {
            this.divs[i].parent.style.display = "";
        }

        for (let i: number = 0; i < this.options.length; i++) {
            let eo: EntryOption = this.options[i];

            let validRet: [boolean, number, boolean] =
                slist.optionValid(eo.entry, eo.choice, null, nonbgp);
            let valid: boolean = validRet[0];
            let cost: number = validRet[1];
            let modified: boolean = validRet[2];

            valid = valid && (modified || cost >= 0);


            eo.div.className = valid ? "ob bh" : "obd";

            if (modified) {
                eo.div.className += " otm";
            }
            else if( slist.inTheme() ) {
                if( slist.theme.isEntryRequired(eo.entry)
                    && slist.theme.isFreebie(eo.entry, eo.choice) ) {
                        eo.div.className += " bothm";
                }
                else if( slist.theme.isEntryRequired(eo.entry) ) {
                        eo.div.className += " reqm";
                }
                else if( slist.theme.isFreebie(eo.entry, eo.choice) ) {
                        eo.div.className += " freem";
                }

            }


            if (eo.entry.bgp == null) {
                eo.div.firstChild.nodeValue = ""  + (cost >= 0 ? cost : "-");
            }
        }

        // Check limited options
        // for now this is for super juniors, so we can be kinda 
        // rough
        for (let i: number = 0; i < this.limitedOptions.length; i++) {
            let eo: EntryOption = this.limitedOptions[i];

            let validRet: [boolean, number, boolean] =
                slist.optionValid(eo.entry, eo.choice, eo.parent, nonbgp);
            let valid: boolean = validRet[0];
            let cost: number = validRet[1];
            let modified: boolean = validRet[2];

            console.log("Valid: " + valid + " - " + eo.entry.n);

            valid = valid && (modified || cost >= 0);


            eo.div.className = valid ? "ob bh" : "obd";

            if (modified) {
                eo.div.className += " otm";
            }
            else if( slist.inTheme() ) {
                if( slist.theme.isEntryRequired(eo.entry)
                    && slist.theme.isFreebie(eo.entry, eo.choice) ) {
                        eo.div.className += " bothm";
                }
                else if( slist.theme.isEntryRequired(eo.entry) ) {
                        eo.div.className += " reqm";
                }
                else if( slist.theme.isFreebie(eo.entry, eo.choice) ) {
                        eo.div.className += " freem";
                }

            }


            if (eo.entry.bgp == null) {
                eo.div.firstChild.nodeValue = ""  + (cost >= 0 ? cost : "-");
            }
        }


        if (this.srCategory) {
            this.srCategory.style.display = (al.getListType() && al.getListType().steamroller) 
                ? "" : "none";
        }

        slist.view.validate(this.rules);
        this.adjustScroll();
    }


    buildEntryDiv(al: ArmyList, entry: Entry, allowUA: boolean, parent? : ArmyEntry, 
            skipUpdate? : boolean) : HTMLDivElement 
    {
        // if (entry.league != null)
        //     return null;

        // if (entry.old)
        //     return null;

        if (entry.C == null && entry.bgp == null)
            return null;

        let div: HTMLDivElement = document.createElement("div");
        div.className = "entry innerpanel";

        let ndiv: HTMLDivElement = document.createElement("div");

        // Debug debug
        ndiv.appendChild(document.createTextNode(entry.n));
	//ndiv.appendChild(document.createTextNode(entry.id + " - " + entry.n));

        if (entry.n.length > 35) {
            ndiv.style.fontSize = "12pt";
        }

        if( isPreRelease(entry, this.rules) ) {
            ndiv.className += " prerelease";
        }
        else if( isCID(entry, this.rules) ) {
            ndiv.className += " cid";
        }
        else if( isNarrative(entry, this.rules) ) {
            ndiv.className += " narrative";
        }

        div.appendChild(ndiv);

        let optDiv: HTMLDivElement = document.createElement("div");

        optDiv.className = "elopt";

        let faDiv: HTMLDivElement = document.createElement("div");
        faDiv.className = "fa";
        let faDiv1: HTMLDivElement = document.createElement("div");
        faDiv1.appendChild(document.createTextNode("FA"));
        let faDiv2: HTMLDivElement = document.createElement("div");
        faDiv2.appendChild(document.createTextNode(" "));

        faDiv.appendChild(faDiv1);
        faDiv.appendChild(faDiv2);

        optDiv.appendChild(faDiv);

        div.appendChild(optDiv);

        if (entry.v != null) {
            ndiv.className = "cvp";

            if (isPreRelease(entry, this.rules) ) {
                ndiv.className += " prerelease";
            }
            else if( isCID(entry, this.rules) ) {
                ndiv.className += " cid";
            }
            else if( isNarrative(entry, this.rules) ) {
                ndiv.className += " narrative";
            }

            div.className += " cvd";
            optDiv.className += " cvo1";
            faDiv.className += " cvo2";
        }

        let stdiv : HTMLDivElement = document.createElement("div");
        stdiv.className = "entrysubtitle";
        stdiv.appendChild(document.createTextNode(subtitle(entry)));
        div.appendChild(stdiv);

        stdiv.onclick = () => { CardViewer.viewCard(entry); };
        ndiv.onclick = () => { CardViewer.viewCard(entry); };



        if (entry.C != null) {
            for (let i = 0; i < entry.C.length; i++) {
                let op: HTMLDivElement = document.createElement("div");
                op.className = "ob bh";
                op.appendChild(document.createTextNode("" + entry.C[i]));

                let ed: Editor = this;

                op.onclick = (function () {
                    let myEntry = entry;
                    let myChoice = i;
                    let myEditor: Editor = ed;
                    let myParent : ArmyEntry = parent || null;

                    return function () {
                        myEditor.currentList.al.current()
                            .insertEntry(myEntry, myChoice, myParent, false,
                            null, false);

                        myEditor.endChange();
                    };
                })();

                optDiv.appendChild(op);

                if( !skipUpdate ) {
                    ed.options.push({
                        "entry": entry,
                        "pc": entry.C[i],
                        "choice": i,
                        "div": op,
                        "pdiv": div
                    });
                }
                else {
                    ed.limitedOptions.push({
                        "entry": entry,
                        "pc": entry.C[i],
                        "choice": i,
                        "div": op,
                        "pdiv": div,
                        "parent": parent
                    });
                }
            }
        }
        else if (entry.bgp != null) {
            let op: HTMLDivElement = document.createElement("div");
            op.className = "ob bh";
            op.appendChild(document.createTextNode("+" + entry.bgp));

            let ed: Editor = this;

            op.onclick = (function () {
                let myEntry: Entry = entry;
                let myEditor: Editor = ed;

                return function () {
                    myEditor.currentList.al.current()
                        .insertEntry(myEntry, null, null, false, null, false);

                    myEditor.endChange();

                };
            })();

            optDiv.appendChild(op);

            ed.options.push({
                "entry": entry,
                "choice": 0,
                "pc": entry.bgp,
                "div": op,
                "pdiv": div,
            });

        }


        if (entry.v != null) {
            let vdiv: HTMLDivElement = document.createElement("div");
            vdiv.className = "cv";

            vdiv.onclick = () => { CardViewer.viewCard(entry); };


            if ( isPreRelease(entry, this.rules) ) {
                vdiv.className += " prerelease";
            }
            else if( isCID(entry, this.rules) ) {
                vdiv.className += " cid";
            }
            else if( isNarrative(entry, this.rules) ) {
                vdiv.className += " narrative";
            }

            vdiv.appendChild(document.createTextNode(entry.v));
            div.appendChild(vdiv);
        }

        return div;
    }

    attachUnit(caster: ArmyEntry, slist: SubList, autopick: boolean): void {

        if (Dialog.active()) {
            return;
        }

        let dlg: Dialog = new Dialog(() => this.limitedOptions = [], 
            "Attach Unit", "person_add");

        let auto: (ev: MouseEvent) => any = null;
        let count: number = 0;

        let added: { [n: number]: boolean } = {};

        let bgp: number[] = slist.bgCost();
        let nonbgp: number = slist.nonbgCost();


        if( caster.entry.xbg ) {
            let attachments : Entry[] = [];

            for (let id in Data._data.entries) {
                let e : Entry = Data._data.entries[id];

                if( caster.entry.atf(e, 0) && validateRules(e, slist.pal.rules) ) {
                    attachments.push(e);
                }
            }        
            
            attachments.sort((a : Entry, b : Entry) => {
                if( a.n == b.n ) {
                    return 0;
                }
                else if( a.n > b.n ) {
                    return 1;
                }
                else {
                    return -1;
                }
            });

            for( let e of attachments ) {
                let node : HTMLDivElement = this.buildEntryDiv(slist.pal, e, false, 
                    caster, true);
                dlg.content.appendChild(node);
                count++;

            }

            this.syncOptions();
        }
        else for (let i: number = 0; i < this.options.length; i++) {
            
            if (canAttach(this.options[i].entry, this.options[i].choice, caster, slist.theme)) {

                let pdiv: HTMLDivElement = this.options[i].pdiv;

                if (pdiv.style.display == "none")
                    continue;

                count++;

                if (added[this.options[i].entry.id])
                    continue;

                added[this.options[i].entry.id] = true;

                let option: EntryOption = this.options[i];


                if (count == 1) {
                    auto = this.options[i].div.onclick;
                }

                let node: HTMLElement = <HTMLElement>pdiv.cloneNode(true);
                let aec: Editor = this;

                let choice: number = 0;

                for (let j: number = 0; j < pdiv.children.length; j++) {
                    if (pdiv.children[j].className == "elopt") {
                        for (let k: number = 0; k < (<HTMLElement>pdiv.children[j]).children.length; k++) {
                            if ((<HTMLElement>pdiv.children[j]).children[k].className.substr(0,5) == "ob bh") {

                                let validRet: [boolean, number, boolean] =
                                    slist.optionValid(this.options[i].entry,
                                        this.options[i].choice, caster, nonbgp);

                                if( !validRet[0] ) {
                                 (<HTMLElement>node.children[j]).children[k].className = "obd";
                                }

                                if (validRet[2] &&
                                    (<HTMLElement>node.children[j]).children[k].className.indexOf("otm") == -1 ) {
                                    (<HTMLElement>node.children[j]).children[k].className += " otm";
                                }

                                (<HTMLElement>(<HTMLElement>node.children[j]).children[k]).onclick = (function () {
                                    let myThis: Editor = aec;
                                    let mySlist: SubList = slist;
                                    let myOption: EntryOption = option;
                                    let myParent: ArmyEntry = caster;
                                    let myChoice: number = choice;
                                    let myDlg: Dialog = dlg;

                                    return function () {
                                        let newParent = mySlist.insertEntry(myOption.entry,
                                            myChoice, myParent, false, null, false)[0];

                                        myThis.endChange();

                                        myDlg.close();

                                        mySlist.pal.aec.attachUnit(newParent, mySlist, false);

                                    };

                                })();

                                choice++;

                            }
                        }
                    }
                }

                dlg.content.appendChild(node);
            }
        }

        if (count == 1 && autopick) {
            auto(null);
        }
        else if (count > 0) {
            dlg.show();
        }
        else if (count == 0) {
            dlg.close();
        }
    }


    static help(): void {
        document.getElementById("helpDialog").style.display = "";
    }


    buildToolbar(alv: ArmyListView): HTMLDivElement {
        let toolbar: HTMLDivElement = document.createElement("div");

        toolbar.className = "toolbar listFooter";

        var tbfunc: (cn: string, callback: () => void, tt: string, extra?: HTMLElement, ttmod?: string) => HTMLDivElement
            = function (cn: string, callback: () => void, tt: string, extra?: HTMLElement, ttmod?: string): HTMLDivElement {
                let ret: HTMLDivElement = document.createElement("div");

                ret.className = cn + " tth tth2";

                ret.onclick = callback;

                if (extra) {
                    ret.appendChild(extra);
                }

                let span: HTMLSpanElement = document.createElement("span");

                span.className = "ttt";

                if (ttmod) {
                    span.className += " " + ttmod;
                }

                //span.appendChild(document.createTextNode(tt));
                span.innerHTML = tt;

                ret.appendChild(span);

                return ret;
            };


        toolbar.appendChild(tbfunc("undobut", () => { this.undo(); }, "Undo (ctrl-z)"));
        toolbar.appendChild(tbfunc("redobut", () => { this.redo(); }, "Redo (ctrl-y)"));

        toolbar.appendChild(tbfunc("clearbut",
            () => { this.currentList.al.clearList(); }, "Clear list (ctrl-x)"));

        // toolbar.appendChild(tbfunc("saveimgbut",
        //     () => { saveAsImage(this.currentList); }, "Save as image (ctrl-s)"));

        toolbar.appendChild(tbfunc("printbut", () => { this.printList(); }, "Print (ctrl-p)"));
        toolbar.appendChild(tbfunc("clipbut",
            () => { Clipboard.copy(this.currentList.al.getTextList()); }
            , "Copy to clipboard (ctrl-c)<br>(Ctrl-B to copy BBCode)", undefined, "ttbig"));

        let linka: HTMLAnchorElement = document.createElement("a");
        linka.href = "CC_URL";
        linka.target = "_blank";

        alv.linkA = linka;

        let adiv: HTMLDivElement = tbfunc("linkbut", null, "Permanent link", linka);

        toolbar.appendChild(adiv);

        let qdiv: HTMLDivElement =
            tbfunc("quitbut", () => { this.quitCallback(); }, "Exit to Main"); // this.exitTooltip);
        qdiv.appendChild(document.createTextNode(this.exitIcon));
        toolbar.appendChild(qdiv);

        //toolbar.appendChild(tbfunc("helpbut", Editor.help, "Help"));

        return toolbar;
    }

    launchSearch(): void {
        //if (Dialog.active() || _editor == null || _editor.currentList == null) {
        if (Dialog.active()) {
            return;
        }

        let search: Search = new Search(this);
        search.clickSearch();
    }

    static handleKeyPress(evtobj: any) : boolean {
        if (Editor.currentEditor) {
            return Editor.currentEditor.handleKeyPress(evtobj);
        }
        else {
            return false;
        }
    }

    handleKeyPress(evtobj: any) : boolean {
        if (evtobj.ctrlKey) {
            if (evtobj.keyCode == 90) {
                this.undo();
                evtobj.preventDefault();
                return true;
            }
            else if (evtobj.keyCode == 89) {
                this.redo();
                evtobj.preventDefault();
                return true;
            }
            else if( evtobj.keyCode == 66) {
                Clipboard.copy(this.currentList.al.getBBList());
                return true;
            }
            else if (evtobj.keyCode == 67) {

                if (evtobj.shiftKey) {
                    Clipboard.copy(this.currentList.al.getDiscordList());
                }
                else {
                    Clipboard.copy(this.currentList.al.getTextList());
                }

                evtobj.preventDefault();
                return true;
            }
            else if (evtobj.keyCode == 83) {
                saveAsImage(this.currentList);
                evtobj.preventDefault();
                return true;
            }
            else if (evtobj.keyCode == 88) {
                this.currentList.al.clearList();
                evtobj.preventDefault();
                return true;
            }
            else if (evtobj.keyCode == 70) {
                this.launchSearch();
                evtobj.preventDefault();
                return true;
            }
            else if (evtobj.keyCode == 80) {
                this.printList();

                // this.pickRandom();
                // this.endChange();

                evtobj.preventDefault();
                return true;
            }
        }
        else if (evtobj.keyCode == 191) {
            this.launchSearch();
            evtobj.preventDefault();
            return true;
        }

        return false;
    }

    static displayList(code: string, options? : Rules): HTMLDivElement {
        let slist: StoredList = parseCode(code);

        let alv: ArmyListView = new ArmyListView(false, slist.f,
            //slist.t, slist.l.size, 
            null, options);

        Editor.initializeFaction(slist.f, alv.al, null);

        //console.log(options);

        alv.al.restoreState(slist, options);

        for( let i : number = 0; i < alv.al.subLists.length; i++ ) {
            alv.al.subLists[i].endChange();
        }

        let div: HTMLDivElement = document.createElement("div");
        div.className = "conflictchamber";
        div.appendChild(alv.rootNode);

        let link: HTMLAnchorElement = document.createElement("a");
        link.className = "staticlink";
        link.href = "http://localhost?" + code;
        link.target = "_blank";

        alv.rootNode.appendChild(link);

        return div;

    }

    restoreCode(code: string): ArmyListView {
        let stored: StoredList = parseCode(code);

        if (stored) {
            let al: ArmyListView = this.restoreStored(stored, true);
            this.endChange();
            return al;
        }
        else {
            this.endChange();
            return null;
        }
    }

    restoreStored(stored: StoredList, interactive: boolean): ArmyListView {
        //console.log(stored);

        let rules : Rules = null;

        if( this.getEventMode() && this.rules ) {
            rules = this.rules;
            stored.t = this.rules.listType;
        }


        this.editorOuter.style.display = "";

        let el: HTMLElement = this.entryInner;

        while (el.hasChildNodes()) {
            el.removeChild(el.lastChild);
        }

        this.reset();

        let alist: ArmyListView = this.loadFaction(stored.f, interactive);
        alist.al.restoreState(stored, rules);

        // fixme
        // if( this.getEventMode() && this.rules ) {
        //     this.factionList.setListType(this.rules.listType);
        // }
        // else {
        //     this.factionList.setListType(stored.t);
        // }

        this.currentList = alist;

        this.show();

        return alist;
    }



    endChange(): void {
        this.currentList.al.endChange();
        this.syncOptions();

        this.pushState();

        this.currentList.al.current().view.updateHeader();

        let ccode : string = this.currentList.al.toCode();

        let a: HTMLAnchorElement = this.currentList.linkA;
        a.href = "http://localhost?" + encodeURIComponent(ccode);

        if( this.listCallback ) {
            this.listCallback(ccode);
        }
    }

    windowResized() : void {
        if( this.currentList ) {
            this.currentList.windowResized();
        }
    }


    collapseAll(): void {
        for (let i: number = 0; i < this.entryLists.length; i++) {
            this.entryLists[i].close();
        }

        this.adjustScroll();
    }


    listOptions(): void {
        if (Dialog.active()) {
            return;
        }

        let fs : FactionSelection = new FactionSelection(
            (fid : number, rules : Rules, fs : FactionSelection) => {

                //console.log("listOptions callback");
                //console.log(fid);
                //console.log(rules);

                if( fid != -1 && fid != this.currentList.al.factionID ) {
                    this.reset();
                    this.loadFaction(fid, true);
                }

                this.endChange();
            },
            this.rules,
            true);

        fs.showDialog();
    }



    inputSize(): void {
        // fixme big

        // let input: HTMLInputElement = this.factionList.sizeinput;

        // let size: number = parseInt(input.value);

        // if (size <= 0) {
        //     this.setSize(75);
        //     input.value = '';
        //     input.className = 'sizeinput';
        // }
        // else {
        //     this.setSize(size, true);
        //     input.className = 'sizeinput sisel';
        // }
    }


    adjustScroll(): void {
        let height: number = window.innerHeight;

        this.entryListHolder.style.height = "" + (height - 44) + "px";
        this.entryScroll.style.height = "" + (height - 104) + "px";

        this.entryScroll.style.paddingLeft = "20px";

        if (this.entryListHolder.clientWidth > 400) {
            this.entryScroll.style.paddingLeft = ""
                + (20 - (this.entryListHolder.clientWidth - 400)) + "px";
        }
        else {
            this.entryScroll.style.paddingLeft = "20px";
        }


    }

    static tournamentValidation(code: string, rules : Rules)
            : { failureCount : number, casters: Entry[] }  {

        let slist: StoredList = parseCode(code);

        let al: ArmyList = new ArmyList(null, false, slist.f,
            //slist.t, slist.l.size, 
            null, rules);

        //Editor.initializeFaction(slist.f, al, null);

        al.restoreState(slist);

        let casterList : Entry[] = [];

        for( let i : number = 0; i < al.subLists.length; i++ ) {
            for( let j : number = 0; j < al.subLists[i].casters.length; j++ ) {
                casterList.push(al.subLists[i].casters[j].entry);
            }
        }

        return {
            failureCount: al.getValidationFailures(rules),
            casters : casterList
         };
    }

    static buildSheet(code? : string, player? : string, teamName? : string,
            logo? : string, title? : string, rounds? : number ) : HTMLDivElement {

        if( !rounds ) {
            rounds = 5;
        }

        let stored : StoredList = null;
        let textList : string[][][] = null;

        if( code ) {
            stored = parseCode(code);
            textList = ArmyList.fromCode(code).getTextArray();

            //console.log(textList);
        }
        else {
            textList = [[], []];
        }


        function td(cl? : string, text? : string, wrapText? : boolean)
            : HTMLTableCellElement {
                let ret : HTMLTableCellElement = document.createElement("td");

                if( cl ) {
                    ret.className = cl;
                }

                if( text ) {
                    //ret.appendChild(document.createTextNode(text));

                    if( wrapText ) {
                        let innerDiv : HTMLDivElement = document.createElement("div");
                        innerDiv.appendChild(document.createTextNode(text));
                        ret.appendChild(innerDiv);
                    }
                    else {
                        ret.innerHTML = text;
                    }
                }

                return ret;
        }

        function tr(cl? : string) : HTMLTableRowElement {
            let ret : HTMLTableRowElement = document.createElement("tr");

            if( cl ) {
                ret.className = cl;
            }

            return ret;
        }

        let ret : HTMLDivElement = document.createElement("div");
        ret.className = "srprint srpr" + rounds;

        let titlediv : HTMLDivElement = document.createElement("div");
        titlediv.className = logo ? "srsheetheaderlogo" : "srsheetheader";

        if( title ) {
            titlediv.appendChild(document.createTextNode(title));
        }
        else {
            titlediv.appendChild(document.createTextNode("2017 Steamroller Record Sheet"));
        }

        ret.appendChild(titlediv);


        if( logo ) {
            let logoimg : HTMLImageElement = document.createElement("img");
            logoimg.src = logo;
            logoimg.className = "logoimg";
            ret.appendChild(logoimg);
        }


        let tNameFaction : HTMLTableElement = document.createElement("table");
        tNameFaction.className = "srtable";

        if( logo ) {
            tNameFaction.className += " pgwidthlogo";
        }
        else {
            tNameFaction.className += " pgwidth";
        }


        let tnheader : HTMLTableElement = document.createElement("table");
        tnheader.className = (logo ? "pgwidthlogo" : "pgwidth") + " tnheader";

        if( teamName ) {
            tnheader.className += " nfteam";
        }
        else {
            tnheader.className += " nfnoteam";
        }

        let tnhr : HTMLTableRowElement = tr();
        tnheader.appendChild(tnhr);

        if( teamName ) {
            tnhr.appendChild(td(null, "Team"));
        }

        tnhr.appendChild(td(null, "Player Name"));
        tnhr.appendChild(td(null, "Faction"));
        ret.appendChild(tnheader);


        let tre : HTMLTableRowElement = null;

        let tde : HTMLTableCellElement = null;


        tre = tr("srodd");

        if( teamName ) {
            // let tnheader : HTMLTableElement = document.createElement("table");
            // tnheader.className = "pgwidthlogo nfteam tnheader";
            // let tnhr : HTMLTableRowElement = tr();
            // tnheader.appendChild(tnhr);
            // tnhr.appendChild(td(null, "Team"));
            // tnhr.appendChild(td(null, "Player Name"));
            // tnhr.appendChild(td(null, "Faction"));
            // ret.appendChild(tnheader);

            //tre = tr("sreven");
            tde = td(null, teamName);
            //tde.colSpan = 2;
            tre.appendChild(tde);
            //tNameFaction.appendChild(tre);
            tre.className += " teamheadrow";

            tNameFaction.className += " nfteam";
        }
        else {
            tNameFaction.className += " nfnoteam";

        }

        //tre = tr("srodd");
        tde = td("nfrow",
            ("") + (player ? player : ""));

        tre.appendChild(tde);

        tde = td("nfrow",
            ("") + (stored ? Data._data.factions[stored.f].n : ""));

        tre.appendChild(tde);

        tNameFaction.appendChild(tre);
        ret.appendChild(tNameFaction);



        let div : HTMLDivElement = null;
        div = document.createElement("div");
        div.className = "srsep";
        ret.appendChild(div);

        let tHist : HTMLTableElement = document.createElement("table");
        ret.appendChild(tHist);
        tHist.className = "srtable pgwidth";
        tre = tr("histheader histrow");
        tHist.appendChild(tre);
        tre.appendChild(td(null, "Round"));
        tre.appendChild(td(null, "Opponent Name"));
        tre.appendChild(td(null, "List Played"));
        tre.appendChild(td(null, "Result"));
        tre.appendChild(td(null, "Control Points"));
        tre.appendChild(td(null, "Opponent Army Points Destroyed or Removed from Play"));

        if( title == "2017 Americas Team Championship") {
            tre.appendChild(td(null, "Rounds"));
        }

        for( let i : number = 1; i <= rounds; i++ ) {
            tre = tr(i % 2 == 0 ? "histrow sreven" : "histrow srodd");
            tre.appendChild(td(null, "" + i));
            tre.appendChild(td());
            tre.appendChild(td(null, "1&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;2"));
            tre.appendChild(td(null, "W&nbsp;&nbsp;/&nbsp;&nbsp;L&nbsp;&nbsp;/&nbsp;&nbsp;T"));
            tre.appendChild(td());
            tre.appendChild(td());

            if( title == "2017 Americas Team Championship") {
                tre.appendChild(td());
            }

            tHist.appendChild(tre);
        }

        div = document.createElement("div");
        div.className = "srsep";
        ret.appendChild(div);


        let tLists : HTMLTableElement = document.createElement("table");
        ret.appendChild(tLists);
        tLists.className = "srlists srlists" + textList.length + " pgwidth";

        let outer : HTMLTableRowElement = tr();
        tLists.appendChild(outer);

        for( let i : number = 1; i <= textList.length; i++ ) {

            let longlist : boolean = false;

            let ls : ListState = null;
            let textSubList : string[][] = null;

            if( i > 1 ) {
                outer.appendChild(td("srvsep"));

                if( stored ) {
                    ls = i == 2 ? stored.m : stored.n;
                }

                if( textList && textList.length > 1 ) {
                    textSubList = textList[i - 1];
                }
            }
            else if ( i == 1 ) {
                if( stored ) {
                    ls = stored.l;
                }

                if( textList && textList.length > 0 ) {
                    textSubList = textList[0];
                }
            }

            let hasObjective : boolean = false;
            let hasSpecialists : boolean = false;

            if( textSubList ) {

                for( let k : number = 0; k < textSubList.length; k++ ) {
                    if( textSubList[k][0].indexOf("(Objective)") != -1 ) {
                        hasObjective = true;
                    }

                    if( textSubList[k][0].indexOf("(S)") != -1 ) {
                        hasSpecialists = true;
                    }
                }

                let listMod : number = 0;

                if( hasObjective) {
                    listMod -= 1;
                }

                if( hasSpecialists ) {
                    listMod += 2;
                }

                if (textSubList.length + listMod > 22 ) {
                    longlist = true;
                    console.log("long list!");
                }
            }

            let tList : HTMLTableElement = document.createElement("table");
            tList.className = "srlist srlist" + textList.length;

            tre = tr("srlistheader srbold");
            tde = td(null, "Army List " + i);
            tde.colSpan = 2;
            tre.appendChild(tde);
            tList.appendChild(tre);


            let tft : string = "Theme Force: ";

            let themeData : ThemeData = null;


            if( ls && ls.tl ) {
                if( ls.tl < 0 ) {
                    themeData = Data._data.themelists[ls.tl];
                }
                else {
                    themeData = Data._data.themelists[ls.tl];
                }

            }


            tft += themeData ? themeData.n : " (None)";

            tre = tr("srodd");
            tde = td(null, tft);
            tde.colSpan = 2;
            tre.appendChild(tde);
            tList.appendChild(tre);

            let tf1 : string = "(No theme benefit)";
            let tf2 : string = "(No theme benefit)";

            if( !code ) {
                tf1 = "Theme benefit: ";
                tf2 = "Theme benefit: ";
            }

            if( themeData )  {
                tf1 = themeData.tb[0];
                tf2 = themeData.tb[1];
            }

            tre = tr("sreven");

            tde = td(tf1 && tf1.length > 60 ? "tblarge" : "themebenefit", tf1);
            tde.colSpan = 2;
            tre.appendChild(tde);
            tList.appendChild(tre);

            tre = tr("srodd");
            tde = td(tf2 && tf2.length > 60 ? "tblarge" : "themebenefit", tf2);
            tde.colSpan = 2;
            tre.appendChild(tde);
            tList.appendChild(tre);

            tre = tr("sreven");

            if( longlist ) {
                tre.className += " srshortheader";
            }

            tre.appendChild(td(null, "Model"));

            if( textList.length > 2 ) {
                tre.appendChild(td(null, "PC"));
            }
            else {
                tre.appendChild(td(null, "Point Cost"));
            }
            tList.appendChild(tre);

            let objstr : string = "";
            let skipped : number = 0;

            let listrows : number = 21;
            let listclass : string = "srlistrow srlistrow" + textList.length;

            if( longlist ) {
                listrows = 29;
                listclass = "srlistrowshort";
            }

            let actualRows : [string, string][] = [];

            for( let j : number = 0; j < textSubList.length; j++ ) {
                let mname : string = textSubList[j][0];
                let pcost : string = textSubList[j][1];

                if( mname.indexOf("(Objective)") != -1 ) {
                    objstr = mname.substr(0, mname.indexOf("(Objective)"));
                }
                else if( mname.indexOf("(S)") == -1 ) {
                    actualRows.push([mname, pcost]);
                }
            }

            if( hasSpecialists ) {
                actualRows.push(["", ""]);
                actualRows.push(["-- Specialists --", ""]);

                for( let j : number = 0; j < textSubList.length; j++ ) {
                    let mname : string = textSubList[j][0];
                    let pcost : string = textSubList[j][1];

                    if( mname.indexOf("(S)") != -1 ) {
                        actualRows.push([mname, pcost]);
                    }
                }

            }

            if( actualRows.length > listrows ) {
                console.log("Overlong list detected");
            }

            for( let j = 0; j < listrows; j++ ) {
                tre = tr(j % 2 == 0 ? listclass + " srodd" : listclass + " sreven");

                let mname : string = null;
                let pcost : string = null;

                if( j < actualRows.length ) {
                    mname = actualRows[j][0];
                    pcost = actualRows[j][1];
                }

                if( mname && mname.indexOf("(S)") != -1 ) {
                    tre.className += " srspec";
                }

                tre.appendChild(td(null, mname, true));
                tre.appendChild(td(null, pcost, true));
                tList.appendChild(tre);
            }

            tre = tr("sreven");

            if( longlist ) {
                tre.className += " srshortheader";
            }

            // Todo: Fix objective line

            if( objstr && objstr.length > 1 ) {
                tde = td(null, "Objective: " + objstr);
                tde.colSpan = 2;
                tre.appendChild(tde);
                tList.appendChild(tre);
            }
            else {
                tde = td(null, "");
                tre.appendChild(tde);
                tre.appendChild(td(null, ""));
                tList.appendChild(tre);
            }

            tde = td();
            tde.appendChild(tList);
            outer.appendChild(tde);


        }

        let printpb = document.createElement("div");
        printpb.className = "page-break";
        ret.appendChild(printpb);

        return ret;
    }

    static clearPrintout() : HTMLDivElement {
        let div : HTMLDivElement =
            <HTMLDivElement>document.getElementById("printout");

        while( div.hasChildNodes() ) {
            div.removeChild(div.lastChild);
        }

        return div;
    }


    static printList(code : string, 
                playerName? : string, 
                rounds? : number, 
                eventName? : string,
                img? : string,
                rules? : Rules) : void {


        buildPDFSheet(code, playerName, {
            title : eventName,
            rounds : rounds,
            logo : img,
            qrcode : true
        }, rules);

        // Editor.clearPrintout().appendChild(Editor.buildSheet(code, playerName, null, img, eventName, rounds));
        // (<any>window).print();
    }


    printList() : void {
        let rules : Rules = null;

        if( this.currentList.al.rules ) {
            rules = this.currentList.al.rules;
        }

        Editor.printList(this.currentList.al.toCode(),
            null,
            null,
            null,
            null,
            rules);
    }




}




//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
//}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
