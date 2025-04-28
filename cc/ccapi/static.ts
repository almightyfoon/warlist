//namespace ccapi {

import { JSONData, Const } from "./defines";
import { Entry, isUnit } from "./entry";
import { themeStaticData } from "./themestatic";
import { entryStaticData } from "./entrystatic";

export function staticData(): JSONData {
  let ob: JSONData =
    {
      typenames: {
        1: "Solos",
        2: "Warlocks",
        3: "Warbeasts",
        4: "Units",
        5: "Attachments",
        6: "Warjacks",
        7: "Warcasters",
        8: "Battle Engines/Structures",
        9: "Monstrosities",
        10: "Steamroller Objectives",
        11: "Caster-Attached Solos",
        12: "Caster-Attached Units",
        13: "Battle Engines/Structures",
        14: "Horrors",
        15: "Infernal Masters",
      },
      typenameSingle: {
        1: "Solo",
        2: "Warlock",
        3: "Warbeast",
        4: "Unit",
        5: "Attachment",
        6: "Warjack",
        7: "Warcaster",
        8: "Battle Engine",
        9: "Monstrosity",
        13: "Structure",
        14: "Horror",
        15: "Master"
      },
      entries: entryStaticData(),

      factions: {
        1: {
          wmh: 1,
          n: "Cygnar"
        },
        2: {
          wmh: 1,
          n: "Protectorate of Menoth"
        },
        3: {
          wmh: 1,
          n: "Khador"
        },
        4: {
          wmh: 1,
          n: "Cryx"
        },
        5: {
          wmh: 1,
          n: "Retribution of Scyrah"
        },
        6: {
          wmh: 1,
          n: "Mercenaries"
        },
        7: {
          wmh: 2,
          n: "Trollbloods"
        },
        8: {
          wmh: 2,
          n: "Circle Orboros"
        },
        9: {
          wmh: 2,
          n: "Skorne"
        },
        10: {
          wmh: 2,
          n: "Legion of Everblight"
        },
        11: {
          wmh: 2,
          n: "Minions"
        },
        12: {
          wmh: 1,
          n: "Convergence of Cyriss"
        },
        13: {
          wmh: -1,
          n: "Objectives"
        },
        14: {
          wmh: 2,
          n: "Grymkin"
        },
        15: {
          wmh: 1,
          n: "Crucible Guard"
        },
        16: {
          wmh: 1,
          n: "Infernals",
        }
      },
      contracts: {
        7: {
          id: 7,
          fid: 6,
          forced: true,
          n: "Operating Theater",
          allowFuncs: [
            [ "Cephalyx" ],
            [ 6, isUnit ]
          ],
          adr: [8, 9],
          allowed: <number[]>[],
          tb: ["Monstrosities gain Hyper-Aggressive.",
          "One Cephalyx Mind-Slaver and Drudge unit gains Ambush."],
              rewards: [706],
              required: [
                162,
                705,
                3057,
                350, 388, 706, 390, 391, 518, 3122, 401, 504, 513,
                511, 510, 199, 702, 704, 481, 524, 479, 478, 458, 339,
                348, 822, 4034, 3059,

                124, 3187, 3058, 131, 138, // new solos
              ],
              pc: 0,
              pcqty: 30
        }


      },

      "themelists": themeStaticData(),
      sortorder : {
        1 : 1.7,
        2 : 0.5,
        3 : 1,
        4 : 4,
        5 : 0.7,
        6 : 1,
        7 : 0.5,
        8 : 8,
        9 : 2,
        10 : 10,
        11 : 1.5,
        12 : 1.5,
        13 : 8,
        14 : 1,
        15 : 0.5
      }

    };

  return ob;
}

//}
