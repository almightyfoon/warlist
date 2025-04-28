//namespace ccapi {

import { ThemeData, RawListEntry, Rules,
    checkThemeAllowed, checkThemeRequired,
    themeFilter, checkThemeReward } from "./defines";
import { Entry, isWarnoun, isCaster } from "./entry";
import { Data } from "./data";

const Solo : number = 1;
const Warlock : number = 2;
const Warbeast : number = 3;
const Unit : number = 4;
const Attachment : number = 5;
const Warjack : number = 6;
const Warcaster : number = 7;
const BattleEngine : number = 8;
const Monstrosity : number = 9;
const ObjectiveType : number = 10;
const Structure : number = 13;

const Cygnar : number = 1;
const Menoth : number = 2;
const Khador : number = 3;
const Cryx : number = 4;
const Ret : number = 5;
const Mercs : number = 6;
const Trolls : number = 7;
const Circle : number = 8;
const Skorne : number = 9;
const Legion : number = 10;
const Minions : number = 11;
const CoC : number = 12;
const ObjectiveFaction : number = 13;
const Grymkin : number = 14;
const CG : number = 15;



export interface ThemeApplication {
    modified: {
        parentIndex: number,
        parentSubIndex: number,
        costReduction: number
    }[];
    themeDiscount: number;
    requiredCount: number;
    requisitionPoints: number;
    requisitionUsed: number;
    modifiedMax: number;
}

function pointCost(e: Entry, c: number) {
    if (e.C == null) {
        return 0;
    }
    else {
        return e.C[c];
    }
}


export class Theme {
    private themeData: ThemeData;
    private explicitlyAllowed: { [n: number]: boolean };
    paranoia: boolean;
    paranoidModels: { [n: number]: boolean };
    adjustedPC: number;
    reqCount: number;
    reqMult: number;
    private required: themeFilter;
    private rewards: themeFilter;
    includedMercs: { [n: number]: boolean };

    forceMercBond() : boolean {
        return this.themeData && this.themeData.forceMercBond;
    }

    fid() : number {
        return this.themeData ? this.themeData.fid : -1;
    }

    hasFAPools() : boolean {
        return this.themeData && this.themeData.sharedFAPools != null;
    }

    getFAPool(e : Entry) : number {
        return this.themeData.sharedFAFunc(e);
    }
    
    getFAWeight(e : Entry) : number {
        if( this.themeData.sharedFAWeightFunc ) {
            return this.themeData.sharedFAWeightFunc(e);
        }
        else {
            return 1;
        }
    }

    getFAPoolSize(i : number) : number {
        return this.themeData.sharedFAPools[i];
    }

    hasAnimosity() : boolean {
        return this.themeData && this.themeData.animosityFunc != null;
    }

    animosity(a : Entry, b : Entry) : boolean {
        return this.themeData.animosityFunc(a,b);
    }

    constructor(td: ThemeData) {
        this.themeData = td;
        this.explicitlyAllowed = this.getAllowed();
        this.paranoia = false;
        this.paranoidModels = {};
        this.adjustedPC = 0;
        this.reqCount = 0;
        this.includedMercs = {};


        this.adjustedPC = td.pc || 0;
        this.reqCount = td.pcqty || 0;
        this.reqMult = td.pcmult || 1;
        this.rewards = td.rewards || [];
        this.required = td.required || [];
        this.setParanoid(true);

        for (let j: number = 0; j < this.rewards.length; j++) {
            let index : any = this.rewards[j];
            if( typeof index === "number" ) {
                this.paranoidModels[index] = true;
            }
        }

        if( td.mercInclusion ) {
            for( let idx in Data.entries ) {
                let e : Entry = Data.entries[idx];

                if( e.wf && !e.themeunique &&
                    (e.t == Unit || e.t == Solo || e.t == BattleEngine )
                    // (this.themeData.mercBENotSolo ? (e.t == Unit || e.t == BattleEngine)
                    //         : (e.t == Solo || e.t == Unit))
                    && (this.themeData.mercNoSolo ? e.t != Solo : true)
                    && (!this.themeData.mercAllowBE ? e.t != BattleEngine : true)
                    && (this.themeData.mercNoCharSolo ? !(e.t == Solo && e.fa == "C") : true)
                    && (this.themeData.mercNoCharUnit ? !(e.t == Unit && e.fa == "C") : true)
                    && e.wf.indexOf(this.themeData.fid) != -1
                    && (!this.themeData.mercExclude || this.themeData.mercExclude.indexOf(e.id) == -1)
                    && (e.part != this.themeData.fid || !checkThemeAllowed(this.themeData, e) ) 
                ) {

                    this.includedMercs[e.id] = true;

                    if( e.at || e.atf ) {
                        for( let attachedId of e.wfatt ) {
                            this.includedMercs[attachedId] = true;
                        }
                    }
                }
            }
        }

    }

    isRequired(rle : RawListEntry) : boolean {

        let madePartisan : boolean = false;

        if( rle.attached ) {
            for( let i : number = 0; i < rle.attached.length; i++ ) {
                madePartisan = madePartisan || rle.attached[i].entry.makepart;
            }
        }

        return checkThemeRequired(this.themeData, rle.entry, rle.choice, 
            madePartisan);
    }

    isEntryRequired(e : Entry) : boolean {
        return checkThemeRequired(this.themeData, e, -1);
    }


    freebieIndex(e : Entry, choice : number) : number {
        return checkThemeReward(this.themeData, e, choice);
    }

    isFreebie(e : Entry, choice : number) : boolean {
        return checkThemeReward(this.themeData, e, choice) >= 0;
    }

    isFAU(n: number): boolean {
        return this.themeData.fau ?
            this.themeData.fau.indexOf(n) > -1
            : false;
    }

    isFAM(e : Entry, rules : Rules, ignoreExplicit? : boolean) : boolean {
        if( !this.themeData.mercInclusion ) {
            return false;
        }

        // It's not Merc Inclusion if the entry is
        // already included in theme
        //if( this.themeData.allowed.indexOf(e.id) != -1 ) {
        if( !ignoreExplicit && this.isAllowed(e, rules, null, true) ) {
            return false;
        }

        // If it's themeunique, it's not merc-included
        if( e.themeunique && e.themeunique != this.themeData.id ) {
            return false;
        }

        // Doesn't apply to warnouns

        if( isWarnoun(e) ) {
            return false;
        }

        return this.includedMercs[e.id] || false;
    }

    modifiedFA(e : Entry): number {
        if( this.themeData.fam && this.themeData.fam[e.id] ) {
            return this.themeData.fam[e.id];
        }

        return 0;
    }

    isAllowed(e : Entry, rules : Rules, parent? : Entry, ignoreFAM? : boolean)
        : boolean 
    {
        // XBG overrides all
        if( parent && parent.xbg && parent.atf(e, 0) ) {
            return true;
        }

        if( e.makepart && this.isOblivion() && !this.themeData.allowMakepart ) {
            return false;
        }
        else if( this.explicitlyAllowed && this.explicitlyAllowed[e.id] == true ) {
            return true;
        }
        else if( this.themeData && checkThemeAllowed(this.themeData, e) ) {
            return true;
        }
        else if( !ignoreFAM && this.isFAM(e, rules, true) ) {
            return true;
        }
        else if( isWarnoun(e) && (e.fid == Minions || e.fid == Mercs) 
                && e.fid != this.themeData.fid ) {
            return true;
        }
        else if ( e.themeExtra && e.themeExtra.indexOf(this.themeData.id) != -1 ) {
            return true;
        }
        else if( parent && e.bond && e.bond.indexOf(parent.id) != -1 ) {
            return true;
        }
        else {
            return false;
        }
    }

    name(): string {
        return this.themeData.n;
    }

    preRelease(): boolean {
        return this.themeData.pr || false;
    }

    preReleaseDate() : Date {
        return this.themeData.prd;
    }
    
    isOblivion() : boolean {
        return this.themeData.obv || false;
    }

    isCID() : boolean {
        return this.themeData.cid || false;
    }

    isParanoid(): boolean {
        return this.paranoia;
    }

    setParanoid(paranoia: boolean) {
        this.paranoia = paranoia;
    }

    id(): number {
        return this.themeData.id;
    }

    private getAllowed(): { [n: number]: boolean } {
        if (this.themeData != null && this.themeData.allowed != null) {
            let allowed: { [n: number]: boolean } = {};

            for (let i: number = 0; i < this.themeData.allowed.length; i++) {
                allowed[this.themeData.allowed[i]] = true;
            }

            return allowed;
        }
        else {
            return null;
        }
    }

    netCost(rl: RawListEntry[], rules : Rules, ta?: ThemeApplication): number {
        let ret: number = 0;

        for (let i: number = 0; i < rl.length; i++) {
            if ( !isCaster(rl[i].entry) ) {
                ret += pointCost(rl[i].entry, rl[i].choice);
            }

            for (let j: number = 0; j < rl[i].attached.length; j++) {
                ret += pointCost(rl[i].attached[j].entry, rl[i].attached[j].choice);
            }
        }

        if (!ta) {
            ta = this.applyTheme(rl, rules);
        }

        for (let i: number = 0; i < ta.modified.length; i++) {
            ret -= ta.modified[i].costReduction;
        }


        return ret;
    }

    applyOblivionTheme(rl: RawListEntry[], rules : Rules) : ThemeApplication {
        let ta: ThemeApplication = {
            modified: [],
            themeDiscount: 0,
            requiredCount: 0,
            modifiedMax: 0,
            requisitionPoints: 0,
            requisitionUsed: 0
        }

        ta.requisitionPoints = Math.min(Math.floor(rules.listSize / 25), 3);

        let potentialPicks : { 
            baseIndex: number;  
            offset: number;
            cost: number;
            savings: number;
            bg: boolean;
            index: number;
        }[] = [];


        for (let i = 0; i < rl.length; i++) {

            let index : number = this.freebieIndex(rl[i].entry, rl[i].choice);

            if ( index >= 0 ) {
                let cost : number = pointCost(rl[i].entry, rl[i].choice);
                let savings : number = cost;

                if( this.themeData.rewardMultiplier ) {
                    savings *= this.themeData.rewardMultiplier[index];
                }

                potentialPicks.push({
                    baseIndex: i,
                    offset: -1,
                    cost: cost,
                    savings: savings,
                    bg: false,
                    index: index
                });
            }

            for (let j = 0; j < rl[i].attached.length; j++) {
                index = this.freebieIndex(rl[i].attached[j].entry, 
                    rl[i].attached[j].choice);

                if (index >= 0) {
                    let cost : number = pointCost(rl[i].attached[j].entry, rl[i].attached[j].choice);
                    let savings : number = cost;

                    if( this.themeData.rewardMultiplier ) {
                        savings *= this.themeData.rewardMultiplier[index];
                    }

                    potentialPicks.push({
                        baseIndex: i,
                        offset: j,
                        cost: cost,
                        savings: savings,
                        bg: isWarnoun(rl[i].attached[j].entry) && isCaster(rl[i].entry),
                        index: index
                    });
                }

            }

        }

        potentialPicks.sort((a : any, b: any) => {
            if( a.savings == b.savings ) {
                if( a.index == b.index ) {
                    return 0;
                }
                else {
                    return a.index < b.index ? 1 : -1;
                }
            }
            else {
                return a.savings < b.savings ? 1 : -1;
            }
        });

        //console.log(potentialPicks);

        let picks : number = ta.requisitionPoints;

        for( let i : number = 0; i < potentialPicks.length && picks > 0; i++ ) {
            // Check for reward multipliers
            let matchesNeeded : number = 1;
            let matchesFound : number = 0;

            if( this.themeData.rewardMultiplier ) {
                matchesNeeded = this.themeData.rewardMultiplier[potentialPicks[i].index];
            }

            //console.log("Starting loop with needed = " + matchesNeeded + "; i = " + i);

            for( let j : number = i; j < i + matchesNeeded && j < potentialPicks.length; j++ ) {
                //console.log("Testing " + j + "; needed " + matchesNeeded);

                if( potentialPicks[j].index == potentialPicks[i].index ) {
                    matchesFound++;
                    //console.log("Found: " + matchesFound + "; needed " + matchesNeeded);
                }
                else {
                    break;
                }

                if( matchesFound == matchesNeeded ) {

                    for( let k : number = i; k < i + matchesNeeded; k++ ) {
                        ta.themeDiscount += potentialPicks[k].cost;

                        ta.modified.push({
                            parentIndex: potentialPicks[k].baseIndex,
                            parentSubIndex: potentialPicks[k].offset == -1 ? null :
                                potentialPicks[k].offset,
                            costReduction: potentialPicks[k].cost
                        });
                        }   
        
                    picks--;
                    ta.requisitionUsed++;
                    i += matchesNeeded - 1;
        
                    break;
                }
            }

        }

        return ta;
    }

    applyTheme(rl: RawListEntry[], rules : Rules): ThemeApplication {

        if( this.isOblivion() ) {
            return this.applyOblivionTheme(rl, rules);
        }
        
        //console.log("**** Starting applyTheme");

        // if(debug) {
        //     console.log("Starting applyTheme - " + rl.length);

        //     let dstr : string = "";
        //     for( let i : number = 0; i < rl.length; i++ ) {
        //         if( i > 0 ) dstr += " / ";
        //         dstr += rl[i].entry.n;
        //     }

        //     console.log(dstr);
        // }



        let reqlistpoints: number = 0;
        let purelistpoints: number = 0;

        let ta: ThemeApplication = {
            modified: [],
            themeDiscount: 0,
            requiredCount: 0,
            modifiedMax: 0,
            requisitionPoints: 0,
            requisitionUsed: 0
        }

        let conflicted: number = 0;

        let potentialPicks : { 
            baseIndex: number;  
            offset: number;
            cost: number;
            conflict: boolean;
            bg: boolean;
        }[] = [];


        for (let i = 0; i < rl.length; i++) {

            let id: number = rl[i].entry.id;

            //console.log("Looking at " + this.armyList[i].entry.n);

            let parentReq: boolean = false;

            let entryPointCost : number = pointCost(rl[i].entry, rl[i].choice);


            if (!rl[i].specialist && this.isRequired(rl[i]) ) {
                //console.log("Adding points");
                reqlistpoints += entryPointCost;
                parentReq = true;
            }

            if (!rl[i].specialist && this.isFreebie(rl[i].entry, rl[i].choice) ) {
                let pc: number = entryPointCost;

                potentialPicks.push({
                    baseIndex: i,
                    offset: -1,
                    cost: pc,
                    conflict: parentReq, 
                    bg: false
                });

                if( this.isRequired(rl[i]) ) {
                    conflicted++;
                }
            }
            else if( parentReq ) {
                //console.log("Adding " + entryPointCost);
                purelistpoints += entryPointCost;
            }

            for (let j = 0; j < rl[i].attached.length; j++) {
                id = rl[i].attached[j].entry.id;
                //console.log("Looking at " + this.armyList[i].children[j].entry.n);

                // Per Nathan's ruling, CA/WA are part of the unit and count
                // for theme list rules.
                // And Nathan would never let me down.

                let childReq : boolean = false;

                if (!rl[i].attached[j].specialist
                    && this.isRequired(rl[i].attached[j]) ||
                    (parentReq && !isWarnoun(rl[i].attached[j].entry))) {
                    //console.log("Adding points");
                    reqlistpoints += pointCost(rl[i].attached[j].entry,
                        rl[i].attached[j].choice);

                    childReq = true;
                }


                if (!rl[i].attached[j].specialist && this.isFreebie(rl[i].attached[j].entry, rl[i].attached[j].choice) ) {
                    if( parentReq ) {
                        conflicted++;
                    }

                    let pc: number = pointCost(rl[i].attached[j].entry,
                        rl[i].attached[j].choice
                    );

                    potentialPicks.push({
                        baseIndex: i,
                        offset: j,
                        cost: pc,
                        conflict: this.isRequired(rl[i].attached[j]),
                        bg: isWarnoun(rl[i].attached[j].entry) && isCaster(rl[i].entry)
                    });
                }
                else if( childReq ) {
                    let pc: number = pointCost(rl[i].attached[j].entry,
                        rl[i].attached[j].choice
                    );                    

                    purelistpoints += pc;
                }
            }
        }

        potentialPicks.sort(function(a, b) : number {
            if( b.cost == -1 ) {
                return a.cost == -1 ? 0 : 1;
            }
            else if( a.cost == -1 ) {
                return b.cost == -1 ? 0 : -1;
            }
            else {
                if( a.cost == b.cost ) {
                    return (a.conflict ? 1 : 0) - (b.conflict ? 1 : 0);
                }
                else {
                    return b.cost - a.cost;
                }
            }
        });
                
        let allowed: number = Math.floor(reqlistpoints / this.reqCount)
            * this.reqMult;

        let finalPointsUsed : number = 0;
        let finalPointsFree : number = 0;

        let pick = (index : number) => {
            // if( potentialPicks[index].offset == -1 ) {
            //     console.log("Picking " + rl[potentialPicks[index].baseIndex].entry.n);
            // }
            // else {
            //     console.log("Picking " + rl[potentialPicks[index].baseIndex]
            //         .attached[potentialPicks[index].offset].entry.n);
            // }
            
            ta.modified.push({
                parentIndex: potentialPicks[index].baseIndex,
                parentSubIndex: potentialPicks[index].offset == -1 ? null :
                    potentialPicks[index].offset,
                costReduction: potentialPicks[index].cost
            });

            if( potentialPicks[index].cost > 0 ) {
                ta.themeDiscount += potentialPicks[index].cost;
            }

            if( potentialPicks[index].conflict ) {
                finalPointsUsed += potentialPicks[index].cost;
            }
        };


        // Calculate BGP and non-BGP spent

        let preThemeBGP : number = 0;
        let preThemeNonBGP : number = 0;

        if( rl.length > 0 && isCaster(rl[0].entry) ) {
            preThemeBGP = -1 * rl[0].entry.bgp;
        }

        for( let i : number = 0; i < rl.length; i++ ) {
            if( !isCaster(rl[i].entry)) {
                preThemeNonBGP += rl[i].entry.C[rl[i].choice];
                //console.log("nonBGP: "  + rl[i].entry.n + " - " + rl[i].entry.C[rl[i].choice]);
            }

            for( let j : number = 0; j < rl[i].attached.length; j++ ) {

                let child = rl[i].attached[j];

                if( isCaster(rl[i].entry) && isWarnoun(child.entry) ) {
                    preThemeBGP += child.entry.C[child.choice];
                    //console.log("BGP: "  + child.entry.n + " - " + child.entry.C[child.choice]);
                }
                else {
                    preThemeNonBGP += child.entry.C[child.choice];
                    //console.log("nonBGP: "  + child.entry.n + " - " + child.entry.C[child.choice]);
                }
            }
        }

        // console.log("Pre-theme: BGP: " + preThemeBGP + ", nonBGP: " + preThemeNonBGP);
        // console.log("list cost: " + (preThemeNonBGP + Math.max(0, preThemeBGP)) );

        let foundBest : boolean = false;

        // Verify that the choice of picks is valid; this should only impact
        // lists that can choose battlegroup models
        let validatePicks = (picks : number[]) : boolean => {

            // console.log("Validating picks");
            // console.log(picks);
            // console.log(potentialPicks);

            // Sanity check
            if( rl.length == 0 ) {
                return true;
            }

            // This only matters for non-bg-free themes.
            if( !this.themeData.bgfree ) {
                return true;
            }


            let bgp : number = preThemeBGP;
            let nonbgp : number = preThemeNonBGP;


            for( let i : number = 0; i < picks.length; i++ ) {
                let parent : Entry = rl[potentialPicks[picks[i]].baseIndex].entry;
                let parentPick = rl[potentialPicks[picks[i]].baseIndex];

                if( isCaster(parent) 
                    && potentialPicks[picks[i]].offset >= 0 
                    && isWarnoun(parentPick.attached[potentialPicks[picks[i]].offset].entry )) {

                    bgp -= potentialPicks[picks[i]].cost;
                }
                else {
                    nonbgp -= potentialPicks[picks[i]].cost;
                }
            }

            // console.log("Post-theme: BGP: " + bgp + ", nonBGP: " + nonbgp);
            // console.log("list cost: " 
            //     + (nonbgp + Math.max(0, bgp)) );


            return (nonbgp + Math.max(0, bgp)) <= rules.listSize;
        }

        if( Math.floor(reqlistpoints / this.reqCount) == Math.floor(purelistpoints / this.reqCount)) {
            // There's no way to get more stuff by skipping choices, so the top n
            // selections from the list are valid.
            
            // console.log("Attempting pure picks -- " + reqlistpoints + " vs " + purelistpoints);
            // console.log(potentialPicks);

            let purePicks : number[] = [];

            for( let i : number = 0; i < allowed && i < potentialPicks.length; i++ ) {
                purePicks.push(i);
            }


            if( validatePicks(purePicks) ) {
                foundBest = true;

                for( let i : number = 0; i < allowed && i < potentialPicks.length; i++ ) {
                    pick(i);
                }
            }

        }

        // If we haven't found the best option...

        if( !foundBest) {
            // console.log("Not using pure picks");

            // Cull picks from the top of the order while they're obvious

            let picksTaken : number = 0;

            // This isn't working yet

            // while( allowed - picksTaken > 0 && potentialPicks.length > 0 && !potentialPicks[0].conflict ) {
            //     pick(0);
            //     picksTaken++;
            //     potentialPicks.splice(0,1);
            // }

            // Only bother with this if there actually *are* things to pick
            if( potentialPicks.length > 0 && allowed - picksTaken > 0 ) {

                // set up equivalence classes

                let eq : {
                    cost: number;
                    conflict: boolean;
                    indices: number[];
                    bg: boolean;
                }[] = [];

                for( let i : number = 0; i < potentialPicks.length; i++ ) {
                    if( i == 0 
                        || potentialPicks[i].cost != potentialPicks[i-1].cost
                        || potentialPicks[i].conflict != potentialPicks[i-1].conflict 
                        || potentialPicks[i].bg != potentialPicks[i-1].bg ) {
                            eq.push({
                                cost: potentialPicks[i].cost,
                                conflict: potentialPicks[i].conflict,
                                bg: potentialPicks[i].bg,
                                indices: [i]
                            });

                    } 
                    else {
                        eq[eq.length - 1].indices.push(i);
                    }
                }

                // console.log("Equivalance classes:");
                // console.log(eq);

                let validateEQ = (picks : number[]) : boolean => {
                    if( rl.length == 0 ) {
                        return true;
                    }

                    // This only matters for non-bg-free themes.
                    if( !this.themeData.bgfree ) {
                        return true;
                    }
        
                    let bgp : number = preThemeBGP;
                    let nonbgp : number = preThemeNonBGP;
        
                    for( let pickIndex : number = 0; pickIndex < picks.length; pickIndex++ ) {
        
                        let pickCount : number = picks[pickIndex];
        
                        if( pickCount < 1 ) {
                            continue;
                        }
        
                        if( potentialPicks[pickIndex].bg ) {
                            bgp -= eq[pickIndex].cost * pickCount;
                        }
                        else {
                            nonbgp -= eq[pickIndex].cost * pickCount;
                        }
        
                    }
        
                    return (nonbgp + Math.max(0, bgp)) <= rules.listSize;
                }
        

                let choices : number[] = [];

                for( let i : number = 0; i < eq.length; i++ ) {
                    choices.push(0);
                }

                let nextChoice = () => {
                    let chosen : number = 0;
                    let valid : boolean = false;

                    do
                    {
                        choices[0]++;

                        let j : number = 0;

                        while( choices[j] > eq[j].indices.length ) {
                            choices[j] = 0;
                            j++;

                            if( j >= choices.length ) {
                                return false;
                            }

                            choices[j]++;
                        }


                        chosen = choices.reduce((total, num) => {
                            return total + num;
                        });

                        valid = chosen == (allowed - picksTaken) 
                            || chosen == ((allowed - picksTaken) - 1)
                            || chosen == potentialPicks.length
                            || chosen == potentialPicks.length - 1;

                        // console.log("valid: " + valid + ", chosen: " + chosen + ", allowed: "
                        //     + allowed + ", picksTaken: " + picksTaken);

                        let consumedPoints : number = 0;

                        for( let k : number = 0; k < choices.length; k++ ) {
                            if( eq[k].conflict ) {
                                consumedPoints += eq[k].cost * choices[k];
                            }
                        }

                        valid = valid 
                        && (Math.floor((reqlistpoints - consumedPoints) / this.reqCount) 
                            * this.reqMult) >=
                            chosen
                        && validateEQ(choices);

                    }
                    while( !valid );


                    return true;
                };

                let bestChoices : number[] = null;
                let bestSavings : number = 0;

                while(nextChoice()) {
                    let savings : number = 0;

                    for( let k : number = 0; k < choices.length; k++ ) {
                        savings += eq[k].cost * choices[k];
                    }

                    // console.log(choices);
                    // console.log("choices: " + choices + ", savings: " + savings);
                

                    if( bestChoices == null || savings > bestSavings ) {
                        bestSavings = savings;
                        bestChoices = choices.slice();
                    }
                }


                // console.log("Best - " + bestSavings);
                // console.log(bestChoices);

                // console.log("picks: " + potentialPicks.length + ", eqs: " + eq.length 
                //     + ", allowed: " + allowed + ", count: " + choiceCount);

                if( bestChoices ) {
                    for( let k : number = 0; k < bestChoices.length; k++ ) {
                        for( let l : number = 0; l < bestChoices[k]; l++ ) {
                            //console.log("picking " + eq[k].indices[l]);
                            pick(eq[k].indices[l]);
                        }
                    }
                }
            }

            
        }

        ta.requiredCount = reqlistpoints - finalPointsUsed;

        return ta;
    }


}

//}
