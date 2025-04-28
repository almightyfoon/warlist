//namespace ccapi {

import { Entry, hasKeyword } from "./entry";

export enum Const {
    // Factions
    Cygnar = 1,
    Menoth = 2,
    Khador = 3,
    Cryx = 4,
    Ret = 5,
    Mercs = 6,
    Trolls = 7,
    Circle = 8,
    Skorne = 9,
    Legion = 10,
    Minions = 11,
    CoC = 12,
    ObjectiveFaction = 13,
    Grymkin = 14,
    CG = 15,
    Infernals = 16,

    // Types
    Solo = 1,
    Warlock = 2,
    Warbeast = 3,
    Unit = 4,
    Attachment = 5,
    Warjack = 6,
    Warcaster = 7,
    BattleEngine = 8,
    Monstrosity = 9,
    ObjectiveType = 10,
    Structure = 13,
    Horror = 14,
    Master = 15,

    // Sizes
    Small = 30,
    Medium = 40,
    Large = 50,
    Huge = 120,
}


export enum Magic {
    listSeparator = 4095,
    contractCode = 4093,
    themeCode = 4094,
    specialistCode = 4092
}

    export interface Contract {
        id: number;
        fid: number;
        n: string;
    }

    export interface FactionDetail {
        wmh: number;
        n: string;
    }


    export interface ListState {
        tl: number;
        size: number;
        //sr: boolean;
        tt: number;
        list: number[][];
    }

    export interface ListType {
        steamroller: boolean;
        adr: boolean;
        champions: boolean;
        season: number;
        minLists: number;
        maxLists: number;
        forceSpecialists?: number;
        coi?: boolean;
        oblivion?: boolean;
        noblivion?: boolean;
    }


    export interface StoredList {
        c: number;
        f: number;
        t: ListType;
        l: ListState;
        m?: ListState;
        n?: ListState;
    }

    export interface SavedList {
        l: StoredList;
        o: number;
        d: string;
        f: number;
    }

    export interface Benefit {
        y: string;
        cIs: number[];
        adj: number;
        pc?: number;
        maxqty: number;
        jbcIs: number[];
        pcadj: number;
        jmcI: number;
        acIs: number[];
        fecIs: number[];
        feqty: number;
        pcqty?: number;
        fa: string;
        rcIs: number[];
    }

    export type entityFilter = (e : Entry, choice : number) => boolean;
    export type themeFilter = Array<entityFilter | string | number | Array<entityFilter | string | number>>;

    export interface ThemeData {
        id: number;
        fid: number;
        n: string;
        allowed?: number[];
        fau? : number[];
        fam? : { [n: number] : number};
        pr? : boolean;
        fr? : number;
        prd? : Date;
        cid? : boolean;
        forced? : boolean;
        // tb1text? : string;
        // tb2text? : string;
        tb : string[];
        mercInclusion? : boolean;
        mercExclude? : number[];
        //mercBENotSolo? : boolean;
        mercAllowBE? : boolean;
        mercNoCharSolo? : boolean;
        mercNoSolo? : boolean;
        mercNoCharUnit? : boolean;
        allowFuncs? : themeFilter,
        //requiredFuncs? : themeFilter,
        required? : themeFilter,
        rewards? : themeFilter,
        sharedFAPools? : number[];
        sharedFAFunc? : (e : Entry) => number;
        sharedFAWeightFunc? : (e : Entry) => number;
        animosityFunc? : (a : Entry, b : Entry) => boolean;

        //rewards?: number[];
        //requiredList?: number[];
        pc?: number;
        pcqty?: number;
        pcmult?: number;

        adr? : number[];

        bgfree? : boolean;  // true if the theme has free battlegroup models
        forceMercBond? : boolean; // true if out-of-faction character warnouns
                                // should be explicitly tested


        obv? : boolean;  // true if it is an Oblivion theme
        allowMakepart?: boolean;
        rewardMultiplier? : number[];
    }

    function evaluateSubFilter(e : Entry, choice : number,
            subFilter : Array<entityFilter | string | number>,
            madePartisan : boolean = false) : boolean {


        for( let f of subFilter ) {
            if( typeof f == "string" ) {
                if( !hasKeyword(e, f) ) {
                    return false;
                }
            }
            else if( typeof f == "number") {
                if( f < 0 ) {
                    return e.id != -f;
                }

                if( e.fid != f && e.part != f && !madePartisan ) {
                    return false;
                }
            }
            else {
                if( !f(e, choice) ) {
                    return false;
                }
            }
        }

        return true;
    }

    function evaluateThemeFilter(e : Entry, choice : number, fid : number,
        tf : themeFilter, madePartisan : boolean = false, mercsExplicit : boolean) : boolean 
    {
        return findThemeFilter(e, choice, fid, tf, madePartisan, mercsExplicit) >= 0;
    }

    function findThemeFilter(e : Entry, choice : number, fid : number,
            tf : themeFilter, madePartisan : boolean = false, 
            mercsExplicit : boolean = false) : number 
    {
        if( e.nonFree )
            return -1;
            
        //for( let f of tf ) {
        for( let index : number = 0; index < tf.length; index++ ) {
            let f = tf[index];

            if( typeof f === "string") {
                let ret : boolean =
                    ( e.fid == fid || e.part == fid || madePartisan || mercsExplicit )
                    && hasKeyword(e, f);

                if( ret ) {
                    return index;
                }
            }
            else if( typeof f === "number") {
                if( e.id == f ) {
                    return index;
                }
            }
            else if( f instanceof Array ) {
                if( evaluateSubFilter(e, choice, f, madePartisan) ) {
                    return index;
                }
            }
            else if( f(e, choice) ) {
                return index;
            }
        }

        return -1;
    }

    export function checkThemeAllowed(td : ThemeData, e : Entry) : boolean {
        if( e == null ) {
            return true;
        }
        
        if( td.allowed && td.allowed.indexOf(e.id) >= 0 ) {
            return true;
        }

        if( e.themeunique && e.themeunique != td.id ) {
            return false;
        }

        if( td.allowFuncs && evaluateThemeFilter(e, -1, td.fid, td.allowFuncs, false, !td.mercInclusion) ) {
            return true;
        }

        return false;
    }

    export function checkThemeReward(td : ThemeData, e : Entry, choice : number) 
            : number 
    {
        if( e.nonFree ) 
            return -1;

        if( td.rewards ) {
            let index : number = td.rewards.indexOf(e.id);

            if( index >= 0 ) {
                return index;
            }

            return findThemeFilter(e, choice, td.fid, td.rewards);
        }
        else {
            return -1;
        }
    }

    export function checkThemeRequired(td : ThemeData, e : Entry, choice : number,
            madePartisan : boolean = false) : boolean {

        if( td.required && td.required.indexOf(e.id) >= 0 ) {
            return true;
        }

        if( td.required && evaluateThemeFilter(e, choice, td.fid, td.required,
                madePartisan, !td.mercInclusion) ) {
            return true;
        }

        return false;
    }


    export class ArmyEntry {
        entry: Entry;
        choice: number;
        specialist: boolean;

        viewData : object;

        modified : boolean;
        private calculatedCost : number;

        rawCost() : number {
            if (this.entry.C == null) {
                return 0;
            }
            else {
                return this.entry.C[this.choice];
            }
        }

        listCost() : number {
            if( this.specialist ) {
                return 0;
            }

            return this.rawCost();
        }

        get cost() : number {
            return this.calculatedCost;
        }

        set cost(c : number) {
            this.calculatedCost = c;
        }

        get baseText() : string {
            let ret : string = this.entry.n;

            if( this.entry.C ) {
                if( this.entry.C.length == 2) {
                    ret += this.choice == 0 ? " (min)" : " (max)";
                }
                else if( this.entry.C.length > 2 ) {
                    ret += " (" + (this.choice + 1) + ")";
                }
            }

            return ret;
        }

        get costText() : string {
            let ret : string = "";

            if( this.entry.bgp ) {
                ret += "+" + this.entry.bgp;
            }
            else {
                ret += "" + this.cost;

                if( this.isModified() ) {
                    if( this.entry.C[this.choice] < 0 ) {
                        ret += "(-)";
                    }
                    else {
                        ret += "(" + this.entry.C[this.choice] + ")";
                    }
                }
            }

            return ret;
        }


        get fullText() : string {
            let ret : string = this.baseText;

            return this.baseText + " [" + this.costText + "]";
        }

        uid: number;
        children: ArmyEntry[];
        parent: ArmyEntry;
        companion : boolean;


        remove: (skipEndChange? : boolean) => void;


        constructor(parentEntry: ArmyEntry, entry: Entry, choice: number, uid: number,
            companion: boolean, remove: (skipEndChange? : boolean) => void,
            viewData: object) {

                this.entry = entry;
                this.choice = choice;
                this.uid = uid;
                this.companion = companion;
                this.remove = remove;
                this.viewData = viewData;
                this.calculatedCost = entry.C ? entry.C[choice] : 0;
                this.children = [];
                this.parent = parentEntry;
        }

        /**
         * Determine if the entry's cost has been modified by a theme.
         */
        isModified() : boolean {
            if( !this.entry.C ) {
                return false;
            }
            else {
                return this.entry.C[this.choice] != this.calculatedCost;
            }
        }

        /**
         * Reset this entry's cost to the default.
         */
        resetCost() : void {
            this.calculatedCost = this.entry.C ? this.entry.C[this.choice] : 0;
        }
    }



    export interface Faction {
        entries: { [n: number]: Entry };
        warnouns: number[];
        types: { [s: string]: { [n: number]: boolean } };
    }

    export interface JSONData {
        entries: { [n: number]: Entry };
        typenames: { [n: number]: string };
        typenameSingle: { [n: number]: string };
        contracts: { [n: number]: ThemeData };
        factions: { [n: number]: FactionDetail };
        themelists: { [n: number]: ThemeData };
        sortorder: { [n: number]: number};
    }


    export interface TypeDetail {
        order: number;
        icon: string;
    }


    export interface RawListEntry {
        entry: Entry;
        choice: number;
        specialist: boolean;
        attached: RawListEntry[];
        parentIndex: number;
        parentSubIndex: number;
    }

export class Rules {
    listSize?: number;
    //ignoreCID?: boolean;
    forbidCID?: boolean;
    convention? : string; // convention status
    allowNarrative?: boolean;
    ignorePreRelease?: boolean;
    preReleaseDate?: Date;
    postedEventDate? : Date;
    listType?: ListType;
    enforce?: boolean;
    useCallback? : boolean;
    extraAllowed? : number[];
    oblivion? : boolean; // if Oblivion is allowed
}




//}
