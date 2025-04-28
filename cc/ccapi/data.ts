//namespace ccapi {
// World data

import { JSONData, Faction, ThemeData, TypeDetail } from "./defines";
import { Entry, isWarnoun, allowedAttachment } from "./entry";
import { staticData } from "./static";
//import { encodeChar } from "./encoding";

export let _factions: { [n: number]: Faction } = {};

// Encoding data
export let _encoding: { [s: string]: number } = {};
export let _decoding: { [n: number]: [number, number] } = {};

function copyProperties(source: any, target: any) {
    for (let key in source) {
        target[key] = source[key];
    }
}

export class Data {
    static _data: JSONData = null;
    static modelUrls: {[n : number] : string } = null;
    static entries: { [n: number]: Entry } = null;
    static themeLists: { [n: number]: ThemeData } = null;
    static typeDetails: { [s: string]: TypeDetail } = {
        //"Warcasters": { "order": 1, "icon": "&#9818;" },
        "Warcasters": { "order": 1, "icon": "account_circle" },
        //"Warlocks": { "order": 2, "icon": "&#9818;" },
        "Warlocks": { "order": 2, "icon": "account_circle" },
        //"Warjacks": { "order": 3, "icon": "&#9881;" },
        "Infernal Masters": { "order": 2.5, "icon": "account_circle" },
        "Warjacks": { "order": 3, "icon": "settings" },
        //"Monstrosities": { "order": 3.5, "icon": "&#9981;" },
        "Monstrosities": { "order": 3.5, "icon": "local_gas_station" },
        //"Warbeasts": { "order": 4, "icon": "&#128058;" },
        "Warbeasts": { "order": 4, "icon": "pets" },
        "Horrors": { "order" : 4, "icon": "polymer"},
        //"Units": { "order": 5, "icon": "&#9823;" },
        "Units": { "order": 5, "icon": "group" },
        //"Solos": { "order": 6, "icon": "&#9822;" },
        "Solos": { "order": 6, "icon": "person" },
        //"Attachments": { "order": 7, "icon": "&#9821;" },
        "Attachments": { "order": 7, "icon": "person_add" },
        //"Battle Engines": { "order": 8, "icon": "&#9820;" },
        "Battle Engines/Structures": { "order": 8, "icon": "settings_applications" },
        //"Mercenary Warcasters": { "order": 8.5, "icon": "&#9818;" },
        "Mercenary/Minion Warcasters": { "order": 8.5, "icon": "account_circle" },
        //"Mercenary Warjacks": { "order": 9, "icon": "&#9881;" },
        "Mercenary/Minion Warjacks": { "order": 9, "icon": "settings" },
        //"Mercenary Monstrosities": { "order": 9.5, "icon": "&#9981;" },
        "Mercenary/Minion Monstrosities": { "order": 9.5, "icon": "local_gas_station" },
        //"Mercenary Units": { "order": 10, "icon": "&#9817;" },
        "Mercenary/Minion Units": { "order": 10, "icon": "people_outline" },
        //"Mercenary Solos": { "order": 11, "icon": "&#9816;" },
        "Mercenary/Minion Solos": { "order": 11, "icon": "person_outline" },
        //"Mercenary Attachments": { "order": 12, "icon": "&#9815;" },
        "Mercenary/Minion Attachments": { "order": 12, "icon": "person_add" },
        //"Mercenary Battle Engines": { "order": 13, "icon": "&#9814;" },
        "Mercenary/Minion Battle Engines": { "order": 13, "icon": "settings_applications" },
        //"Minion Warlocks": { "order": 13.5, "icon": "&#9818;" },
        "Mercenary/Minion Warlocks": { "order": 13.5, "icon": "account_circle" },
        //"Minion Warbeasts": { "order": 14, "icon": "&#128058;" },
        "Mercenary/Minion Warbeasts": { "order": 9.3, "icon": "pets" },
        //"Minion Units": { "order": 15, "icon": "&#9817;" },
        "Minion Units": { "order": 15, "icon": "people_outline" },
        //"Minion Solos": { "order": 16, "icon": "&#9816;" },
        "Minion Solos": { "order": 16, "icon": "person_outline" },
        //"Minion Attachments": { "order": 17, "icon": "&#9815;" },
        "Minion Attachments": { "order": 17, "icon": "person_add" },
        //"Minion Battle Engines": { "order": 18, "icon": "&#9814;" },
        "Minion Battle Engines": { "order": 18, "icon": "settings_applications" },
        //"Steamroller Objectives": { "order": 19, "icon": "&#9820;" }
        "Steamroller Objectives": { "order": 19, "icon": "account_balance" }
    };


    static factionShort: { [s: string]: string; } = {
        "1": "Cygnar",
        "2": "Protectorate",
        "3": "Khador",
        "4": "Cryx",
        "5": "Retribution",
        "6": "Mercenary",
        "7": "Trollblood",
        "8": "Circle",
        "9": "Skorne",
        "10": "Legion",
        "11": "Minion",
        "12": "Convergence",
        "14": "Grymkin",
        "15": "Crucible Guard",
        "16": "Infernal",
    };

    static factionNameShort: { [s: string]: string; } = {
        "1": "Cygnar",
        "2": "Protectorate",
        "3": "Khador",
        "4": "Cryx",
        "5": "Retribution",
        "6": "Mercenaries",
        "7": "Trollbloods",
        "8": "Circle",
        "9": "Skorne",
        "10": "Legion",
        "11": "Minions",
        "12": "Convergence",
        "14": "Grymkin",
        "15": "Crucible Guard",
        "16": "Infernals",
    };

    static aliases : { [s: string] : number; } = {
        "witch coven" : 58,
        "vlad 1" : 392,
        "vlad 2" : 393,
        "vlad 3" : 676,
        "amon ad-raza": 69,
        "knight exemplar officer": 4011,
        "cask imp": 6045,
        "doom reavers" : 446,
        "revenant crew" : 115,
        "dahlia & skarath" : 649,
        "bone grinders" : 54,
        "gatorman bokor & bog trog shamblers": 815,
        "jozef grigorovich" : 465,
        "kapitan valachev" : 477,
        "kovnik markov" : 467,
        "iron fang uhlan" : 431,
        "shepherd" : 615,
        "whelps" : 379,
        "alexia 1" : 350,
        "alexia 2" : 527,
        "eiryss 1" : 215,
        "eiryss 2" : 276,
        "eiryss 3" : 2052,
        "satyxis sea witch" : 106,
        "hoarluk 1" : 282,
        "hoarluk 2" : 284,
        "hoarluk 3" : 3163,
        "runebearer" : 6159,
        "arcanist" : 192,
        "lanyssa ryssyll" : 241,
        "great bears" : 669,
        "mage hunter commander" : 184,
        "archduke runewood" : 582,
        "captain arlan strangeways" : 570,
        "sorceress & hellion" : 618,
        "trencher officer and sniper" : 550,
        "saeryn and rhyas" : 3151,
        "blood of the martyrs" : 206,
        "visgoth rhoven & honor guard" : 180,
        "stormsmith stormcaller" : 564,
        "stormblade storm gunner" : 559,
        "siege brisbane" : 498,
        "gun carriage" : 588,
        "stormblade officer and standard" : 558,
        "vessel of judgement" : 640,
        "agitator" : 3058,
        "swamp gobbers" : 154,
        "victor pendrake" : 240,
        "cephalyx mind bender and drudges" : 3057,
        "cephalyx mind slaver and drudges" : 705,
        "kara sloan" : 507,
        "trencher infantry grenadier" : 551,
        "krielstone" : 22,
        "blessing of vengence" : 105,
        "cyclop brute" : 255,
        "devil dogs" : 388,
        "bloodrunners" : 331,
        "bloodrunner master tormentor" : 360,
        "greygore boomhowler & company" : 401,
        "earthbreaker" : 2066,
        "nuala, the huntress" : 305,
        "man-o-war shocktroopers officer" : 4029,
        "druids of orboros overseer" : 292,
        "skeryth issyen" : 204,
        "black 13th" : 544,
        "war wagon" : 644,
        "fire eaters" : 3091,
        "fennblades ua" : 11,
        "farrow brigands warlord" : 3159,
        "blighted nyss striders ua" : 610,
        "beast-09" : 417,
        "incubus" : 614,
        "tristan durant" : 3030,
        "high paladin vilmon" : 198,
        "razor boar": 785,
        "strum & drang" : 679,
        "holy zealot monolith bearer": 129,
        "skinner": 1,
        "storm tower" : 565,
        "sword knight officer and standard" : 548,
        "hand of judgement" : 3127,
        "dawnguard scyir" : 202,
        "sea dog crew" : 458,
        "sorcerer" : 801,
        "pyg bushwackers": 25,
        "pyg bushwacker ua" : 3166,
        "warspear chieftain" : 781,
        "runeshapers" : 353,
        "silverline stormguard" : 2065,
        "jarl 1" : 18,
        "caber thrower" : 341,
        "warpborn alpha ua" : 776,
        "exemplar seneschal" : 183,
        // themes
        "kingmaker" : 8,
        "operationtheatre" : 7,
        "operatingtheatre" : 7,
        "dstructioninitiative" : 18,
        "destructioninititative" : 18,
        "stromdivision" : 14,
        "desctructioninitiative" : 18,
        "imperialwarlord" : 47,
        "legoinofsteel" : 34,
        "infernalmachine" : 32
    };

    static findTheme(s : string) : ThemeData {
        let sOrig : string = s;

        s = s.toLowerCase();        
        s = s.replace(/the /g, "");
        s = s.replace(/ /g, "");
        s = s.replace(/'/g, "");

        for( let tid in Data.themeLists ) {
            let td : ThemeData = Data.themeLists[tid];

            let tn : string = td.n;
            tn = tn.toLowerCase();        
            tn = tn.replace(/the /g, "");
            tn = tn.replace(/ /g, "");
            tn = tn.replace(/'/g, "");

            if( s == tn ) { 
                return td;
            }
        }

        if( Data.aliases[s] ) {
            if( Data.themeLists[Data.aliases[s]] ) {
                return Data.themeLists[Data.aliases[s]];
            }
            else if( Data._data.contracts[Data.aliases[s]] ) {
                return Data._data.contracts[Data.aliases[s]];
            }
        }

        return null;
    }


    static findEntry(s : string) : number[] {
        let sOrig : string = s;

        s = s.toLowerCase();

        let choice : number = 0;

        if( s.indexOf("(max") != -1 ) {
            s = s.substr(0, s.indexOf("(max"));
            choice = 1;
        }
        else if( s.indexOf(" (min") != -1 ) {
            s = s.substr(0, s.indexOf("(min" ));
        }

        if( s.indexOf("(") != -1 ) {
            s = s.substr(0, s.indexOf("("));
        }

        s = s.trim();

        if( Data.aliases[s] != null ) {
            return [ Data.aliases[s], choice ];
        }

        for( let eid in Data.entries ) {
            let e : Entry = Data.entries[eid];
            let en : string = e.n.toLowerCase();


            if( e.pr > 1 ) {
                continue;
            }

            if( en == s || 
                (e.v && (e.v.toLowerCase() == s || e.v.toLowerCase() == s + " 1" ))
                || s == "the " + en || en == "the " + s) {
                return [ e.id, choice ];
            }

            if( en.indexOf(",") != -1 ) {
                let short : string = en.substr(0, en.indexOf(","));

                if( short == s ) {
                    return [e.id, choice];
                }
            }

            if( en.indexOf(" (") != -1 ) {
                let short : string = en.substr(0, en.indexOf(" ("));
                
                if( short == s ) {
                    return [e.id, choice];
                }
            }

            if( s.indexOf(" &") != -1 ) {
                let short : string = s.substr(0, s.indexOf(" &"));

                if( short == en ) {
                    return [e.id, choice];
                }
            }

            if( s.indexOf(" ua") != -1 ) {
                let unit : string = s.substr(0, s.indexOf(" ua"));

                if( (unit == en || unit + "s" == en) && e.at ) {
                    for( let i : number = 0; i < e.at.length; i++ ) {
                        if( Data.entries[e.at[i]] && !Data.entries[e.at[i]].wa ) {
                            return [e.at[i], choice];
                        }
                    }
                }
                else if( unit == en && !e.at ) {
                    return [e.id, choice];
                }
            }
        }

        return null;
    }



}


  


export function loadData(jsonText: string,
    //fl: FactionList,
    //callback: (n: number) => void
): void {


    Data._data = staticData();

    Data.entries = {};

    for (let id in Data._data.entries) {
        let source = Data._data.entries[id];
        let target: any = { };

        copyProperties(source, target);

        Data.entries[id] = target;
    }

    let ids: number[] = [];

    for (let id in Data.entries) {
        ids.push(parseInt(id));
    }

    ids = ids.sort(function (a: number, b: number) { return a - b; });

    let enccount: number = 1;
    for (let i: number = 0; i < ids.length; i++) {

        let realId : number = ids[i];

        if( Data.entries[realId].fr ) {
            realId = Data.entries[realId].fr;
        }

        if (Data.entries[realId].C == null) {
            _encoding["" + realId + "_0"] = enccount;
            _decoding[enccount] = [realId, 0];

            enccount++;
        }
        else for (let j: number = 0; j < Data.entries[realId].C.length; j++) {
            _encoding["" + realId + "_" + j] = enccount;

            _decoding[enccount] = [realId, j];
            enccount++;
        }
    }

    // let map : { [s : string] : string } = {};

    // for( let i in _decoding )
    // {
    //     let sl : number[] = _decoding[i];

    //     let e : Entry = Data.entries[sl[0]];

    //     if( e ) {
    //         let n : string = e.n;

    //         if( e.C && e.C.length == 2 ) {
    //             if( sl[1] == 0 ) {
    //                 n += " (min)";
    //             }
    //             else {
    //                 n += " (max)";
    //             }
    //         }
    //         else if( e.C && e.C.length == 3 ) {
    //             n += " (" + (sl[1] + 1) + ")";
    //         }

    //         map[encodeChar(parseInt(i))] = n;
    //     }
    //     else {
    //         map[encodeChar(parseInt(i))] = 'x';
    //     }

    // }

    // console.log(Data.entries);
    // console.log(map);

    // download("ccmap.json", JSON.stringify(map));


    Data.themeLists = Data._data.themelists;

    for (let id in Data._data.contracts) {
        let mid: number = parseInt(id) * -1;

        Data.themeLists[mid] = Data._data.contracts[id];
        Data.themeLists[mid].id = mid;
    }

    // let mtl : { [s: string] : string } = {};

    // for( let id in Data.themeLists )
    // {
    //     mtl[encodeChar(Math.abs(parseInt(id)))] = Data.themeLists[id].n;
    // }

    // download("ccmap.json", JSON.stringify(
    //     { "entries" : map, "themes" : mtl }
    // ));


    let ff: { [m: number]: { [n: number]: Entry[] } } = {};

    for (let id in Data.entries) {
        let entry: Entry = Data.entries[id];

        // maybe fix
        // if (entry.mf) {
        //     let mfs: number[] = entry.mf;

        //     for (let i: number = 0; i < mfs.length; i++) {
        //         if (mfs[i] == null) {
        //             continue;
        //         }

        //         let mid2: number = mfs[i] * -1;

        //         if (Data.themeLists[mid2]) {
        //             Data.themeLists[mid2].allowed.push(parseInt(id));
        //         }
        //     }
        // }

        if( entry.lm ) {
            if( Data.themeLists[-1 * entry.lm] ) {
                Data.themeLists[-1 * entry.lm].allowed.push(parseInt(id));
            }
        }

        if (ff[entry.fid] == null) {
            ff[entry.fid] = {};
        }

    }

    let facts: { [n: number]: Faction } = {};

    for (let id in Data.entries) {
        if (Data.entries[id].wa == 1 || Data.entries[id].ca == 1 
                || Data.entries[id].casterAttachment) 
        {
            Data.entries[id].isat = true;
        }

        if( isWarnoun(Data.entries[id]) && !Data.entries[id].indep ) {
            Data.entries[id].isat = true;
        }

    }

    for (let id in Data.entries) {
        let entry: Entry = Data.entries[id];

        let fid: number = entry.fid;
        let typename: string = Data._data.typenames[entry.t];

        if (facts[fid] == null) {
            facts[fid] = {
                warnouns: [],
                types: {},
                entries: {}
            };
        }

        // Don't put in mercs that don't work for
        // main merc factions -- mostly for Cephalyx
        // list creation rules
        if( !entry.wf || entry.wf.indexOf(fid) != -1 )
        {
            if (facts[fid].types == null)
                facts[fid].types = {};

            if (facts[fid].types[typename] == null)
                facts[fid].types[typename] = {};

            facts[fid].types[typename][id] = true;

            if (facts[fid].entries == null)
                facts[fid].entries = {};

            facts[fid].entries[id] = entry;
        }

        let worksForAll: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16];

        if (((entry.wf != null || entry.themeExtra != null)
            && !(isWarnoun(entry) && entry.themeExtra == null)
            //&& !isWarnoun(entry)
        )
            || entry.t == 10
        ) {
            let worksfor: number[] = [];

            if (entry.t == 10) {
                worksfor = worksForAll;
            }
            else {
                let wftmp = entry.wf || [];

                for (let i = 0; i < wftmp.length; i++) {
                    worksfor.push(wftmp[i]);
                }

                if( entry.themeExtra ) {
                    for( let j : number = 0; j < entry.themeExtra.length; j++ ) {
                        let theme : ThemeData = Data.themeLists[entry.themeExtra[j]];

                        // Double fuck Hearts of Darkness
                        
                        if( theme ) {
                            worksfor.push(theme.fid);
                        }
                    }
                }

            }

            //let wfatt: number[] = [];

            if( entry.wfatt == null ) {
                entry.wfatt = [];
            }

            // if (entry.co != null) {
            //     entry.wfatt.push(Data.entries[entry.co].id);
            // }

            if (entry.at != null || entry.atf != null) {



                // UGH.
                for( let atid in Data.entries ) {
                    if( allowedAttachment(Data.entries[atid], entry, null) ) {
                        entry.wfatt.push(parseInt(atid));
                    }
                }


                // let ats: number[] = entry.at;

                // for (let i: number = 0; i < ats.length; i++) {
                //     if (ats[i] != null) {
                //         wfatt.push(ats[i]);
                //     }
                // }
            }

            for (let i: number = 0; i < worksfor.length; i++) {
                if (worksfor[i] != null) {
                    if (worksfor[i] == entry.fid)
                        continue;

                    let ntn: string = "";

                    if (entry.fid == 6 || entry.fid == 11 ) {
                        ntn = "Mercenary/Minion ";

                        if( typename.indexOf("/") != -1 ) {
                            ntn += typename.substr(0, typename.indexOf("/"));
                        }
                        else {
                            ntn += typename;
                        }
                    }
                    else {
                        ntn = typename;
                    }

                    if (facts[worksfor[i]] == null)
                        facts[worksfor[i]] = { warnouns: [], entries: {}, types: {} };

                    if (facts[worksfor[i]].types == null)
                        facts[worksfor[i]].types = {};

                    if (facts[worksfor[i]].types[ntn] == null)
                        facts[worksfor[i]].types[ntn] = {};

                    facts[worksfor[i]].types[ntn][id] = true;

                    if (facts[worksfor[i]].entries == null)
                        facts[worksfor[i]].entries = {};

                    facts[worksfor[i]].entries[id] = entry;

                    for (let j: number = 0; j < entry.wfatt.length; j++) {
                        let aten: Entry = Data.entries[entry.wfatt[j]];

                        if (aten == null)
                            continue;

                        let keep: boolean = true;

                        if (aten.fid != worksfor[i]) {
                            if ((aten.fid != 6 && aten.fid != 11)
                                || aten.lmod == 7) {
                                keep = false;
                            }
                        }

                        if (!keep) {
                            //console.log(aten.n);
                            continue;
                        }

                        ntn = "";


                        let modTypeName : string = Data._data.typenames[aten.t];

                        if (entry.fid == 6 || entry.fid == 11 ) {
                            ntn = "Mercenary/Minion ";
    
                            if( modTypeName.indexOf("/") != -1 ) {
                                ntn += modTypeName.substr(0, modTypeName.indexOf("/"));
                            }
                            else {
                                ntn += modTypeName;
                            }
                        }
                        else {
                            ntn = modTypeName;
                        }
                            




                        if( !entry.wu ) {
                            if (facts[worksfor[i]].types[ntn] == null)
                                facts[worksfor[i]].types[ntn] = {};

                            facts[worksfor[i]].types[ntn][aten.id] = true;
                        }

                        facts[worksfor[i]].entries[aten.id] = aten;

                    }
                }
            }
        }
    }

    _factions = facts;
}










//}
