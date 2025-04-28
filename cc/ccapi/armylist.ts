
import { SubList, ISubListView } from "./sublist";
import { Magic, Rules, ArmyEntry, StoredList, ListState, ThemeData, ListType } from "./defines";
// import { Theme, ThemeApplication } from "./theme";
// import { Entry, canAttach, isWarnoun } from "./entry";
import { Data } from "./data";
import { encodeChar, encodeCharSingle, encodeSubList } from "./encoding";
import { parseCode } from "./ccapi";


export interface IEntryCallback {
    // entryCallback(sl: SubList, entry: Entry,
    //     choice: number, parent: ArmyEntry,
    //     restore: boolean, interactive: boolean): void;

    attachUnit(data: ArmyEntry, slist: SubList,
        autopick: boolean): void;

    syncOptions(al: ArmyList): void;

    listOptions(): void;
    endChange(): void;
}


export interface IArmyListView {
    createSubListView(sl : SubList) : ISubListView;
    repositionLists(): void;
}



export class ArmyList {
    //listSize: number;
    //private _lt: ListType;

    factionID: number;
    subLists: SubList[];
    index: number;
    interactive: boolean;
    aec: IEntryCallback;
    rules : Rules = {};

    alv: IArmyListView;

    getListSize() : number {
        return this.rules.listSize;
    }

    setListSize(size : number) : void {
        this.rules.listSize = size;
    }

    maxCasters(): number {
        if (this.getListSize() >= 125) {
            return Math.floor((this.getListSize() + 25) / 75);
        }
        else {
            return 1;
        }
    }

    inADR() : boolean {
        if( !this.getListType() ) {
            return false;
        }

        if( this.getListType().forceSpecialists ) {
            return true;
        }
        
        if( !this.getListType().adr ) {
            return false;
        }

        if( this.subLists.length > this.getListType().maxLists ||
            this.subLists.length < this.getListType().minLists ) {
                return false;
        }

        for( let i : number = 0; i < this.subLists.length; i++ ) {
            let slist : SubList = this.subLists[i];

            if( !slist.hasCaster() ) {
                return false;
            }

            if( !slist.casters[0].entry.adr
                || slist.casters[0].entry.adr.indexOf(this.getListType().season) == -1 ) {
                    return false;
            }
        }

        return true;
    }

    getValidationText(rules : Rules, thisMode : boolean) : string {
        let ret : string = "";

        for( let i : number = 0; i < this.subLists.length; i++ ) {
            this.subLists[i].validate(
                function(text: string, sl : SubList, warn? : boolean)
                {
                    //console.log("Failed: " + text);
                    ret += text + "\n";
                },
                rules, thisMode
            );
        }   

        return ret;
    };

    /**
     * Test for CID status
     */
    isCID() : boolean {
        for( let i : number = 0; i < this.subLists.length; i++ ) {
            if( this.subLists[i].isCID() ) {
                return true;
            }
        }

        return false;
    }

    getValidationFailures(rules : Rules) : number {
        //console.log(this);

        let ret : number = 0;

        for( let i : number = 0; i < this.subLists.length; i++ ) {
            ret += this.subLists[i].validate(
                function(text: string, sl : SubList, warn? : boolean)
                {
                    //console.log("Failed: " + text);
                },
                rules, true
            );
        }

        return ret;
    }

    getValidationState(rules : Rules) : number {
        //console.log(this);
        let valState : number = 0;

        for( let i : number = 0; i < this.subLists.length; i++ ) {
            this.subLists[i].validate(
                function(text: string, sl : SubList, warn? : boolean)
                {
                    if( warn && valState < 2 ) {
                        valState = 1;
                    }
                    else {
                        valState = 2;
                    }
                },
                rules, true
            );
        }

        return valState;
    }


    static fromCode(code : string, options? : Rules) : ArmyList {
        let slist: StoredList = parseCode(code);

        let al: ArmyList = new ArmyList(null, false, slist.f,
            //slist.t, slist.l.size, 
            null, options);

        //Editor.initializeFaction(slist.f, al, null);

        al.restoreState(slist);

        return al;
    }

    getListType() : ListType {
        return this.rules.listType;
    }

    setRules(rules : Rules) : void {
        if( rules == null ) {
            this.rules = {
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
        }
        else {
            this.rules = rules;
        }
    }

    setListType(lt : ListType) : void {

        if( this.rules == null ) {
            this.rules = {
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
        }

        if( lt == null ) {
            this.rules.listType = {
                steamroller: false,
                adr: false,
                champions: false,
                season: null,
                minLists: 1,
                maxLists: 3
            };
        }
        else {
            this.rules.listType = lt;
        }

    }


    constructor(alv : IArmyListView, interactive: boolean, factionID: number,
            //lt: ListType, listSize: number, 
            aec: IEntryCallback, rules : Rules) {
        this.alv = alv;
        // this.listSize = listSize;
        // this._lt = lt;
        this.aec = aec;
        this.factionID = factionID;
        this.interactive = interactive;
        this.subLists = [new SubList(this)];
        this.index = 0;

        this.setRules(rules);
    }

    getDiscordList(rules? : Rules): string {
        let ret: string = "https://conflictchamber.com/?" + this.toCode() + "\n```ini\n";

        for (let i = 0; i < this.subLists.length; i++) {
            if (i > 0) {
                ret += "\n";
            }

            ret += this.subLists[i].getTextList(rules);
        }

        ret += "```";

        return ret;
    }

    getTextList(rules? : Rules): string {
        let ret: string = "https://conflictchamber.com/?" + this.toCode() + "\n\n";

        for (let i = 0; i < this.subLists.length; i++) {
            if (i > 0) {
                ret += "\n";
            }

            ret += this.subLists[i].getTextList(rules);
        }

        return ret;
    }

    getJsonList(rules? : Rules): string {
        let ob : any = {};

        ob.url = "https://conflictchamber.com/?" + this.toCode();
        if( this.factionID > 0 ) {
            ob.faction = Data._data.factions[this.factionID].n;
        }
        ob.lists = [];

        ob.validation = this.getValidationText(rules, true);
        ob.validationFailures = this.getValidationFailures(rules);

        for (let i = 0; i < this.subLists.length; i++) {
            //ret += this.subLists[i].getTextList(rules);
            ob.lists.push(this.subLists[i].getJsonSummary());
        }

        return JSON.stringify(ob);
    }


    getTextArray(): string[][][] {
        let ret : string[][][] = [];

        for (let i = 0; i < this.subLists.length; i++) {

            ret.push(this.subLists[i].getTextArray());
        }


        return ret;
    }

    getBBList(): string {
        let ret: string = "[TABLE=\"class: outer_border\"]";


        ret += "[tr][td][center][URL=\"https://conflictchamber.com/?" + this.toCode()
            + "\"]Conflict Chamber link[/URL][/center][/td][/tr]"
            + "\n\n";

        ret += "[tr][td][TABLE][tr]";

        for (let i = 0; i < this.subLists.length; i++) {
            if (i > 0) {
                ret += "\n";
            }

            ret += "[td]" + this.subLists[i].getBBList() + "[/td]";
        }

        ret += "[/tr][/TABLE]";
        ret += "[/td][/tr][/TABLE]";

        return ret;

    }

    getSaveFilename(): string {
        let filename: string = "";

        for (let i = 0; i < this.subLists.length; i++) {

            if (i > 0) {
                filename += "_";
            }

            let slist: SubList = this.subLists[i];

            if (slist.hasCaster() && slist.casters[0].entry.v) {
                if (slist.casters[0].entry.id == 58) {
                    filename += "Coven";
                }
                else if (slist.casters[0].entry.id == 3151) {
                    filename += "Twins";
                }
                else {
                    filename += slist.casters[0].entry.v;
                }
            }
            else if (this.factionID > 0) {
                filename += Data.factionShort[this.factionID];
            }
        }

        filename = filename.replace(/\ /g, "");
        filename = filename.replace(/&/g, "");
        filename = filename.replace(/,/g, "");

        filename += "_" + this.getListSize();

        return filename;

    }

    casterExists(id: number): boolean {
        for (let i = 0; i < this.subLists.length; i++) {
            for (let j = 0; j < this.subLists[i].casters.length; j++) {
                if (this.subLists[i].casters[j] != null
                    && this.subLists[i].casters[j].entry.id == id) {
                    return true;
                }
            }
        }

        return false;
    }

    // isSteamroller(): boolean {
    //     return this._srMode;
    // }

    // setSteamroller(mode: boolean): void {
    //     if (this._srMode != mode) {
    //         this._srMode = mode;
    //         this.optionsChanged();
    //     }
    // }

    updateHeaders(): void {
        for (let i = 0; i < this.subLists.length; i++) {
            this.subLists[i].view.updateHeader();
        }
    }

    getState(): StoredList {

        let sl: StoredList = {
            t: this.getListType(),
            f: this.factionID,
            c: this.getListSize(),
            l: this.subLists[0].getState()
        };

        if (this.subLists.length > 1) {
            sl.m = this.subLists[1].getState();
        }

        if( this.subLists.length > 2 ) {
            sl.n = this.subLists[2].getState();
        }

        return sl;
    }

    restoreState(state: StoredList, rules? : Rules): void {
        if (state.m != null && this.subLists.length < 2) {
            this.addList(true);

            if( state.n != null && this.subLists.length < 3 ) {
                this.addList(true);
            }
        }

        this.setListType(state.t);

        this.subLists[0].restoreState(state.l, rules);

        if (state.m != null) {

            this.subLists[1].restoreState(state.m, rules);

            if( state.n != null ) {
                this.subLists[2].restoreState(state.n, rules);
            }
            //this.swapList();
        }
        else if (this.subLists.length > 1) {
            this.subLists = [this.subLists[0]];
            this.index = 0;

        }

        if( this.alv) {
            this.alv.repositionLists();
        }

        this.optionsChanged(true);
    }

    clearList() {
        if (this.subLists.length < 2) {
            this.current().clearList();
        }
        else {
            this.subLists.splice(this.index, 1);
            this.index = (this.index + 1) % this.subLists.length;

            if( this.alv ) {
                this.alv.repositionLists();
            }

            this.optionsChanged(true);
        }

        this.current().invalidateTheme();


        this.endChange();
    }

    toCode(): string {
        let ret: string = "c";

        //let val = parseInt(fid);
        let val: number = this.factionID;

        let lt : ListType = this.getListType();

        if( lt.coi ) {
            ret = "d";
        }

        ret += encodeCharSingle(val);


        let nval: number = 0;

        if( lt.steamroller ) {
            nval += 1;
        }

        if( lt.adr ) {
            nval += 2;
        }

        if( lt.champions) {
            nval += 4;
        }

        if( lt.adr || lt.champions ) {
            nval += (lt.season - 4) << 3;
        }

        nval += (lt.maxLists - 1) << 6;

        if( lt.maxLists == lt.minLists ) {
            nval += 256;
        }

        ret += encodeChar(nval);



        ret += encodeChar(this.getListSize());

        let list: ListState = this.subLists[0].getState();

            //console.log(list);


        if (this.subLists[0].inTheme()) {

            if (this.subLists[0].theme.id() < 0) {
                ret += encodeChar(Magic.contractCode);
                ret += encodeChar(this.subLists[0].theme.id() * -1);
            }
            else {
                ret += encodeChar(Magic.themeCode);
                ret += encodeChar(this.subLists[0].theme.id());
            }
        }

        for (let i: number = 0; i < list.list.length; i++) {
            ret += encodeSubList(list.list[i]);
        }

        //if (this.subLists.length > 1) {
        for( let i : number = 1; i < this.subLists.length; i++) {
            ret += encodeChar(Magic.listSeparator);

            if (this.subLists[i].inTheme()) {
                if (this.subLists[i].theme.id() < 0) {
                    ret += encodeChar(Magic.contractCode);
                    ret += encodeChar(this.subLists[i].theme.id() * -1);
                }
                else {
                    ret += encodeChar(Magic.themeCode);
                    ret += encodeChar(this.subLists[i].theme.id());
                }
            }

            list = this.subLists[i].getState();

            for (let j: number = 0; j < list.list.length; j++) {
                ret += encodeSubList(list.list[j]);
            }
        }

        return ret;
    }



    addList(skipChange?: boolean): void {
        if (this.subLists.length > 2) {
            return;
        }

        let sl: SubList = new SubList(this);

        this.subLists.unshift(sl);

        //this.subLists.push(sl);
        //this.saveNode.appendChild(sl.rootNode);
        //this.swapList();

        if( this.alv ) {
            this.alv.repositionLists();
        }
        this.optionsChanged(true);

        if (!skipChange) {
            this.endChange();
        }

        this.current().updateThemeList(null, null);
    }

    swapList(): void {
        this.index = (this.index + 1) % this.subLists.length;

        if( this.alv) {
            this.alv.repositionLists();
        }

        this.endChange();
    }

    current(): SubList {
        return this.subLists[this.index];
    }

    reset() {
        this.factionID = -1;

        for (let i = 0; i < this.subLists.length; i++) {
            this.subLists[i].reset();
        }
        //this.factions = {};
        //this.data = null;
        //this.entries = null;
        //this.themelists = null;
        //this.list = {};
    }

    endChange() {
        for (let i = 0; i < this.subLists.length; i++) {
            this.subLists[i].endChange();
        }

    }

    optionsChanged(ignoreEmpty?: boolean): void {
        // if (!ignoreEmpty
        //         //&& !this._srMode
        //         && this.subLists.length > 1) {

        //     this.subLists = [this.current()];
        //     this.index = 0;

        //     if( this.alv) {
        //         this.alv.repositionLists();
        //     }
        // }

        if (!this.interactive) {
            return;
        }

        for (let i = 0; i < this.subLists.length; i++) {
            let sl: SubList = this.subLists[i];

            sl.view.updateButtons();
        }
    }


}
