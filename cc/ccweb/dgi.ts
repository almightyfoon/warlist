import * as ccapi from "../ccapi/ccapi";
import * as ccweb from "./ccweb";

export function buildTournamentInterface(content : HTMLDivElement) : void {
    //content.appendChild(ccweb.displayList('c5201b_-0z0G0w0w3y3y3W3LdPdP4kf23u35363u35363uhT'));
    ccweb.attachStyles();
    ccapi.loadData(null);

    ccweb.ajax("https://conflictchamber.com/modelurls.json", (s : string) => {
        ccapi.Data.modelUrls = JSON.parse(s);
    });

    let search : HTMLDivElement = document.createElement("div");
    search.className = "conflictchamber searchbar";

    for( let i : number = 1; i <= 15; i++ ) {

        if( i == 13 ) {
            // Objectives
            continue;
        }

        // let fbut : HTMLDivElement[] = buildFactionHeader(i);

        // for( let header of fbut ) {
        //     search.appendChild(header);
        // }

        search.appendChild(buildFactionHeader(i).container);
    }

    content.appendChild(search);

    let bigDisplay : HTMLDivElement = document.createElement("div");
    bigDisplay.className = "conflictchamber dgiresults";

    content.appendChild(bigDisplay);

    ccweb.ajax("https://api.conflictchamber.com/events", (s : string) => {
        gotEvents(s, bigDisplay);
    });
}

function dadd(div : HTMLDivElement, text : string, className? : string)
			: HTMLDivElement  {
	let newdiv : HTMLDivElement = document.createElement("div");
	newdiv.appendChild(document.createTextNode(text));
	if( className ) {
		newdiv.className = className;
	}
	div.appendChild(newdiv);

	return newdiv;
}


let _events : Event[] = [];

function gotEvents(s : string, content : HTMLDivElement) : void {

    let events : any = JSON.parse(s);

    let v : any[] = [];

    for( let ev of events ) {
        if( ev.dgi != 1 ) {
            continue;
        }

        ev.dn = Date.parse(ev.date) || Date.parse("January 1, 1970");
        v.push(ev);
    }

    v.sort((a : any, b : any) => { 
        return b.dn - a.dn;        
    });


    for( let i in v ) {
        let ev : any = v[i];
        let e : Event = buildEventHeader(ev, parseInt(i) < 4);

        content.appendChild(e.card.container);

        _events.push(e);
    }
}

interface Player {
    //outer: HTMLDivElement;
    //header: HTMLDivElement;
    header: ccweb.Subheader;
    //toggle: () => void;
    faction: number;
    casters: number[];
};

interface Event {
    card: ccweb.Card;
    //outer: HTMLDivElement;
    //header: ccweb.Card;
    //holder: HTMLDivElement;
    //icon: HTMLDivElement;
    players : Player[];
    initialized: boolean;
    completed: boolean;
    //toggle: () => void;
    uid: number;
};

function buildEventHeader(ev : any, opened : boolean) : Event {
    let e : Event = {
        players: [],
        card: null,
        initialized: false,
        completed: false,
        uid: ev.uid
    };
    

    let clickFunc = (function() {
        let myEvent = e;

        return function(card : ccweb.Card) {

            if( !card.content.hasChildNodes() ) {
                initializeEvent(myEvent);
            }

        };
    })();

    

    e.card = new ccweb.Card({
        title: ev.name,
        icon: "flag",
        subtitle: ev.date,
        expand: true,
        startClosed: true,
        onOpen: clickFunc,
        size: "full"
    });



    if( opened ) {
        //clickFunc(e.card);
        e.card.open();
    }

    return e;
}


function buildEventInner(s : string, e : Event) : void {
    let ev : any = JSON.parse(s);

    let players : any[] = ev.players;
    players.sort((a : any, b : any) => { 
        // let placediff : number = a.place - b.place;

        // if( placediff != 0 ) {
        //     return placediff;
        // }

        return a.place - b.place;
     });

    for( let player of players ) {
        let p : Player = buildPlayerHeader(player);

        if( p ) {
            e.card.content.appendChild(p.header.container);
            e.players.push(p);
        }
    }

    e.completed = true;
    scanEvent(e);
}

interface Caster {
    button: ccweb.Button;
    id: number;
};

interface Faction {
    fid: number;
    //icon: HTMLDivElement;
    //holder: HTMLDivElement;
    header: ccweb.Subheader;
    casters: Caster[];
};

let _factions : Faction[] = [];

function buildFactionHeader(fid : number) : ccweb.Subheader {

    let options : ccweb.subheaderOptions = {
        title: ccapi.Data._data.factions[fid].n,
        expand: true,
        startClosed: true
    }


    
    let f : Faction = {
        fid: fid,
        //icon: picon,
        //holder: pholder,
        header: null,
        casters: []
    };

    options.onClose = (sh : ccweb.Subheader) => {
        _playerRule = (p : Player) => {
            return true;
        };

        scanEvents();
    };
    
    options.onOpen = (sh : ccweb.Subheader) => {
        let myFaction : Faction = f;

        for( let faction of _factions ) {
            faction.header.close(true);
        }

        if( myFaction.header.isEmpty() ) {
            let casters : ccapi.Entry[] = [];

            for( let i in ccapi.Data.entries ) {
                let e : ccapi.Entry = ccapi.Data.entries[i];

                if( e.fid == myFaction.fid && ccapi.isCaster(e) 
                        && e.v && !e.pr && !e.fr ) {
                    casters.push(e);
                }
                
            }

            casters.sort((a : ccapi.Entry, b: ccapi.Entry) => {
                return a.v < b.v ? -1 : 1;
            });

            for( let e of casters ) {

                let casterClick = (button : ccweb.Button) => {
                    let myCaster = c;
                    let myFaction = f;

                    console.log("Caster clicked");

                    if( button.isSelected() ) {
                        button.select(false);

                        console.log("Reverting to faction");

                        _playerRule = (p : Player) => {
                            return p.faction == myFaction.fid;
                        }
                    }
                    else {
                        for( let caster of myFaction.casters ) {
                            caster.button.select(false);
                        }

                        console.log("Picking caster");

                        button.select(true);

                        _playerRule = (p : Player) => {
                            return p.casters && p.casters.indexOf(myCaster.id) != -1;
                        };
                    }

                    scanEvents();
                    

                };
                
                let casterButton = new ccweb.Button({
                    text: e.v,
                    size: "mediumfixed",
                    click: casterClick
                })

                myFaction.header.add(casterButton.container);
                let c : Caster = { button: casterButton, id: e.id };
                myFaction.casters.push(c);
            }
        }

        for( let c of myFaction.casters ) {
            c.button.select(false);
        }

        _playerRule = (p : Player) => {
            return p.faction == myFaction.fid;
        }

        scanEvents();

    };


    _factions.push(f);

    f.header = new ccweb.Subheader(options);
    return f.header;
   
}

function buildPlayerHeader(player : any) : Player {
    if( player.place == 0 || player.place == null ) {
        return null;
    }
    

    let alternate : boolean = false;


    let options : ccweb.subheaderOptions = {
        title: player.name,
        expand: true,
        startClosed: true
    };



    let p : Player = {
        header: null,
        faction: 0,
        casters: []
    }

    if( player.place >= 0 && player.place <= 6 ) {
        options.icon = ["reorder", "looks_one", "looks_two",
            "looks_3", "looks_4", "looks_5", "looks_6"][player.place];
    }
    else {
        options.icon = "reorder";
    }



    if( player.submission ) {
        let slist : string = player.submission;

        let fid = ccapi.decodeCharSingle(slist, 1);

        if( (fid & 16) == 16 && fid > 16 ) {
            fid -= 16;
        }

        p.casters = ccapi.getCasters(slist);

        p.faction = fid;
        options.subtitle = ccapi.Data._data.factions[fid].n;
   
        let openFunc = (function(myList : string) {

            return function(sh : ccweb.Subheader) {
                if( !sh.content.hasChildNodes() ) {
                    sh.content.appendChild(
                        ccweb.Editor.displayList(myList, null)
                    );
                }

            };
        })(slist);

        options.onOpen = openFunc;

    }


    p.header = new ccweb.Subheader(options);

    return p;
}

let _playerRule : (p : Player) => boolean = (p: Player) => {
    return true;  
};

function scanEvent(e : Event) : void {

    if( !e.initialized ) {
        e.card.hide();
        initializeEvent(e);
        return;
    }
    else if( !e.completed ) {
        return;
    }

    let display : boolean = false;

    for( let p of e.players ) {
        if( _playerRule(p) ) {
            display = true;
            //p.outer.style.display = "";
            p.header.show();
        }
        else {
            //p.outer.style.display = "none";
            p.header.hide();
        }
    }

    //e.outer.style.display = display ? "" : "none";
    if( display ) {
        e.card.show();
        e.card.open();
    }
    else {
        e.card.hide();
    }
}

function scanEvents() : void {
    for( let e of _events ) {
        scanEvent(e);
    }
}

function initializeEvent(e : Event) : void {
    if( e.initialized ) {
        return;
    }

    e.initialized = true;

    ccweb.ajax("https://api.conflictchamber.com/event/" + e.uid,
    (s : string) => {
        buildEventInner(s, e);
    } );

}