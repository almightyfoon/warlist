
import { Const, ThemeData, entityFilter } from "./defines";
import { Entry, isUnit, isAttachment, isSolo,
    isWarnoun, isWarbeast, isCaster, hasKeyword, isCommandAttachment, isStructure,
    isAmphibious, isCharacter, isLiving, isUndead, isConstruct } from "./entry";

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


  const ExtraDeployment : string = "Your deployment is extended 2\" forward.";
  const StartingUpkeeps : string = "Models and units may begin the game affected by your upkeep spells.";
  const PlusOneToGoFirst : string = "You gain +1 to your starting roll for the game.";
  const RerollStarting : string = "You can reroll your starting roll for the game.";
  const RepairPlusOne : string = "Models affected by Repair are repaired an additional point.";

  const factionShort: { [s: string]: string; } = {
    "1": "Cygnar",
    "2": "Protectorate",
    "3": "Khador",
    "4": "Cryx",
    "5": "Retribution",
    "6": "Mercenary",
    "7": "Trollbloods",
    "8": "Circle",
    "9": "Skorne",
    "10": "Legion",
    "11": "Minion",
    "12": "Convergence",
    "14": "Grymkin",
    "15": "Crucible Guard",
    "16": "Infernal",
};


// function nonCharacterWarnoun(fid : number, ignoreMonstrosities? : boolean) {
//   return (e : Entry) => {
//     return isWarnoun(e) && (e.fid == fid || e.part == fid) && e.fa != "C"
//       && (ignoreMonstrosities ? e.t != Monstrosity : true);
//   }
// }

function themeUnique(tid : number) : entityFilter {
  let myThemeId : number = tid;

  return (e : Entry) => {
    return e.themeunique == myThemeId;
  };
}

function costAtMost(cost : number) : entityFilter {
  let myCost = cost;

  return (e: Entry) => {
    return e.C[0] <= myCost;
  }
}

function isWarjack(e : Entry) : boolean {
  return e.t == Warjack;
}


function nonCharacterWarnoun(e : Entry) : boolean {
    return isWarnoun(e) && e.fa != "C";
}

function nonCharacter(e : Entry) : boolean {
    return e.fa != "C";
}

function isJunior(e : Entry) : boolean {
    return !isCaster(e) && !isWarnoun(e) && e.ff > 0;
}


function not(ef : entityFilter | string | number) : entityFilter {
  if( typeof ef === "string" ) {
    let myKeyword : string = ef;

    return (e: Entry) => {
      return !hasKeyword(e, myKeyword);
    }
  }
  else if( typeof ef === "number" ) {
    return (e : Entry) => {
      let myUid : number = ef;

      return e.id != ef;
    }
  }
  else {
    let myEF : entityFilter = ef;

    return (e: Entry, choice: number) => {
        return !myEF(e, choice);
    }
  }
}

function HoDFAPools(fid : number) {
  let myFid = fid;

  return (e : Entry) => {
    // Fix for Croe's not counting correctly
    if( myFid == Const.Mercs && e.id == 390 ) {
      return -1;
    }

    if( (e.fid == myFid ) )
    {
      if( isUnit(e) ) {
        return 0;
      }
      else if( isSolo(e) ) {
        return 1;
      }
    }

    return -1;
  }
}

let HoDAllowed = [
  507, // Cygnar
  6504, // Khador
  6282, 6296, // CG
  59, 63, 6505, // Prot
  6164, // Mercs
  62, 6062, // Cryx
];


function HoDAllowFuncs(fid: number) {
  return [
    //[ fid, isUnitOrAttachment, not(6491) ], 
    ( e : Entry ) => { return e.fid == fid 
                        && isUnitOrAttachment(e)
                        && e.id != 6491
                        && e.id != 3122
                        && e.id != 6439
                        && e.id != 6553
                        // Partisan rule for Mercs
                        && (fid != Const.Mercs || e.part == null || e.part == Const.Infernals)
                        ;
                      },
    //[ fid, isSolo, not("Archon"), not(6551) ],
    ( e : Entry ) => { return e.fid == fid 
                        && isSolo(e)
                        && !hasKeyword(e, "Archon")
                        // Partisan rule for Mercs
                        && (fid != Const.Mercs || e.part == null || e.part == Const.Infernals)
                        ;
                      },

    [ Const.Infernals, isWarnoun, sizeOrSmaller(Medium) ],
    [ Const.Infernals, isUnitOrAttachment ],
    6461, // Runewood 2
    6140, // Eilish 1
    6455, // Eilish 2
    6456, // Regna
    6484, // Hermit
    6462, // Nicia 2
    420, // Orin 1
    239, // Saxon 1
    6460, // Umbral Guardian
    6458, // Valin Hauke
    6459, // The Wretch
    [ Const.Infernals, isStructure ],
    390, // Croe's
    (e : Entry) => { return HoDAllowed.indexOf(e.id) != -1 && e.fid == fid; },
    //(e : Entry) => { return e.fid == Const.Minions && e.wf && e.wf.indexOf(Const.Mercs) != -1; } // good bye Minions?
  ];
}

function HoDFaction(fid : number, id : number) {
  return {
    id: id, obv: true, fid: Const.Infernals,
    n: "Hearts of Darkness (" + factionShort[fid] + ")",
    adr: [10],
    mercInclusion: false,
    allowFuncs: HoDAllowFuncs(fid),
    rewards: [
      [ isCommandAttachment ],// CA
      6460, // Umbral Guardian
      6484, 6462, 6454, 6455, 6461, 6459, // Marked souls
      6140, 239, 420, // Merc Marked souls
    ],
    tb: [
      "All models in this army are Infernal models.",
      "Warjacks in this army gain Accumulator [Soulless].",
      "Wretches gain That Which Does Not Kill You.",
      StartingUpkeeps
    ],
    sharedFAPools : [2, 3],
    sharedFAFunc: HoDFAPools(fid),            
    forceMercBond: true,
  };
}


function size(sz : number) : entityFilter {
    let mySize : number = sz;

      return (e : Entry) => {
        return e.b == mySize;
      };

}

function isPartisan(fid : number) : entityFilter {
  let myFid = fid;

  return (e : Entry) => {
    return e.part == myFid;
  }
}

function sizeOrSmaller(size : number) : entityFilter {
  let mySize : number = size;

  return (e : Entry) => {
    return e.b <= mySize;
  };
}

function costOrLess(cost : number) : entityFilter {
	let myCost : number = cost;

	return (e : Entry) => {
		return e.C.length == 1 && e.C[0] <= myCost;
	};
}

function factionSoloCostOrLess(fid : number, cost : number) : entityFilter {
	let myFaction : number = fid;
	let myCost : number = cost;


	return (e : Entry) => {
		return (e.fid == myFaction || e.part == myFaction)
			&& isSolo(e)
			&& e.C.length == 1
			&& e.C[0] <= myCost
			;

	};
}
  

function nonCaster(e : Entry ) : boolean {
  return !isCaster(e);
}

function factionCaster(fid : number, keyword? : string) {
    let myFaction : number = fid;
    let myKeyword : string = keyword;

    return (e : Entry) => {
        return (e.fid == myFaction || e.part == myFaction)
          && isCaster(e)
          && (myKeyword ? hasKeyword(e, myKeyword) : true);
    }
}

function inFaction(fid : number) {
  let myFaction : number = fid;

  return (e : Entry) => {
      return (e.fid == myFaction || e.part == myFaction);
  }
}

function entryChoice(uid : number, ch : number) : entityFilter {
  return (e : Entry, choice : number) => {
    return e.id == uid && ch == choice;
  }
}

function nonCharacterWarjack(fid : number) {
  return ( e : Entry, choice : number ) => {
    return e.fid == fid && isWarnoun(e) && e.fa != "C";
  }
}

function standardAllowed(fid : number) {
  return (e : Entry) => {

    return (e.fid == fid || e.part == fid)
      && !e.dec
      && (isCaster(e) || (isWarnoun(e) && e.fa != "C"));
  }
}

function mercsStandardAllowed(e : Entry) {

    return (e.fid == Const.Mercs || e.part == Const.Mercs )
      && !e.dec
      && !e.lm
      && (isCaster(e)|| (isWarnoun(e) && e.fa != "C"));
}


function isUnitOrAttachment(e : Entry) {
  return isUnit(e) || isAttachment(e);
}

function isSoloOrAttachment(e : Entry) {
  return isSolo(e) || isAttachment(e);
}

function factionSolo(fid : number, keyword? : string,
      noJunior? : boolean, maxSize? : number) {
  let myFaction : number = fid;
  let myKeyword : string = keyword;
  let myNoJunior : boolean = noJunior;
  let myMaxSize : number = maxSize;

    return (e : Entry) => {
      return (e.fid == myFaction || e.part == myFaction)
        && isSolo(e)
        && (myKeyword ? hasKeyword(e, myKeyword) : true)
        && (myNoJunior ? !e.ff : true)
        && (myMaxSize ? e.b <= myMaxSize : true);
    };

}


function worksFor(fid : number) : entityFilter {
  let myFaction : number = fid;

  return ( e : Entry ) => {
    return e.fid == myFaction ||
      (e.wf && e.wf.indexOf(myFaction) != -1);
  }
}

function factionUnit(fid : number, keyword? : string) {
  let myFaction : number = fid;
  let myKeyword : string = keyword;

    return (e : Entry) => {
      return (e.fid == myFaction || e.part == myFaction)
        && isUnit(e)
        && (myKeyword ? hasKeyword(e, myKeyword) : true);
    };

}

function factionKeyword(fid : number, keyword : string) {
    let myFaction : number = fid;
    let myKeyword : string = keyword;

      return (e : Entry) => {
        return (e.fid == myFaction || e.part == myFaction)
          && !e.dec
          && hasKeyword(e, myKeyword);
      };

  }

// function join(a : entityFilter, b : entityFilter) : entityFilter {

//   let myA : entityFilter = a;
//   let myB : entityFilter = b;

//   return (e : Entry) => {
//       return myA(e) && myB(e);
//   };

// }

// function keywordFilter(a : entityFilter, keyword: string) {
//   let myA : entityFilter = a;
//   let myKeyword : string = keyword;

//   return (e : Entry) => {
//     return myA(e) && hasKeyword(e, myKeyword);
//   };
// }

function factionSoloOrAttachment(fid : number, keyword? : string) {
    let myFaction : number = fid;
    let myKeyword : string = keyword;

    return (e : Entry) => {
      return (e.fid == myFaction || e.part == myFaction)
        && !e.dec
        && isSoloOrAttachment(e)
        && (myKeyword ? hasKeyword(e, myKeyword) : true);
    };
}

function factionCommandAttachment(fid : number, keyword? : string) {
    let myFaction : number = fid;
    let myKeyword : string = keyword

    return (e : Entry) => {
      return (e.fid == myFaction || e.part == myFaction)
        && !e.dec
        && isCommandAttachment(e)
        && (myKeyword ? hasKeyword(e, myKeyword) : true);
    };
}

function factionWarnoun(fid : number) {
  let myFaction : number = fid;

  return (e : Entry) => {
    return (e.fid == myFaction || e.part == myFaction)
      && !e.dec
      && isWarnoun(e);
  };
}

function isBattleEngine(e : Entry) : boolean {
  return e.t == BattleEngine && e.st != 1;
}

function factionUnitOrAttachment(fid : number) {
    let myFaction : number = fid;

    return (e : Entry) => {
        return (e.fid == myFaction || e.part == myFaction)
           && isUnitOrAttachment(e);
    };
}


export function themeStaticData() : { [n: number]: ThemeData } {
    let ob : { [n: number]: ThemeData } = {
        8: {
          id: 8,
          fid: Mercs,
          n: "The Kingmaker's Army",
          adr: [8],
          allowFuncs: [
            [ Mercs, isWarjack, nonCharacter, not("Rhulic") ],
            themeUnique(8),
            "Steelhead",
          ],
          allowed: [
            443, // Bart
            521, // Damiano
            308, // MacBain
            280, 304, // Magnus
            390, // Croe's
            401, // Boomhowler
            484, // Dirty Meg
            407, // Kell
            517, // Madelyn
            420, // Orin
            2053, // Raluk
            455, 456, 335, 457, 336, 337, 523, 323, 334, // Raluk jacks
          ],
          tb: [
            "Warrior models and units gain Feign Death.",
            "Greygore Boomhowler & Co. gain Ambush."
          ],
              rewards: [
                isSolo
              ],
              required: [
                isUnitOrAttachment
              ],
              pc: 0,
              pcqty: 20
        },
        9: {
          id: 9,
          fid: 11,
          n: "The Thornfall Alliance",
          adr: [10],
          allowFuncs: [
            [ Minions, isCaster, "Farrow" ],
            [ isWarnoun, "Farrow", nonCharacter ],
            [ "Farrow", not(isWarnoun) ],
          ],
          allowed: [
            455, 456, 335, 457, 336, 337, 523, 323, 334, // Raluk jacks
            4040, // Arkadis's Gorax
            64, // Arkadius
            158, // Alten Ashley
            163, // Gudrun
            3180, // Hutchuk
            2053, // Raluk
            239, // Saxon
            3183, // Swamp Gobber Chef
            240, // Viktor Pendrake
            3103, // Efaarit Scouts
            654, // Brun
            241, // Lanyssa
            2053, // Raluk
            455, 456, 335, 457, 336, 337, 523, 323, 334, // Raluk jacks
            3179, // Lynus & Edrea
            655, // Boneswarm for Midas
            6481, // Dhunian Archon
          ],
          tb: ["Farrow warbeasts gain Retaliatory Strike.",
          "One Farrow Commandos unit gains Ambush."],
              rewards: [
                "Weapon Crew",
                isCommandAttachment,
                [ isSolo, not(isJunior), not("Archon") ],
                6481, // Dhunian Archon
              ],
              required: [
                [ "Farrow", isUnitOrAttachment ],
                [ "Farrow", isBattleEngine ]
              ], // req
              pc: 0,
              pcqty: 20
        },
        10: {
          id: 10,
          fid: 7,
          n: "Band of Heroes",
          adr: [9, 10],
          allowFuncs: [
            standardAllowed(Trolls),
            "Champion",
            "Fell Caller",
            "Fennblade",
            "Long Rider",
            "Warder",
            "Kriel Warrior",
          ],
          mercInclusion: true,
          allowed: [
            22, 23, // Kriestone bearer & Stone scribe units
            6134, // CID Krielstone attachment
            374, // Stone Scribe Chronicler
            379, // Whelps
            801, // Trollkin sorc, as all legal attachments are allowable
            652, // Skaldi
            653, 6159, // Runebearer
            1, // Skinner
          ],
          tb: ["Models disabled by warriors cannot Tough, you may choose to remove them from play.",
          ExtraDeployment],
          // benefits: [
          //   {
          //     y: "pcafp",
              rewards: [
                [ Trolls, isCommandAttachment ],
                [ Trolls, isSolo, size(Medium) ]
              ], //  Medium-based solo
              required: [
                  [ Trolls, isUnitOrAttachment ]
              ],
              pc: 0,
              pcqty: 20
          //   }
          // ]
        },
        11: {
          id: 11,
          fid: 7,
          n: "The Power of Dhunia",
          adr: [8],
          allowFuncs: [
              standardAllowed(Trolls),
          ],
          mercInclusion: true,
          allowed: [
            379, // Whelps

            399, 4001, 3165, 353, 801, 23, 653, 22, // Trollkin models/units with the magic ability special rule
            6134, // CID krielstone attachment
            6159, // CID Runebearer
            374, // Stone Scribe Chronicler
            3041, // Solos with lesser warlock rule

            6158, 6,  // CID Mulg

            6481, // Dhunian Archon
          ],
          fau: [353],
          tb: ["Dhunian Knot units gain Serenity.",
            StartingUpkeeps],
              rewards: [
                [ Trolls, isSolo, size(Medium) ],
                379 // Whelps
              ],
              required: [
                 [ Trolls, isWarnoun ]
                ],
              pc: 0,
              pcqty: 25
        },

        12: {
          id: 12,
          fid: 2,
          n: "Guardians of the Temple",
          mercInclusion: true,
          allowFuncs: [
            standardAllowed(Menoth),
            "Flameguard",
            "Reclaimer"
          ],
          allowed: [
            6307, // Shrine
            
            // Choir of Menoth
            164,

            // Vassal Solos
            189, 193,

            // Wrack Solos
            195,

            // Attendant Priest, for Merc inclusion
            207,


          ],
          tb: ["Flameguard B2B with another model in the unit gain Tough and Steady.",
          "One Daughters of the Flame unit gains Ambush."],
              rewards: [
                [ "Flameguard", isCommandAttachment ],
                [ Menoth, isSolo, size(Small) ]
              ],
              required: [
                [ "Flameguard", nonCaster ],
                6307, // Shrine
              ],
              pc: 0,
              pcqty: 20
        },
        13: {
          id: 13,
          fid: 2,
          n: "The Creator's Might",
          adr: [8, 10],
          allowFuncs: [
            standardAllowed(Menoth),
            "Vassal",
            [ Menoth, isBattleEngine ],
            [ Menoth, isJunior ],
          ],
          mercInclusion: true,
          allowed: [
            6307, // Shrine

            // Avatar of Menoth
            126,

            // Choir of Menoth
            164,

            // Visgoth Rhoven
            180,

            // Covenant of Menoth
            196,

            // Hierophant Solos
            186,

            // Wrack Solos
            195, 6020,

            // Attendant Priest, for Merc inclusion
            207,


            6311, // Exemplar Warder
            6202, // Gade
            6307, // Church

            6477, // Menite Archon
          ],
          tb: ["Solos and Choir of Menoth gain Reposition [3\"].",
          StartingUpkeeps],
              rewards: [
                [ Menoth, isSolo, sizeOrSmaller(Medium) ],
              ],
              required: [
                isWarnoun,
                isBattleEngine,
              ],
              pc: 0,
              pcqty: 25
        },
        14: {
          id: 14,
          fid: 1,
          n: "Storm Division",
          adr: [10],
          allowFuncs: [
            standardAllowed(Cygnar),
            "Mechanik",
            "Storm Knight",
            "Stormsmith"
          ],
          mercInclusion: true,
          allowed: [
            // Thunderhead
            541,

            // junior
            566,

            // Jakes
            3031,

            // Squires
            567,

            3157, // Savio (?)

          ],
          tb: ["Models/units gain Immunity: Electricity.",
          "Stormblade units gain Advance Move."],
          // benefits: [
          //   {
              // y: "pcafp",
              rewards: [ // What you get
                [ "Storm Knight", isCommandAttachment ],
                [ "Stormsmith", "Weapon Crew"],
                [ Cygnar, isSolo, size(Small) ],
                3157, // Savio
              ],
              required: [ // What you need to buy to get it
                [ "Storm Knight", nonCaster ],
                "Stormsmith",
              ],
              pc: 0,
              pcqty: 20
        },
        15: {
          id: 15,
          fid: 3,
          n: "Winter Guard Kommand",
          allowFuncs: [
            standardAllowed(Khador),
            "Winter Guard",
            "Widowmaker",
            "Mechanik",
            "Assault Kommando"
          ],
          mercInclusion: true,
          mercNoCharSolo: true,
          allowed: [

            // Kovnik Andrei Malakov
            3029,

            // War Dog solos
            452,

            // Valachev, for Merc inclusion
            477,

            6397, // Greylord Adjunct

          ],
          tb: ["Warcasters gain Sacrifical Pawn [Winter Guard trooper model].",
          "One heavy warjack per Winter Guard unit gains Advance Move."],
              rewards: [ // What you get
                [ "Winter Guard", "Weapon Crew" ],
                [ "Winter Guard", isCommandAttachment ],
                4028, // WG Artillery Kapitan
              ],
              required: [ // What you need to buy to get it
                [ "Winter Guard", nonCaster ],
              ],
              pc: 0,
              pcqty: 20
        },
        16: {
          id: 16,
          fid: 4,
          n: "The Ghost Fleet",
          adr: [10],
          mercInclusion: true,
          allowFuncs: [
            standardAllowed(Cryx),
            "Revenant",
            [ Cryx, "Wraith", (e : Entry) : boolean => { return e.id != 6216; }]
          ],
          allowed: [
            6215, // Misery Cage
            6209, // Black Ogrun Iron Mongers
          ],
          tb: ["Revenant Crew Deathbound rolls gain +1.",
          PlusOneToGoFirst],
              rewards: [ // What you get
                [ "Revenant", "Weapon Crew"],
                [ Cryx, isSolo, size(Small) ]
              ],
              required: [ // What you need to buy to get it
                [ "Revenant", nonCaster ],
              ],
              pc: 0,
              pcqty: 20
        },

        17: {
          id: 17,
          fid: 5,
          n: "Forges of War",
          adr: [8, 9],
          mercInclusion: true,
          allowFuncs: [
            [ Ret, isCaster, not("Vyre")],
            [ Ret, isWarnoun, "Shyeel", nonCharacter ],
            [ "Shyeel", not(isWarnoun) ],
            [ Ret, isJunior] ,
          ],
          allowed: [

            // Arcanist Mechanik solos
            192,

            // Sylys Wyshnalyrr
            526,

            190, // Soulless

            224, // Discordia

            6076, // Fane Knight Guardian
            6345, // Dawnguard Trident
          ],
          tb: ["Warjacks gain Shield Guard.",
          StartingUpkeeps],
              rewards: [ // What you get
                [ Ret, isSolo ],
                6073, // House Shyeel Arcanists
              ],
              required: [ // What you need to buy to get it
                [ "Shyeel", nonCaster ],
              ],
              pc: 0,
              pcqty: 30
        },


        18: {
          id: 18,
          fid: 12,
          n: "Destruction Initiative",
          adr: [8, 9, 10],
          allowFuncs: [
            standardAllowed(CoC),
            "Priest",
            [ CoC, isBattleEngine ],
            [ "Servitor", isSolo ],
            "Weapon Crew"
          ],
          mercInclusion: true,
          allowed: [
          ],
          tb: ["Servitor solos gain Shield Guard.",
          ExtraDeployment],
              rewards: [ // What you get
                [ "Servitor", isSolo ],
                "Weapon Crew"
              ],
              required: [ // What you need to buy to get it
                [ CoC, isWarnoun, (e : Entry) => { return e.req == null; }  ],
                [ CoC, isBattleEngine ],
              ],
              pc: 0,
              pcqty: 20
        },
        19: {
          id: 19,
          fid: 8,
          n: "The Devourer's Host",
          adr: [8, 9],
          mercInclusion: true,
          allowFuncs: [
            [ Circle, isCaster ],
            [ Circle, isStructure ],
            [ Circle, isWarnoun, isLiving, nonCharacter ],
            "Tharn"
          ],
          allowed: [
            // Ghetorix
            325, 6363,

            // Loki 
            6026,

            // Death Wolves
            3096,

            // Shifting Stones
            295, 313, 6376,

            // Gallows Groves
            698, 6373,

            // Lord of the Feast
            297, 6361,

            6480, // Primal Archon
          ],
          tb: ["One Tharn Bloodweaver unit gains Ambush.",
          "Each model that can gain corpse tokens begins with one."],
              rewards: [ // What you get
                [ Circle, isCommandAttachment ],
                [ Circle, isSolo, not("Archon") ],
                6372, // Wolf rider champ CID
                6361, // Lord of the Feast CID
                6373, // Gallows Grove CID
                6376, // Stone Keeper CID
              ],
              required: [ // What you need to buy to get it
                [ "Tharn", nonCaster ]
              ],
              pc: 0,
              pcqty: 20
        },
        20: {
          id: 20,
          fid: 9,
          n: "Winds of Death",
          adr: [10],
          mercInclusion: true,
          allowFuncs: [
            standardAllowed(Skorne),
            "Venator",
            [ isSolo, "Extoller" ],
            [ Skorne, isBattleEngine ]
          ],
          allowed: [
            // PGBH
            333,

            // Willbreakers
            784,
          ],
          tb: ["Skorne Warbeasts gain Swift Hunter.",
          "Place one wall template within 20\" of your table edge before deployment."],
              rewards: [ // What you get
                [ "Venator", "Weapon Crew"],
                [ Skorne, isSolo ],
              ],
              required: [ // What you need to buy to get it
                "Venator",
                isBattleEngine,
              ],
              pc: 0,
              pcqty: 20
        },
        21: {
          id: 21,
          fid: 10,
          n: "Ravens of War",
          mercInclusion: true,
          allowFuncs: [
            [ Legion, isCaster ],
            [ Legion, isWarnoun, size(Medium) ],
            "Grotesque",
            "Strider",
            "Raptor",
          ],
          allowed: [
            // Non-character warbeasts with Flight (heavy/garg/pack/lesser)
            598, 777, 3066, 121, 3100, 597,
            6248, // CID Archangel

            // Blighted Nyss Sorc & Hellion solos
            618,

            // Forsaken
            613,

            // Spell Martyrs
            774,

            4009, // Hellmouth
          ],
          tb: ["Enemy models lose Ambush.",
          "One Grotesque Raider unit gains Ambush."],
              rewards: [ // What you get
                [ Legion, isCommandAttachment ],
                [ Legion, isSolo, size(Small) ],
              ],
              required: [ // What you need to buy to get it
                [ Legion, isUnitOrAttachment ],
              ],
              pc: 0,
              pcqty: 20
          //   }
          // ]
        },
        22: {
          id: 22,
          fid: Mercs,
          n: "Hammer Strike",
          adr: [9, 10],
          allowFuncs: [
            "Rhulic"
          ],
          allowed: [
            654, // Brun
          ],
          tb: ["Heavy warjacks and weapon crew units gain Reposition [3\"].",
          "Warriors gain Tough.", ExtraDeployment],
              rewards: [ // What you get
                isCommandAttachment,
                "Weapon Crew",

                // Ogrun Bokur
                514,
              ],
              required: [ // What you need to buy to get it
                isUnitOrAttachment,
                isBattleEngine,
              ],
              pc: 0,
              pcqty: 20
        },
        23: {
          id: 23,
          fid: 1,
          n: "Heavy Metal",
          adr: [8, 9],
          mercInclusion: true,
          //mercBENotSolo: true,
          mercNoSolo: true,
          mercAllowBE: true,
          allowFuncs: [
            standardAllowed(Cygnar),
            "Mechanik",
            "Sword Knight",
            [ Cygnar, isJunior ],
            [ Cygnar, isBattleEngine ],
          ],
          allowed: [
            // Thunderhead
            541,
            // Archduke Alain Runewood
            582,
            // Squires
            567,

            572, 573, // Precursors
            700, 701, 
            
            6094, 6095, // Long Gunners

            4024, 519, 240, // Partisan mercs
          ],
          tb: ["Solos and Mechanik units gain Reposition [3\"].",
          ExtraDeployment],
              rewards: [ // What you get
                isCommandAttachment,
                isSolo,
              ],
              required: [ // What you need to buy to get it
                isWarnoun,
                isBattleEngine,
              ],
              pc: 0,
              pcqty: 30
        },
        // 24: {
        //   id: 24,
        //   fid: 1,
        //   n: "Sons of the Tempest",
        //   allowed: [
        //     // Cygnar Warcasters
        //     577, 498, 490, 491, 494, 426, 489, 3123, 6001, 506, 4005,
        //     492, 493, 670, 507, 424, 425, 3032, 3036, 6023,
        //     6097, 6123, // Trencher CID

        //     // Non-character warjacks with ranged weapons
        //     580, 508, 534, 536, 512, 516, 6124, 3140, 579, 3021,
        //     531, 539, 683, 509,

        //     // Arcane Tempest models/units
        //     4004, 563, 542, 544, 820, 543,
        //     6168, // cid shotgunmage

        //     // Mechanik models/units
        //     562, 570,
        //     6102, // Trencher CID

        //     // junior
        //     566,
        //   ],
        //   tb: ["Arcane Tempest Gun Mages gain Combined Ranged Attack.",
        //   "Models/units may begin game affected by upkeep spells."],
        //       rewards: [ // What you get
        //         // Arcane Tempest CA
        //         543,

        //         // Small-based Arcane Tempest solo
        //         4004, 563,
        //         6168, // cid
        //       ],
        //       required: [ // What you need to buy to get it
        //         // Arcane Tempest models/units
        //         4004, 563, 542, 544, 820, 543,
        //         6168, // cid

        //       ],
        //       pc: 0,
        //       pcqty: 20
        // },
        25: {
          id: 25,
          fid: 8,
          n: "The Bones of Orboros",
          adr: [8, 10],
          mercInclusion: true,
          allowFuncs: [
            [ Circle, isCaster ],
            [ Circle, isWarnoun, isConstruct, nonCharacter ],
            [ Circle, isUnitOrAttachment, "Stone" ],
            [ isSolo, "Blackclad" ]
          ],
          allowed: [
            // Celestial Fulcrum
            589, 6092,

            // Gallows Groves
            698,

            273, // Megalith

            6371, // Well 
          ],
          tb: ["Remove 1 damage point from each warbeast before leeching.",
          ExtraDeployment],
              rewards: [ // What you get
                [ Circle, isSolo ],
              ],
              required: [ // What you need to buy to get it
                [ Circle, isWarnoun ],
                [ Circle, isBattleEngine ],
                6371, // Well
              ],
              pc: 0,
              pcqty: 25
        },
        26: {
          id: 26,
          fid: 8,
          n: "The Wild Hunt",
          adr: [10],
          mercInclusion: true,
          allowFuncs: [
            standardAllowed(Circle),
            325, // Ghetorix
            6026, // Loki
            "Wolf Sworn",
            [ Circle, isStructure ]
          ],
          allowed: [
            // Shifting Stones
            295, 313,

            // Gallows Groves
            698,

            // War Wolf solo
            299,
          ],
          tb: ["Warbeasts gain Tracker.",
          "One Wolf of Orboros unit gains Ambush."],
              rewards: [ // What you get
                [ isCommandAttachment, "Wolf Sworn"],
                [ Circle, isSolo, sizeOrSmaller(Medium) ]
              ],
              required: [ // What you need to buy to get it
                [ "Wolf Sworn", nonCaster ],
              ],
              pc: 0,
              pcqty: 20
        },

        27: {
          id: 27,
          fid: 14,
          n: "Dark Menagerie",
          adr: [8, 9, 10],
          allowFuncs: [
            standardAllowed(Grymkin),
          ],
          mercInclusion: true,
          allowed: [

            // Special Crabit
            6059,

            // Dread Rot units
            6037,

            // Twilight Sisters
            6042,

            // Glimmer Imps
            6046,

            // Gremlin Swarms
            6047, 3154,

            // Lady Karianna Rose
            6048,

            // Death Knell
            6052,

            6418, // Kermit
            6417, // Malady Man

          ],
          tb: ["Gremlin Swarm solos gain Serenity.",
          "Each non-trooper that can have corpse tokens starts with one."],
          fam : { 3154 : 4 },
              rewards: [ // What you get
                // Single Crabit
                6059,

                // Gremlin Swarm
                6047, 3154,
              ],
              required: [ // What you need to buy to get it
                [ isWarnoun,  -6059 ],
              ],
              pc: 0,
              pcqty: 15
        },

        28: {
          id: 28,
          fid: 14,
          n: "Bump in the Night",
          adr: [8, 9, 10],
          mercInclusion: true,
          mercExclude: [3154],
          allowFuncs: [
            standardAllowed(Grymkin),
            [ Grymkin, isUnitOrAttachment ],
          ],
          allowed: [
            // Cask Imps
            6045,

            // Lord Longfellow
            6049,

            // Trapperkin
            6050,

            // Witchwood
            6051,

            // Glimmer Imps
            6046,

            // Death Knell
            6052,

            6418, // Kermit
            6419, // Grave Ghoul
          ],
          tb: ["Warrior models gain Rise.",
          "Murder Crow units gain Ambush."],
              rewards: [ // What you get
                // CA or solo
                isCommandAttachment,
                [ isSolo, not("Archon") ],

                6219, // Holden CID

                6417, // Malady Man CID
              ],
              required: [ // What you need to buy to get it
                // Units and BEs
                [ Grymkin, isUnitOrAttachment ],
                [ Grymkin, isBattleEngine ],
              ],
              pc: 0,
              pcqty: 20
        },

        29: {
          id: 29,
          fid: 10,
          n: "Oracles of Annihilation",
          adr: [8, 10],
          mercInclusion: true,
          allowFuncs: [
            standardAllowed(Legion),
          ],
          allowed: [

            // Models/units with Magic ability
            630, 622, 618, 613, 637, 623, 633, 6082,
            6166, // cid

            // Spawning Vessel Units
            608,

            // Beast Mistress solos
            809,

            // Blighted Nyss Shepherd solos
            615,

            // Spell Martyr solos
            774,

            6480, // Primal Archon

          ],
          tb: ["One non-warlock unit gains Apparition each Control Phase.",
          StartingUpkeeps],
              rewards: [ // What you get
                // Command attachment
                [ Legion, isCommandAttachment ],
                [ Legion, isSolo ],
              ],
              required: [ // What you need to buy to get it
                [ Legion, isWarnoun ],
                [ Legion, isBattleEngine ],
              ],
              pc: 0,
              pcqty: 30
        },

        30: {
          id: 30,
          fid: 10,
          n: "Children of the Dragon",
          adr: [9, 10],
          mercInclusion: true,
          allowFuncs: [
            [ Legion, isCaster ],
            [ Legion, isWarnoun, sizeOrSmaller(Small), -3066 ],
            [ isWarnoun, "Nephilim", nonCharacter ],
            [ "Succubus", isSolo ],
            "Blighted Nyss",
            "Incubus",
          ],
          allowed: [

            // Spell Martyr solos
            774,

            // Azrael
            6028,

            // Zuriel
            3101,

          ],
          tb: ["Nephilim warbeasts gain Unyielding.",
          PlusOneToGoFirst],
              rewards: [ // What you get
                [ Legion, isCommandAttachment ],
                [ Legion, isSolo, size(Small) ],
              ],
              required: [ // What you need to buy to get it
                [ Legion, isWarnoun ],
              ],
              pc: 0,
              pcqty: 25
        },

        31: {
          id: 31,
          fid: 11,
          n: "The Blindwater Congregation",
          bgfree: true,
          adr: [8, 9, 10],
          allowFuncs: [
            [ "Gatorman", isCaster ],
            [ Minions, isWarnoun, isAmphibious, nonCharacter ],
            [ Minions, isAmphibious, not(isWarnoun) ],
            "Gobber"
          ],
          allowed: [
            // Feralgeist solos
            156,

            // Raluk Moorclaw
            2053,

            // Totem hunter
            244,

            // Viktor Pendrake
            240,

            // Wrong Eye
            647,

            // Sacral Vault
            3067,

            // Dahlia
            649,

            6193, // Bone Shrine
            6191, // Spirit Cauldron
            6192, // Void Leech

            455, 456, 335, 457, 336, 337, 523, 323, 334, // Raluk jacks

            3179, // Lynus & Edrea

            6480, // Primal Archon
          ],
          fau: [80, 6204],
          tb: ["Gatorman Posse units gain Snacking and have 8 boxes.",
          ExtraDeployment],
              rewards: [ // What you get
                // Bull Snapper
                  234,

                  // Solos without lesser warlock
                  //3189, 3188, 291, 156, 656, 2048, 3183, 3138, 238, 240, 244,
                  (e : Entry) => isSolo(e) && !e.ff && !hasKeyword(e, "Archon"),

                  6191, // Boil Master & Spirit Cauldron
                ],
              required: [ // What you need to take to get it
                isUnit,
                isBattleEngine
              ],
              pc: 0,
              pcqty: 20
        },
        32: {
          id: 32,
          fid: 4,
          n: "Infernal Machines",
          mercInclusion: true,
          allowFuncs: [
            standardAllowed(Cryx),
            "Thrall",
            "Warwitch",
            "Iron Lich",
            [ isSolo, "Wraith", (e : Entry) : boolean => { return e.id != 6216; } ],
            [ Cryx, isJunior ],
          ],
          allowed: [

            // Deathjack
            93,

            // Malice
            167,


            // Necrotech solos
            134,


            // Darragh Wrathe
            147,

            // Wraith Engines
            642,

          ],
          tb: ["Warjacks gain Hyper-Aggressive.",
          "One Mechanithrall unit gains Ambush."],
              rewards: [ // What you get
                // Necrosurgeon & Stitch Thralls
                99,

                [ Cryx, isCommandAttachment ],
                [ Cryx, isSolo, nonCharacter ],

              ],
              required: [ // What you need to buy to get it
                // Thrall models/units
                [ "Thrall", nonCaster ]
              ],
              pc: 0,
              pcqty: 20
        },

        33: {
          id: 33,
          fid: Khador,
          n: "Jaws of the Wolf",
          adr: [8],
          allowFuncs: [
              standardAllowed(Khador),
              "Mechanik",
              "Kayazy",
              "Kossite",
              "Widowmaker",
              [ Khador, isJunior ]
          ],
          mercInclusion: true,
          allowed: [
            702, 703, 704, // Kayazy

            // Behemoth
            418,

            // Yuri the Axe
            468,

            // Greylord Forge Seer solos
            6066,

            // Manhunter solo
            459,

            // War Dog solos
            452,

            // Valachev, for Merc inclusion
            477,

            6397, // Greylord Adjunct

          ],
          tb: ["Battle Mechanik units gain Reposition [3\"].",
          "Enemy models lose Ambush."],
              rewards: [ // What you get
                [ Khador, isCommandAttachment ],
                [ Khador, isSolo ]
              ],
              required: [ // What you need to buy to get it
                [ Khador, isWarnoun ]
              ],
              pc: 0,
              pcqty: 25
        },

        34: {
          id: 34,
          fid: 3,
          n: "Legions of Steel",
          adr: [10],
          mercInclusion: true,
          mercNoCharUnit: true,
          allowFuncs: [
              standardAllowed(Khador),
              factionKeyword(Khador, "Iron Fang"),
              factionKeyword(Khador, "Mechanik"),
          ],
          allowed: [

            // War Dog solos
            452,

            // Valachev, for Merc inclusion
            477,

            6397, // Greylord Adjunct

          ],
          tb: ["The Great Bears and Iron Fang solos gain Countercharge.",
          "One small-based Iron Fang unit gains Advance Move."],
              rewards: [ // What you get
                [ Khador, isCommandAttachment ],
                [ Khador, isSolo, size(Small) ]
              ],
              required: [ // What you need to buy to get it
                [ "Iron Fang", nonCaster ],
              ],
              pc: 0,
              pcqty: 20
        },
        35: {
          id: 35,
          fid: 5,
          n: "Defenders of Ios",
          adr: [8],
          mercInclusion: true,
          allowFuncs: [
              standardAllowed(Ret),
              "Houseguard",
              "Ellowuyr",
              "Fane Knight",
              "Ghost",
              "Nyss",
              [ Ret, isBattleEngine ]
            ],
          allowed: [
            // Lys Healer solos
            4012,

            // Arcanist Mechanik solos
            192,

            // Sylys Wyshnalyrr
            526,

            241, // Lanyssa
            391, // Cylena

            // Soulless escort (by rule)
            190,

            3136, // Electromancers
          ],
          tb: ["Solos, Electromancers, and Stormfall Archers gain Reposition [3\"].",
          "For every Houseguard unit, one Retribution unit gains Advance Move."],
              rewards: [ // What you get
                [ "Houseguard", "Weapon Crew" ],
                [ Ret, isCommandAttachment ],
                [ Ret, isSolo ],
              ],
              required: [ // What you need to buy to get it
                [ Ret, isUnitOrAttachment ],
                [ Ret, isBattleEngine ],
                391, // Cylena
              ],
              pc: 0,
              pcqty: 20
        },

        36: {
          id: 36,
          fid: 5,
          n: "Shadows of the Retribution",
          adr: [10],
          mercInclusion: true,
          allowFuncs: [
              standardAllowed(Ret),
              "Mage Hunter",
            ],
          allowed: [
            // Arcanist Mechanik solos
            192,

            190, // Soulless

            215, // Eiryss1 
            276, // Eiryss2

            3120, // Moros
            4012, // Lys Healer
            6076, // Fane Knight Guardian

            6479, // Void archon
          ],
          tb: ["Models disabled by melee attacks lose Tough and may be RFPed.",
          "One Mage Hunter Infiltrators unit without a Command Attachment gains Ambush."],
              rewards: [ // What you get
                [ Ret, isCommandAttachment ],
                [ Ret, isSolo ],
              ],
              required: [ // What you need to buy to get it
                [ Ret, isUnitOrAttachment ],
		            391, // Cylena
              ],
              pc: 0,
              pcqty: 20
        },
        37: {
          id: 37,
          fid: 4,
          n: "Dark Host",
          adr: [10],
          mercInclusion: true,
          allowFuncs: [
              standardAllowed(Cryx),
              "Bane"
        ],

          allowed: [

            // Machine Wraith solos
            131,

            // Necrotech solos
            134,

            // Scrap Thrall solos
            135,

            // Skarlock Thrall solos
            143,

            // Soul Trapper solos
            3134,

            // Wraith Engine battle engines
            642,

            // Darraghe Wrathe
            147,

          ],
          tb: ["Bane models/units gain Prowl.",
          "Put two 4\" AOE dense fogs completely within 20\" of your board edge."],
              rewards: [ // What you get
                [ Cryx, isCommandAttachment ],
                [ Cryx, isSolo, sizeOrSmaller(Medium) ],
              ],
              required: [ // What you need to buy to get it
                [ Cryx, isUnitOrAttachment ],
                isBattleEngine
              ],
              pc: 0,
              pcqty: 20
        },

        // 38: {
        //   id: 38,
        //   fid: 4,
        //   n: "Infernal Machines (CID)",
        //   allowed: [
        //     // Cryx Warcasters
        //     4016, 6004, 37, 39, 678, 32, 36, 3131, 45, 51, 3000,
        //     58, 62, 170, 40, 43, 3037, 55, 67, 6062,

        //     // Non-character warjacks
        //     83, 71, 72, 174, 85, 74, 3024, 686, 88, 77, 90, 76, 173,
        //     91, 3144, 3132, 92, 79,

        //     // Deathjack
        //     93,

        //     // Malice
        //     167,

        //     // Iron lich models/units
        //     28, 177,

        //     // Thrall models/units
        //     124, 3187, 143, 135, 98, 99, 4023, 111, 2068, 102, 119, 3134, 6087,

        //     // Warwitch models/units
        //     144,

        //     // Necrotech solos
        //     134,

        //     // Wraith solos
        //     138, 6063, 131,

        //     // Solos with battlegroup controller
        //     3028,

        //     // Darragh Wrathe
        //     147,

        //     // Wraith Engine
        //     642,

        //   ],
        //   pr: true,
        //   tb: ["Warjacks gain Hyper-Aggressive.",
        //   "One Mechanithrall unit gains Ambush."],
        //       rewards: [ // What you get
        //         // Necrosurgeon & Stitch Thralls
        //         99,

        //         // Command Attachment
        //         2068,

        //         // Non-character solo
        //         124, 177, 138, 135, 143, 144, 3134, 131,

        //       ],
        //       required: [ // What you need to buy to get it
        //         // Thrall models/units
        //         124, 3187, 143, 135, 98, 99, 4023, 111, 2068, 102, 119, 3134, 6087

        //       ],
        //       pc: 0,
        //       pcqty: 20
        // },

        39 : {
          id: 39,
          fid: 7,
          n: "Kriel Company",
          mercInclusion: true,
          allowFuncs: [
              [ Trolls, isCaster ],
              "Pyg",
        ],

          allowed: [
            // Non Character Warbeasts with ranged weapons
            332, 26, 3162, 689, 4, 6017, 326, 402, 27, 20, 5,
            6132, 6130, 6157, // CID warbeasts

            // Trollkin models/units with ranged weapons
            3091, 4002, 357, 347, 3092, 697, 651, 9,
            801, 412, 3166, // attachments
            3093, 368, // solos
            6139, // CID

            // Krielstone Bearer & Stone Scribes
            22, 23, // Kriestone bearer & Stone scribe units
            6134, // CID

            // Troll Whelp solos
            379, // Whelps

            // Boomhowler
            401,

            // Dannon Blythe & Bull
            518,

            // War Wagon
            6080, 644,

            // Hooch Hauler
            6138,

            // Runebearer
            653, 6159,

          ],
          tb: ["Models can ignore friendly warriors when determining LOS.",
          PlusOneToGoFirst],
              rewards: [
                  "Weapon Crew",
                  [ Trolls, isCommandAttachment ],
                  [ Trolls, isSolo, size(Medium) ],

              ],
              required: [
                  [ Trolls, isUnitOrAttachment ],
                  [ Trolls, isBattleEngine ],
                  518, // Dannon Blythe & Bull
                  401, // Boomhowler
                ],
              pc: 0,
              pcqty: 20
        },


        40: {
          id: 40,
          fid: 2,
          n: "Exemplar Interdiction",
          adr: [9, 10],
          allowFuncs: [
              standardAllowed(Menoth),
              "Vassal",
              "Exemplar",
              "Reclaimer",
              "Scrutator",
        ],
        mercInclusion: true,

          allowed: [
            6326, // Fire of Salvation CID
            127, // Fire of Salvation


            // Choir of Menoth
            164,

            // Visgoth Rhoven
            180,

            // Wrack Solos
            195,

            // Attendant Priest, for Merc inclusion
            207,

            6337, // CID hierophant
            186, // Real hierophant


          ],
          tb: ["The weapons of warjacks gain Blessed.",
          ExtraDeployment],
              rewards: [
                    [ Menoth, isSolo, sizeOrSmaller(Medium) ],
                    [ Menoth, isCommandAttachment ],
              ],
              required: [
                    [ "Exemplar", nonCaster ]
              ],
              pc: 0,
              pcqty: 20
        },

        41: {
          id: 41,
          fid: 1,
          n: "Gravediggers",
          adr: [8, 9, 10],
          allowFuncs: [
              standardAllowed(Cygnar),
              "Ranger",
              "Trencher",
        ],

          allowed: [
            // Triumph
            6096, // Trencher CID
            4024, // Gibbs


          ],
          mercInclusion: true,
          tb: ["Trencher warrior models gain Rise.",
          PlusOneToGoFirst],
              rewards: [ // What you get
                [ "Trencher", "Weapon Crew" ],
                [ "Trencher", isCommandAttachment ],
                [ "Trencher", isSolo ],
              ],
              required: [ // What you need to buy to get it
                "Ranger",
                "Trencher",
              ],
              pc: 0,
              pcqty: 20
        },


        42 : {
          id: 42,
          fid: 7,
          n: "Storm of the North",
          adr: [8, 9, 10],
          mercInclusion: true,
          allowFuncs: [
              standardAllowed(Trolls),
              "Long Rider",
              "Champion",
              "Northkin",
              "Kriel Warrior"
          ],

          allowed: [
            6128, 408, // Rok


            22, 23, 6134, // KSB & attachments
            368, // Fell Caller Hero solos
            653, // Trollkin Runebearer solos
            6159, // CID Runebearer
            379, // Whelps
            801, // Sorc
          ],
          tb: ["You can upkeep spells on Northkin models/units for free.",
          "Place 2 4\" snow drifts; non-warlock warriors become Northkin."],
              rewards: [
                  [ Trolls, isCommandAttachment ],
                  [ Trolls, isSolo, size(Medium)],
              ],
              required: [
                  [ Trolls, isUnitOrAttachment ],
                  [ Trolls, isBattleEngine ],
                ],
              pc: 0,
              pcqty: 20
        },

        43: {
          id: 43,
          fid: 9,
          n: "Disciples of Agony",
          mercInclusion: false,
          allowFuncs: [
            [ Skorne, nonCharacterWarnoun ],
            [ Minions, isUnitOrAttachment ],
            [ Minions, isSolo ],
            [ Mercs, isUnitOrAttachment ],
            [ Mercs, isSolo ],
            "Mortitheurge",
            "Nihilator",
            "Paingiver"
          ],
          allowed: [
            // Skorne Warlocks
            218, 214, 6078, 377, 4019,

            // DoA warbeasts
            6142, 6143, 6144, 6145, 6146, 6147,
            6148, 6149, 6150, 6151, 6152, 6153,
            6194, 6195, 6196, 6197,

            // Minion units
            // 84, 3153, 54, 48, 4007, 237, 52, 815, 80, 154, 3159, 6172,
            // 6198, 6191, 6188, 6182, // CID
            6192, // Void leech
	    6067, // Chiron

	    420, // Orin
          ],
          tb: ["Paingiver models gain Sacrificial Pawn [Minion warrior].",
          "One Paingiver Bloodrunner unit gains Ambush."],
              rewards: [ // What you get
                  [ Skorne, isSolo, size(Small) ],
                  [ Skorne, isCommandAttachment ]
              ],
              required: [ // What you need to buy to get it
                  isUnitOrAttachment
              ],
              pc: 0,
              pcqty: 20
        },
        44: {
          id: 44,
          fid: 9,
          n: "The Exalted",
          adr: [9, 10],
          mercInclusion: true,
          allowFuncs: [
              standardAllowed(Skorne),
              "Exalted",
              "Extoller",
          ],
          allowed: [

            // PGBH
            333,
            // Void spirit solos
            361,

            812, // Despoiler

            6479, // Void Archon

          ],
          tb: ["Construct models gain Immovable Object.",
          "Models with Soul Taker start with one soul token."],
              rewards: [ // What you get
                [ Skorne, isCommandAttachment ],
                [ Skorne, isSolo ],
              ],
              required: [ // What you need to buy to get it
                [ "Exalted", nonCaster ],
                3172, // Extoller Advocate for attachment to Immortals

              ],
              pc: 0,
              pcqty: 20
        },

        45: {
          id: 45,
          fid: Mercs,
          n: "The Irregulars",
          allowFuncs: [
            [ standardAllowed(Mercs), not("Cephalyx") ],
            [ isSolo, worksFor(Mercs), isCharacter ],
            [ isUnitOrAttachment, worksFor(Mercs), not("Cephalyx") ],
            [ Mercs, isBattleEngine ],
            [ Minions, isWarnoun, nonCharacter ], // Warbeasts for Wrong Eye
          ],
          allowed: [
            // Gobber tinker
            2048,

            // Wrongeye and Rorsh
            647, 427,

            // Brunc
            654,

            // Dahlia
            649,

            // Lanyssa
            241,
            
          ],
          tb: ["Marshaled jacks gain Flank [Friendly Faction Warrior].",
          "One heavy warjack per unit taken gets Advanced Move."],
              rewards: [ // What you get
                isCommandAttachment,
                [ isSolo, not(isJunior), sizeOrSmaller(Medium) ],
                3026, // Gastonne
              ],
              required: [ // What you need to buy it
                isWarjack,
                isUnitOrAttachment,
              ],
              pc: 0,
              pcqty: 30
        },

        46: {
          id: 46,
          fid: Khador,
          n: "Wolves of Winter",
          adr: [9, 10],
          mercInclusion: true,
          allowFuncs: [
            standardAllowed(Khador),
            "Greylord",
            "Doom Reaver",
            "Mechanik"
          ],
          allowed: [
              452, // War Dog
              3121, // Ruin 
              448, // Ternion
              6501, // Void archon (CID)
          ],
          tb: ["A non-warcaster Doom Reaver or Greylord unit gains Apparition each Control Phase.",
          StartingUpkeeps],
          rewards: [
            [ Khador, isCommandAttachment ],
	        [ Khador, isSolo, sizeOrSmaller(Medium)],
	      448, // CID Ternion
          ],
          required: [
            [ "Greylord", nonCaster ],
	    [ "Doom Reaver", nonCaster ],
	    477 // Valachev
          ],
          pc: 0,
          pcqty: 20
        },
        47: {
          id: 47,
          fid: Skorne,
          n: "Imperial Warhost",
          bgfree: true,
          adr: [8, 9],
          mercInclusion: true,
          allowFuncs: [
            standardAllowed(Skorne),
            [ Skorne, isBattleEngine ]
          ],
          allowed: [
            // PGBH
            333,

            // Solos with battlegroup controller
            3038,

            // Willbreakers
            784,

            324, // Molik Karn
            375, // Aptimus

          ],
          tb: ["Skorne Warbeasts gain Hyper-Aggressive.",
          ExtraDeployment],
              rewards: [ // What you get
                // Krea
                254,

                // Agonizer
                356,

                [ Skorne, isSolo ]

              ],
              required: [
                [ Skorne, isWarnoun ],
                [ Skorne, isBattleEngine ]
              ],
              pc: 0,
              pcqty: 30
        },

        48: {
          id: 48,
          fid: Circle,
          n: "Secret Masters",
          adr: [9],
          mercInclusion: false,
          allowFuncs: [
            "Blackclad",
            [ Circle, nonCharacterWarnoun ],
            [ Circle, isStructure ],
            [ Minions, isSolo ],
            [ Minions, isUnitOrAttachment ],
          ],
          allowed: [
            // Shifting Stones
            295,

            // Gallows Groves
            698,
            
            6483,


	    391, // Nyss hunters
          ],
          tb: ["Blackclad warriors gain Sacrificial Pawn [Minion warrior].",
          StartingUpkeeps],
          rewards: [
            [ Circle, isSolo, not("Archon") ],
            [ "Blackclad", isCommandAttachment ]
          ],
              required: [
            [ Circle, "Blackclad", nonCaster ],
            [ Minions, isUnitOrAttachment ],
	        391, // Nyss hunters
              ],
              pc: 0,
              pcqty: 20
        },
        24: {
          id: 24,
          fid: Cygnar,
          n: "Sons of the Tempest",
          mercInclusion: true,
          allowFuncs: [
            standardAllowed(Cygnar),
            "Arcane Tempest",
            "Mechanik"
          ],
          allowed: [
            // junior
            566,

            567, // Squire

            // Non-character warjacks with ranged weapons
            // 580, 508, 534, 536, 512, 516, 6124, 3140, 579, 3021,
            // 531, 539, 683, 509,

          ],
          tb: ["Arcane Tempest Gun Mage and Black 13th units gain Pistoleer.",
          "Warcasters can upkeep spells on Arcane Tempest models for free."],
          rewards: [
            [ Cygnar, isSolo, size(Small) ],
            [ Cygnar, isCommandAttachment, "Arcane Tempest"]
          ],
          required: [
            "Arcane Tempest"
          ],
          pc: 0,
          pcqty: 15
        },
        50: {
          id: 50,
          fid: Menoth,
          n: "The Faithful Masses",
          adr: [8, 9],
          mercInclusion: true,
          allowFuncs: [
            standardAllowed(Menoth),
            "Deliverer",
            "Paladin",
            "Zealot",
            "Reclaimer",
            //"Idrian",
            "Vassal",
          ],
          allowed: [
            6307, // Shrine
            
            126, // Avatar
            // Choir of Menoth
            164,

            // Allegiant of the order of the fist
            181,

            // Hierophant
            186,

            // Wrack Solos
            195,

            // Tristan Durant
            3030,

            // Covenant
            196,

            199, 200, // Idrians


          ],
          tb: ["Heavy Warjacks and Colossals gain Hand of Vengeance.",
          "Place one wall template within 20\" of your table edge before deployment."],
          rewards: [
            [ Menoth, "Weapon Crew" ],
            [ Menoth, isCommandAttachment ],
            [ Menoth, isSolo, sizeOrSmaller(Medium) ],
            6396 // Initiates
          ],
          required: [
            [ Menoth, isUnitOrAttachment ],
            [ "Paladin", nonCaster ],
            [ "Reclaimer", nonCaster ]
          ],
          pc: 0,
          pcqty: 20
      },

        51: {
          id: 51,
          fid: Minions,
          n: "Will Work for Food",
          adr: [8, 9, 10],
          allowFuncs: [
            standardAllowed(Minions),
            [ worksFor(Minions), isSolo ],
            [ worksFor(Minions), isUnit, isCharacter ],
            [ Minions, isBattleEngine ]
          ],
          allowed: [
            654, // Brun
            6191, // Boil Master & Spirit Cauldron units

            // Farrow Bone Grinders
            54,

            // Farrow Valkyries
            6172,

            // Swamp Gobber Bellows Crew
            154,

            // Brun Cragback & Lug
            654,

            // Dahlia Hallyr
            649,

            // Rorsh
            427,

            // Wrong Eye
            647,

            455, 456, 335, 457, 336, 337, 523, 323, 334 // Raluk jacks
          ],
          tb: ["Warbeasts in this army gain Overtake.",
          "Warbeasts gain +2 SPD running (without forcing) during your first turn."],
              rewards: [
                [ worksFor(Minions), isSolo, not(isJunior), not("Archon") ],
                6481, // Dhunian Archon
              ],
              required: [ // What you need to take to get it
                  [ Minions, isWarnoun ],
                  // models with lesser warlock
                  //427, 647, 649, 654,
                  [ isJunior ]
                ],
              pc: 0,
              pcqty: 25
        },

        // 52: {
        //   id: 52,
        //   fid: Mercs,
        //   n: "The Talion Charter",
        //   allowed: [
        //   ],
        //   allowFuncs: [
        //     "Privateer",
        //     [ Minions, "Privateer" ],
        //     [ Mercs, isWarjack, nonCharacter ]
        //   ],
        //   tb: ["Solos gain Dodge.",
        //   "One Press Gangers unit gains Ambush."],
        //   rewards: [
        //       "Weapon Crew",
        //       isSolo
        //   ],
        //   required: [
        //     [ Mercs, "Privateer", nonCaster ],
        //     [ Minions, "Privateer" ]
        //   ],
        //   pc: 0,
        //   pcqty: 25
        // },

        52: {
          id: 52,
          fid: Mercs,
          n: "The Talion Charter",
          adr: [10],
          pr: false,
          cid: false,
          allowed: [
          ],
          allowFuncs: [
            "Privateer",
            6429,
            [ Minions, "Privateer" ],
            [ Mercs, isWarjack, nonCharacter ],
            [ Mercs, "Scharde" ]
          ],
          tb: ["Solos gain Sacrificial Pawn [Sea Dog model].",
            "Place and scatter up to 2 Broadside AOEs."],
          rewards: [
              6437,
              isSolo
          ],
          required: [
            [ Mercs, "Privateer", nonCaster ],
            [ Minions, "Privateer" ]
          ],
          pc: 0,
          pcqty: 25
        },






        53: {
          id: 53,
          fid: Mercs,
          n: "Llaelese Resistance",
          adr: [8, 9],
          allowed: [
            // Caine's Hellslingers
            6025,

            // Drake MacBain
            308,

            // Reinholdt
            403,

            // Sylys
            526,

            // Captain Sam MacHorne & the Devil Dogs
            388,

            // Colbie Sterling, Captain of the BRI
            6030,

            // Gobber Tinker solos
            2048,

            // Harlan Vesh
            519,

            // Madelyn Corbeau
            517,

            // Rhupert Carvolo
            421,

            // Rutger Shaw
            423,

            // Dannon Blythe & Bull
            518,

            // Ellish
            6140,

            6477, // Menite Archon
            6476, // Morrowan Archon
            6478, // Thamarite Archon
          ],
          allowFuncs: [
              [ Mercs, nonCharacterWarnoun, not("Cephalyx") ],
              [ Mercs, "Llaelese"]
            ],
        required: [
            isUnit,
            isAttachment,
            isSolo
        ],
          sharedFAPools : [2],
          sharedFAFunc: (e : Entry) => {
            if( (e.fid == Cygnar || e.fid == Menoth || e.fid == CG ) &&
                isUnit(e) ) {
              return 0;
            }
            else {
              return -1;
            }
          },
          animosityFunc: (a : Entry, b : Entry) => {
              return (a.fid != b.fid)
                && (a.fid == Cygnar || a.fid == Menoth  || a.fid == CG )
                && (b.fid == Cygnar || b.fid == Menoth || b.fid == CG );
          },
        rewards: [
            [isSolo, not("Archon")],
            isCommandAttachment
        ],
          tb: ["Llaelese models gain Pathfinder.",
          "You get a drop pod.  Too complex to fit on one line."],
          pc: 0,
          pcqty: 20
        },

        54 : {
          id: 54,
          fid: CoC,
          n: "Clockwork Legions",
          adr: [8, 9, 10],
          allowed: [
            // Solos with Soul Vessel
            2042, 2043, 2044,
            6389, // Frustum
            6420, // JAIMS
            6526, // Gaspy 4
          ],
          mercInclusion: true,
        allowFuncs: [
            standardAllowed(CoC),
            [ CoC, isUnitOrAttachment ],
            "Priest"
        ],
          fam: { 2044: 4 },
          rewards: [
              [ CoC, isSoloOrAttachment ]
            ],
          required: [
              [ CoC, isUnitOrAttachment ],
              [ CoC, isSolo ]
            ],
          tb: ["Units with Shield Wall gain Advance Move.",
          "Eradicator, Perforator, and Reciprocator units gain Vengeance."],
          pc: 0,
          pcqty: 20
        },

        // 55 : {
        //   id: 55,
        //   fid: Khador,
        //   mercInclusion: true,
        //   allowed: [
        //       452 // War dog
        //     ],
        //   required: [ 
        //     ["Man-O-War", nonCaster]
        //   ],
        //   rewards: [
        //       [ Khador, isCommandAttachment ],
        //       [ "Tanker", isSolo ],
	      // 462, // Man-O-War Kovnik
	      // 6267, // CID Man-O-War Kovnik
        //   ],
        //   n: "Armored Corps",
        //   adr: [8],
        //   allowFuncs: [
        //       standardAllowed(Khador),
        //       "Man-O-War",
        //       "Mechanik"
        //   ],
        //   tb: ["Models affected by Repair are repaired an additional point.",
        //   "Man-o-War Battle Engines and Tanker solos gain Advance Move."],
        //   pc: 0,
        //   pcqty: 20
        // },

          55 : {
            id: 55,
            fid: Khador,
            mercInclusion: true,
            allowed: [
	    452, // War dog
		 6397, // Greylord Adjunct	    
              ],
            required: [ 
              ["Man-O-War", nonCaster],
              "Mechanik"
            ],
            rewards: [
                [ Khador, isCommandAttachment ],
                [ "Tanker", isSolo ],
                462, // Man-O-War Kovnik
                6267, // CID Man-O-War Kovnik
                6066, // Forge Seer
            ],
            n: "Armored Corps",
            adr: [8, 9],
            allowFuncs: [
                standardAllowed(Khador),
                "Man-O-War",
                "Mechanik"
            ],
            tb: ["Models affected by Repair are repaired an additional point.",
            "One Man-O-War model/unit gains Advance Move per Khador unit. "],
            pc: 0,
            pcqty: 20
          },
        

        56: {
          id: 56,
          fid: Cryx,
          mercInclusion: true,
          n: "Black Industries",
          bgfree: true,
          adr: [8, 9],
          pc: 0,
          pcqty: 30,
          allowFuncs: [
              standardAllowed(Cryx),
              "Iron Lich",
              "Warwitch",
              [ Cryx, isJunior ]
            ],
          allowed: [
            // Deathjack
            93,

            167, // Malice

            // Withershadow Combine
            28,

            // Necrotech
            134,

            // Machine Wraiths
            131,

            // Scrap Thralls
            135,

            // Soul Trapper solos
            3134,

            // Cephalyx
            162, 166, 6551,

            6209, // Black Ogrun Iron Mongers

            6587, // Ol' Grim
            
          ],

          rewards: [ (e : Entry) => {
            return e.fid == 4 && isWarnoun(e)
              && e.C.length == 1 && e.C[0] <= 7;
          }],

          required: [
              [Cryx, isWarnoun]
          ],

          tb: ["Heavy warjacks gain Carapace.",
          ExtraDeployment],

        },

        57 : {
          id: 57,
          fid: Cryx,
          mercInclusion: true,
          n: "Slaughter Fleet Raiders",
          adr: [9],
          pc: 0,
          pcqty: 20,
          allowFuncs: [
              standardAllowed(Cryx),
              "Black Ogrun",
              "Blighted Trollkin",
              "Scharde"
            ],
          allowed: [
            6233, // Devil's shadow CID
            3028, // Aiakos

            6215, // Misery Cage
            6214, // Satyxis Blood Priestess

            6061, // Kharybdis 
            6216, // Axiara
	    // 6235, // Barathrum CID
            
          ],
          rewards: [
              [ Cryx, isSolo ] ,
              [ Cryx, isCommandAttachment ]
            ],
          required: [
              [ Cryx, isUnitOrAttachment ],
              3122
          ],
          tb: ["Warjacks gain Gang Fighter [Friendly Faction Warrior].",
          ExtraDeployment],
        },

        58 : {
          id: 58,
          fid: Circle,
          n: "Call of the Wild",
          mercInclusion: true,
          pc: 0,
          pcqty: 25,
          allowFuncs: [
              [ Circle, isCaster ],
              [ Circle, isStructure ],
              [ Circle, isWarnoun, isLiving, nonCharacter ],
              [ isSolo, "Blackclad" ]
            ],
          allowed: [
            3095, 6365, // Brennos

            295, 313, // Shifting stones
            698, // Gallows Grove
            297, 6361, // Lord of the feast

          ],
        required: [
            [ Circle, isWarnoun ]
        ],
          rewards: [
              [ Circle, isSolo ],
              295, // Shifting Stones
          ],
          tb: ["Reduce the COST of all animi cast by warbeasts by 1.",
          PlusOneToGoFirst],
        },

        59: {
            id: 59,
            fid: Ret,
            n: "Legions of Dawn",
            adr: [9, 10],
            mercInclusion: true,
            allowed: [
                192, // Arcanist Mechanik
                190, // Soulless Escort

                3025, // Imperatus
                268, // Artificer
                3137, // Void tracer
                222, // Ghost sniper
                4012, // Lys Healer
                6076, // Fane Knight Guardian
                190, // Soulless Escorts
            ],
            allowFuncs: [
              standardAllowed(Ret),
              "Dawnguard",
              "Nyarr",
            ],
            tb: ["Retribution warjacks ignore friendly Dawnguard for LoS/movement.",
              PlusOneToGoFirst],
            rewards: [
                [ "Dawnguard", isCommandAttachment ],
                [ Ret, isSolo, sizeOrSmaller(Medium) ]
            ],
            required: [
                [ "Dawnguard", nonCaster ]
            ],
            pc: 0,
            pcqty: 20
          },


          60: {
            id: 60,
            fid: Cryx,
            n: "Scourge of the Broken Coast",
            adr: [8],
            mercInclusion: true,
            allowed: [
              6215, // Misery Cage
	      6209, // Black Ogrun Iron Mongers
	      3133, // Barathrum
            ],
            allowFuncs: [
              standardAllowed(Cryx),
              "Satyxis",
            ],
	    //tb: ["Satyxis models/units gain Pathfinder.",
	    tb: ["Solos gain Dodge.",
            "One Satyxis Blood Witch unit gains Ambush."],
            rewards: [
                [ "Satyxis", isCommandAttachment ],
                [ "Satyxis", isSolo ],
            ],
            required: [
                [ "Satyxis", nonCaster ]
            ],
            pc: 0,
            pcqty: 20
          },
          61: {
            id: 61,
            fid: Skorne,
            n: "Masters of War",
            adr: [8],
            mercInclusion: true,
            allowed: [
    //             // non-character warbeasts without ranged weapons
    //             356, 3097, 382, 260, 255, 257, 363,
		// 811, 314, 3065, 321, 364,
		// 6378, // CID Bronzeback

    //             254, // Krea

                383, 6385, // Tiberion

                333, // PGBH
                349, // TyCo
                784, // Willbreaker
                6356, // Supreme Guardian
                3065, // Scarab Pack
                358, // Ancestral Guardian
                369, // Hakaar

            ],
            allowFuncs: [
                standardAllowed(Skorne),
                "Cataphract",
                "Praetorian",
                [ "Extoller", isSolo ]
            ],
            tb: ["Models disabled by a Skorne warrior cannot make a Tough roll.",
            PlusOneToGoFirst],
            rewards: [
                [ Skorne, isCommandAttachment ],
                349, // TyCo
                [ Skorne, isSolo, sizeOrSmaller(Medium) ],
            ],
            required: [
                [ Skorne, isUnitOrAttachment ],
                6356, // Supreme Guardian
                3065, // Scarab Pack
                362, // Dragoons
            ],
            pc: 0,
            pcqty: 20
          },
          62: {
            id: 62,
            fid: Legion,
            n: "Primal Terrors",
            adr: [8, 9],
            mercInclusion: true,
            allowed: [
                4009, // Hellmouth
                613, // Forsaken
                774, // Spell Martyr
                6244, // Golab
            ],
            allowFuncs: [
              standardAllowed(Legion),
              "Blighted Ogrun",
              "Blighted Rotwing",
            ],
            tb: ["Blighted Ogrun Warmonger and Warspear units gain Vengeance.",
              ExtraDeployment],
            rewards: [
                4009, // Hellmouth
                [ "Blighted Ogrun", isCommandAttachment ],
                [ "Blighted Ogrun", isSolo, size(Medium) ]
            ],
            required: [
              [ "Blighted Ogrun", not(isCaster) ],
              "Rotwing"
          ],
            pc: 0,
            pcqty: 20
          },

          // 64 : {
          //   id: 64,
          //   fr: 55,
          //   fid: Khador,
          //   mercInclusion: true,
          //   allowed: [
          //       452 // War dog
          //     ],
          //   required: [ 
          //     ["Man-O-War", nonCaster],
          //     "Mechanik"
          //   ],
          //   rewards: [
          //       [ Khador, isCommandAttachment ],
          //       [ "Tanker", isSolo ],
          //       462, // Man-O-War Kovnik
          //       6267, // CID Man-O-War Kovnik
          //       6066, // Forge Seer
          //   ],
          //   pr: true,
          //   n: "Armored Corps (obs)",
          //   adr: [8],
          //   allowFuncs: [
          //       standardAllowed(Khador),
          //       "Man-O-War",
          //       "Mechanik"
          //   ],
          //   tb: ["Models affected by Repair are repaired an additional point.",
          //   "One Man-O-War model/unit gains Advance Move per Khador unit. "],
          //   pc: 0,
          //   pcqty: 20
          // },

          65 : {
            id: 65,
            fid: CG,
            mercInclusion: false,
            allowed: [
              6293, // Combat Alchemists
              6278, // Dragon;s Breath
              6296, // Alyce
              6292, // Mechanik
              405, // Gorman
              3180, // Hutchuk
              6280, // Prospero
              6295, // Trancers
              6274, // Railless
            ],
            allowFuncs: [
              standardAllowed(CG),
              [ CG, isUnit, size(Medium) ]
            ],
            required: [
              [ CG, isWarjack ],
              6278, // Dragon's Breath
              isBattleEngine
            ],
            rewards: [
              6293, // Combat alchemist
              [CG, isSolo ]
            ],
            tb: ["Vanguards can use Shield Guard twice per turn.",
            ExtraDeployment],
            n: "Prima Materia",
            adr: [8, 9, 10],
            pc: 0,
            pcqty: 30
          },
            
          66 : {
            id: 66,
            fid: CG,
            mercInclusion: true,
            allowed: [
              6294, // Morely
              405, // Gorman
              3180, // Hutchuk
            ],
            allowFuncs: [
              standardAllowed(CG),
              [ CG, isUnitOrAttachment ],
              [ CG, isSolo ],
              [ CG, isBattleEngine ],
            ],
            required: [
              [ CG, isUnitOrAttachment ],
              [ CG, isSolo ],
              [ CG, isBattleEngine ]
            ],
            rewards: [
              6278, // Weapon crew
              [ CG, isCommandAttachment ],// CA
              [ CG, isSolo ]// solo
            ],
            tb: ["Solos and weapon crews gain Reposition [3\"].",
            PlusOneToGoFirst],
            n: "Magnum Opus",
            adr: [8, 9, 10],
            pc: 0,
            pcqty: 20
          },

          // 67: {
          //   fr: 17,
          //   pr: true,
          //   id: 67,
          //   fid: 5,
          //   n: "Forges of War (CID)",
          //   adr: [8],
          //   mercInclusion: true,
          //   allowFuncs: [
          //     [ Ret, isCaster, not("Vyre")],
          //     [ Ret, isWarnoun, "Shyeel", nonCharacter ],
          //     [ "Shyeel", not(isWarnoun) ],
          //     [ Ret, isJunior] ,
          //   ],
          //   allowed: [
  
          //     // Arcanist Mechanik solos
          //     192,
  
          //     // Sylys Wyshnalyrr
          //     526,
  
          //     190, // Soulless
  
          //     224, // Discordia
  
          //     6076, // Fane Knight Guardian
          //     6345, // Dawnguard Trident
          //   ],
          //   tb: ["Warjacks gain Shield Guard.",
          //   "Models/units may begin game affected by upkeep spells."],
          //       rewards: [ // What you get
          //         [ Ret, isSolo ],
          //         6073, // House Shyeel Arcanists
          //       ],
          //       required: [ // What you need to buy to get it
          //         [ "Shyeel", nonCaster ],
          //       ],
          //       pc: 0,
          //       pcqty: 30
          // },
  


          // 68: {
          //   fr: 59,
          //   id: 68,
          //   fid: Ret,
          //   n: "Legions of Dawn (CID)",
          //   pr: true,
          //   mercInclusion: true,
          //   allowed: [
          //       192, // Arcanist Mechanik
          //       190, // Soulless Escort

          //       6348, // Imperatus
          //       268, // Artificer
          //       3137, // Void tracer
          //       222, // Ghost sniper
          //       4012, // Lys Healer!!!
          //       6076, // Fane Knight Guardian
          //   ],
          //   allowFuncs: [
          //     standardAllowed(Ret),
          //     "Dawnguard",
          //     "Nyarr",
          //   ],
          //   tb: ["Warjacks ignore Dawnguard for LoS and can move through them.",
          //   "One Warjack gains Advance Move per unit or Battle Engine."],
          //   rewards: [
          //       [ "Dawnguard", isCommandAttachment ],
          //       [ Ret, isSolo, sizeOrSmaller(Medium) ]
          //   ],
          //   required: [
          //       [ "Dawnguard", nonCaster ]
          //   ],
          //   pc: 0,
          //   pcqty: 20
          // },


          // 69: {
          //   fr: 36,
          //   id: 69,
          //   fid: 5,
          //   n: "Shadows of the Retribution (CID)",
          //   pr: true,
          //   mercInclusion: true,
          //   allowFuncs: [
          //       standardAllowed(Ret),
          //       "Mage Hunter",
          //     ],
          //   allowed: [
          //     // Arcanist Mechanik solos
          //     192,
  
          //     190, // Soulless
  
          //     215, // Eiryss1 
          //     276, // Eiryss2
          //     3120, // Moros
          //     4012, // Lys Healer
  
          //   ],
          //   tb: ["Models disabled by melee attacks lose Tough and may be RFPed.",
          //   "You gain +1 to your starting roll for the game."],
          //       rewards: [ // What you get
          //         [ Ret, isSolo ],
          //         [ Ret, isCommandAttachment ]
          //       ],
          //       required: [ // What you need to buy to get it
          //         [ Ret, isUnitOrAttachment ],
          //         391, // Cylena
          //       ],
          //       pc: 0,
          //       pcqty: 20
          // },
  
  
          // 70: {
          //   id: 70,
          //   fid: Mercs,
          //   n: "The Irregulars (CID)",
          //   pr: true,
          //   cid: true,
          //   allowFuncs: [
          //     [ standardAllowed(Mercs), not("Cephalyx") ],
          //     [ isSolo, worksFor(Mercs), isCharacter ],
          //     [ isUnitOrAttachment, worksFor(Mercs), not("Cephalyx") ],
          //     [ Mercs, isBattleEngine ],
          //     [ Minions, isWarnoun, nonCharacter ], // Warbeasts for Wrong Eye
          //   ],
          //   allowed: [
          //     // Gobber tinker
          //     2048,
  
          //     // Wrongeye and Rorsh
          //     647, 427,
  
          //     // Brunc
          //     654,
  
          //     // Dahlia
          //     649,
  
          //     // Lanyssa
          //     241,
              
          //   ],
          //   tb: ["Marshaled jacks gain Flank [Friendly Faction Warrior].",
          //   "One heavy warjack per unit taken gets Advanced Move."],
          //       rewards: [ // What you get
          //         isCommandAttachment,
          //         [ isSolo, not(isJunior), sizeOrSmaller(Medium) ],
          //         3026, // Gastonne
          //       ],
          //       required: [ // What you need to buy it
          //         isWarjack,
          //         isUnitOrAttachment,
          //       ],
          //       pc: 0,
          //       pcqty: 30
          // },
  
          71: {
            id: 71,
            fid: Mercs,
            n: "Soldiers of Fortune",
            adr: [10],
            allowFuncs: [
              [ standardAllowed(Mercs), not("Cephalyx") ],
              "Steelhead",
            ],
            allowed: [
              526, // Sylys -- merc with attached
              403, // Reinhold -- merc with attached
              517, // Corbeau -- merc with attached
              350, 527, // Alexias
              6404, // Rocinante (CID)
              522, // Rocinante
              518, // Blythe & Bull
              513, // Herne & Jonne
              158, // Alten Ashley
              404, // Anastasia di Bray
              215, // Eiryss, Mage Hunter
              405, // Gorman
              514, // Ogrun Bokur
              423, // Rutger Shaw
              441, // Taryn
              421, // Rhupert
              239, // Saxon
            ],
            tb: ["Solos gain Mark Target",
                "Place a Wall Template.",
                "Steelhead Cavalry models gain Bulldoze"],
                rewards: [ // What you get
                  isSolo,
                  [ "Steelhead", "Weapon Crew" ]
                ],
                required: [ // What you need to buy it
                  "Steelhead"
                ],
                pc: 0,
                pcqty: 20
          },
          
          73 : {
            id: 73,
            fid: Const.Infernals,
            mercInclusion: true,
            allowed: [
            ],
            allowFuncs: [
              standardAllowed(Const.Infernals),
              [ Const.Infernals, isUnitOrAttachment ],
              [ Const.Infernals, isSolo ],
              [ Const.Infernals, isStructure ],
            ],
            required: [
              [ Const.Infernals, isUnitOrAttachment ],
              [ Const.Infernals, isSolo ],
              [ Const.Infernals, isStructure ]
            ],
            rewards: [
              entryChoice(6465, 2),
              [ Const.Infernals, isCommandAttachment ],// CA
              [ sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Infernals, 5) ]// solo
            ],
            tb: ["Infernal solos gain Reposition [3\"].",
              "Horrors do not pay Tithe during your first turn.",
              "Up to one Cultist Band unit gains Ambush."],
            n: "Dark Legacy",
            adr: [10],
            pc: 0,
            pcqty: 20
          },


          74 : {
            id: 74,
            fid: Const.Infernals,
            mercInclusion: false,
            allowed: [
              507,
            ],
            allowFuncs: [
              [ Const.Cygnar, isUnitOrAttachment ],
              [ Const.Cygnar, isSolo, not("Archon") ],
              [ Const.Infernals, isWarnoun, sizeOrSmaller(Medium) ],
              [ Const.Infernals, isUnitOrAttachment ],
              [ Const.Infernals, isSolo ],
              [ Const.Infernals, isStructure ],
            ],
            required: [
              [ isUnitOrAttachment ],
              [ isSolo ],
              [ Const.Infernals, isStructure ]
            ],
            rewards: [
              [ isCommandAttachment ],// CA
              6460, // Umbral Guardian
              6484, 6462, 6454, 6455, 6461, 6459, // Marked souls
              6140, 239, 420, // Merc Marked souls
            ],
            tb: ["All models in this army are Infernal models.",
                "Warjacks in this army gain Accumulator [Soulless].",
                StartingUpkeeps],
            n: "Hearts of Darkness (Cygnar)",
            pc: 0,
            pcqty: 20,

            sharedFAPools : [2, 3],
            sharedFAFunc: (e : Entry) => {
              if( (e.fid == Const.Cygnar || e.fid == Const.Khador || e.fid == Const.CG ) )
              {
                if( isUnit(e) ) {
                  return 0;
                }
                else if( isSolo(e) ) {
                  return 1;
                }

                return -1;
              }
            },
            animosityFunc: (a : Entry, b : Entry) => {
                return (a.fid != b.fid) 
                  && (a.fid == Cygnar || a.fid == Khador || a.fid == CG )
                  && (b.fid == Cygnar || b.fid == Khador || b.fid == CG );
            },
            forceMercBond: true,
  
          },

          75 : {
            id: 75,
            fid: Const.Infernals,
            mercInclusion: false,
            allowed: [
              6503,
            ],
            allowFuncs: [
              [ Const.Khador, isUnitOrAttachment ],
              [ Const.Khador, isSolo, not("Archon") ],
              [ Const.Infernals, isWarnoun, sizeOrSmaller(Medium) ],
              [ Const.Infernals, isUnitOrAttachment ],
              [ Const.Infernals, isSolo ],
              [ Const.Infernals, isStructure ],
            ],
            required: [
              [ isUnitOrAttachment ],
              [ isSolo ],
              [ Const.Infernals, isStructure ]
            ],
            rewards: [
              [ isCommandAttachment ],// CA
              6460, // Umbral Guardian
              6484, 6456, 6462, 6454, 6455, 6461, 6459, // Marked souls
              6140, 239, 420, // Merc Marked souls
            ],
            tb: ["All models in this army are Infernal models.",
                "Warjacks in this army gain Accumulator [Soulless].",
                StartingUpkeeps],
            n: "Hearts of Darkness (Khador)",
            adr: [10],
            pc: 0,
            pcqty: 20,

            sharedFAPools : [2, 3],
            sharedFAFunc: (e : Entry) => {
              if( (e.fid == Const.Cygnar || e.fid == Const.Khador || e.fid == Const.CG ) )
              {
                if( isUnit(e) ) {
                  return 0;
                }
                else if( isSolo(e) ) {
                  return 1;
                }

                return -1;
              }
            },
            animosityFunc: (a : Entry, b : Entry) => {
                return (a.fid != b.fid) 
                  && (a.fid == Cygnar || a.fid == Khador || a.fid == CG )
                  && (b.fid == Cygnar || b.fid == Khador || b.fid == CG );
            },
            forceMercBond: true,
  
          },

          
          76 : {
            id: 76,
            fid: Const.Infernals,
            mercInclusion: false,
            allowed: [
              6282, // Lukas
              6296, // Alyce
            ],
            allowFuncs: [
              [ Const.CG, isUnitOrAttachment ],
              [ Const.CG, isSolo, not("Archon") ],
              [ Const.Infernals, isWarnoun, sizeOrSmaller(Medium) ],
              [ Const.Infernals, isUnitOrAttachment ],
              [ Const.Infernals, isSolo ],
              [ Const.Infernals, isStructure ],
            ],
            required: [
              [ isUnitOrAttachment ],
              [ isSolo ],
              [ Const.Infernals, isStructure ]
            ],
            rewards: [
              [ isCommandAttachment ],// CA
              6460, // Umbral Guardian
              6484, 6456, 6462, 6454, 6455, 6461, 6459, // Marked souls
              6140, 239, 420, // Merc Marked souls
            ],
            tb: ["All models in this army are Infernal models.",
                "Warjacks in this army gain Accumulator [Soulless].",
                StartingUpkeeps],
            n: "Hearts of Darkness (CG)",
            pc: 0,
            pcqty: 20,

            sharedFAPools : [2, 3],
            sharedFAFunc: (e : Entry) => {
              if( (e.fid == Const.Cygnar || e.fid == Const.Khador || e.fid == Const.CG ) )
              {
                if( isUnit(e) ) {
                  return 0;
                }
                else if( isSolo(e) && e.id != 6296 ) {
                  return 1;
                }

                return -1;
              }
            },
            animosityFunc: (a : Entry, b : Entry) => {
                return (a.fid != b.fid) 
                  && (a.fid == Cygnar || a.fid == Khador || a.fid == CG )
                  && (b.fid == Cygnar || b.fid == Khador || b.fid == CG );
            },
            forceMercBond: true,
  
          },

          77 : {
            id: 77,
            fid: Const.Infernals,
            mercInclusion: false,
            allowed: [
              59, 63, 6502,
            ],
            allowFuncs: [
              [ Const.Menoth, isUnitOrAttachment ],
              [ Const.Menoth, isSolo, not("Archon") ],
              [ Const.Infernals, isWarnoun, sizeOrSmaller(Medium) ],
              [ Const.Infernals, isUnitOrAttachment ],
              [ Const.Infernals, isSolo ],
              [ Const.Infernals, isStructure ],
            ],
            required: [
              [ isUnitOrAttachment ],
              [ isSolo ],
              [ Const.Infernals, isStructure ]
            ],
            rewards: [
              [ isCommandAttachment ],// CA
              6460, // Umbral Guardian
              6484, 6456, 6462, 6454, 6455, 6461, 6459, // Marked souls
              6140, 239, 420, // Merc Marked souls
            ],
            tb: ["All models in this army are Infernal models.",
                "Warjacks in this army gain Accumulator [Soulless].",
                StartingUpkeeps],
            n: "Hearts of Darkness (Prot.)",
            adr: [10],
            pc: 0,
            pcqty: 20,

            sharedFAPools : [2, 3],
            sharedFAFunc: (e : Entry) => {
              if( (e.fid == Const.Menoth ) )
              {
                if( isUnit(e) ) {
                  return 0;
                }
                else if( isSolo(e) ) {
                  return 1;
                }

                return -1;
              }
            },
            forceMercBond: true,
  
          },          

          78 : {
            id: 78,
            fid: Const.Infernals,
            mercInclusion: false,
            allowed: [
              6164,
            ],
            allowFuncs: [
              [ Const.Mercs, isUnitOrAttachment ],
              [ Const.Mercs, isSolo, not("Archon"), (e : Entry) => e.part == null ],
              [ Const.Infernals, isWarnoun, sizeOrSmaller(Medium) ],
              [ Const.Infernals, isUnitOrAttachment ],
              [ Const.Infernals, isSolo ],
              [ Const.Infernals, isStructure ],
            ],
            required: [
              [ isUnitOrAttachment ],
              [ isSolo ],
              [ Const.Infernals, isStructure ]
            ],
            rewards: [
              [ isCommandAttachment ],// CA
              6460, // Umbral Guardian
              6484, 6456, 6462, 6454, 6455, 6461, 6459, // Marked souls
              6140, 239, 420, // Merc Marked souls
            ],
            tb: ["All models in this army are Infernal models.",
                "Warjacks in this army gain Accumulator [Soulless].",
                StartingUpkeeps],
            n: "Hearts of Darkness (Mercs)",
            pc: 0,
            pcqty: 20,

            sharedFAPools : [2, 3],
            sharedFAFunc: (e : Entry) => {
              if( (e.fid == Const.Mercs ) )
              {
                if( isUnit(e) ) {
                  return 0;
                }
                else if( isSolo(e) ) {
                  return 1;
                }

                return -1;
              }
            },
            forceMercBond: true,
  
          },          


          79 : {
            id: 79,
            fid: Const.Infernals,
            mercInclusion: false,
            allowed: [
              62, 6062,
            ],
            allowFuncs: [
              [ Const.Cryx, isUnitOrAttachment ],
              [ Const.Cryx, isSolo, not("Archon") ],
              [ Const.Infernals, isWarnoun, sizeOrSmaller(Medium) ],
              [ Const.Infernals, isUnitOrAttachment ],
              [ Const.Infernals, isSolo ],
              [ Const.Infernals, isStructure ],
            ],
            required: [
              [ isUnitOrAttachment ],
              [ isSolo ],
              [ Const.Infernals, isStructure ]
            ],
            rewards: [
              [ isCommandAttachment ],// CA
              [ isSolo, sizeOrSmaller(Medium) ], // solo
              6140, 239, 420, // Merc Marked souls
            ],
            tb: ["All models in this army are Infernal models.",
                "Warjacks in this army gain Accumulator [Soulless].",
                StartingUpkeeps],
            n: "Hearts of Darkness (Cryx)",
            pc: 0,
            pcqty: 20,

            sharedFAPools : [2, 3],
            sharedFAFunc: (e : Entry) => {
              if( (e.fid == Const.Cryx ) )
              {
                if( isUnit(e) ) {
                  return 0;
                }
                else if( isSolo(e) ) {
                  return 1;
                }

                return -1;
              }
            },
            forceMercBond: true,
  
          },          


          80 : {
            id: 80,
            fid: Menoth,
            mercInclusion: false,
            allowed: [
              6018, 673, 3033, // cavalry warcasters
              3125, // Durst
              6495, // Vlad 3

              6483, // hermit of henge hold
              164, // Choir of Menoth
              450, // Kossite Woodsmen
              459, // Manhunter Solos
              6477, // Menite Archons
              468, // Yuri the Axe
              452, // War Dog
              195, // Wrack
              189, 193, // Vassal Solos
              2069, 139, // Prot Cav units
              6171, 6308, 197,  // Prot Cav solos
              824, 431, // Khador Cav Units
              464, 461, 467, // Khador Cav Solos
              6177, 6250, 588, // Khador Cav Battle Engines

              6492, 6493, // Free solos
            ],
            allowFuncs: [
              nonCharacterWarjack(Menoth),
              nonCharacterWarjack(Khador),
              [ "Paladin", nonCaster ]
            ],
            required: [
              isUnitOrAttachment,
              isSolo,
              isBattleEngine
            ],
            rewards: [
              [ isSolo, sizeOrSmaller(Small), not(189), not(193) ]
            ],

            sharedFAPools: [2, 3],
            sharedFAFunc: (e: Entry) => {
              if( e.id == 6492 || e.id == 193 ) {
                return 0;
              }
              else if( e.id == 6493 || e.id == 189 ) {
                return 1;
              }
              else {
                return -1;
              }
            },
            sharedFAWeightFunc: (e : Entry) => {
              if( e.id == 6493 || e.id == 6492 ) {
                return 2;
              }
              else {
                return 1;
              }
            },

            tb: ["All models are Protectorate and Khadoran.",
              "Cavalry models gain Line Breaker.",
              "You can reroll your starting roll for the game."],
            n: "Warriors of the Old Faith",
            pc: 0,
            pcqty: 20,
            pr: false,
            cid: false,
          },          


          81 : {
            id: 81,
            fid: Khador,
            mercInclusion: false,
            allowed: [
              676, // Vlad 3
              6496, 6497, 6498, // Menoth cavalry casters
              6499, // Durst

              6483, // hermit of henge hold
              164, // Choir of Menoth
              450, // Kossite Woodsmen
              459, // Manhunter Solos
              6477, // Menite Archons
              468, 6591, // Yuri the Axe
              452, // War Dog
              195, // Wrack
              189, 193, // Vassal Solos
              2069, 139, // Prot Cav units
              6171, 6308, 197,  // Prot Cav solos
              824, 431, // Khador Cav Units
              464, 461, 467, // Khador Cav Solos
              6177, 6250, 588, // Khador Cav Battle Engines

              6492, 6493, // Free solos
            ],
            allowFuncs: [
              nonCharacterWarjack(Khador),
              nonCharacterWarjack(Menoth),
              [ "Paladin", nonCaster ]
            ],
            required: [
              isUnitOrAttachment,
              isSolo,
              isBattleEngine
            ],
            rewards: [
              [ isSolo, sizeOrSmaller(Small), not(189), not(193) ]
            ],

            sharedFAPools: [2, 3],
            sharedFAFunc: (e: Entry) => {
              if( e.id == 6492 || e.id == 193 ) {
                return 0;
              }
              else if( e.id == 6493 || e.id == 189 ) {
                return 1;
              }
              else {
                return -1;
              }
            },
            sharedFAWeightFunc: (e : Entry) => {
              if( e.id == 6493 || e.id == 6492 ) {
                return 2;
              }
              else {
                return 1;
              }
            },

            tb: ["All models are Protectorate and Khadoran.",
                "Cavalry models gain Line Breaker.",
                "You can reroll your starting roll for the game."],
            n: "Warriors of the Old Faith",
            pc: 0,
            pcqty: 20,
            pr: false,
            cid: false,
          },              


          82 : {
            id: 82,
            fid: Mercs,
            mercInclusion: false,
            allowed: [
              6467, // Blaize
              6164, // Crosse 2
              453, 6421, // Fionas
              306, 6558, // Ashlynn
              726, // Gallant
              3031, // Jakes 1
              6483, // Hermit
              562, // Field Mechankis
              3122, // DSM
            ],
            allowFuncs: [
              nonCharacterWarjack(Cygnar),
              [ nonCharacterWarjack(Mercs), not("Rhulic") ],
              nonCharacterWarjack(Khador),
              [ "Morrowan", nonCaster ],
              [ "Thamarite", nonCaster ],
              "Alexia",
            ],
            required: [
              isUnitOrAttachment,
              isSolo,
            ],
            rewards: [
              isCommandAttachment,
              [ isSolo, sizeOrSmaller(Medium) ],
              entryChoice(6491, 2)
            ],

            sharedFAPools: [2],
            sharedFAFunc: (e: Entry) => {
              if( e.t == Const.Warjack && 
                (e.fid == Const.Khador || e.fid == Const.Cygnar) 
                && e.fa != "C" ) 
              {
                return 0;
              }
              else {
                return -1;
              }
            },

            tb: ["All models are Mercenary models.",
            "Units gain Vengeance."],
            n: "Flame in the Darkness",
            pc: 0,
            pcqty: 20,
            pr: false,
            cid: false,
          },                 

          83 : {
            id: 83,
            fid: Cygnar,
            mercInclusion: false,
            allowed: [
              6466, // Blaize (CID)
              6001, // Jakes 2
              3031, // Jakes 1
              424, 425, 3032, // Stryker
              4005, // Maddox 
              578, // Gallant
            ],
            allowFuncs: [
              nonCharacterWarjack(Cygnar),
              [ nonCharacterWarjack(Mercs), not("Rhulic") ],
              nonCharacterWarjack(Khador),
              [ "Morrowan", nonCaster ],
              [ "Thamarite", nonCaster ],
              "Alexia",
              6483, // Hermit
              562, // Field Mechankis
              3122, // DSM
            ],
            required: [
              isUnitOrAttachment,
              isSolo,
            ],
            rewards: [
              isCommandAttachment,
              [ isSolo, sizeOrSmaller(Medium) ],
              entryChoice(6491, 2)
            ],

            sharedFAPools: [2],
            sharedFAFunc: (e: Entry) => {
              if( e.t == Const.Warjack && 
                (e.fid == Const.Khador || e.fid == Const.Cygnar) 
                && e.fa != "C" ) 
              {
                return 0;
              }
              else {
                return -1;
              }
            },

            tb: ["All models are Cygnar models.",
            "Units gain Vengeance."],
            n: "Flame in the Darkness",
            pc: 0,
            pcqty: 20,
            pr: false,
            cid: false,
          },                 


          84 : {
            id: 84,
            fid: Const.Khador,
            mercInclusion: false,
            allowed: [
              397, 3128, // Zerkovas
              6494, // Gallant???

              3031, // Jakes 1

            ],
            allowFuncs: [
              nonCharacterWarjack(Cygnar),
              [ nonCharacterWarjack(Mercs), not("Rhulic") ],
              nonCharacterWarjack(Khador),
              [ "Morrowan", nonCaster ],
              [ "Thamarite", nonCaster ],
              "Alexia",
              6483, // Hermit
              562, // Field Mechankis
              3122, // DSM
            ],
            required: [
              isUnitOrAttachment,
              isSolo,
            ],
            rewards: [
              isCommandAttachment,
              [ isSolo, sizeOrSmaller(Medium) ],
              entryChoice(6491, 2)
            ],

            sharedFAPools: [2],
            sharedFAFunc: (e: Entry) => {
              if( e.t == Const.Warjack && 
                (e.fid == Const.Khador || e.fid == Const.Cygnar) 
                && e.fa != "C" ) 
              {
                return 0;
              }
              else {
                return -1;
              }
            },

            tb: ["All models are Khador models.",
            "Units gain Vengeance."],
            n: "Flame in the Darkness",
            pc: 0,
            pcqty: 20,
            pr: false,
            cid: false,
          },         
          
          // 85: {
          //   id: 85,
          //   fid: 1,
          //   cid: true,
          //   pr: true,
          //   n: "Heavy Metal (CID)",
          //   mercInclusion: true,
          //   mercAllowBE: true,
          //   allowFuncs: [
          //     standardAllowed(Cygnar),
          //     "Mechanik",
          //     "Sword Knight",
          //     [ Cygnar, isJunior ],
          //     [ Cygnar, isBattleEngine ],
          //   ],
          //   allowed: [
          //     // Thunderhead
          //     541,
          //     // Archduke Alain Runewood
          //     582,
          //     // Squires
          //     567,
  
          //     572, 573, // Precursors
          //     700, 701, 
              
          //     6094, 6095, // Long Gunners
  
          //     4024, 519, 240, // Partisan mercs
          //   ],
          //   tb: ["Solos and Mechanik units gain Reposition [3\"].",
          //   ExtraDeployment],
          //       rewards: [ // What you get
          //         isCommandAttachment,
          //         [ Cygnar, isSolo, sizeOrSmaller(Medium) ],
          //       ],
          //       required: [ // What you need to buy to get it
          //         isWarnoun,
          //         isBattleEngine,
          //       ],
          //       pc: 0,
          //       pcqty: 30
          // },


          86 : {
            id: 86,
            fid: Const.Khador,
            obv: true,
            n: "Jaws of the Wolf",
            mercInclusion: true,
            allowFuncs: [
              standardAllowed(Const.Khador),
              "Kossite",
              "Kayazy",
              "Widowmaker",
              [ Const.Khador, isJunior ]
            ],
            allowed: [
              418, // Behemoth
              473, // Black Ivan
              445, 476, // Battle Mechaniks
              6397, // Greylord Adjunct
              6066, // Grelord Forge Seer
              452, // War Dog
              468, 6591, // Yuri
              459, // Manhunter
	      6581, // Malvin & Mayhem
            ],
            rewards: [
              704, // Kayazy Eliminators
              [ Const.Khador, isCommandAttachment ],
              [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Khador, 5)],
            ],
            tb: [
              "Place a 5\" forest completely within 18\" of your table edge.",
              "Khador Warjacks gain Pathfinder."
            ]
          },

          87 : {
            id: 87,
            fid: Const.Ret,
            obv: true,
            n: "Defenders of Ios",
            mercInclusion: true,
            allowFuncs: [
              standardAllowed(Const.Ret),
              "Houseguard",
              "Nyss",
              "Ellowuyr",
              [ Const.Ret, isSolo, "Arcanist" ],
              [ Const.Ret, isSolo, "Fane Knight" ],
              [ Const.Ret, isSolo, "Ghost" ],
              [ Const.Ret, isBattleEngine ],
              190, // Soulless Escorts
	      3027, // Elara 1
            ],
            allowed: [
              242,  // Hypnos
              3136, // Vyre Electromancers
              4012, // Lys Healer
              526,  // Sylys
	      6581, // Malvin & Mayhem
            ],
            rewards: [
              [ Const.Ret, "Weapon Crew" ],
              [ Const.Ret, isCommandAttachment ],
              222, // Ghost Sniper
              4012, // Lys Healer
              [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Ret, 5)],
	      2067, // Houseguard Thane
            ],
            rewardMultiplier: [
              1,
              1,
              2,
              2,
              1,
	      2
            ],
            tb: [
              "Retribution Solos, Vyre Electromancers, and Stormfall Archers gain Reposition [3\"].",
              "Place a wall within 20\" of your table edge."
            ]
          },


          88 : {
            id: 88,
            fid: Const.Ret,
            obv: true,
            n: "Legions of Dawn",
            adr: [10],
            mercInclusion: true,
            allowMakepart: true,
            allowFuncs: [
              standardAllowed(Const.Ret),
              "Dawnguard",
            ],
            allowed: [
              6069, // Hemera
              3025, // Imperatus
              192,  // Arcanist Mechaniks
              6076, // Fane Knight Guardian
              222,  // Ghost Sniper
              268,  // HS Artificer
              4012, // Lys Healer
              3137, // Soulless Voidtracer
              190, // Soulless Escorts
	      6581, // Malvin & Mayhem
            ],
            rewards: [
              [ Const.Ret, isCommandAttachment ],
              222, // Ghost Sniper
              4012, // Lys Healer
              [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Ret, 5)],
            ],
            rewardMultiplier: [
              1,
              2,
              2,
              1
            ],
            tb: [
              "Warjacks ignore friendly Dawnguard models for LOS and movement.",
              "Marshaled Warjacks gain Flank [Dawnguard]."
            ]
          },

          89 : {
            id: 89,
            fid: Const.Menoth,
            obv: true,
            n: "The Faithful Masses",
            mercInclusion: true,
            allowFuncs: [
              standardAllowed(Const.Menoth),
              "Deliverer",
              "Idrian",
              "Paladin",
              "Reclaimer",
              "Vassal",
              "Zealot",
              [ Const.Menoth, isStructure ]
            ],
            allowed: [
              126,  // Avatar of Menoth
              164,  // Choir
              181,  // Allegiant
              196,  // Covenant
              186,  // Hierophant
              3030, // Tristan
              6477, // Menite Archon
              195,  // Wrack
	      6581, // Malvin & Mayhem
            ],
            rewards: [
              [ Const.Menoth, isCommandAttachment ],
              188, // Reclaimer Gatekeeper
              [ Const.Menoth, "Vassal", isSolo ],
              [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Menoth, 5)],
              195,
              160, // Deliverer Sunburst
            ],
            rewardMultiplier: [
              1,
              2,
              2,
              1,
              3,
              1
            ],
            tb: [
              "Protectorate heavy Warjacks and Colossals gain Hand of Vengeance."
            ]
          },

          90 : {
            id: 90,
            fid: Const.Menoth,
            obv: true,
            n: "The Creator's Might",
            adr: [10],
            mercInclusion: true,
            allowMakepart: true,
            allowFuncs: [
              standardAllowed(Const.Menoth),
              "Vassal",
              [ Const.Menoth, isJunior ],
              [ Const.Menoth, isStructure ],
              [ Const.Menoth, isBattleEngine ]
            ],
            allowed: [
              126,  // Avatar of Menoth
              164,  // Choir
              196,  // Covenant
              186,  // Hierophant
              6477, // Menite Archon
              195,  // Wrack
              105,  // Blessing of Vengeance
              201,  // Scourge of Heresy
              180,  // Rhoven & Co
              6311, // Warder 
              6202, // Gade
	      6581, // Malvin & Mayhem
            ],
            rewards: [
              [ Const.Menoth, "Vassal", isSolo ],
              [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Menoth, 5)],
              195
            ],
            rewardMultiplier: [
              2,
              1,
              3
            ],
            tb: [
              "Protectorate Solos and Choir of Menoth gain Reposition [3\"].",
              "Friendly models/units can begin the game with upkeeps."
            ]
          },

          91: {
            id: 91,
            fid: Const.Menoth,
            obv: true,
            n: "Exemplar Interdiction",
            adr: [10],
            mercInclusion: true,
            allowFuncs: [
              standardAllowed(Const.Menoth),
              "Exemplar",
              "Reclaimer",
              "Scrutator",
              "Vassal",
            ],
            allowed: [
              164,  // Choir
              186,  // Hierophant
              195,  // Wrack
              127, // Fire of Salvation
	      6581, // Malvin & Mayhem
            ],
            rewards: [
              [ Const.Menoth, isCommandAttachment ],
              [ Const.Menoth, "Vassal", isSolo ],
              [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Menoth, 5)],
              195
            ],
            rewardMultiplier: [
              1,
              2,
              1,
              3
            ],
            tb: [
              "The melee weapons of Protectorate Warjacks gain Blessed.",
              "Exemplar models in this army gain Aegis."
            ]
          },

          92: {
            id: 92,
            obv: true,
            fid: Const.Skorne,
            n: "Disciples of Agony",
            mercInclusion: false,
            allowFuncs: [
              standardAllowed(Const.Skorne),
              [ Const.Minions, isUnitOrAttachment ],
              [ Const.Minions, isSolo ],
              [ Const.Mercs, isUnitOrAttachment ],
              [ Const.Mercs, isSolo ],
              [ Const.Skorne, isJunior ],
              "Mortitheurge",
              "Nihilator",
              "Paingiver",
	      6582, // Malvin & Mayhem
            ],
            allowed: [
  
              // DoA warbeasts
              6142, 6143, 6144, 6145, 6146, 6147,
              6148, 6149, 6150, 6151, 6152, 6153,
              6194, 6195, 6196, 6197,
  
              6192, // Void leech
              6067, // Chiron
              420, // Orin
              375, // Marketh

              646, // Turtle

              6555, // Terrorizer
            ],
            tb: [
              "Paingiver models gain Sacrificial Pawn [Minion warrior].",
              "One Paingiver Bloodrunner unit gains Ambush."
            ],
            rewards: [ // What you get
                356, // Agonizer
                373, // Task Master
                [ Skorne, isSolo, sizeOrSmaller(Const.Medium), costAtMost(5) ],
                [ Skorne, isCommandAttachment ],
            ],
            rewardMultiplier: [
              1,
              2,
              1,
              1,
            ]
          },

          93 : {
            id: 93,
            obv: true,
            fid: Const.Trolls,
            n: "Kriel Company",
            mercInclusion: true,
            allowFuncs: [
              standardAllowed(Const.Trolls),
              "Pyg"
            ],
            allowed: [
              3070, // Dozer & Smig

            // Trollkin models/units with ranged weapons
            3091, 4002, 357, 347, 3092, 697, 651, 9,
            801, 412, 3166, // attachments
            3093, 368, // solos
            6139, // CID

            // Krielstone Bearer & Stone Scribes
            22, 23, // Kriestone bearer & Stone scribe units
            6134, // CID

            // Troll Whelp solos
            379, // Whelps

            // War Wagon
            6080, 644,

            // Hooch Hauler
            6138,

            // Runebearer
            653, 6159,

            6509, // Boomy 2
            6601, // Barrage Team
            6602, // Trollkin Gunnery Sergeant
            6611, // Madrak 0
            1, // Trollkin Skinner
	    6582, // Malvin & Mayhem
            ],
            tb: [
              "Solos in this army gain Mark Target.",
              RerollStarting
            ],
            rewards: [
              [ Const.Trolls, "Weapon Crew" ],
              [ Const.Trolls, isCommandAttachment ],
              379, // Whelps
              [ Const.Trolls, isSolo, sizeOrSmaller(Medium), costAtMost(5)]
            ],
	    rewardMultiplier: [1, 1, 5, 1],
          },

          94: {
            id: 94,
            obv: true,
            fid: Const.CG,
            n: "Magnum Opus",
            adr: [10],
            mercInclusion: true,
            allowMakepart: true,
            allowFuncs: [
              standardAllowed(Const.CG),
              [ Const.CG, isUnitOrAttachment ],
              [ Const.CG, isSolo ],
              [ "Gorman", isSolo ],
              [ Const.CG, isBattleEngine ]
            ],
            allowed: [
              3180, // Hutchuk
	      6581, // Malvin & Mayhem
            ],
            tb: [
              "Crucible Guard solos and weapon crews gain Reposition [3\"]",
              RerollStarting
            ],
            rewards: [
              [ Const.CG, "Weapon Crew" ],
              [ Const.CG, isCommandAttachment ],
              6292, // CG Mechanik
              6295, // Trancer
              [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.CG, 5)],
            ],
            rewardMultiplier: [
              1,
              1,
              3,
              2,
              1
            ]
          },


          95: {
            id: 95,
            obv: true,
            fid: Const.CG,
            n: "Prima Materia",
            adr: [10],
            mercInclusion: false,
            allowFuncs: [
              standardAllowed(Const.CG),
              [ Const.CG, isUnitOrAttachment, size(Medium) ],
              [ "Gorman", isSolo ],
              [ Const.CG, isBattleEngine ]
            ],
            allowed: [
              3180, // Hutchuk
              6296, // Alyce
              6278, // DBR
              6293, // Combat Alchemist
              6292, // Mechanik
              6295, // Trancer
              6605, // Ascendant Mentalist
              6280, // Prospero
              6604, // Death Archon
	      6607, // Containment Operatives
	      6581, // Malvin & Mayhem
            ],
            tb: [
              "Warjacks and Battle Engines gain Cutting Edge.",
              "Vanguard warjacks can use Shield Guard twice per turn."
            ],
            rewards: [

              6292, // CG Mechanik
              6295, // Trancer
              [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.CG, 5)],
            ],
            rewardMultiplier: [
              3,
              2,
              1
            ]
          },

          97: { 
            id: 97, obv: true, fid: Const.Circle,
            n: "The Wild Hunt",
            adr: [10],
            mercInclusion: true,
            allowFuncs: [
              standardAllowed(Const.Circle),
              "Wolf Sworn",
              [ isSolo, "Blackclad" ],
              [ Const.Circle, isStructure ],
              3095, // Brennos
              295, 313,  // Shifting Stones
              698,  // Gallows Grove
              297,  // LotF
              299,  // War Wolf
              6517, // Wolf With No Name
	      325, // Ghetorix
              6026, // Loki
	      6582, // Malvin & Mayhem
            ],
            tb: [
              "When living warbeasts are forced to use their animus, reduce the COST by 1.",
              "One Wolves of Orboros unit gains Ambush."
            ],
            rewards: [
              [ Const.Circle, isCommandAttachment ],
              698, // Gallows Grove
              299, // War Wolf
              [ factionSoloCostOrLess(Const.Circle, 5), sizeOrSmaller(Medium)]
            ],
            rewardMultiplier: [ 1, 3, 3, 1 ]
          },

          98 : {
            id: 98, obv: true, fid: Const.Infernals,
            n: "Dark Legacy",
            adr: [10],
            mercInclusion: true,
            allowFuncs: [
              standardAllowed(Const.Infernals),
              [ Const.Infernals, isUnitOrAttachment ],
              390, // Croe's Cutthroats
              [ Const.Infernals, isSolo ],
              6140, // Eilish
              6483, // Hermit 
              420, // Orin 
              239, //Saxon 
              [ Const.Infernals, isStructure ]
            ],
            rewards: [
              [ Const.Infernals, isCommandAttachment ],
              entryChoice(6465, 2),
              [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Infernals, 5)],
	      6460
            ],
            tb: [
              "Infernal solos gain Reposition [3\"].",
              "Horrors do not have to pay Tithe on the first turn.",
              "Up to one Cultist Band gains Ambush."
            ]
          },


          // Hearts of Darkness themes
          99 : HoDFaction(Const.Cygnar, 99),
          100 : HoDFaction(Const.Khador, 100),
          101 : HoDFaction(Const.CG, 101),
          102 : HoDFaction(Const.Menoth, 102),
          103 : HoDFaction(Const.Mercs, 103),
          104 : HoDFaction(Const.Cryx, 104),


          105 : {
            id: 105, obv: true, fid: Const.Menoth,
            n: "Warriors of the Old Faith",
            mercInclusion: false,
            allowed: [
              6018, 673, 3033, // cavalry warcasters
              6495, // Vlad 3

              6483, // hermit of henge hold
              164, // Choir of Menoth
              450, // Kossite Woodsmen
              459, // Manhunter Solos
              6477, // Menite Archons
              468, 6591, // Yuri the Axe
              452, // War Dog
              195, // Wrack
              189, 193, // Vassal Solos
              2069, 139, // Prot Cav units
              6171, 6308, 197,  // Prot Cav solos
              824, 431, // Khador Cav Units
              464, 461, 467, // Khador Cav Solos
              6177, 6250, 588, // Khador Cav Battle Engines

              //6492, 6493, // Free solos
            ],
            allowFuncs: [
              nonCharacterWarjack(Menoth),
              nonCharacterWarjack(Khador),
              [ "Paladin", nonCaster ]
            ],          
            rewards: [
              189,
              193,
              [isSolo, sizeOrSmaller(Medium), costOrLess(5)],
              195
            ],
            rewardMultiplier: [ 2, 2, 1, 3 ],
            tb: [
              "All models are Khadoran and Protectorate.",
              "Cavalry models gain Line Breaker.",
              RerollStarting,
            ]
          },


          106 : {
            id: 106, obv: true, fid: Const.Khador,
            n: "Warriors of the Old Faith",
            mercInclusion: false,
            allowed: [
              676, // Vlad 3
              6496, 6497, 6498, // Menoth cavalry casters

              6483, // hermit of henge hold
              164, // Choir of Menoth
              450, // Kossite Woodsmen
              459, // Manhunter Solos
              6477, // Menite Archons
              468, 6591, // Yuri the Axe
              452, // War Dog
              195, // Wrack
              189, 193, // Vassal Solos
              2069, 139, // Prot Cav units
              6171, 6308, 197,  // Prot Cav solos
              824, 431, // Khador Cav Units
              464, 461, 467, // Khador Cav Solos
              6177, 6250, 588, // Khador Cav Battle Engines

              //6492, 6493, // Free solos
            ],
            allowFuncs: [
              nonCharacterWarjack(Menoth),
              nonCharacterWarjack(Khador),
              [ "Paladin", nonCaster ]
            ],          
            rewards: [
              189,
              193,
              [isSolo, sizeOrSmaller(Medium), costOrLess(5)],
              195
            ],
            rewardMultiplier: [ 2, 2, 1, 3 ],
            tb: [
              "All models are Khadoran and Protectorate.",
              "Cavalry models gain Line Breaker.",
              RerollStarting,
            ]
          },

          // 107 : FitD Mercs

          107 : {
            id: 107, obv: true, fid: Const.Mercs,
            n: "Flame in the Darkness",
            mercInclusion: false,
            allowFuncs: [
              [ isCaster, Const.Mercs, "Morrowan" ],
              [ isCaster, Const.Mercs, "Thamarite" ],
              [ Const.Mercs, isWarjack, nonCharacter ],
              [ Const.Khador, isWarjack, nonCharacter ],
              [ Const.Cygnar, isWarjack, nonCharacter ],
              726, // Gallant
              "Alexia",
              "Morrowan",
              "Thamarite",
              562, // Field Mechanik
              6483, // Hermit
	      6581, // Malvin & Mayhem
            ],
            sharedFAPools: [2],
            sharedFAFunc: (e: Entry) => {
              if( e.t == Const.Warjack && 
                (e.fid == Const.Khador || e.fid == Const.Cygnar) 
                && e.fa != "C" ) 
              {
                return 0;
              }
              else {
                return -1;
              }
            },
            rewards: [
              isCommandAttachment,
              6486, // Thamarite Advocate
              [isSolo, sizeOrSmaller(Medium), costOrLess(5)],
            ],
            rewardMultiplier: [ 1, 2, 1 ],
            tb: [
              "All models are Mercenaries.",
              "Units gain Vengeance"
            ]
          },

          // 108 : FitD Cygnar

          108 : {
            id: 108, obv: true, fid: Const.Cygnar,
            n: "Flame in the Darkness",
            mercInclusion: false,
            allowFuncs: [
              [ isCaster, Const.Cygnar, "Morrowan" ],
              [ isCaster, Const.Cygnar, "Thamarite" ],
              [ Const.Mercs, isWarjack, nonCharacter ],
              [ Const.Khador, isWarjack, nonCharacter ],
              [ Const.Cygnar, isWarjack, nonCharacter ],
              726, // Gallant
              "Alexia",
              "Morrowan",
              [ "Thamarite", not(3122) ],
              562, // Field Mechanik
              6483, // Hermit
	      6581, // Malvin & Mayhem
            ],
            sharedFAPools: [2],
            sharedFAFunc: (e: Entry) => {
              if( e.t == Const.Warjack && 
                (e.fid == Const.Khador || e.fid == Const.Cygnar) 
                && e.fa != "C" ) 
              {
                return 0;
              }
              else {
                return -1;
              }
            },
            rewards: [
              isCommandAttachment,
              6486, // Thamarite Advocate
              [isSolo, sizeOrSmaller(Medium), costOrLess(5)],
            ],
            rewardMultiplier: [ 1, 2, 1 ],
            tb: [
              "All models are Cygnaran.",
              "Units gain Vengeance"
            ]
          },

          // 109 : FitD Khador

          109 : {
            id: 109, obv: true, fid: Const.Khador,
            n: "Flame in the Darkness",
            mercInclusion: false,
            allowFuncs: [
              [ isCaster, Const.Khador, "Morrowan" ],
              [ isCaster, Const.Khador, "Thamarite" ],
              [ Const.Mercs, isWarjack, nonCharacter ],
              [ Const.Khador, isWarjack, nonCharacter ],
              [ Const.Cygnar, isWarjack, nonCharacter ],
              6494, // Gallant
              "Alexia",
              "Morrowan",
              "Thamarite",
              562, // Field Mechanik
              6483, // Hermit
	      6581, // Malvin & Mayhem
            ],
            sharedFAPools: [2],
            sharedFAFunc: (e: Entry) => {
              if( e.t == Const.Warjack && 
                (e.fid == Const.Khador || e.fid == Const.Cygnar) 
                && e.fa != "C" ) 
              {
                return 0;
              }
              else {
                return -1;
              }
            },
            rewards: [
              isCommandAttachment,
              6486, // Thamarite Advocate
              [isSolo, sizeOrSmaller(Medium), costOrLess(5)],
            ],
            rewardMultiplier: [ 1, 2, 1 ],
            tb: [
              "All models are Khadoran.",
              "Units gain Vengeance"
            ]
          },
          
      

       110 : {
        id: 110, obv: true, fid: Const.Cygnar,
        n: "Gravediggers",
        adr: [10],
        mercInclusion: true,
        allowMakepart: true,
        allowFuncs: [
          standardAllowed(Const.Cygnar),
          6096, 574, // Triumph
          "Ranger",
          "Trencher",
          581, // Murdoch
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ "Trencher", "Weapon Crew" ],
          [ Const.Cygnar, isCommandAttachment ],
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Cygnar, 5)],
        ],
        tb: [
          "Trencher warriors gain Rise.",
          RerollStarting
        ]
      },

      111 : {
        id: 111, obv: true, fid: Const.Cygnar,
        n: "Heavy Metal",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Cygnar),
          540, // Rowdy
          532, // thorn
          541, // Thunderhead
          [ Const.Cygnar, "Mechanik" ],
          "Sword Knight",
          6094, 6095, // Long gunners
          6470, 6471, 572, 573, 700, 701, // PK
          [ Const.Cygnar, isJunior ],
          [ isSolo, isPartisan(Const.Cygnar) ],
          582, // Runewood 1
          567, // Squire 
          [ Const.Cygnar, isBattleEngine ],
          6581, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Cygnar, isCommandAttachment ],
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Cygnar, 5)],
        ],
        tb: [
          "Cygnar solos and Mechanik units gain Reposition [3\"].",
          RepairPlusOne
        ]
      },

      112: {
        id: 112, obv: true, fid: Const.Cygnar,
        n: "Sons of the Tempest",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Cygnar),
          3139, // Ace 
          "Arcane Tempest",
          [ Const.Cygnar, "Mechanik"],
          566, // Journeyman Warcaster 
          567, // Squire
          556, // Rangers
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Cygnar, isCommandAttachment ],
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Cygnar, 5)],
        ],
        tb: [
          "Arcane Tempest Gun Mage units and the Black 13th gain Pistoleer.",
          "Warcasters can upkeep spells on Arcane Tempest models/units for free."
        ]
      },

      113 : {
        id: 113, obv: true, fid: Const.Cygnar,
        n: "Storm Division",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Cygnar),
          6029, // Brickhouse 
          3119, // Dynamo
          541, // Thunderhead
          "Mechanik",
          "Storm Knight",
          "Stormsmith",
          566, // Junior
          3031, // Jakes 1
          3157, // Savio 
          567, // Squire
          6520, // Nemo 4
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ "Stormsmith", "Weapon Crew" ],
          [ Const.Cygnar, isCommandAttachment ],
          564, // Stormcallers
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Cygnar, 5)],
        ],
        tb: [
          "Cygnar models gain Immunity: Electricity.",
          "Storm Knight models gain Unyielding."
        ]
      },

      114 : {
        id: 114, obv: true, fid: Const.Menoth,
        n: "Guardians of the Temple",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Menoth),
          206, // Blood of Martyrs 
          6019, // Eye of Truth 
          3127, // Hand of Judgment
          "Flameguard",
          164, // Choir 
          [ "Reclaimer", isSolo ],
          [ "Vassal", isSolo ],
          195, // Wrack
          [ Const.Menoth, isStructure ],
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Menoth, isCommandAttachment ],
          188, // Reclaimer Gatekeeper
          [ "Vassal", isSolo ],
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Menoth, 5)],
          195,
        ],
        rewardMultiplier: [1, 2, 2, 1, 3],
        tb: [
          "While B2B with another model in their unit, Flameguard gain Tough and Steady.",
          "Up to one Daughters of the Flame unit gains Ambush."
        ]
      },

      115 : {
        id: 115, obv: true, fid: Const.Khador,
        n: "Armored Korps",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Khador),
          "Man-O-War",
          445, 476, // Battle Mechaniks
          6397, // Greylord Adjunct 
          452, // War Dog
          418, // Behemoth
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Khador, isCommandAttachment ],
          [ "Tanker", isSolo ],
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Khador, 5)],
        ],
        tb: [
          RepairPlusOne,
          "Man-O-War units and Tanker solos gain Advance Move."
        ]
      },

      116 : {
        id: 116, obv: true, fid: Const.Khador,
        n: "Legions of Steel",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Khador),
          "Iron Fang",
          445, 476, // Battle Mechaniks
          6397, // Greylord Adjunct 
          452, // War Dog
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Khador, isCommandAttachment ],
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Khador, 5)],
        ],
        tb: [
          "The Great Bears and Iron Fang solos gain Countercharge.",
          RerollStarting
        ]
      },

      117 : {
        id: 117, obv: true, fid: Const.Khador,
        n: "Winter Guard Kommand",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Khador),
          417, // Beast 09
          471, // Torch
          445, 476, // Battle Mechaniks
          "Assault Kommando",
          "Winter Guard",
          "Widowmaker",
          6397, // Greylord Adjunct 
          452, // War Dog
          3029, // Malakov 1
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ "Winter Guard", "Weapon Crew" ],
          4028, // WG Artillery Kapitan
          [ Const.Khador, isCommandAttachment ],
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Khador, 5)],
        ],
        rewardMultiplier: [1, 2, 1, 1],
        tb: [
          "Warcasters gain Sacrificial Pawn [Winter Guard trooper model]."
        ]
      },

      118 : {
        id: 118, obv: true, fid: Const.Khador,
        n: "Wolves of Winter",
        adr: [10],
        mercInclusion: true,
        allowMakepart: true,
        allowFuncs: [
          standardAllowed(Const.Khador),
          419, // Drago 
          3121, // Ruin 
          "Doom Reaver",
          "Greylord",
          445, 476, // Battle Mechaniks
          6507, // Void Archon
          452, // War Dog
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          448, // Ternion
          [ Const.Khador, isCommandAttachment ],
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Khador, 5)],
        ],
        tb: [
          "At the start of your Control Phase, one non-warlock Doom Reaver or Greylord unit gains Apparition.",
        ]
      },


      119 : {
        id: 119, obv: true, fid: Const.Cryx,
        n: "Black Industries",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Cryx),
          [ Const.Cryx, isWarjack, isCharacter ],
          "Cephalyx",
          "Iron Lich",
          "Thrall",
          "Warwitch",
          6209, // Black Ogrun Iron Monger
          147, // Darragh 
          [ "Necrotech", isSolo ],
          [ Const.Cryx, isJunior ],
          [ isSolo, "Wraith", (e : Entry) : boolean => { return e.id != 6216; } ],
          642, // Wraith Engine
          6547, // Gurgleplox,
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          99, // Necrosurgeon 
          [ Const.Cryx, isCommandAttachment ],
          entryChoice(102, 2), // Brute Thralls
          134, // Necrotech
          [ sizeOrSmaller(Medium), not(6547), factionSoloCostOrLess(Const.Cryx, 5)]
        ],
        rewardMultiplier: [1, 1, 1, 3, 1],
        tb: [
          "Heavy warjacks gain Carapace.",
          "One Mechanithrall unit gains Ambush."
        ]
      },

      120: {
        id: 120, obv: true, fid: Const.Cryx,
        n: "Dark Host",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Cryx),
          "Bane",
          147, // Darragh 
          131, // Machine Wraith
          [ "Necrotech", isSolo ],
          135, // Scrap Thrall 
          143, // Skarlock Thrall
          3134, // Soul Trapper 
          6479, // Void Archon
          642, // Wraith Engine
          93, // Deathjack
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Cryx, isCommandAttachment ],
          131, // Machine Wraith
          134, // Necrotech
          [ sizeOrSmaller(Medium), not(6547), factionSoloCostOrLess(Const.Cryx, 5) ]
        ],
        rewardMultiplier: [1, 3, 3, 1],
        tb: [
          "Bane models gain Prowl.",
          "Place two 4\" AOE dense fog terrain features completely within 20\" of your board edge."
        ]
      },

      121: {
        id: 121, obv: true, fid: Const.Cryx,
        n: "The Ghost Fleet",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Cryx),
          3133, // Barathrum 
          "Revenant",
          "Wraith",
          6209, // Black Ogrun Iron Monger
          6215, // Misery Cage
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ "Revenant", "Weapon Crew" ],
          entryChoice(176, 2), // RevCrew rifles
          131, // Machine Wraith
          6215, // Misery Cage
          [ factionSoloCostOrLess(Const.Cryx, 5), sizeOrSmaller(Medium), not(6547) ]
        ],
        rewardMultiplier: [1, 1, 3, 3, 1],
        tb: [
          "Add 1 to Deathbound rolls.",
          RerollStarting
        ]
      },

      122 : {
        id: 122, obv: true, fid: Const.Cryx,
        n: "Scourge of the Broken Coast",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Cryx),
          3133, // Barathrum
          6061, // Kharybdis
          [ Const.Cryx, isLiving ],
          3122, // DSM
          6215, // Misery Cage
	  6604, // Death Archon
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          6213, // Dirge Seer
          [ Const.Cryx, isCommandAttachment ],
          6215, // Misery Cage
          [factionSoloCostOrLess(Const.Cryx, 5), sizeOrSmaller(Medium), not(6547) ]
        ],
        rewardMultiplier: [1, 1, 3, 1],
        tb: [
          "Cryx warjacks gain Gang Fighter.",
          "Up to one Satyxis Blood Witch unit gains Ambush."
        ]
      },

      123 : {
        id: 123, obv: true, fid: Const.Ret,
        n: "Forges of War",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Ret),
          224, // Discordia 
          [ "Shyeel", isSolo ],
          [ "Shyeel", isUnitOrAttachment ],
          [ "Shyeel", isBattleEngine ],
          192, // Arcanist Mechanik 
          6076, // Fane Knight Guardian 
          526, // Sylys 
          [ Const.Ret, isJunior ],
          6345, // Trident,
          190, // Soulless Escorts
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          6073,// Shyeel Arcanist
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Ret, 5)],
        ],
        tb: [
          "Retribution warjacks gain Shield Guard."
        ]
      },

      124 : {
        id: 124, obv: true, fid: Const.Ret,
        n: "Shadows of the Retribution",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Ret),
          3120, // Moros 
          "Mage Hunter",
          192, // Arcanist Mechanik 
          6511, // Eiryss 4
          6076, // Fane Knight Guardian 
          4012, // Lys Healer
          6479, // Void Archon
          190, // Soulless Escorts
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Ret, isCommandAttachment ],
          4012, // Lys Healer
          3137, // Soulles Voidtracer
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.Ret, 5)],
        ],
        rewardMultiplier: [1, 2, 3, 1],
        tb: [
          "Models disabled by a Retribution warrior's melee attack cannot make a Tough roll.  You may choose to RFP.",
          RerollStarting
        ]
      },

      125 : {
        id: 125, obv: true, fid: Const.CoC,
        n: "Clockwork Legions",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.CoC),
          [ Const.CoC, "Priest" ],
          // Solos with Soul Vessel
          2042, 2043, 2044, 6535,
          6389, // Frustum
          6420, // JAIMS
          [ Const.CoC, isUnitOrAttachment ],
          6479, // Void Archon
          6532, // D3k
          6526, // Gaspy 4
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.CoC, isWarjack, costAtMost(5) ],
          [ Const.CoC, isCommandAttachment ],
          2044, // Enigma Foundry
          6389, // Frustum
          [sizeOrSmaller(Medium), factionSoloCostOrLess(Const.CoC, 5)],
        ],
        tb: [
          "Field Allowance of Enigma Foundries is 4.",
          "Eradicator, Perforatoe, and Reciprocators gain Vengeance."
        ],
        fam: { 2044: 4 },
      },

      126 : {
        id: 126, obv: true, fid: Const.CoC,
        n: "Destruction Initiative",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.CoC),
          [ Const.CoC, "Priest" ],
          [ "Servitor", isSolo ],
          [ Const.CoC, isBattleEngine ],
          6532, // Destructotron 3000
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          2039, // Optifex Directive
          2042, // Algorithmic 
          [ "Servitor", isSolo ],
          6532,
        ],
        rewardMultiplier: [1, 3, 1, 1],
        tb: [
          "Servitor solos gain Shield Guard."
        ]
      },

      127 : {
        id: 127, obv: true, fid: Const.Mercs,
        n: "Hammer Strike",
        adr: [10],
        mercInclusion: false,
        allowFuncs: [
          "Rhulic",
          654, // Brun
          6597, // Gudrun 2
          163, // Gudrun 1
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ "Rhulic", "Weapon Crew" ],
          822, // Tac arc corps
          [ Const.Mercs, isCommandAttachment ],
          [ factionSoloCostOrLess(Const.Mercs, 5), sizeOrSmaller(Medium), not(isJunior) ]
        ],
        tb: [
          "Weapon Crews and heavy warjacks gain Reposition [3\"].",
          "Warrior models gain Tough.",
          ExtraDeployment
        ]
      },

      128 : {
        id: 128, obv: true, fid: Const.Mercs,
        n: "The Irregulars",
        mercInclusion: false,
        allowFuncs: [
          mercsStandardAllowed,
          [ Const.Mercs, isUnitOrAttachment, isCharacter ],
          [ Const.Minions, isUnitOrAttachment, isCharacter ],
          199, 200, // Idrians
          702, 703, 704, // Kayazy
          700, 701, // PKs
          [ Const.Mercs, isSolo, isCharacter ],
          [ Const.Minions, isSolo, isCharacter ],
          2048, // Tinker
          [ Const.Mercs, isBattleEngine ],
          6491, // Morrowan Battle Priests
	  6583, // Boomhowler 3 cause the character doesn't catch it?
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Mercs, isCommandAttachment ],
          [ Const.Mercs, isSolo, sizeOrSmaller(Medium), costAtMost(5) ],
          [ Const.Minions, isCommandAttachment ],
          [ Const.Minions, isSolo, sizeOrSmaller(Medium), not(isJunior), costAtMost(5) ]
        ],
        tb: [
          "Ace is a friendly Mercenary model",
          "While marshaled, warjacks gain Flank [friendly warrior].",
          RerollStarting
        ]
      },

      129 : {
        id: 129, obv: true, fid: Const.Mercs,
        n: "The Kingmaker's Army",
        mercInclusion: false,
        allowFuncs: [
          [ Mercs, isWarjack, nonCharacter, not("Rhulic") ],
          themeUnique(8),
          "Steelhead",
          443, // Bart
          521, // Damiano
          308, // MacBain
          280, 304, // Magnus
          390, // Croe's
          401, // Boomhowler
          6509, // Boomhowler 2
          6583, // Boomhowler 3
          484, // Dirty Meg
          407, // Kell
          517, // Madelyn
          420, // Orin
          2053, // Raluk
          455, 456, 335, 457, 336, 337, 523, 323, 334, // Raluk jacks
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ isCommandAttachment ],
          6410, // Steelhead gunner
          [ Const.Mercs, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [ 1, 2, 1 ],
        tb: [
          "Long Gunner, Ranger, and Trencher Infantry units are friendly Mercenaries.",
          "Warrior models gain Feign Death.",
          "Boomhowler & Co gain Ambush."
        ]
      },


      130: {
        id: 130,
        fid: Const.Mercs,
        obv: true,
        mercInclusion: false,
        n: "Llaelese Resistance",
        adr: [8, 9],
        allowed: [
          // Caine's Hellslingers
          6025,

          // Drake MacBain
          308,

          // Reinholdt
          403,

          // Sylys
          526,

          // Captain Sam MacHorne & the Devil Dogs
          388, 6550, 

          // Colbie Sterling, Captain of the BRI
          6030,

          // Gobber Tinker solos
          2048,

          // Harlan Vesh
          519,

          // Madelyn Corbeau
          517,

          // Rhupert Carvolo
          421,

          // Rutger Shaw
          423,

          // Dannon Blythe & Bull
          518,

          // Ellish
          6140,

          6477, // Menite Archon
          6476, // Morrowan Archon
          6478, // Thamarite Archon
	  6581, // Malvin & Mayhem
        ],
        allowFuncs: [
            [ Mercs, nonCharacterWarnoun, not("Cephalyx") ],
            [ Mercs, "Llaelese"]
          ],
        sharedFAPools : [2],
        sharedFAFunc: (e : Entry) => {
          if( (e.fid == Cygnar || e.fid == Menoth || e.fid == CG ) &&
              isUnit(e) ) {
            return 0;
          }
          else {
            return -1;
          }
        },
        animosityFunc: (a : Entry, b : Entry) => {
            return (a.fid != b.fid)
              && (a.fid == Cygnar || a.fid == Menoth  || a.fid == CG )
              && (b.fid == Cygnar || b.fid == Menoth || b.fid == CG );
        },
      rewards: [
          [ Const.Mercs, isSolo, sizeOrSmaller(Medium), costAtMost(5)],
          isCommandAttachment
      ],
        tb: [
          "Ace is a friendly Mercenary.",
          "Gun Mage models gain Sniper.",
          "Llaelese models gain Pathfinder.",
        "You get a drop pod.  Too complex to fit on one line."],
      },

      131 : {
        id: 131, obv: true, fid: Const.Mercs,
        n: "Operating Theater",
        mercInclusion: false,
        allowFuncs: [
          "Cephalyx",
          [ Const.Mercs, isUnit ],
          6479, // Void Archon
          124, 3187, // Bloat Thrall
          131, // Machine Wraith
          138, // Pistol Wraith
          6524, // Gaspy4
          6491, // Battle Priest
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          3058, // Agitator
          [ isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [2, 1],
        tb: [
          "Monstrosities gain Hyper-Aggressive.",
          "Drudge models gain Rise.",
          "One Cephalyx Mind Slaver & Drudge unit gains Ambush."
        ]
      },


      132 : {
        id: 132, obv: true, fid: Const.Mercs,
        n: "Soldiers of Fortune",
        adr: [10],
        mercInclusion: false,
        allowFuncs: [
          mercsStandardAllowed,
          522, // Rocinante
          "Alexia",
          "Steelhead",
          518, // Blythe & Bull
          513, // Herne & Jonne
          158, // Alten Ashley
          404, // Anastasia
          6509, // Boomhowler, Solo Artist
          6510, // Dez 
	  6596, // Dez & Gubbin
          215, // Eiryss 1
          [ isSolo, "Gorman" ],
          514, // Ogrun Bokur
          421, // Rhupert 
          423, // Rutger Shaw 
          239, // Saxon
          441, // Taryn 
          517, 403, 526, // Mercs with Attached
	  6604, // Death Archon
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          [ "Steelhead", "Weapon Crew" ],
          6410, // Steelhead Gunner
          [ Const.Mercs, isSolo, sizeOrSmaller(Medium), costAtMost(5) ],
          [ Const.Minions, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [ 1, 2, 1, 1 ],
        tb: [
          "Ace is a friendly Mercenary.",
          "Solos gain Mark Target."
        ]
      },

      133 : {
        id: 133, obv: true, fid: Const.Mercs,
        n: "Talion Charter",
        adr: [10],
        mercInclusion: false,
        allowFuncs: [
          [ "Privateer", isCaster ],
          [ not("Rhulic"), nonCharacterWarjack(Const.Mercs) ],
          6429, // Scallywag 
          "Privateer",
          "Scharde",
          3138, // River raiders
	  6604, // Death Archon
	  6581, // Malvin & Mayhem
        ],
        rewards: [
          6213, // Dirge Seer
          478, // Sea Dog Deck Gun
          isCommandAttachment,
          6427, // Powder Monkey
          [ "Privateer", isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [ 1, 2, 1, 3, 1],
        tb: [
          "Solos gain Sacrifical Pawn [Sea Dog model].",
          "Place 2 AOE 3\" bombardment hazards (see rules)."
        ]
      },

      134 : {
        id: 134, obv: true, fid: Const.Trolls,
        n: "Band of Heroes",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Trolls),
          "Champion",
          "Fell Caller",
          "Fennblade",
          "Kriel Warrior",
          "Long Rider",
          "Warders",
          374, // Stone Scribe
          653, // Runebearer
          1, // Skinner
          651, // Trollkin Scouts
          379, // Whelps
          22, 23, 6134, // Krielstone
          801, // Sorc
          652, // Skaldi
          3041, // Horgle Ironstrike
          6583, // Boomy 3
          6611, // Madrak 0
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Trolls, isCommandAttachment ],
          379, // Whelps
          [ Const.Trolls, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
	rewardMultiplier: [1, 5, 1],
        tb: [
          "Models disabled by a Trollblood warrior cannot Tough; you may RFP.",
          "Reduce COST of Animi by 1."
        ]
      },

      135 : {
        id: 135, obv: true, fid: Const.Trolls,
        n: "Power of Dhunia",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Trolls),
          6, // Mulg
          399, 4001, 3165, 353, 801, 23, 653, 22, // Trollkin models/units with the magic ability special rule
          "Stone Scribe",
          23, 6134, // Krielstone attachments
          6481, // Dhunian Archon
          379, // Whelps
          [ Const.Trolls, isJunior ],
          801,  // Sorc
          6597, // Gudrun the Wasted
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          3165, // Dhunian Knot
          379, // Whelps
          [ Const.Trolls, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
	rewardMultiplier: [1, 5, 1],
        fau: [353],
        tb: [
          "Runeshapers are FA: U.",
          "Dhunian Knots gain Serenity.",
          StartingUpkeeps
        ]
      },

      136 : {
        id: 136, obv: true, fid: Const.Trolls,
        n: "Storm of the North",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Trolls),
          408, // Rok
          "Champion",
          "Long Rider",
          "Northkin",
          22, 23, 6134, // Krielstone
          [ isUnitOrAttachment, "Kriel Warrior" ],
          368, // Fell Caller Hero
          653, // Runebearer
          379, // Whelps
          801, // Sorc
          6583, // Boomy 3
          6611, // Madrak 0
          1, // Trollkin Skinner
          651, // Trollkin Scouts
	  6582, // Malvin & Mayhem
        ],

        rewards: [
          [ Const.Trolls, isCommandAttachment ],
          379, // Whelps
          [ Const.Trolls, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
	rewardMultiplier: [1, 5, 1],
        tb: [
          "Non-warlock Trollblood warriors become Northkin and gain Immunity: Cold.",
          "Warlocks can upkeep spells on Northkin for free.",
          "Place two 4\" AOE Snowdrifts completely within 20\" of your board edge."
        ]
      },

      137 : {
        id: 137, obv: true, fid: Const.Circle,
        n: "Bones of Orboros",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          [ Const.Circle, isCaster ],
          [ Const.Circle, isWarbeast, nonCharacter, isConstruct ],
          273, // Megalith 
          [ Const.Circle, isUnitOrAttachment, "Stone"],
          293, // Stoneward & Stalkers 
          [ Const.Circle, "Blackclad", isSolo ],
          698, // Gallows Grove 
          589, // Fulcrum 
          [ Const.Circle, isStructure ],
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          295, // Shifting Stones
          294, // Sentry Stone
          4021, // Stoneshapers
          698, // Groves
          [ Const.Circle, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [ 2, 1, 2, 3, 1],
        tb: [
          "Before leeching remove 1 damage point from each Circle warbeast.",
          StartingUpkeeps,
        ]
      },

      138 : {
        id: 138, obv: true, fid: Const.Circle,
        n: "The Devourer's Host",
        mercInclusion: true,
        allowFuncs: [
          [ Const.Circle, isCaster ],
          [ Const.Circle, isWarbeast, nonCharacter, isLiving ],
          325, // Ghetorix
          6026, // Loki
          "Tharn",
          3096, // Death Wolves
          295, 313, // Shifting Stones
          698, // Groves
          297, // LotF
          6480, // Primal Archon 
          [ Const.Circle, isStructure ],
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Circle, isCommandAttachment ],
          698, // Groves
          [ Const.Circle, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [1, 3, 1],
        tb: [
          "Each model that can gain corpse tokens begins the game with one.",
          "One Tharn Bloodweaver unit gains Ambush."
        ]
      },

      139 : {
        id: 139, obv: true, fid: Const.Circle,
        n: "Secret Masters",
        mercInclusion: false,
        allowFuncs: [
          [ Const.Circle, isCaster, "Blackclad" ],
          310, // Wurmwood
          [ Const.Circle, isWarbeast, nonCharacter ],
          3095, // Brennos
          "Blackclad",
          295, 313, // Shifting Stones
          698, // Groves
          [ Const.Circle, isStructure ],
          [ Const.Minions, isUnitOrAttachment],
          [ Const.Minions, isSolo ],
          [ Const.Minions, isBattleEngine ],
          [ Const.Mercs, isSolo ],
	  [ Const.Mercs, isUnitOrAttachment],
	  [ Const.Mercs, isBattleEngine ],
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Circle, isCommandAttachment ],
          4021, // Stoneshaper
          698, // Groves
          [ isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [ 1, 2, 3, 1 ],
        tb: [
          "Blackclad warriors gain Sacrificial Pawn [Minion warrior model]."
        ]
      },

      140 : {
        id: 140, obv: true, fid: Const.Skorne,
        n: "The Exalted",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Skorne),
          812, // Despoiler
          "Exalted",
          "Extoller",
          333, // PGBH
          6479, // Void Archon 
          361, // Void Spirit
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Skorne, isCommandAttachment ],
          6382, // Novitiate
          359, // Soulward
          6383, // Vessel
          [ Const.Skorne, isSolo, sizeOrSmaller(Medium), costAtMost(5)]
        ],
        rewardMultiplier: [1, 3, 2, 2, 1],
        tb: [
          "Construct models gain Immovable Object.",
          "Models with Soul Taker begin the game with one soul token."
        ]
      },

      141 : {
        id: 141, obv: true, fid: Const.Skorne,
        n: "Masters of War",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Skorne),
          324, // Molik Karn
          383, // Tiberion
          "Cataphract",
          "Praetorian",
          333, // PGBH
          349, // TyCom
          358, // Ancestral Guardian 
          369, // Hakaar
          [ "Extoller", isSolo ],
          784, // Willbreaker
          6356, // Supreme Guardian
          6614, // Makeda 0
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          349, // TyCom
          [ Const.Skorne, isCommandAttachment ],
          6382, // Novitiate
          359, // Soulward
          [ Const.Skorne, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [1, 1, 3, 2, 1],
        tb: [
          "Models disabled by a Skorne warrior's melee attack may not Tough and you may RFP."
        ]
      },

      142 : {
        id: 142, obv: true, fid: Const.Skorne,
        n: "Winds of Death",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Skorne),
          "Venator",
          333, // PGBH
          [ "Extoller", isSolo ],
          784, // Willbreaker
          [ Const.Skorne, isBattleEngine ],
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          [ "Venator", "Weapon Crew"],
          [ Const.Skorne, isCommandAttachment ],
          359, // Soulward
          [ Const.Skorne, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [1, 1, 2, 1],
        tb: [
          "Weapon crews gain Reposition [3\"].",
          "Place a wall completely within 20\" of your table edge."
        ]
      },

      143 : {
        id: 143, obv: true, fid: Const.Legion,
        n: "Children of the Dragon",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Legion),
          6028, // Azrael
          600, // Typhon
          3101, // Zuriel
          "Blighted Nyss",
          "Virtue",
          6565, // Blight Archon
          [ "Forsaken", isSolo ],
          614, // Incubi
          774, // Spell Martyr
          637, // Throne of Everblight
          [ "Succubus", isSolo ],
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          [ "Blighted Nyss", "Weapon Crew" ],
          [ Const.Legion, isCommandAttachment ],
          614, // Incubi
          [ Const.Legion, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        tb: [
          "Nephilim warbeasts gain Unyielding",
          "Warlocks gain Tactician [Blighted Nyss]."
        ]
      },

      144 : {
        id: 144, obv: true, fid: Const.Legion,
        n: "Oracles of Annihilation",
        adr: [10],
        mercInclusion: false,
        allowFuncs: [
          standardAllowed(Const.Legion),
          635, // Proteus
          // Models/units with Magic ability
          630, 622, 618, 613, 637, 623, 633, 6082, 6166, 
          608, // Spawning Vessel
          809, // Beast Mistress
          615, // Blighted Nyss Shepherds 
          614, // Incubi
          774, // Spell Martyrs
          6568, // Ysylla
          "Virtue",
          6565, // Blight Archon
          6613, // Thagrosh 0
          [ Const.Minions, isUnitOrAttachment ],
          [ Const.Minions, isSolo ],
          [ Const.Mercs, isSolo ],
          [ Const.Mercs, isUnitOrAttachment ],
          [ Const.Minions, isBattleEngine ],
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Legion, isCommandAttachment ],
          618, // Sorc & Hellion
          614, // Incubi
          [ Const.Legion, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        tb: [
          "Minions gain Blighted keyword and can be reaplced with an Incubus when destroyed.",
          "When an enemy model ends activation within 2\" of a Blighted model, it suffers continuous Corrosion.",
          StartingUpkeeps,
        ]
      },

      145: {
        id: 145, obv: true, fid: Const.Legion,
        n: "Primal Terrors",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Legion),
          6244, // Golab
          "Blighted Ogrun",
          6240, // Rotwings
          4009, // Hellmouth 
          [ "Forsaken", isSolo ],
          774, // Spell Martyr
          6565, // Blight Archon
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          [ Const.Legion, isCommandAttachment ],
          [ Const.Legion, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        tb: [
          "Blighted Ogrun Warmonger and Warspear units gain Vengeance."
        ]
      },

      146: {
        id: 146, obv: true, fid: Const.Legion,
        n: "Ravens of War",
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Legion),
          6244, // Golab
          "Grotesque",
          "Raptor",
          "Strider",
          6240, // Rotwings
          4009, // Hellmouth
          618, // Sorc & Hellion
          6565, // Blight Archon
          [ "Forsaken", isSolo ],
          774, // Spell Martyr
          [ "Succubus", isSolo ],
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          121, // Harrier
          [ Const.Legion, isCommandAttachment ],
          618, // Sorc & Hellion
          [ Const.Legion, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [2, 1, 1, 1],
        tb: [
          "Lesser warbeasts gain Mark Target.",
          RerollStarting
        ]
      },

      147 : {
        id: 147, obv: true, fid: Const.Grymkin,
        n: "Bump in the Night",
        adr: [10],
        mercInclusion: true,
        mercExclude: [3154],
        allowFuncs: [
          standardAllowed(Const.Grymkin),
          [ Const.Grymkin, isUnitOrAttachment ],
          6418, // Tonguelick 
          6045, // Cask Imp 
          6046, // Glimmer Imp
          6419, // Grave Ghoul
          6050, // Trapperkin 
          6548, // Weird Wendell
          6051, // Witchwood 
          6052, // Death Knell
          6049, // Lord Longfellow
          6561, // Four Horseymans
	  6621, // Defiled Archon
	  6622, // Isaiah, the Dread Harvester
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          6417, // Malady Man
          [ Const.Grymkin, isCommandAttachment ],
          6050, // Trapperkin
          6051, // Witchwood
          [ Const.Grymkin, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [1, 1, 2, 1, 1],
        tb: [
          "Grymkin warriors gain Rise",
          RerollStarting
        ]
      },

      148 : {
        id: 148, obv: true, fid: Const.Grymkin,
        n: "Dark Menagerie",
        adr: [10],
        mercInclusion: true,
        allowFuncs: [
          standardAllowed(Const.Grymkin),
          6037, // Dread Rot
          6417, // Malady Man
          6042, // Twilight Sisters
          6418, // Tonguelick
          6046, // Glimmer Imp
          3154, // Gremlin Swarm 
          6048, // Karianna Rose 
          6548, // Weird Wendell 
          6052, // Death Knell
	        6621, // Defiled Archon
	        6622, // Isaiah, the Dread Harvester
          6051, // Witchwood
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          6033, // Crabbit, two of the motherfuckers this time
          3154, // Gremlin Swarm
          6051, // Witchwood
          [ Const.Grymkin, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [2, 2, 1, 1],
        fam : { 3154 : 4 },
        tb: [
          "Gremlin Swarms are FA: 4.",
          "Gremlin Swarms gain Serenity.",
          "Each non-trooper that can gain corpse tokens begins the game with one."
        ]
      },


      149 : {
        id: 149, obv: true, fid: Const.Minions,
        n: "The Blindwater Congregation",
        adr: [10],
        mercInclusion: false,
        allowFuncs: [
          [ "Gatorman", isCaster ],
          778, // Rask
          [ Minions, isWarnoun, isAmphibious, nonCharacter ],
          [ Minions, isAmphibious, not(isWarnoun) ],
          "Gobber",
          // Feralgeist solos
          156,

          // Raluk Moorclaw
          2053,

          // Totem hunter
          244,

          // Viktor Pendrake
          240,

          // Wrong Eye
          647,

          // Sacral Vault
          3067,

          // Dahlia
          649,

          6193, // Bone Shrine
          6191, // Spirit Cauldron
          6192, // Void Leech

          455, 456, 335, 457, 336, 337, 523, 323, 334, // Raluk jacks

          3179, // Lynus & Edrea

          6480, // Primal Archon

          6615, // Barnabas 0
		
	  6604, // Death Archon
          6582, // Malvin & Mayhem

        ],
        rewards: [
          234, // Bull snapper
          6191, // Spirit Cauldron
          156, // Feralgeist
          6186, // Gatorman Husk
          [ Const.Minions, isSolo, sizeOrSmaller(Medium), costAtMost(5) ],
	  [ Const.Mercs, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [ 1, 1, 3, 2, 1, 1],
        tb: [
          "Gatorman Posse become FA: U and gain Snacking.",
        ],
        fau: [80],
      },


      150 : {
        id: 150, obv: true, fid: Const.Minions,
        n: "The Thornfall Alliance",
        adr: [10],
        mercInclusion: false,
        allowFuncs: [
          [ Minions, isCaster, "Farrow" ],
          [ isWarnoun, "Farrow", nonCharacter ],
          [ "Farrow", not(isWarnoun) ],
          455, 456, 335, 457, 336, 337, 523, 323, 334, // Raluk jacks
          4040, // Arkadis's Gorax
          64, // Arkadius
          158, // Alten Ashley
          163, 6597, // Gudrun
          3180, // Hutchuk
          2053, // Raluk
          239, // Saxon
          3183, // Swamp Gobber Chef
          240, // Viktor Pendrake
          3103, // Efaarit Scouts
          654, // Brun
          241, // Lanyssa
          2053, // Raluk
          455, 456, 335, 457, 336, 337, 523, 323, 334, // Raluk jacks
          3179, // Lynus & Edrea
          655, // Boneswarm for Midas
          6481, // Dhunian Archon
          6552, // Scythe
          6560, // Wastelander
          6582, // Malvin & Mayhem
        ],
        rewards: [
          [ "Farrow", "Weapon Crew" ],
          [ Const.Minions, isCommandAttachment ],
          3103, // Efaarit
          [ Const.Minions, isSolo, sizeOrSmaller(Medium), costAtMost(5) ],
          6151, // Battle Boar
	  [ Const.Mercs, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        tb: [
          "Farrow warbeasts gain Salvage.",
          "Farrow warriors gain Rise."
        ]
      },

      151 : {
        id: 151, obv: true, fid: Const.Minions,
        n: "Will Work For Food",
        adr: [10],
        mercInclusion: false,
        allowFuncs: [
          standardAllowed(Const.Minions),
          [ Const.Minions, isSolo ],
          [ Const.Mercs, isSolo ],
          [ Const.Minions, isBattleEngine ],
          [ Const.Mercs, isUnitOrAttachment, isCharacter ],
          [ Const.Minions, isUnitOrAttachment, isCharacter ],
          54, // Farrow Bone Grinders
          154, // Swamp Gobber Bellows Crew
          6172, // Farrow Valkyries
          6191, // Boil Master & Spirit Cauldron units
	  6583, // Boomhowler 3
          6582, // Malvin & Mayhem

        ],
        rewards: [
          3103, // Efaarit
          156, // Feralgeist
          [ Const.Minions, isSolo, sizeOrSmaller(Medium), costAtMost(5) ],
          [ Const.Mercs, isSolo, sizeOrSmaller(Medium), costAtMost(5) ]
        ],
        rewardMultiplier: [1, 3, 1, 1],
        tb: [
          "Warbeasts gain Overtake.",
          "Lesser warlocks can upkeep spells for free."
        ]
      },


      152 : {
        id: 152, obv: true, fid: Const.CoC,
        n: "Strange Bedfellows",
        mercInclusion: false,
        allowFuncs: [
          6541, 6542, // Mortenebra
          2000, 6533, // Aurora
          nonCharacterWarjack(Const.Cryx),
          nonCharacterWarjack(Const.CoC),
          [ nonCharacterWarjack(Const.Mercs), not("Rhulic")],
          [ Const.CoC, "Angel" ],
          2039, // Optifex Directive
          2040, // Transverse Enumerators
          [ Const.Cryx, "Thrall" ],
          [ Const.Cygnar, "Stormsmith", isSolo, isUnitOrAttachment ],
          (e : Entry) => e.fid == Const.Mercs && e.wf && e.wf.indexOf(Const.CoC) != -1,
          [ Const.CoC, isSolo ],
          [ Const.CoC, isBattleEngine ],
        ],
        rewards: [
          (e : Entry) => isWarjack(e) && e.C[0] <= 5,
          [isSolo, sizeOrSmaller(Medium), costOrLess(5)], 
        ],
        tb: [
          "All models are Convergence and Mercenary models.",
          "Non-Servitor solos gain Swift Vengeance.",
          "When a model is Repaired, remove 1 additional damage box."
        ]
      },

      153 : {
        id: 153, obv: true, fid: Const.Mercs,
        n: "Strange Bedfellows",
        mercInclusion: false,
        allowFuncs: [
          6539, 6540, // Mortenebra
          6543, 6534, // Aurora
          6524, 6520, // Gaspy 4 and Nemo 4
          nonCharacterWarjack(Const.Cryx),
          nonCharacterWarjack(Const.CoC),
          [ nonCharacterWarjack(Const.Mercs), not("Rhulic")],
          [ Const.CoC, "Angel" ],
          2039, // Optifex Directive
          2040, // Transverse Enumerators
          [ Const.Cryx, "Thrall" ],
          [ Const.Cygnar, "Stormsmith", isSolo, isUnitOrAttachment ],
          (e : Entry) => e.fid == Const.Mercs && e.wf && e.wf.indexOf(Const.CoC) != -1,
          [ Const.CoC, isSolo ],
          [ Const.CoC, isBattleEngine ]
        ],
        rewards: [
          (e : Entry) => isWarjack(e) && e.C[0] <= 5,
          [isSolo, sizeOrSmaller(Medium), costOrLess(5)],
        ],
        tb: [
          "All models are Convergence and Mercenary models.",
          "Non-Servitor solos gain Swift Vengeance.",
          "When a model is Repaired, remove 1 additional damage box."
        ]
      },

      154 : {
        id: 154, obv: true, fid: Const.Trolls,
        n: "Vengeance of Dhunia",
        mercInclusion: false,
        allowFuncs: [
          standardAllowed(Const.Trolls),
          6569, // Carver
          6576, 6577,// Helga
          6579, // Lord Azazello
          357, 412, // Scattergunners
          [ Const.Trolls, "Barrage"],
          [ Const.Trolls, "Slugger" ],
          [ Const.Trolls, "Champion" ],
          [ "Dhunian" ],
          22, 23, 6134, // KSB & attachments
          [ "Pyg" ],
          [ Const.Trolls, "Weapon Crew" ],
          // Farrow units/solos with ranged weapons
          6172, 48, 3159, 4007, 237, 6603,
          [ Const.Minions, "Ogrun" ],
          [ Const.Minions, "Gobber" ],
          [ Const.Minions, "Trollkin" ],
          644, // War Wagon
          3068, // Meat Thresher

          6583, // Boomy 3
          6596, // Dez & Gubbin
          3138, // Swamp Gobber
		
	  801, // Trollkin Sorcerer
	  374, // Stone Scribe Chronicler
	  6597, // Gudrun the Wasted
	  427, // Rorsh & Brine

          // Farrow warbeasts
          6570, 6571, 6572, 6573, 6574, 6575,
	  6582, // Malvin & Mayhem
        ],
        rewards: [
          [ isCommandAttachment ],
          3165, // Dhunian Knot
          6546,
          [ isSolo, sizeOrSmaller(Medium), costOrLess(5) ],
        ],
        tb: [
          "All models are Trollblood and Minion models.",
          "Place two Trenches at start of game.",
          "Warlock modles gain Attuned Spirit [Trollblood]."
        ]
      },

      155 : {
        id: 155, obv: true, fid: Const.Minions,
        n: "Vengeance of Dhunia",
        mercInclusion: false,
        allowFuncs: [
          standardAllowed(Const.Trolls),
          6569, // Carver
          6576, 6577,// Helga
          6579, // Lord Azazello
          357, 412, // Scattergunners
          [ Const.Trolls, "Barrage"],
          [ Const.Trolls, "Slugger" ],
          [ Const.Trolls, "Champion" ],
          [ "Dhunian" ],
          22, 23, 6134, // KSB & attachments
          [ "Pyg" ],
          [ Const.Trolls, "Weapon Crew" ],
          // Farrow units/solos with ranged weapons
          6172, 48, 3159, 4007, 237, 6603,
          [ Const.Minions, "Ogrun" ],
          [ Const.Minions, "Gobber" ],
          [ Const.Minions, "Trollkin" ],
          644, // War Wagon
          3068, // Meat Thresher

          6583, // Boomy 3
          6596, // Dez & Gubbin
          3138, // Swamp Gobber

          // Farrow warbeasts
          6570, 6571, 6572, 6573, 6574, 6575,
        ],
        rewards: [
          [ isCommandAttachment ],
          [ "Dhunian" ],
          6545,
          6546,
          [ isSolo, sizeOrSmaller(Medium), not(isJunior) ]
        ],
        tb: [
          "All models are Trollblood and Minion models.",
          "Place two Trenches at start of game.",
          "Warlock modles gain Attuned Spirit [Trollblood]."
        ]
      },


    };

          /*
           : {
            id: , obv: true, fid: Const.,
            n: "",
            mercInclusion: true,
            allowFuncs: [
              standardAllowed(Const.),
            ],
            rewards: [
              [ Const., isCommandAttachment ],
              [ Const., isSolo, sizeOrSmaller(Medium) ]
            ],
            rewardMultiplier: []
            tb: [
            ]
          },
        */



    return ob;
}

