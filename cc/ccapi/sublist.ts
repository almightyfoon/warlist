
import { ArmyList, IEntryCallback } from "./armylist";
import { Const, Rules, ArmyEntry, ListState,
     ThemeData, RawListEntry } from "./defines";
import { Theme, ThemeApplication } from "./theme";
import { Entry, canAttach, isWarnoun, isCaster, companyOfIron,
    isPreRelease, isCID, isExpired } from "./entry";
import { Data } from "./data";

let _copyValidation: string = null;
let _arrayValidation: string[] = [];

export interface ISubListView {
    updateHeader() : void;
    clearList() : void;
    validate(rules: Rules) : void;
    updateThemeList(caster: Entry, id: number) : void;
    setTheme(td: ThemeData) : void;
    deleteEntry(ae : ArmyEntry) : void;
    updateButtons() : void;
    rebuildList() : void;
    endChange() : void;
    decorateEntry(ae: ArmyEntry, parent: ArmyEntry, restore: boolean) : void;
}

const equivalentThemes : { [n: number] : number} = {
    43 : 92,
    92 : 43,
    80 : 105,
    105 : 80,
    81 : 106,
    106 : 81
};

function qualifyThemeUniqueness(a : number, b: number ) {
    if( a == b ) {
        return true;
    }

    if( equivalentThemes[a] && equivalentThemes[a] == b ) {
        return true;
    }

    if( equivalentThemes[b] && equivalentThemes[b] == a ) {
        return true;
    }

    return false;
}
export class SubList {
    armyEntries: ArmyEntry[];
    private faCount: { [n: number]: number };
    uid: number;
    casters: ArmyEntry[];
    bondable: ArmyEntry[];
    pal: ArmyList;

    theme: Theme;

    private _themeApplication: ThemeApplication = null;

    /**
     * Test for CID status
     */
    isCID() : boolean {
        if( this.inTheme() && this.theme.isCID() ) {
            return true;
        }

        for (let i: number = 0; i < this.armyEntries.length; i++ ) {
            if (this.armyEntries[i].entry.pr == 2 ) {
                return true;
            }

            for( let j : number = 0; j < this.armyEntries[i].children.length; j++ ) {
                if( this.armyEntries[i].children[j].entry.pr == 2 ) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Gets theme freebie text
     */
    themeFreebieText() : string {
        if( !this.inTheme() ) {
            return "Not in theme";
        }

        let ta : ThemeApplication = this.themeApplication();


        if( this.theme.isOblivion() ) {
            return "Requisitions: " + ta.requisitionUsed + " / " 
                + ta.requisitionPoints + " (+" + ta.themeDiscount +")";
        }
        else {
            return "Qualifying Points: " + ta.requiredCount 
            + " (" + this.theme.reqCount + ") &ndash; Free Cards: " + ta.modified.length 
            + " / " + (Math.floor(ta.requiredCount / this.theme.reqCount) * 
                    this.theme.reqMult)
            + " (+" + ta.themeDiscount + ")";
        }

    }


    /**
     * Gets (or instantiates) the ThemeApplication for the current list.
     */
    themeApplication(force? : boolean): ThemeApplication {
        if (!this.inTheme()) {
            return null;
        }

        if (this._themeApplication == null || force) {
            this._themeApplication = this.theme.applyTheme(this.rawList(), 
                this.pal.rules);
        }

        return this._themeApplication;
    }

    /**
     * Invalidates current ThemeApplication, forcing it to be regenerated the next
     * time used.
     */
    invalidateTheme(): void {
        this._themeApplication = null;
    }

    /**
     * Queries if the list contains a caster.
     */
    hasCaster(): boolean {
        return this.casters.length > 0;
    }

    /**
     * Queries if the list is in theme.
     */
    inTheme(): boolean {
        return this.theme != null;
    }

    view: ISubListView = null;



    /**
     * @constructor
     * @param {ArmyList} pal - The surrounding ArmyList this SubList is part of.
     */
    constructor(pal: ArmyList) {
        this.armyEntries = [];
        this.faCount = {};
        this.uid = 1;
        //this.bgPoints = 0;
        //this.hasCaster = false;
        this.casters = [];
        this.bondable = [];
        this.theme = null;
        //this.themeList = null;
        //this.themeTier = null;
        //this.themePC = {};
        //this.themeFA = {};
        //this.themeParanoia = false;
        //this.paranoidModels = {};
        //this.themeAllowed = {};
        //this.inTheme = false;
        this.pal = pal;

        //this.view = new SubListView(this);
        if( pal.alv ) {
            this.view = pal.alv.createSubListView(this);
            this.view.updateHeader();
        }
    }

    /**
     * Resets the current SubList to an empty state.
     */
    reset() {
        this.armyEntries = [];
        this._themeApplication = null;
        this.faCount = {};
        //this.uid = 1;
        //this.bgPoints = 0;
        //this.hasCaster = false;
        this.casters = [];
        this.bondable = [];
        this.theme = null;
        //this.themeList = null;
        //this.themeTier = null;
        //this.themePC = {};
        //this.themeFA = {};
        //this.themeParanoia = false;
        //this.themeAllowed = {};
        //this.inTheme = false;
    }


    registerEntry(entry: Entry, pc: number): void {
        // if (_faCount[entry.id] == null) {
        //     _faCount[entry.id] = 1;
        // }
        // else {
        //     _faCount[entry.id]++;
        // }

        this.addFA(entry);

        // if (entry.bgp == null) {
        //     //_ listPoints += pc;
        // }
        // else {
        //     this.bgPoints = entry.bgp;
        // }

    }

    //findEntryParent(entry : Entry, choice : number, restore : boolean) : ArmyEntry {
        /**
         * Find the location in a list where an attached entry should be placed.
         * @param entry The entry to find a location for in the list
         * @param choice Which index of the entry's cost array to use
         * @param restore Whether to use restore semantics
         * @param parentStack An alternative ordering of potential parents
         */
    findEntryParent(entry: Entry, choice: number, restore: boolean,
            parentStack: ArmyEntry[]): ArmyEntry {

        let start: number = 0;
        let add: number = 1;
        let nonbgp: number = this.nonbgCost();

        let ovret: [boolean, number, boolean] =
            this.optionValid(entry, choice, null, nonbgp);

        let cost: number = ovret[1];

        let armycost: number = this.armyCost();


        // Check if we're attempting to add something that
        // pushes the list over the maximum size, and if so
        // try to find a battlegroup that can hold it.
        //
        // ... And give it the benefit of the doubt if
        // we're in theme.
        if (armycost + cost > this.pal.getListSize()
                && (!restore || !this.inTheme()) ) {
            let bgp: number[] = this.bgCost();

            if (restore) {
                start = this.casters.length - 1;
                add = -1;
            }

            for (let i: number = start; i < this.casters.length && i >= 0; i += add) {
                if (canAttach(entry, choice, this.casters[i], this.theme)) {
                    if ((bgp[i] - (this.casters[i].entry.bgp || 0)) + cost + armycost <= this.pal.getListSize()) {
                        return this.casters[i];
                    }
                }
            }

        }
        else {

            if( !parentStack ) {
                parentStack = this.armyEntries;
            }
            // else {
            //     console.log("Using parentStack for " + eo.entry.n);
            //     console.log(parentStack);
            // }

            // console.log("Starting find for " + entry.n);
            // console.log(parentStack);


            if (restore) {
                //start = this.armyEntries.length - 1;
                start = parentStack.length - 1;
                add = -1;
            }

            for (let i: number = start; i < parentStack.length && i >= 0; i += add) {



                // console.log("Trying to attach " 
                //     + entry.n + " to " + parentStack[i].entry.n);

                if( this.inTheme() && !this.theme.isAllowed(entry, null, 
                        parentStack[i] ? parentStack[i].entry : null)) {
                    // console.log("Failing " + parentStack[i].entry.n + 
                    //     " due to theme.");
                    continue;
                }
                
                if (canAttach(entry, choice, parentStack[i], this.theme)) {
                    // console.log("Returning " + parentStack[i].entry.n);

                    // Make sure that if we're trying to attach to 
                    // an attachment, we attach to the grandparent
                    // instead

                    if( parentStack[i].entry.isat ) {
                        // console.log("Attaching to attachment");
                        return parentStack[i].parent;
                    }


                    return parentStack[i];
                }
                // else {
                //     console.log("Failing after canAttach " + entry.n + " - " + parentStack[i].entry.n);
                // }
            }
        }

        //console.log("Returning null parent for " + eo.entry.n);
        return null;
    }


    unregisterEntry(entry: Entry): void {
        //this.faCount[entry.id]--;
        this.removeFA(entry);
        this.invalidateTheme();


        if ( isCaster(entry) ) {
            let newCasters: ArmyEntry[] = [];
            for (let i: number = 0; i < this.casters.length; i++) {
                if (this.casters[i].entry != entry) {
                    newCasters.push(this.casters[i]);
                }
            }

            this.casters = newCasters;

            for (let i: number = this.armyEntries.length - 1; i >= 0; i--) {
                if (this.armyEntries[i].entry.req != null) {
                    //this.deleteEntry(this.armyEntries[i].uid);
                    this.armyEntries[i].remove(true);
                }
            }
        }

        if( isCaster(entry) || (entry.bond && entry.bond.length == 0) ) {
            for( let i : number = this.bondable.length - 1; i >= 0; i-- ) {
                if( this.bondable[i].entry == entry ) {
                    this.bondable.splice(i, 1);
                }
            }
        }

    }

    moveAttachment(entry: Entry, pc: number, choice: number, div: HTMLDivElement,
        cont: HTMLDivElement, uid: number, puid: number, dir: boolean, specialist: boolean): void {
        let pindex = -1;

        for (let i = 0; i < this.armyEntries.length; i++) {
            if (this.armyEntries[i].uid == puid) {
                pindex = i;
                break;
            }
        }

        if (pindex == -1)
            return;

        this.invalidateTheme();

        let start = pindex + 1;
        let add = 1;

        if (!dir) {
            start = pindex - 1;
            add = -1;
        }

        for (let i = start; i >= 0 && i < this.armyEntries.length; i += add) {

            if (canAttach(entry, choice, this.armyEntries[i], this.theme)) {

                cont.removeChild(div);
                this.deleteAttachment(entry, pc, uid, puid);
                // this.pal.aec.entryCallback(this, entry, choice,
                //     this.armyEntries[i], false, this.pal.interactive);

                // DivBuilder.clickEntry(this, entry, choice,
                //     null, this.armyEntries[i], false, this.pal.interactive,
                //     null, null);

                // this.pal.aec.clickEntry(this, entry, choice,
                //     this.armyEntries[i], false, this.pal.interactive,
                //     null);

                let ae : ArmyEntry = this.insertEntry(entry, choice,
                    this.armyEntries[i], false, null, specialist)[0];

                // if( this.view ) {
                //     this.view.decorateEntry(ae, this.armyEntries[i], false);
                // }




                break;
            }

        }

    }



    deleteAttachment(entry: Entry, pc: number,
        uid: number, puid: number): void {
        this.unregisterEntry(entry);

        for (let i: number = 0; i < this.armyEntries.length; i++) {
            if (this.armyEntries[i].uid == puid) {
                for (let j: number = 0; j < this.armyEntries[i].children.length; j++) {
                    if (this.armyEntries[i].children[j].uid == uid) {
                        this.armyEntries[i].children.splice(j, 1);
                        break;
                    }
                }

                break;
            }
        }
    }

    hasFAMModel(t : number) : boolean {
        if( !this.inTheme() ) {
            return false;
        }

        for( let i : number = 0; i < this.armyEntries.length; i++ ) {
            if( this.armyEntries[i].entry.t == t &&
                this.theme.isFAM(this.armyEntries[i].entry, this.pal.rules) ) {
                    return true;
            }

            for( let j : number = 0; j < this.armyEntries[i].children.length; j++ ) {
                if( this.armyEntries[i].children[j].entry.t == t &&
                    this.theme.isFAM(this.armyEntries[i].children[j].entry, this.pal.rules)) {
                        return true;
                }
            }
        }

        return false;
    }

    getFACount(id: number): number {
        // if( this.id == 160 )
        // {
        //     console.log(__faCount);
        // }

        return this.faCount[id] || 0;
    }

    isBondable(entry : Entry) : boolean {
        if( !entry.bond ) {
            return false;
        }

        for( let ae of this.bondable) {
            if( entry.bond.indexOf(ae.entry.id) != -1 ) {
                return true;
            }
        }

        return false;
        //return (casteral && entry.bond && entry.bond.indexOf(casteral.entry.id) > -1);
    }


    faLeft(entry: Entry, parent : Entry, checkBonds : boolean): number {

        if( this.inTheme() && !this.theme.isAllowed(entry, this.pal.rules, parent) ) {
            //console.log(entry.n + " is not in theme");

            if( (checkBonds && this.isBondable(entry) ) ) {
                // Check to see if the entry is bonded to 
                // a caster
                if (this.hasCaster()) {
                    let fail: boolean = true;
    
                    //for (let i: number = 0; i < this.casters.length; i++) {
                    for( let i : number = 0; i < this.armyEntries.length; i++ ) {
                        if (entry.bond && entry.bond.indexOf(this.armyEntries[i].entry.id) > -1) {
                            fail = false;
                            break;
                        }
                    }
    
                    if (fail) {
                        return 0;
                    }

                    //console.log("Passing " + entry.n + " due to bond");
                }

                // Fall through to next check
    
            }
            else {
                // Fail if out of theme and no bond
                //console.log("fa left 0 on " + entry.n + " due to not in theme");
                return 0;
            }
        }

        // No space for themeExtra models if we're out of
        // theme and in the wrong faction
        if( entry.themeExtra && !this.inTheme()
                && entry.fid != this.pal.factionID 
                && (!parent || !parent.xbg || !parent.atf(entry, 0))
                && (!entry.wf || entry.wf.indexOf(this.pal.factionID) == -1)
                ) {
            return 0;
        }


        if (entry.req != null) {
            if (!this.hasCaster())
                return 0;

            //if (this.req.indexOf(',' + _caster.id) == -1)

            let retVal: number = 0;

            for (let i: number = 0; i < this.casters.length; i++) {
                if (entry.req.indexOf(this.casters[i].entry.id) != -1) {
                    retVal = 1;
                }
            }

            if (retVal == 0) {
                return 0;
            }
        }

        let fa: string = this.entryFA(entry);

        let retVal : number = 0;

        if (fa == "U") {
            retVal = 100;
        }
        else if (fa == "C") {
            retVal = this.getFACount(entry.id) > 0 ? 0 : 1;
        }
        else if( fa == "M" ) {
            // Attachments don't follow this rule
            if( entry.isat) {
                return 100;
            }

            retVal = this.hasFAMModel(entry.t) ? 0 : 1;
        }
        else {
            retVal = parseInt(fa) - this.getFACount(entry.id);
        }

        // Check for themes with FA pools
        if( retVal > 0 && this.inTheme() && this.theme.hasFAPools() ) {
            let pool : number = this.theme.getFAPool(entry);
            let count : number = 0;

            if( pool > -1 ) {
                for( let i : number = 0; i < this.armyEntries.length; i++ ) {
                    if( this.theme.getFAPool(this.armyEntries[i].entry) == pool ) {
                        count += this.theme.getFAWeight(this.armyEntries[i].entry);
                    }

                    for( let j : number = 0; j < this.armyEntries[i].children.length; j++ ) {
                        if( this.theme.getFAPool(this.armyEntries[i].children[j].entry) == pool ) {
                            count += this.theme.getFAWeight(this.armyEntries[i].entry);
                        }
                    }
                }

                let poolTotal = this.theme.getFAPoolSize(pool);

                // Reduce theme pool by the excess weight of the model being
                // tested

                poolTotal -= this.theme.getFAWeight(entry) - 1;


                if( poolTotal - count < retVal ) {
                    retVal = poolTotal - count;
                }

            }

        }

        // Check for theme animosity
        if( retVal > 0 && this.inTheme() && this.theme.hasAnimosity() ) {
            for( let i : number = 0; i < this.armyEntries.length; i++ ) {
                if( this.theme.animosity(entry, this.armyEntries[i].entry) ) {
                    retVal = 0;
                    break;
                }

                for( let j : number = 0; j < this.armyEntries[i].children.length; j++ ) {
                    if( this.theme.animosity(entry, this.armyEntries[i].children[j].entry) ) {
                        retVal = 0;
                        break;
                    }
                }

                if( retVal == 0 ) {
                    break;
                }
            }
        }

        return retVal;
    }

    addFA(entry: Entry): void {
        // if( this.id == 160 )
        // {
        //     console.log("Adding FA");
        //     console.log(__faCount);
        // }

        if (this.faCount[entry.id] == null) {
            this.faCount[entry.id] = 1;
        }
        else {
            this.faCount[entry.id] = this.faCount[entry.id] + 1;
        }

        // if( this.id == 160 )
        // {
        //     console.log(__faCount);
        //     console.log("Done adding");
        // }

    }

    removeFA(entry: Entry): void {
        // if( this.id == 160 )
        // {
        //     console.log("Removing FA");
        //     console.log(__faCount);
        // }

        this.faCount[entry.id] = this.faCount[entry.id] - 1;

        // if( this.id == 160 )
        // {
        //     console.log(__faCount);
        //     console.log("Done removing");
        // }
    }



    bgCost(): number[] {
        let bgp: number[] = [];

        for (let i: number = 0; i < this.casters.length; i++) {
            let al: ArmyEntry = this.casters[i];

            if ( !isCaster(al.entry) )
                continue;

            let cost: number = 0;

            for (let j: number = 0; j < al.children.length; j++) {
                if (isWarnoun(al.children[j].entry)) {
                    let calcCost : number = al.children[j].listCost();

                    if( calcCost > 0 ) {
                        cost += calcCost;
                    }
                }
            }

            bgp.push(cost);
        }

        return bgp;
    }

    bgTotalCost(): number {
        let ret: number = 0;

        let bgcost: number[] = this.bgCost();

        for (let i: number = 0; i < bgcost.length; i++) {
            if( bgcost[i] > 0 ) {
                ret += bgcost[i];
            }
        }

        return ret;
    }

    bgPoints(): number {
        let ret: number = 0;

        for (let i: number = 0; i < this.casters.length; i++) {
            ret += this.casters[i].entry.bgp || 0;
        }

        return ret;
    }

    specialistPoints() : number {
        let ret : number = 0;

        for( let i : number = 0; i < this.armyEntries.length; i++) {
            if( this.armyEntries[i].specialist ) {
                ret += this.armyEntries[i].rawCost();
            }

            for( let j : number = 0; j < this.armyEntries[i].children.length; j++ ) {
                if( this.armyEntries[i].children[j].specialist ) {
                    ret += this.armyEntries[i].children[j].rawCost();
                }
            }
        }

        return ret;
    }


    nonbgCost(): number {
        let cost: number = 0;

        for (let i: number = 0; i < this.armyEntries.length; i++) {
            let al: ArmyEntry = this.armyEntries[i];

            //cost += pointCost(al.entry, al.choice);
            cost += al.listCost();

            for (let j: number = 0; j < al.children.length; j++) {
                if ( !isCaster(al.entry) || !isWarnoun(al.children[j].entry))
                    //cost += al.children[j].pc || 0;
                    //cost += pointCost(al.children[j].entry, al.children[j].choice);
                    cost += al.children[j].listCost();
            }
        }

        return cost;
    }


    armyCost(): number {
        let bgp: number[] = [];
        let op: number = 0;

        for (let i: number = 0; i < this.casters.length; i++) {
            let al: ArmyEntry = this.casters[i];

            bgp.push(-1 * (al.entry.bgp || 0));

            for (let j = 0; j < al.children.length; j++) {
                if (isWarnoun(al.children[j].entry)) {
                    //bgp[i] += (al.children[j].pc || 0);
                    //bgp[i] += pointCost(al.children[j].entry, al.children[j].choice);
                    bgp[i] += al.children[j].listCost();
                }
                else {
                    //op += al.children[j].pc || 0;
                    //op += pointCost(al.children[j].entry, al.children[j].choice);
                    op += al.children[j].listCost();
                }
            }
        }

        for (let i: number = 0; i < bgp.length; i++) {
            op += Math.max(0, bgp[i]);
        }

        for (let i: number = 0; i < this.armyEntries.length; i++) {
            let al: ArmyEntry = this.armyEntries[i];

            if ( isCaster(al.entry) ) {
                continue;
            }

            for (let j = 0; j < al.children.length; j++) {
                op += al.children[j].listCost();
            }

            op += al.listCost();
        }

        if (this.inTheme()) {
            let ta: ThemeApplication = this.themeApplication();

            for (let i: number = 0; i < ta.modified.length; i++) {
                op -= ta.modified[i].costReduction;
            }
        }

        return op;
    }

    armyHeaderText(skipBG: boolean): string {
        return Data.factionNameShort[this.pal.factionID];

    /*
        let txt: string = Data.factionShort[this.pal.factionID] + " Army - " + this.armyCost() + " / "
            + this.pal.getListSize();

        let bgp: number = this.bgPoints();

        if (bgp != 0 && !skipBG) {
            txt += " (+" + bgp + ")";
        }

        txt += " points";

        return txt;
    */
    }

    getJsonSummary(): any {
        let models: any[] = [];

        for (let i: number = 0; i < this.armyEntries.length; i++) {
            let e : any = {};

            if (this.armyEntries[i].entry.v != null) {
                //line[0] += "(" + this.armyEntries[i].entry.v + ") ";
                //line[0] += this.armyEntries[i].baseText;
                e.desc = this.armyEntries[i].entry.v;
                e.name = this.armyEntries[i].baseText;
            }
            else if( this.armyEntries[i].entry.co ) {
                let co : Entry = Data._data.entries[this.armyEntries[i].entry.co];

                //line[0] += this.armyEntries[i].baseText;
                e.name = this.armyEntries[i].baseText;

                if( co ) {
                    //line[0] += " & " + co.n;
                    e.name += " & " + co.n;
                }
            }
            else {
                e.name = this.armyEntries[i].baseText;
            }

            //line[1] += this.armyEntries[i].costText;
            e.cost = this.armyEntries[i].costText;
            e.type = Data._data.typenameSingle[this.armyEntries[i].entry.t];

            models.push(e);

            //text += "]\n";

            if (this.armyEntries[i].children != null) {
                for (let j: number = 0; j < this.armyEntries[i].children.length; j++) {
                    //let subline : string[] = ["", ""];
                    let child : any = {};

                    //subline[0] += " - ";

                    // subline[0] += this.armyEntries[i].children[j].baseText;
                    // subline[1] += this.armyEntries[i].children[j].costText;

                    child.name = this.armyEntries[i].children[j].baseText;
                    child.cost = this.armyEntries[i].children[j].costText;
                    child.type = Data._data.typenameSingle[this.armyEntries[i].children[j].entry.t];

                    if( e.attached == null ) {
                        e.attached = [ child ];
                    }
                    else {
                        e.attached.push(child);
                    }
                }
            }
        }


        let ret : any = {};

        ret.models = models;
        ret.theme = this.inTheme() ? this.theme.name() : "None";
        ret.points = this.armyCost();

        let validation : string[] = [];

        this.validate((vt : string) => {
            validation.push(vt);
        }, null, true);

        ret.validation = validation;

        return ret;
    }




    getTextArray(): string[][] {
        let ret: string[][] = [];

        for (let i: number = 0; i < this.armyEntries.length; i++) {
            let line : string[] = ["", ""];

            if( this.armyEntries[i].specialist ) {
                line[0] += "(S) ";
            }

            if (this.armyEntries[i].entry.v != null && this.armyEntries[i].entry.v != null) {
                line[0] += "(" + this.armyEntries[i].entry.v + ") ";
                line[0] += this.armyEntries[i].baseText;
            }
            else if( this.armyEntries[i].entry.co ) {
                let co : Entry = Data._data.entries[this.armyEntries[i].entry.co];

                line[0] += this.armyEntries[i].baseText;


                if( co ) {
                    line[0] += " & " + co.n;
                }
            }
            else {
                line[0] += this.armyEntries[i].baseText;
            }

            line[1] += this.armyEntries[i].costText;

            ret.push(line);

            //text += "]\n";

            if (this.armyEntries[i].children != null) {
                for (let j: number = 0; j < this.armyEntries[i].children.length; j++) {
                    let subline : string[] = ["", ""];

                    subline[0] += " - ";

                    if( this.armyEntries[i].children[j].specialist ) {
                        subline[0] += "(S) ";
                    }

                    subline[0] += this.armyEntries[i].children[j].baseText;
                    subline[1] += this.armyEntries[i].children[j].costText;


                    ret.push(subline);
                }
            }
        }


        return ret;
    }

    getTextList(rules? : Rules): string {
        let text: string = this.armyHeaderText(true);

        if (this.inTheme()) {
            text += "\n[Theme] " + this.theme.name() + "";
        }


        let valText : string = this.getValidationText(true, "!!! ", "\n");

        text += "\n\n";

        text += valText;

        if (valText != "") {
            text += "\n";
        }

        for (let i: number = 0; i < this.armyEntries.length; i++) {
            if (this.armyEntries[i].entry.v != null && this.armyEntries[i].entry.v != null) {
                text += "[" + this.armyEntries[i].entry.v + "] ";
            }


            text += this.armyEntries[i].fullText + "\n";

            // if (this.armyEntries[i].entry.bgp > 0) {
            //     text += "+" + this.armyEntries[i].entry.bgp;
            // }
            // else {
            //     //text += this.armyEntries[i].pc;
            //     //text += pointCost(this.armyEntries[i].entry, this.armyEntries[i].choice);
            //     //text += this.armyEntries[i].pcspan.innerText;
            //     text += this.armyEntries[i].cost;
            // }

            // text += "]\n";

            if (this.armyEntries[i].children != null) {
                for (let j: number = 0; j < this.armyEntries[i].children.length; j++) {
                    text += " - " + this.armyEntries[i].children[j].fullText;

                    // if (this.armyEntries[i].children[j].text.slice(-1) == "[") {
                    //     //text += this.armyEntries[i].children[j].pc;
                    //     //text += pointCost(this.armyEntries[i].children[j].entry,
                    //     //  this.armyEntries[i].children[j].choice);
                    //     //text += this.armyEntries[i].children[j].pcspan.innerText;
                    //     text += this.armyEntries[i].children[j].cost;
                    //     text += "]";
                    // }

                    text += "\n";
                }
            }
        }

        return text;
    }

    getValidationText(thisMode : boolean, pre? : string, post? : string) : string {
        _copyValidation = "";

        this.validate(function (vt) {
            _copyValidation += (pre ? pre : "") + vt + (post ? post : "");
        }, null, thisMode);

        return _copyValidation;
    }



    getValidationArray(thisMode : boolean) : string[] {
        _arrayValidation = [];

        this.validate(function (vt : string, sl : SubList, warn? : boolean) {
            _arrayValidation.push((warn ? "!" : "#") + vt);
        }, null, thisMode);

        return _arrayValidation;
    }

    getBBList(): string {
        let text: string = this.armyHeaderText(true);

        if (this.inTheme()) {
            text += "\n[b][Theme] " + this.theme.name() + "[/b]";
        }

        let valText : string = this.getValidationText(true, "[COLOR=\"#800000\"]!!! ", "[/COLOR]\n");

        text += "\n\n";

        text += valText;

        if (valText != "") {
            text += "\n";
        }

        //text += "[INDENT]";

        for (let i: number = 0; i < this.armyEntries.length; i++) {
            if (this.armyEntries[i].entry.v != null && this.armyEntries[i].entry.v != null) {
                text += "[B](" + this.armyEntries[i].entry.v + ")[/B] ";
            }

            text += this.armyEntries[i].baseText + " [";

            if( this.armyEntries[i].isModified() ) {
                text += "b][[COLOR=\"#008080\"]";
            }

            text += this.armyEntries[i].costText;

            if( this.armyEntries[i].isModified() ) {
                text += "[/COLOR]][/b";
            }

            text += "]";

            // if (this.armyEntries[i].entry.bgp > 0) {
            //     text += "+" + this.armyEntries[i].entry.bgp;
            // }
            // else {
            //     //text += this.armyEntries[i].pc;
            //     //text += pointCost(this.armyEntries[i].entry, this.armyEntries[i].choice);

            //     if( this.armyEntries[i].isModified() ) {
            //         text += "b][[COLOR=\"#008080\"]";
            //     }

            //     //text += this.armyEntries[i].pcspan.innerText;
            //     text += this.armyEntries[i].cost;

            //     if( this.armyEntries[i].isModified() ) {
            //         text += "[/COLOR]][/b";
            //     }

            // }

            // text += "]";

            let sublist = "";

            if (this.armyEntries[i].children != null) {
                for (let j: number = 0; j < this.armyEntries[i].children.length; j++) {
                    sublist += "[*]" + this.armyEntries[i].children[j].baseText + " [";

                    //if (this.armyEntries[i].children[j].fullText.slice(-1) == "[") {
                        //sublist += this.armyEntries[i].children[j].pc + "]";
                        //sublist += pointCost(this.armyEntries[i].children[j].entry,
                        //  this.armyEntries[i].children[j].choice) + "]";

                        if( this.armyEntries[i].children[j].isModified() ) {
                            sublist += "b][[COLOR=\"#008080\"]";
                        }

                        //sublist += this.armyEntries[i].children[j].pcspan.innerText;
                        //sublist += this.armyEntries[i].children[j].cost;
                        sublist += this.armyEntries[i].children[j].costText;

                        if( this.armyEntries[i].children[j].isModified() ) {
                            sublist += "[/COLOR]][/b]";
                        }
                        else {
                            sublist += "]";
                        }
                    //}
                    sublist += "\n";
                }
            }

            if (sublist != "") {
                text += "[LIST]" + sublist + "[/LIST]";
            }
            else {
                text += "\n";
            }
        }

        //text += "[/INDENT]";

        text = text.replace(/(\[[0-9]+\])/g, "[B]$1[/B]");
        text = text.replace(/(\[\+[0-9]+\])/g, "[B]$1[/B]");

        text = text.replace("(max)", "([I]max[/I])");
        text = text.replace("(min)", "([I]min[/I])");

        return text;
    }


    clearList(): void {
        if( this.view ) {
            this.view.clearList();
        }

        this.armyEntries = [];
        this.faCount = {};
        this.casters = [];
        this.bondable = [];
        this.clearTheme();
        this.invalidateTheme();
        this.updateThemeList(null, null);

        if (this.pal && this.pal.aec) {
            this.pal.aec.syncOptions(this.pal);
        }
    }


    entryFA(entry: Entry): string {
        let fa: string = entry.fa;

        if (this.pal.maxCasters() > 1 && parseInt(fa) > 0) {
            fa = '' + (parseInt(fa) * this.pal.maxCasters());
        }

        if (this.inTheme() ) {
            if( this.theme.isFAU(entry.id)) {
                fa = "U";
            }
            else if( this.theme.isFAM(entry, this.pal.rules) ) {
                fa = "M";
            }
            else if( this.theme.modifiedFA(entry) ) {
                fa = "" + this.theme.modifiedFA(entry);
            }
        }

        return fa;
    }





    getState(): ListState {
        let ld: number[][] = [];

        let paranoid: number[][] = [];

        for (let i: number = 0; i < this.armyEntries.length; i++) {
            // if (this.armyEntries[i].fo == null) {
            //     if (this.inTheme() && this.theme.paranoidModels[this.armyEntries[i].entry.id])
            //         paranoid.push([this.armyEntries[i].entry.id, -1]);
            //     else
            //         ld.push([this.armyEntries[i].entry.id, -1]);
            // }
            // else
            {
                // let index : number = -1;

                // for (let j : number = 0; j < this.armyEntries[i].entry.fo.length; j++) {
                //     if (this.armyEntries[i].entry.fo[j] == this.armyEntries[i].fo) {
                //         index = j;
                //         break;
                //     }
                // }

                // if (index == -1)
                //     alert("Couldn't find force option");

                let index: number = this.armyEntries[i].choice;

                if (index == null) {
                    index = 0;
                }

                if (this.inTheme() && this.theme.paranoidModels[this.armyEntries[i].entry.id]) {
                    paranoid.push([this.armyEntries[i].entry.id, index,
                        this.armyEntries[i].specialist ? 1 : 0]);
                    ld.push(null);
                }
                else {
                    paranoid.push(null);
                    ld.push([this.armyEntries[i].entry.id, index,
                        this.armyEntries[i].specialist ? 1 : 0]);
                }
            }

            //console.log(" -> " + this.armyEntries[i].children.length);

            for (let j: number = 0; j < this.armyEntries[i].children.length; j++) {
                let c = this.armyEntries[i].children[j];

                if (c.companion)
                    continue;

                // if (c.fo == null) {
                //     if (this.inTheme() && this.theme.paranoidModels[this.armyEntries[i].children[j].entry.id])
                //         paranoid.push([c.entry.id, -1]);
                //     else
                //         ld.push([c.entry.id, -1]);
                // }
                // else
                {
                    // let index : number = -1;

                    // for (let k : number = 0; k < c.entry.fo.length; k++) {
                    //     if (c.entry.fo[k] == c.fo) {
                    //         index = k;
                    //         break;
                    //     }
                    // }

                    // if (index == -1)
                    //     alert("Couldn't find force option");

                    let index: number = c.choice;

                    let opt: number[] = null;

                    // if (c.count != null)
                    //     opt = [c.entry.id, index, c.count];
                    // else
                    opt = [c.entry.id, index, this.armyEntries[i].children[j].specialist ? 1 : 0];

                    if (this.inTheme() && this.theme.paranoidModels[this.armyEntries[i].children[j].entry.id]) {
                        paranoid.push(opt);
                        ld.push(null);
                    }
                    else {
                        paranoid.push(null);
                        ld.push(opt);
                    }
                }
            }
        }

        //ld = ld.concat(paranoid);

        for (let i: number = 0; i < ld.length; i++) {
            if (ld[i] == null) {
                ld[i] = paranoid[i];
            }

        }

        for (let i: number = 0; i < ld.length; i++) {
            if ( isCaster(Data.entries[ld[i][0]]) ) {
                let caster: number[][] = [ld[i]];
                ld.splice(i, 1);
                ld = caster.concat(ld);
            }
        }

        let ret: ListState = {
            tl: undefined,
            size: this.pal.getListSize(),
            //sr: this.pal.isSteamroller(),
            tt: undefined,
            list: ld
        };

        if (this.inTheme()) {
            ret.tl = this.theme.id();
            //ret.tt = this.themeTier;
            ret.tt = 0;
        }

        return ret;
    }


    restoreState(state: ListState, rules? : Rules): void {
        //console.log(state);
        //console.trace();

        this.clearList();

        if (state == null) {
            console.log("Restoring null state");
            return;
        }

        let caster: Entry = null;

        let ftl: ThemeData = null;

        if (state.tl != null) {
            ftl = Data.themeLists[state.tl];
        }

        if( state.size != null ) {
            this.pal.setListSize(state.size);
        }

        this.setTheme(null, state.tl, ftl, state.tt);

        let sl: number[][] = state.list;

        //let forcedCost: { [n: number]: number };


        if (sl != null) {
            for( let i : number = 0; i < sl.length; i++) {

                //console.log(sl);


                if( Data.entries[sl[i][0]].fr ) {
                    if( isCaster(Data.entries[Data.entries[sl[i][0]].fr]) ) {
                        caster = Data.entries[sl[i][0]];
                    }
                }
                else if( isCaster(Data.entries[sl[i][0]]) ) {
                    caster = Data.entries[sl[i][0]];
                }
            }

            let parentStack: ArmyEntry[] = [];

            for (let i: number = 0; i < sl.length; i++) {
                let id: number = sl[i][0];

                if( Data.entries[id].fr ) {
                    id = Data.entries[id].fr;
                }

                let choice: number = sl[i][1];

                if (choice == null || choice < 0) {
                    choice = 0;
                }

                //let count : number = null;

                // if (sl[i].length > 2)
                //     count = sl[i][2];

                //let fo : EntryForceOption = null;

                let entry = Data.entries[id];

                //console.log("Considering " + entry.n);

                if (entry.themeunique && !qualifyThemeUniqueness(entry.themeunique,state.tl) ) {
                    console.log("Skipping " + entry.n + " due to themeuniqueness");
                    continue;
                }

                // if (foi > -1)
                //     fo = entry.fo[foi];

                if ( isCaster(entry) ) {
                    if( this.pal.getListType().champions &&
                        (!entry.adr || entry.adr.indexOf(this.pal.getListType().season) == -1 ) ) {
                            //console.log("Skipping " + entry.n + " due to adr caster");
                            continue;
                        }

                    caster = entry;
                }

                if( sl[i][2] > 0 && caster == null ) {
                    console.log("Skipping " + entry.n + " do to sl[i][2] stuff");
                    continue;
                }


                //this.pal.aec.entryCallback(this, entry, choice,
                //    null, true, this.pal.interactive);

                // let newAE : ArmyEntry[] = DivBuilder.clickEntry(this, entry, choice, null,
                //     null, true, this.pal.interactive, null, parentStack);

                //console.log("Inserting " + entry.n);

                let newAE : ArmyEntry[] = this.insertEntry(entry, choice, null,
                    true, parentStack, sl[i][2] > 0, rules);

                // todo: attach AE


                // let newAE : ArmyEntry[] = this.pal.aec.clickEntry(this, entry, choice,
                //     null, true, this.pal.interactive, parentStack);

                // if( newAE[1] && sl[i][2] > 0 ) {
                //     newAE[1].specialist = true;
                // }

                if( newAE[1] != null ) {
                    parentStack.push(newAE[1]);
                }
            }
        }

        this.updateThemeList(caster, state.tl);
        this.applyTheme();

        if( this.view ) {
            this.view.validate(this.pal.rules);
            this.view.updateHeader();
        }
    }

    insertEntry(entry: Entry, choice: number, parent: ArmyEntry,
           restore: boolean, parentStack: ArmyEntry[],
           specialist: boolean, rules? : Rules) : ArmyEntry[] {

        // console.log("Starting insertEntry - " + entry.n);

        // if (entry.sr == 1 && !this.pal.getListType().steamroller ) {
        //     //console.log("Ending insertEntry due to trying to add an objective to a non-SR list");
        //     return [null, null];
        // }

        // Champions of Iron rules
        if( this.pal.getListType().coi && !companyOfIron(entry) ) {
                return [null, null];
        }

        if (entry.req != null) {
            if (!this.hasCaster()) {
                //console.log(`Ending insertEntry due to adding a caster-specific entry to a
                //    list without a caster`);
                return [null, null];
            }

            for (let i: number = 0; i < this.casters.length; i++) {
                let fail: boolean = true;

                if (entry.req.indexOf(this.casters[i].entry.id) != -1) {
                    fail = false;
                    break;
                }

                if (fail) {
                    //console.log(`Ending insertEntry due to caster not found for a caster-specific
                    //        model`);
                    return [null, null];
                }
            }
        }

        let foundParent : ArmyEntry = null;

        if (parent != null) {
            if (!canAttach(entry, choice, parent, this.theme)) {
                //console.log(`Ending insertEntry due to canAttach failing`);
                return [null, null];
            }
        }
        else if( isWarnoun(entry) && entry.indep != 1 ) {
            
            foundParent = this.findEntryParent(entry, choice, restore, parentStack);


            if( foundParent == null ) {
                //console.log("Ending insertEntry due to foundParent being null");
                //console.log(parentStack.map( x => x.entry.n ));
                return [null, null];
            }
        }

        if ( isCaster(entry) && this.casters.length >= this.pal.maxCasters()) {
            //console.trace();
            // console.log(`Ending thisEntry due to trying to add too many casters`);
            // console.log(this.casters);
            return [null, null];
        }

        if( rules ) {
            if( isPreRelease(entry, rules) || isCID(entry, rules) || isExpired(entry, rules) ) {
                return [null, null];
            }
        }

        if( isCaster(entry) ) {
            for( let i : number = 0; i < this.pal.subLists.length; i++ ) {
                for( let j : number = 0; j < this.pal.subLists[i].casters.length; j++ ) {
                    if( this.pal.subLists[i].casters[j].entry.id == entry.id ) {
                        // console.log("Ending insertEntry due to a duplicate caster in another list");
                        return [null, null];
                    }
                }
            }
        }

        // Force no "merc first" casters

        if ( isCaster(entry) && entry.fid != this.pal.factionID) {
            if( !this.hasCaster() && !(this.theme && this.theme.forceMercBond()) ) {
                return [null, null];
            }
        }


        if( this.hasAnimosity(entry) ) {
            return [null, null];
        }

        let uid: number = this.uid;
        this.uid++;

        let parentEntry : Entry = null;

        if( foundParent ) {
            parentEntry = foundParent.entry;
        }
        else if( parent ) {
            parentEntry = parent.entry;
        }

        if (this.faLeft(entry, parentEntry, !isWarnoun(entry)) == 0) {
            //console.log("Ending insertEntry due to faLeft being 0");
            return [null, null];
        }

        if (parent == null) {
            parent = foundParent || this.findEntryParent(entry, choice, restore, parentStack);
        }

        if( parent == null && (entry.ca > 0 || entry.isat) ) {
            // If it's an attachment with no parent, end
            //console.log("Ending insertEntry due to attachment with no parent")
            return [null, null];
        }

        //console.log(parent ? parent.entry.n : "no parent");

        let pcret: [number, boolean, number] = this.pointCost(entry, choice,
            parent ? parent.entry : null);

        let pc = pcret[0];
        let modified = pcret[1];
        let realPC = pcret[2];

        let bgcost: number = this.bgTotalCost();
        let nonbgcost: number = this.nonbgCost();

        if (parent != null && isCaster(parent.entry) && isWarnoun(entry)) {
            bgcost += pc;
        }
        else {
            nonbgcost += pc;
        }

        let themediscount: number = this.inTheme()
            ? this.themeApplication().themeDiscount : 0;

        if (Math.max(0, bgcost - this.bgPoints()) + nonbgcost - themediscount
            > this.pal.getListSize()) {

            if( restore && this.inTheme() ) {
                //console.log("Skipping point cost due to theme");
            } else {
                //console.log(`Ending insertEntry due to going over point cost`);
                if( pc != 0 ) {
                    return [null,null];
                }
            }

        }

        //console.log("Passed insertEntry stuff");


        // And here we actually insert the entry to the list

        this.registerEntry(entry, pc);


        let ae : ArmyEntry = new ArmyEntry(parent, entry,
            choice, uid, false, null, {});

        ae.specialist = specialist;


        if ( isCaster(ae.entry) ) {
            this.casters.push(ae);

            if (!restore) {
                this.updateThemeList(ae.entry, 
                    this.theme ? this.theme.id() : null);
            }
        }

        if( isCaster(ae.entry) || (ae.entry.bond && ae.entry.bond.length == 0) ) {
            this.bondable.push(ae);
        }

        if( modified ) {
            ae.cost = realPC;
        }

        if( parent != null ) {
            this.addAttachment(parent, ae);
        }
        else {
            this.addEntry(ae);
        }

        if( this.view ) {
            this.view.decorateEntry(ae, parent, restore);
        }

        //console.log("Normal termination of insertEntry");

        return [parent, ae];
    }


    deleteEntry(uid: number): void {
        let isCaster_: boolean = false;

        for (let i: number = 0; i < this.armyEntries.length; i++) {
            if (this.armyEntries[i].uid == uid) {
                if ( isCaster(this.armyEntries[i].entry) )
                    isCaster_ = true;

                for (let j: number = this.armyEntries[i].children.length - 1; j >= 0; j--) {
                    this.unregisterEntry(this.armyEntries[i].children[j].entry);
                }

                this.unregisterEntry(this.armyEntries[i].entry);
                this.invalidateTheme();
                //this.view.listInner.removeChild(this.armyEntries[i].cont);
                if( this.view ) {
                    this.view.deleteEntry(this.armyEntries[i]);
                }
                this.armyEntries.splice(i, 1);
            }
        }

        if (isCaster_) {
            this.restoreState(this.getState());

            for( let i : number = 0; i < this.pal.subLists.length; i++ ) {
                if( this.pal.subLists[i] != this ) {
                    //this.pal.subLists[i].view.validate(this.pal.rules);
                    this.pal.subLists[i].restoreState(this.pal.subLists[i].getState());
                }
            }
        }

    }


    rawList(): RawListEntry[] {
        let ret: RawListEntry[] = [];

        for (let i = 0; i < this.armyEntries.length; i++) {
            let rle: RawListEntry = {
                entry: this.armyEntries[i].entry,
                choice: this.armyEntries[i].choice,
                specialist: this.armyEntries[i].specialist,
                attached: [],
                parentIndex: i,
                parentSubIndex: null
            };

            for (let j = 0; j < this.armyEntries[i].children.length; j++) {
                let att: RawListEntry = {
                    entry: this.armyEntries[i].children[j].entry,
                    choice: this.armyEntries[i].children[j].choice,
                    specialist: this.armyEntries[i].children[j].specialist,
                    attached: [],
                    parentIndex: i,
                    parentSubIndex: j
                };

                rle.attached.push(att);
            }

            ret.push(rle);
        }

        return ret;
    }




    applyTheme() {
        if (this.inTheme()) {
            //console.log("About to apply theme");

            this.resetCosts();

            let ta: ThemeApplication = this.themeApplication();

            for (let i: number = 0; i < ta.modified.length; i++) {
                if (ta.modified[i].parentSubIndex == null) {
                    // this.armyEntries[ta.modified[i].parentIndex].pcspan.innerText = "0";
                    this.armyEntries[ta.modified[i].parentIndex].cost = 0;

                    // todo: ensure the proper update gets called
                }
                else {
                    // this.armyEntries[ta.modified[i].parentIndex]
                    //     .children[ta.modified[i].parentSubIndex].pcspan.innerText = "0";
                    this.armyEntries[ta.modified[i].parentIndex]
                        .children[ta.modified[i].parentSubIndex].cost = 0;

                }
            }

            let changed : boolean = false;

            // Fucking Crabits

            for( let i : number = this.armyEntries.length - 1; i >= 0; i-- ) {
                if( this.armyEntries[i].entry.C
                    && this.armyEntries[i].entry.C[this.armyEntries[i].choice] == -1
                    && !this.armyEntries[i].isModified() ) {
                        //this.armyEntries.splice(i,1);
                        //console.log("Removing due to -1 C");
                        this.armyEntries[i].remove();
                        changed = true;
                    }
                for( let j : number = this.armyEntries[i].children.length - 1; j >= 0; j-- ) {
                    if( this.armyEntries[i].children[j].entry.C
                        && this.armyEntries[i].children[j].entry.C[this.armyEntries[i].children[j].choice] == -1
                        && !this.armyEntries[i].children[j].isModified() ) {
                            //this.armyEntries[i].children.splice(j,1);
                            //console.log("Removing child due to -1");
                            if( this.armyEntries[i].children[j].remove ) {
                                this.armyEntries[i].children[j].remove();
                            }
                            else {
                                console.log(this.armyEntries[i].children[j]);
                            }
                            changed = true;
                        }
                }
            }
        }

    }

    resetCosts(): void {
        // todo: ensure that the view is updated
        for (let i: number = 0; i < this.armyEntries.length; i++) {

            if ( !isCaster(this.armyEntries[i].entry) ) {
                this.armyEntries[i].resetCost();
            }

            for (let j: number = 0; j < this.armyEntries[i].children.length; j++) {
                    this.armyEntries[i].children[j].resetCost();
            }
        }
    }


    endChange(): void {
        this.applyTheme();

        if( this.view ) {
            this.view.endChange();
        }
    }


    chooseThemeList(tlid: number): void {
        this.invalidateTheme();

        let state: ListState = this.getState();

        state.tl = tlid;

        this.restoreState(state);
        this.pal.aec.syncOptions(this.pal);
        this.endChange();
    }

    updateThemeList(caster: Entry, id: number): void {
        this.invalidateTheme();

        if( caster == null && this.hasCaster() ) {
            caster = this.casters[0].entry;
        }

        if( this.view ) {
            this.view.updateThemeList(caster, id);
        }

        // Cephalyx hack

        // maybe fix 


        // Fix to make this a validation error

        // if( caster && caster.lm ) {
        //     this.theme = new Theme(Data.themeLists[-1 * caster.lm]);
        // }
    }

    hasAnimosity(entry : Entry) : boolean {

        for( let i : number = 0; i < this.armyEntries.length; i++ ) {
            if( entry.anf != null ) {
                if( entry.anf(this.armyEntries[i].entry, 0) ) {
                    return true;
                }
            }

            if( this.armyEntries[i].entry.anf != null ) {
                if( this.armyEntries[i].entry.anf(entry, 0) ) {
                    return true;
                }
            }
        }


        if (entry.an != null) {
            //let anList: string[] = eo.entry.an.split(",");
            let anList: number[] = entry.an;

            for (let j: number = 0; j < anList.length; j++) {
                if (anList[j] != null) { //&& anList[j] != "") {
                    //let check : number = _faCount[parseInt(anList[j])];
                    let check: number = 0;

                    if (Data.entries[anList[j]]) {
                        //check = Data.entries[parseInt(anList[j])].faCount();
                        check = this.getFACount(anList[j]);
                    }

                    if (check != null && check > 0) {
                        // console.log("check failed - " + check + " (" + anList[j] + ","
                        //     + parseInt(anList[j]) + "," + _faCount[parseInt(anList[j])] + ")");
                        // console.log(_faCount);

                        return true;
                    }

                }
            }
        }

        return false;
    }



    optionValid(entry : Entry, choice : number, potentialParent: ArmyEntry, nonbgp: number)
        : [boolean, number, boolean] {
        let valid: boolean = true;
        let modified: boolean = false;
        let cost: number = 0;

        let bgp: number[] = this.bgCost();

        let totalbgp: number = 0;

        for (let i: number = 0; i < bgp.length; i++) {
            let val: number = bgp[i] - (this.casters[i].entry.bgp || 0);

            totalbgp += Math.max(0, val);
        }

        if( entry.n == "Morrowan Battle Priest" ) {
            console.log("Debugging");
        }

        if (potentialParent != null && !canAttach(entry, choice, potentialParent, this.theme)) {            
            return [false, cost, modified];
        }

        // Company of Iron stuff
        if( this.pal.getListType() && this.pal.getListType().coi && !companyOfIron(entry) ) {
            return [false, cost, modified];
        }


        if ( isCaster(entry) ) {
            valid =
                !this.pal.casterExists(entry.id)
                && this.casters.length < this.pal.maxCasters();

            if (valid && entry.fid != this.pal.factionID) {
                valid = this.hasCaster() || 
                    (this.theme && this.theme.forceMercBond() );

            }
        }
        else {
            let pcret: [number, boolean, number] = this.pointCost(entry, choice, null);

            cost = pcret[0];
            modified = pcret[1];

            let themediscount: number = this.inTheme()
                ? this.themeApplication().themeDiscount : 0;

            //let nonbgp2 : number = nonbgp;

            let maxbgdiscount: number = 0;

            if (isWarnoun(entry)) {
                for (let i: number = 0; i < this.casters.length; i++) {
                    if (potentialParent == null) {
                        if (canAttach(entry, choice, this.casters[i], this.theme)) {
                            maxbgdiscount = Math.max(maxbgdiscount,
                                this.casters[i].entry.bgp - bgp[i]);
                        }
                    }
                    else if (potentialParent == this.casters[i]) {
                        maxbgdiscount = Math.max(0,
                            this.casters[i].entry.bgp - bgp[i]);
                    }
                }

                maxbgdiscount = Math.min(cost, maxbgdiscount);
            }

            valid = totalbgp + nonbgp - themediscount + cost - maxbgdiscount <= this.pal.getListSize();

            // Fucking single crabbits

            if( cost == 0 && modified ) {
                valid = true;
            }

            if (valid) {
                valid = this.faLeft(entry, 
                    potentialParent ? potentialParent.entry : null, 
                    true) > 0;
            }

            if (valid
                && (isWarnoun(entry) || entry.isat)
                && entry.indep != 1) {
                valid = false;

                for (let j: number = -1; j < this.armyEntries.length; j++) {
                    valid = j == -1
                        ? canAttach(entry, choice, null, this.theme)
                        : canAttach(entry, choice, this.armyEntries[j], this.theme);


                    if (valid)
                        break;
                }

            }


        }

        if( valid && this.hasAnimosity(entry) ) {
            valid = false;
        }

        if( cost < 0 && (!entry.C || entry.C[0] > -1)) {
            cost = 0;
        }

        if( modified && entry.C && entry.C[choice] > 0 && cost > entry.C[choice]) {
            modified = false;
            cost = entry.C[choice];
        }

        return [valid, cost, modified];
    }





    validate(failFunc: (text: string, sl: SubList, warn?: boolean) => void, 
        rules : Rules, thisMode : boolean): number 
    {
        let failCount : number = 0;

        let pronoun : string = thisMode ? "This" : "Your";

        if( rules && rules.listType ) {
            if( rules.listType.minLists > this.pal.subLists.length ) {
                failFunc(pronoun + " army must contain at least " 
                    + rules.listType.minLists + " lists.", this);
                failCount++;
            }

            if( rules.listType.maxLists < this.pal.subLists.length ) {
                failFunc(pronoun + " army must contain at most " 
                    + rules.listType.maxLists + " list" 
                    + (this.pal.getListType().maxLists > 1 ? "s" : "")
                    + ".", this);
                failCount++;
            }
        }
        else {
            if( this.pal.getListType().minLists > this.pal.subLists.length ) {
                failFunc(pronoun + " army must contain at least " 
                    + this.pal.getListType().minLists + " lists.", this);
                failCount++;
            }

            if( this.pal.getListType().maxLists < this.pal.subLists.length ) {
                failFunc(pronoun + " army must contain at most " 
                    + this.pal.getListType().maxLists
                    + " list" + (this.pal.getListType().maxLists > 1 ? "s" : "")
                    + ".", this);
                failCount++;
            }
        }

        if (!this.hasCaster() && !this.pal.getListType().coi) {
            failFunc(pronoun + " army must contain a warcaster.", this);
            failCount++;
        }


        var totalcost: number = this.pal.getListSize();

        for (let i: number = 0; i < this.casters.length; i++) {
            totalcost += this.casters[i].entry.bgp || 0;
        }


        if( this.armyCost() > this.pal.getListSize() ) {
            failFunc(pronoun + " army must contain " + this.pal.getListSize() 
                + " point" + (this.pal.getListSize() == 1 ? "" : "s") 
                + " or fewer", this);
            failCount++;
        }

        if (this.bgTotalCost() + this.nonbgCost() < totalcost - 5) {
            failFunc(pronoun + " army must contain at least " + (totalcost - 5)
                + " total points.", this);
            failCount++;
        }

        for (let i: number = 0; i < this.armyEntries.length; i++) {
            if (this.armyEntries[i].entry.jr 
	    && this.armyEntries[i].entry.fid != Const.Infernals 
                    && this.armyEntries[i].children.length == 0) {
                failFunc(this.armyEntries[i].entry.n + " must have a battlegroup.", this);
                failCount++;
            }
        }

        if (this.inTheme()) {
            // cephalyx hack
            if (this.theme.id() == -7 || this.theme.id() == 7 || this.theme.id() == 131 ) {
                for (let i: number = 0; i < this.armyEntries.length; i++) {
                    if (!this.armyEntries[i].entry.lm /*&& this.armyEntries[i].entry.sr != 1*/) {
                        let found: boolean = false;
                        for (let j: number = 0; j < this.armyEntries[i].children.length; j++) {
                            if (this.armyEntries[i].children[j].entry.lm == 7) {
                                found = true;
                                break;
                            }
                        }

                        if (!found && this.armyEntries[i].entry.t != 1 && this.armyEntries[i].entry.id != 6524 ) {
                            failFunc(this.armyEntries[i].entry.n +
                                " must have a Cephalyx attachment.", this);
                            failCount++;
                        }
                    }
                }
            }

        }

        // Champions validation

        if( this.pal.getListType().champions && this.pal.getListType().season >= 8 ) {
            if( !this.inTheme() ) {
                failFunc(pronoun + " list must be in theme.", this);
                failCount++;
            }
            else {
                let td : ThemeData = Data.themeLists[this.theme.id()];

                if( !td.adr || td.adr.indexOf(this.pal.getListType().season) == -1 ) {
                    failFunc(pronoun + " theme must be allowed in ADR.", this);
                    failCount++;
                }
            }

            if( this.pal.subLists.length > 1 ) {
                if( this.pal.subLists[0].theme && this.pal.subLists[1].theme
                    && this.pal.subLists[0].theme.id() == this.pal.subLists[1].theme.id() ) {
                        failFunc((thisMode ? "These" : "Your") 
                        + " lists must have different themes.", this);
                        failCount++;
                    }
            }
        }        

        let prerelease: number = 0;
        let expired: number = 0;
        let cid : number = 0;

        let cephalyx : number = 0;

        for (let i: number = 0; i < this.armyEntries.length; i++) {

            if( this.armyEntries[i].entry.lm == 7 ) {
                cephalyx++;
            }

            if (isPreRelease(this.armyEntries[i].entry, rules) ) {
                prerelease++;
            }

            if( isExpired(this.armyEntries[i].entry, rules )) {
                expired++;
            }

            if ( isCID(this.armyEntries[i].entry, rules) ) {
                cid++;
            }

            if( this.armyEntries[i].entry.valf )  {
                let valtext : string = this.armyEntries[i].entry.valf(this);

                if( valtext != null ) {
                    failFunc(valtext, this);
                    failCount++;
                }
            }


            for (let j: number = 0; j < this.armyEntries[i].children.length; j++) {
                if( this.armyEntries[i].children[j].entry.valf )  {
                    let valtext : string = this.armyEntries[i].children[j].entry.valf(this);
    
                    if( valtext != null ) {
                        failFunc(valtext, this);
                        failCount++;
                    }
                }
    
                if( this.armyEntries[i].children[j].entry.lm == 7 ) {
                    cephalyx++;
                }
    
                if ( isPreRelease(this.armyEntries[i].children[j].entry, rules) ) {
                    prerelease++;
                }

                if( isExpired(this.armyEntries[i].children[j].entry, rules) ) {
                    expired++;
                }

                if ( isCID(this.armyEntries[i].children[j].entry, rules) ) {
                    cid++;
                }
            }
        }

        // Check for Cephalyx 
        if( cephalyx > 0 && this.pal.factionID != Const.Cryx ) {
            // Christ this is a clusterfuck.

            if( !this.inTheme() 
                || (this.theme.id() != 7 && this.theme.id() != -7 && this.theme.id() != 131 ) ) {
                failFunc("Cephalyx models must be in a Cephalyx theme.", this, false);
                failCount++;
            }
        }

        // Determine if being pre-release is a warning or direct failure;
        // we test this by seeing if there's a pre-release date attached 
        // to the rules.
        let preReleaseWarning : boolean = true;

        if( rules && rules.preReleaseDate ) {
            preReleaseWarning = false;
        }

        if (prerelease == 1) {
            if( !rules || !rules['ignorePreRelease']) {
                failFunc(pronoun + " army contains a pre-release entry.", this,
                    preReleaseWarning);
                failCount++;
            }
        }
        else if (prerelease > 1) {
            if( !rules || !rules['ignorePreRelease']) {
                failFunc(pronoun + " army contains pre-release entries.", this, 
                    preReleaseWarning);
                failCount++;
            }
        }

        // Expired is always a failure
        if( expired == 1 ) {
            failFunc(pronoun + " army contains an expired entry.", this, false);
            failCount++;
        }
        else if( expired > 1 ) {
            failFunc(pronoun + " army contains expired entries.", this, false);
            failCount++;
        }


        // CID is a bit more complicated.  Default to failure,
        // but if we don't have 
        let cidWarning : boolean = false;

        // If we don't have rules attached, or we do but there's no 
        // date (and explicit no on CID), call it a warning instead 
        // of a failure
        if( !rules || (rules && !rules.forbidCID && !rules.preReleaseDate)) {
            cidWarning = true;
        }

        if (cid == 1) {
            if( !rules || rules.forbidCID ) {
                failFunc(pronoun + " army contains a CID entry.", this, 
                    cidWarning);
                failCount++;
            }
        }
        else if (cid > 1) {
            if( !rules || rules.forbidCID ) {
                failFunc(pronoun + " army contains CID entries.", this, 
                    cidWarning);
                failCount++;
            }
        }

        // Detect unused freebies
        // Unused freebies are always warnings.

        if( this.inTheme() ) {
            let ta : ThemeApplication = this.themeApplication();

            let freeCards : number = 
                Math.floor(ta.requiredCount / this.theme.reqCount)
                * this.theme.reqMult;
            let usedCards : number = ta.modified.length;

            if( freeCards - usedCards > 1 ) {
                failFunc(pronoun + " list has unused free cards.", this, true);
                failCount++;
            }
            else if( freeCards - usedCards == 1 ) {
                failFunc(pronoun + " list has an unused free card.", this, 
                    true);
                failCount++;
            }
        }

        // merc inclusion warning

        // else if(this.hasFAMModel(3) || this.hasFAMModel(4) || this.hasFAMModel(8) ) {
        //     if( !rules || !rules['ignoreCID']) {
        //         failFunc("Your army contains CID Merc/Minion theme inclusion.", this, true);
        //         failCount++;
        //     }
        // }


        // Use the same rules for pre-release for warning vs. failure

        if (this.inTheme() && this.theme.preRelease() && !this.theme.isCID() ) {
            let failcheck : boolean = true;

            if( rules ) {
                if( rules["ignorePreRelease"] ||
                    ( rules["preReleaseDate"] && this.theme.preReleaseDate()
                    && 
                    rules["preReleaseDate"] > this.theme.preReleaseDate() ) ) {
                failcheck = false;
                }
            }

            if( failcheck ) {
                failFunc(pronoun + " list is using a pre-release theme.", this, 
                    preReleaseWarning);
                failCount++;
            }
        }

        if( this.inTheme() && rules && rules.listType ) {
            if( this.theme.isOblivion() && rules.listType.noblivion ) {
                failFunc("You are using an Oblivion theme in a Classic event.",
                    this, false);
                failCount++;
            }

            if( !this.theme.isOblivion() && rules.listType.oblivion ) {
                failFunc("You are using an Classic theme in an Oblivion event.",
                    this, false);
                failCount++;
            }

        }


        // check for CID theme

        if( this.inTheme() && this.theme.isCID() ) {
            failFunc(pronoun + " list is using a CID theme.", this, cidWarning);
        }


        return failCount;
    }

    clearTheme(): void {
        this.theme = null;
        this._themeApplication = null;
    }

    setTheme(caster: Entry, id: number, tl: ThemeData, tier: number): void {
        this.invalidateTheme();

        // wtf
        // if (this.themeList == tl && (this.themeList == null /*|| this.themeTier == tier*/)) {
        //     return;
        // }

        //this.themeList = tl;

        // if (this.themeList != null)
        //     this.themeList.id = id;

        //this.themeTier = tier;

        if( this.view ) {
            this.view.setTheme(tl);
        }


        if (tl == null) {
            this.theme = null;
        }
        else {
            this.theme = new Theme(tl);
        }


        // Force revalidate pairings in case of Champions

        for( let i : number = 0; i < this.pal.subLists.length; i++ ) {
            if( this.pal.subLists[i] != this ) {

                if( this.pal.subLists[i].view ) {
                    this.pal.subLists[i].view.validate(null);
                }
            }
        }
    }


    // rawPointCost(jack: Entry, choice: number): number {
    //     //let pc : number = fo == null ? jack.pc : fo.pc;
    //     //let pc : number = jack.C[choice];

    //     // if (count != null) {
    //     //     pc *= count;
    //     // }

    //     //return pc;

    //     if (jack.C == null) {
    //         return 0;
    //     }
    //     else {
    //         return jack.C[choice];
    //     }
    // }


    pointCost(jack: Entry, choice: number, caster: Entry)
        : [number, boolean, number] {
        let pc :number = 0; //= pointCost(jack, choice);

        if( jack.C != null ) {
            pc = jack.C[choice];
        }

        if (!this.inTheme()) {
            return [pc, false, pc];
        }



        // We don't have to check for adding Partisan
        // here, since in all cases where the attachment
        // makes the unit required, the attachment (jack here)
        // is also required.

        if ( !this.theme.isFreebie(jack, choice)
            && !this.theme.isEntryRequired(jack) ) {
            return [pc, false, pc];
        }


        let rl: RawListEntry[] = this.rawList();

        //let debug : boolean = jack.id == 48;

        let baseCost: number = this.theme.netCost(rl, this.pal.rules, 
            this.themeApplication());

        rl.push({
            entry: jack,
            choice: choice,
            specialist: false,
            attached: [],
            parentIndex: -1,
            parentSubIndex: null
        });

        let addCost: number = this.theme.netCost(rl, this.pal.rules);

        if (addCost - baseCost == pc) {
            return [pc, false, pc];
        }
        else {
            return [addCost - baseCost, true, pc];
        }

    }


    /**
     * Compares two entries to establish a canonical ordering
     * @param a First entry to compare
     * @param b Second entry to compare
     */
    static compareEntry(a : ArmyEntry, b : ArmyEntry) : number {
        // First compare by classes; casters always come first, etc.
        if( Data._data.sortorder[a.entry.t] > Data._data.sortorder[b.entry.t] ) {
            return 1;
        } else if( Data._data.sortorder[a.entry.t] < Data._data.sortorder[b.entry.t] ) {
            return -1;
        } else if( a.entry.id == b.entry.id ) {
            // If they're copies of the same entry, prefer max units over min units.
            // Neccessary to maintain a single canonical ordering for all lists.
            if( a.choice > b.choice ) {
                return 1;
            }
            else if( a.choice < b.choice ) {
                return -1;
            }
            else {
                // Same id, same choice, they're the same
                return 0;
            }
        }
        else {
            // Finally sort alphabetically -- same type order
            return a.entry.n.localeCompare(b.entry.n);
        }
    }

    /**
     * Adds an entry to the list, perserving ordering.
     * @param ae - ArmyEntry to be added to the SubList.
     */
    addEntry(ae : ArmyEntry) : void {
        this.armyEntries.push(ae);
        this.armyEntries.sort(SubList.compareEntry);

        this.invalidateTheme();
    }

    addAttachment(parent : ArmyEntry, ae : ArmyEntry) : void {
        parent.children.push(ae);
        parent.children.sort(SubList.compareEntry);

        this.invalidateTheme();
    }

}

