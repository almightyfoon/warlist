
//namespace ccapi {

import { Rules, ArmyEntry, entityFilter, Const } from "./defines";
import { Theme } from "./theme";
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

const Small : number = 30;
const Medium : number = 40;
const Large : number = 50;
const Huge : number = 120;

    export interface Entry {
        req?: number[];
        fa: string;
        id?: number;
        v?: string;
        n: string;
        bgp?: number;
        an?: number[];
        anf? : entityFilter;
        atf?: entityFilter;
        exf? : entityFilter; // Exclude filter
        atfr?: string;
        indep?: number;
        typename?: string;
        themeunique?: number;
        am? : number; // Amphibious
        ud? : number; // Undead
        cs? : number; // Construct
        lv? : number; // Explicitly living
        ff?: number;
        lm?: number;
        jr?: number;
        jm?: number;
        //sr?: number;
        t: number;
        fid: number;
        wa?: number;
        lbg?: number; // Limited Battlegroup
        xbg?: boolean; // Extended Battlegroup
        at?: number[];
        wfatt?: number[];
        wu?: number;
        co?: number;
        //league?: boolean;
        //old?: boolean;
        //pc : number;
        lmod?: number;
        wf?: number[];
        //mf?: number[];
        ca?: number;
        isat?: boolean;
        casterAttachment?: boolean;
        pr?: number;
        prd?: Date;
        bond?: number[];
        C?: number[];
        D?: string;
        E?: number;
        adr?: number[];
        fr?: number;
        exp? : Date;
        themeExtra? : number[];
        k? : string;
        b : number;
        dec? : number;
        makepart? : boolean; // Makes attached unit partisan
        part? : number; // Partisan
        st? : number;
        //rc? : number[]; // Company of Iron requisition cost
        gr? : string;
        con? : string; // convention release
        noAttach? : boolean; // Prevent caster attachments
        nonFree? : boolean; // prevent choice as free model
        valf? : any
        nkw? : string; // no keyword, terrible hack
    }


    export function isLiving(e : Entry) : boolean {
        return e.lv == 1 || (e.t != Warjack && e.t != BattleEngine && e.t != Structure
                && !e.ud && !e.cs);
    }

    export function isConstruct(e : Entry) : boolean {
        return e.cs == 1 || ((e.t == Warjack || e.t == BattleEngine 
            || e.t == Structure) && e.lv != 1);
    }

    export function isUndead(e : Entry) : boolean {
        return e.ud == 1;
    }

    export function isAmphibious(e: Entry) : boolean {
        return e.am == 1;
    }

    export function isCharacter(e : Entry) : boolean {
        return e.fa == "C";
    }

    export function isWarmachine(e : Entry) : boolean {
        return Data._data.factions[e.fid].wmh == 1;
    }

    export function isHordes(e : Entry) : boolean {
        return Data._data.factions[e.fid].wmh == 2;
    }


    export function subtitle(e: Entry) : string {
        let ret : string = Data.factionShort[e.fid];

        if( e.k ) {
            ret += " " + e.k;
        }

        if( e.t == 5 ) {
            if( e.wa ) {
                ret += " Weapon";
            }
            else {
                ret += " Command";
            }
        }

        if( e.t == 3 ) {
            switch( e.b ) {
                case 30: ret += " Lesser"; break;
                case 40: ret += " Light"; break;
                case 50: ret += " Heavy"; break;
                case 120: ret += " Gargantuan"; break;
            }
        }

        if( e.t == 6 ) {
            switch( e.b ) {
                case 40: ret += " Light"; break;
                case 50: ret += " Heavy"; break;
                case 120: ret += " Colossal"; break;
            }
        }

        if( (e.t == 2 || e.t == 7) && e.b == 120 ) {
            ret += " Battle Engine";
        }

        ret += " " + Data._data.typenameSingle[e.t];


        return ret;
    }


    export function isWarnoun(e: Entry) : boolean {
        return !e.dec && (e.t == Const.Warbeast || e.t == Const.Warjack 
            || e.t == Const.Monstrosity || e.t == Const.Horror);
    }

    export function isWarbeast(e: Entry) : boolean {
        return isWarnoun(e) && isHordes(e);
    }

    export function isWarjack(e : Entry) : boolean {
        return isWarnoun(e) && isWarmachine(e);
    }

    export function hasKeyword(e: Entry, keyword: string) : boolean {
        if( e.nkw == keyword )
            return false;

        return e.n.indexOf(keyword) >= 0
            || (e.k && e.k.indexOf(keyword) >= 0);
    }

    export function isSolo(e: Entry) : boolean {
        return e.t == Solo && !e.dec;
    }

    export function isAttachment(e: Entry) : boolean {
        return e.t == 5;
    }

    export function isCommandAttachment(e: Entry) : boolean {
        return e.t == 5 && !e.wa;
    }


    export function isUnit(e: Entry) : boolean {
        return ( e.t == 4 || (e.t == Warbeast && e.ff == -17 ) )
            && !e.dec;
    }

    export function isCaster(e: Entry) : boolean {
        return e.t == Const.Warlock || e.t == Const.Warcaster 
            || e.t == Const.Master;
    }

    export function isStructure(e: Entry) : boolean {
        return e.t == Structure;
    }


    export function companyOfIron(e: Entry) : boolean {
        return !isCaster(e) 
            && e.b < Large 
            && (!e.isat || !isSolo(e));
    }

    function inList(id: number, list: number[]) : boolean {
        return list.indexOf(id) != -1;
    }

    export function allowedAttachment(jack : Entry, caster : Entry, theme : Theme) : boolean {

        // Explicitly disallowed check

        if( caster.exf && caster.exf(jack, -1) ) {
            return false;
        }

        // Check for themeExtra jacks
        if( theme 
            && jack.themeExtra 
            && isWarnoun(jack)
            && isCaster(caster)
            && jack.themeExtra.indexOf(theme.id()) != -1 
            )
        {
            return true;
        }

        if( caster.atf && caster.atf(jack, -1) ) {
            return true;
        }


        if( caster.at && caster.at.indexOf(jack.id) != -1 ) {
            return true;
        }

        // Check for default caster attachments
        if( isCaster(caster) && !caster.lbg && !caster.noAttach && jack.casterAttachment 
            && (
                jack.fid == caster.fid
                || (theme && jack.themeExtra && jack.themeExtra.indexOf(theme.id()) != -1)
                || (jack.wf && jack.wf.indexOf(caster.fid) != -1)
               )
        ) 
        {
            return true;
        }

        return false;
    }

    function hasJmSpace(caster: ArmyEntry) : boolean {
        let isJm: boolean = caster.entry.jm == 1 || (caster.entry.jr && caster.entry.fid == Const.Infernals);
        let jackCount: number = 0;

        for (let i: number = 0; i < caster.children.length; i++) {
            if (caster.children[i].entry.jm == 1 )
                isJm = true;

            if (isWarnoun(caster.children[i].entry)) {
                jackCount++;
            }
        }

        return isJm && jackCount < 1;
    }

    export function isExpired(entry: Entry, rules : Rules) : boolean {
        if( !entry.exp || !rules || !rules.preReleaseDate ) {
            return false;
        }

        let prd : Date = null;

        if( typeof(rules.preReleaseDate) == "string" ) {
            prd = new Date(rules.preReleaseDate);
        }
        else {
            prd = rules.preReleaseDate;
        }


        let exd : Date = null;

        if( typeof(entry.exp) == "string") {
            exd = new Date(entry.exp);
        }
        else {
            exd = entry.exp;
        }


        return prd.getTime() > exd.getTime();
    }

    export function isPreRelease(entry: Entry, rules : Rules) : boolean {
        if( entry.pr == 1 ) {

            if( rules && rules.ignorePreRelease ) {
                return false;
            }

            if( rules && rules.convention && entry.con == rules.convention ) {
                return false;
            }

            if( rules && rules.extraAllowed && rules.extraAllowed.indexOf(entry.id) != -1 ) {
                return false;
            }

            if( !rules || !rules.preReleaseDate || !entry.prd ) {
                return true;
            }


            if( !rules.preReleaseDate ) {
                return true;
            }

            let prd : Date = null;

            if( typeof(rules.preReleaseDate) == "string" ) {
                prd = new Date(rules.preReleaseDate);
            }
            else {
                prd = rules.preReleaseDate;
            }


            let prr : Date = null;

            if( typeof(entry.prd) == "string") {
                prr = new Date(entry.prd);
            }
            else {
                prr = entry.prd;
            }

            return prr.getTime() > prd.getTime();



                // return !(rules
                //     &&
                //     (
                //         rules.ignorePreRelease
                //             || (rules.preReleaseDate && entry.prd
                //             && rules.preReleaseDate.getTime() > entry.prd.getTime())
                //     ));
        }
        else {
            return false;
        }
    }

    export function isCID(entry: Entry, rules : Rules) : boolean {
        if( entry.pr == 2 ) {
            return !rules || !rules.forbidCID;
        }
        else {
            return false;
        }
    }

    export function isNarrative(entry: Entry, rules : Rules) : boolean {
        if( entry.pr == 3 ) {
            //return !rules || rules.allowNarrative;
            return true;
        }
        else {
            return false;
        }
    }

    export function validateRules(entry : Entry, rules : Rules) : boolean {
        if( entry.exp || entry.fr ) {
            return false;
        }

        if( !rules ) {
            return true;
        }

        return true;
    }


    export function canAttach(jack: Entry, choice: number, caster: ArmyEntry, theme : Theme): boolean {

        if (isWarnoun(jack)) {
            if (caster == null)
                return jack.indep == 1;

            if (jack.indep == 1)
                return false;

            // Check for explicit rejection
            if( caster.entry.exf && caster.entry.exf(jack, -1) ) {
                return false;
            }

            if (jack.t == 9 && !caster.entry.lm)
                return false;

            let jmSpace: boolean = hasJmSpace(caster);

            let correctFaction : boolean = caster.entry.fid == jack.fid;

            // Consider themeExtra jacks brought in to be in
            // the correct theme
            if( !correctFaction && theme && jack.themeExtra 
                && jack.themeExtra.indexOf(theme.id()) != -1 )
            {
                correctFaction = true;
            }

            // evil hack
            if(jmSpace && !correctFaction && theme 
                && (theme.id() == 53 || theme.id() == 130) ) 
            {
                correctFaction = jack.fid == 6 && jack.id != 320 && jack.k != "Rhulic";
            }

            // xbg overrides all
            if( caster && caster.entry && caster.entry.xbg && caster.entry.atf(jack, 0) ) {
                return true;
            }

            // another evil hack to fix DoA
            if( jack.themeunique == 43 && caster.entry.jr ) {
                return false;
            }

            // Check if we're in theme but the jack is not
            if( theme && caster && !theme.isAllowed(jack, null) ) {
                if( !(jack.bond && jack.bond.indexOf(caster.entry.id) != -1) ) {
                    return false;
                }
            }

            if ((   
                    ( caster.entry.ff != null 
                        && (caster.entry.fid != Const.Infernals || !caster.entry.lbg)
                    ) 
                    || jmSpace
                )
                && correctFaction
                && (caster.entry.lbg != 1 || allowedAttachment(jack, caster.entry, theme))
            ) {
                if (jmSpace) {
                    return true;
                }
                else if (caster.entry.lbg != 1) {
                    return isCaster(caster.entry) || caster.entry.jr == 1;
                }
                else {
                    if ( allowedAttachment(jack, caster.entry, theme) )
                        return true;
                }
            }
        }
        else if (jack.isat) {
            if (caster != null && allowedAttachment(jack, caster.entry, theme) ) {
                for (let i = 0; i < caster.children.length; i++) {
                    if (jack.wa) {
                        let wacount: number = 0;
                        if (caster.children[i].entry.wa) {
                            if (caster.children[i].entry.id == jack.id) {
                                return false;
                            }

                            wacount += caster.children[i].choice + 1;
                        }

                        if (wacount + choice > 2) {
                            return false;
                        }
                    }
                    else if (
                        !isWarnoun(caster.children[i].entry)
                        && caster.children[i].entry.wu != 1
                        && caster.children[i].entry.wa != 1)
                        return false;
                }

                return true;
            }
        }

        return false;
    }



//}

// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 
// Padding for WSL 

