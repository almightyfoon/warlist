

// Nothing here


export { ArmyList } from "./armylist";
export { SubList } from "./sublist";
export { SavedList, StoredList, ListState, ListType,
    Rules, ThemeData } from "./defines";
export { Data, loadData } from "./data";
export { decodeCharSingle, decodeChar, getCasters } from "./encoding";
export { Entry, isCaster } from "./entry";
export { Theme } from "./theme";


import { ArmyList } from "./armylist";
import { Rules } from "./defines";
import { Magic, StoredList, ListType } from "./defines";
import { decodeCharSingle, decodeChar, decodeSubList } from "./encoding";

export function parseCode(code: string): StoredList {
    let stored: StoredList = null;

    if( code.indexOf('?') != -1 ) {
        code = code.substr(code.indexOf('?') + 1);
    }

    if (code.substring(0, 1) == "a") {
        stored = JSON.parse(decodeURIComponent(code.substring(1)));
    }
    else if (code.substring(0, 1) == "b" ) {
        let ret: string = code;

        let ii: number = 1;
        let nval: number = decodeCharSingle(ret, ii);
        ii++;
        let size: number = decodeChar(ret, ii);
        ii += 2;
        let sr: boolean = (nval & 16) ? true : false;

        let lt : ListType = {
            steamroller: sr,
            adr: false,
            minLists: 1,
            maxLists: sr ? 2 : 3,
            champions: false,
            season: 0,
            coi: false
        };

        let ob: StoredList = {
            //s: sr,
            t: lt,
            f: nval - (nval & 16),
            c: size,
            l: {
                list: [],
                size: size,
                //sr: sr,
                tl: undefined,
                tt: undefined
            }
        };


        // let ob : StoredList = new StoredList();

        // let ii : number = 1;

        // let nval : number = decodeCharSingle(ret, ii);
        // ob.s = (nval & 16) ? true : false;
        // ob.f = nval - (nval & 16);
        // ii++;
        // ob.c = decodeChar(ret, ii);
        // ii += 2;
        // ob.l = new ListState();
        // ob.l.list = [];
        // ob.l.size = ob.c;
        // ob.l.sr = ob.s;

        var paired: boolean = false;
        var specialist: boolean = false;

        while (ii < ret.length) {
            let lval: number = decodeChar(ret, ii);
            ii += 2;

            if (lval == Magic.themeCode || lval == Magic.contractCode) {
                let mod: number = lval == Magic.contractCode ? -1 : 1;

                lval = mod * decodeChar(ret, ii);
                ii += 2;

                ob.l.tl = lval;
            }
            else if (lval == Magic.listSeparator) {
                paired = true;
                break;
            }
            else if( lval == Magic.specialistCode ) {
                specialist = true;
            }
            else {
                ob.l.list.push(decodeSubList(lval, specialist));
                specialist = false;
            }
        }

        if (paired) {
            ob.m = {
                list: [],
                size: size,
                //sr: sr,
                tl: undefined,
                tt: undefined
            };

            while (ii < ret.length) {
                let lval: number = decodeChar(ret, ii);
                ii += 2;


                if (lval == Magic.themeCode || lval == Magic.contractCode) {
                    let mod: number = lval == Magic.contractCode ? -1 : 1;

                    lval = mod * decodeChar(ret, ii);
                    ii += 2;

                    ob.m.tl = lval;
                }
                else if( lval == Magic.specialistCode ) {
                    specialist = true;
                }
                else {
                    ob.m.list.push(decodeSubList(lval, specialist));
                    specialist = false;
                }
            }
        }

        stored = ob;
    }
    else if (code.substring(0, 1) == "c" || code.substring(0,1) == "d") {
        let ret: string = code;

        let ii: number = 1;
        let fval : number = decodeCharSingle(ret, ii);
        ii += 1;
        let nval: number = decodeChar(ret, ii);
        ii += 2;
        let size: number = decodeChar(ret, ii);
        ii += 2;
        let sr: boolean = (nval & 16) ? true : false;
        let adr: boolean = (nval & 32) ? true : false;


        let lt : ListType = {
            steamroller: (nval & 1) ? true : false,
            adr: (nval & 2) ? true : false,
            champions: (nval & 4) ? true : false,
            minLists: 1,
            maxLists: sr ? 2 : 3,
            season: 0,
            coi: code.substring(0,1) == "d"
        };

        if( lt.adr || lt.champions ) {
            let season: number = 0;
            season = 4;

            if(nval & 8 ) {
                season += 1;
            }

            if( nval & 16) {
                season += 2;
            }

            if( nval & 32) {
                season += 4;
            }

            lt.season = season;
        }

        let max: number = 1;
        let min: number = 1;

        if( nval & 64 ) {
            max += 1;
        }

        if( nval & 128 ) {
            max += 2;
        }

        if( nval & 256 ) {
            min = max;
        }

        lt.minLists = min;
        lt.maxLists = max;




        let ob: StoredList = {
            //s: sr,
            t: lt,
            f: fval,
            c: size,
            l: {
                list: [],
                size: size,
                //sr: sr,
                tl: undefined,
                tt: undefined
            }
        };


        // let ob : StoredList = new StoredList();

        // let ii : number = 1;

        // let nval : number = decodeCharSingle(ret, ii);
        // ob.s = (nval & 16) ? true : false;
        // ob.f = nval - (nval & 16);
        // ii++;
        // ob.c = decodeChar(ret, ii);
        // ii += 2;
        // ob.l = new ListState();
        // ob.l.list = [];
        // ob.l.size = ob.c;
        // ob.l.sr = ob.s;

        var paired: boolean = false;

        while (ii < ret.length) {
            let lval: number = decodeChar(ret, ii);
            ii += 2;

            if (lval == Magic.themeCode || lval == Magic.contractCode) {
                let mod: number = lval == Magic.contractCode ? -1 : 1;

                lval = mod * decodeChar(ret, ii);
                ii += 2;

                ob.l.tl = lval;
            }
            else if (lval == Magic.listSeparator) {
                paired = true;
                break;
            }
            else if( lval == Magic.specialistCode ) {
                specialist = true;
            }
            else {
                ob.l.list.push(decodeSubList(lval, specialist));
                specialist = false;
            }
        }

        if (paired) {
            paired = false;

            ob.m = {
                list: [],
                size: size,
                //sr: sr,
                tl: undefined,
                tt: undefined
            };

            while (ii < ret.length) {
                let lval: number = decodeChar(ret, ii);
                ii += 2;


                if (lval == Magic.themeCode || lval == Magic.contractCode) {
                    let mod: number = lval == Magic.contractCode ? -1 : 1;

                    lval = mod * decodeChar(ret, ii);
                    ii += 2;

                    ob.m.tl = lval;
                }
                else if (lval == Magic.listSeparator) {
                    paired = true;
                    break;
                }
                else if( lval == Magic.specialistCode) {
                    specialist = true;
                }
                else {
                    ob.m.list.push(decodeSubList(lval, specialist));
                    specialist = false;
                }
            }
        }

        if (paired) {
            paired = false;

            ob.n = {
                list: [],
                size: size,
                //sr: sr,
                tl: undefined,
                tt: undefined
            };

            while (ii < ret.length) {
                let lval: number = decodeChar(ret, ii);
                ii += 2;


                if (lval == Magic.themeCode || lval == Magic.contractCode) {
                    let mod: number = lval == Magic.contractCode ? -1 : 1;

                    lval = mod * decodeChar(ret, ii);
                    ii += 2;

                    ob.n.tl = lval;
                }
                else if (lval == Magic.listSeparator) {
                    paired = true;
                    break;
                }
                else if( lval == Magic.specialistCode ) {
                    specialist = true;
                }
                else {
                    ob.n.list.push(decodeSubList(lval, specialist));
                    specialist = false;
                }
            }
        }


        stored = ob;
    }


    return stored;
}


export function fromCode(code : string, options? : Rules) : ArmyList {
    let slist: StoredList = parseCode(code);

    let al: ArmyList = new ArmyList(null, false, slist.f,
        //slist.t, slist.l.size, 
        null, options);

    //Editor.initializeFaction(slist.f, al, null);

    al.restoreState(slist);

    return al;
}
