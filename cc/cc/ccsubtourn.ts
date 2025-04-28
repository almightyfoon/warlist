import * as ccapi from "../ccapi/ccapi";
import * as ccweb from "../ccweb/ccweb";

import { hideAll, setMainFocus, manageHistory } from "./ccmain";
import { restGet, ajaxPost, getATCLists, getEvent } from "./ccstorage";
import { authAjax, requireLogin } from "./cclogin";
import { dumpList, api, buildEventHeader } from "./cctourn";

let _formControls : HTMLInputElement[] = [];

let _placeIndex : number = 1;

//let _atcEditor : ccweb.Editor = null;


let _teamData : any = null;


function clickSubmit() : void {
	if( ccweb.Editor.currentEditor ) return;

	let sub : any = {};

	if( !_formControls[0].value || _formControls[0].value == "" ) {
		alert("Please enter a name for the tournament.");
		return;
	}

	if( !_formControls[1].value || _formControls[1].value == "" ) {
		alert("Please enter a date for the tournament.");
		return;
	}

	sub["name"] = _formControls[0].value;
	sub["date"] = _formControls[1].value;

	sub["players"] = [];

	for( let i : number = 0; i < _playerEntries.length; i++ ) {
		if( !_playerEntries[i].live ) {
			continue;
		}

		let player : any = {};
		player["place"] = _playerEntries[i].placeInput.value;
		player["name"] = _playerEntries[i].nameInput.value;
		player["list"] = _playerEntries[i].getListCode();

		sub["players"].push(player);
	}

	//console.log(JSON.stringify(sub));

	authAjax(api("/dgisubmit"),
		"tourn=" + encodeURIComponent(JSON.stringify(sub)),
		() => { showTournaments(); });

	// ajaxPost("https://conflictchamber.com/st.php",
	// 	gotSubmitResult,
	// 	"tourn=" + encodeURIComponent(JSON.stringify(sub)));

	//alert("Thank you for submitting your results!");
	//showTournaments();
}


let _eventTested : boolean = false;

function clickTestEvent(tourn : HTMLDivElement) : void {
	while( tourn.hasChildNodes() ) {
		tourn.removeChild(tourn.lastChild);
	}

	tourn.className = "testlisting";

	let sub : any = getEventData();


	if( !sub ) {
		return;
	}

	sub["regtype"] = 3;
	

	buildEventHeader(tourn, sub, sub["rules"]);

	_eventTested = true;

}

function getEventData() : any {
	if( !_formControls[0].value || _formControls[0].value == "" ) {
		alert("Please enter a name for the tournament.");
		return null;
	}

	if( !_formControls[1].value || _formControls[1].value == "" ) {
		alert("Please enter a date for the tournament.");
		return null;
	}

	let sub : any = {};

	sub["name"] = _formControls[0].value;
	sub["date"] = _formControls[1].value;
	sub["url"] = _formControls[2].value;
	sub["venue_name"] = _formControls[3].value;
	sub["address"] = _formControls[4].value;
	sub["cover"] = _formControls[5].value;
	sub["inset"] = _formControls[6].value;
	sub["submission_deadline"] = _formControls[7].value;
	sub["team_size"] = _formControls[8].value;

	let dt : Date = new Date(_formControls[1].value);

	let rules : any = {
		listSize: parseInt(_formControls[9].value),
		forbidCID: true,
		ignorePreRelease: false,
		preReleaseDate: "" + dt.getFullYear()
						+ "-" + ("0" + (dt.getMonth() + 1) ).substr(-2)
						+ "-" + ("0" + (dt.getDate() + 1) ).substr(-2)
						+ "T12:00:00.000Z",
		enforce: true,
		listType:{
			steamroller: false,
			adr: _submitADR,
			champions: _submitChampions,
			season: _submitSeason,
			minLists: parseInt(_formControls[10].value),
			maxLists: parseInt(_formControls[11].value)
		}
	};

	sub["rules"] = rules;

	return sub;
}

function clickPostEvent() : void {
	if( ccweb.Editor.currentEditor ) return;

	let sub : any = getEventData();

	if( !sub ) {
		return;
	}

	if( !_eventTested ) {
		alert("You should probably test the event to make sure the header looks correct first.");
		_eventTested = true;
		return;
	}


	authAjax(api("/postevent"),
		"tourn=" + encodeURIComponent(JSON.stringify(sub)),
		(loggedIn : boolean, s : string) => { 
			window.location.href = "https://conflictchamber.com/?event=" 
				+ encodeURIComponent(s);
		});
}


function gotSubmitResult(text : string) {
	//console.log(text);
}





let _tournLoaded : boolean = false;

export function showTournaments(skipHistory? : boolean): void {
	hideAll();
	manageHistory("Tournaments", "tournaments", skipHistory);

	let dgitourn : HTMLElement = document.getElementById("dgitourn");

	if( dgitourn ) {
		dgitourn.style.display = "";
		setMainFocus(dgitourn);
	}
	else {
		// let iframe : HTMLIFrameElement = document.createElement("iframe");
		// iframe.src = "https://www.discountgamesinc.com/tournaments/";
		// iframe.id = "dgitourn";
		// document.body.appendChild(iframe);

		window.location.href = "https://www.discountgamesinc.com/tournaments/";
	}

	// let tourn : HTMLElement = document.getElementById("tournaments");

    // tourn.style.display = "";
	// tourn.focus();

	// setMainFocus(tourn);

    //let div : HTMLDivElement = ccweb.Editor.displayList("bi1b0y22221Ge41G1G2W2W2_gs3G3H3B__171U1U1U1U1U2424302W2W3z3z3t3tgs");

    //let tourn : HTMLElement = document.getElementById("tournaments");

    //tourn.insertBefore(div, document.getElementById("tournlast"));

	//window.history.replaceState({}, "Conflict Chamber", "#tournaments");
	//window.history.pushState({}, "Conflict Chamber - Tournaments", "?tournaments");



	// if( !_tournLoaded ) {
	// 	_tournLoaded = true;
    // 	ccweb.ajax("https://conflictchamber.com/t.php", gotTournamentList);
	// }

}



export function showDGIList(skipHistory : boolean) : void {
	hideAll();
	manageHistory("DGI Events", "dgilist", skipHistory);
	authAjax(api("/cansubmit"),
		null,
		(loggedIn : boolean, s : string) => { 
			listDGI(loggedIn, s);
		});
}

export function submitTournament(skipHistory : boolean, dgiMode : boolean): void {
	hideAll();
	manageHistory(
		dgiMode ? "Tournament Submission" : "Post Event", 
		dgiMode ? "submit" : "postevent", skipHistory);


		
	if( dgiMode ) {
		authAjax(api("/cansubmit"),
			null,
			(loggedIn : boolean, s : string) => { 
				submitAuthorized(s, dgiMode);
			});
	}
	else {
		requireLogin(() => {

			let flow = new ccweb.Flow("eventflow")

			setMainFocus(flow.container);

			//flow.loadingScreen("Loading event...");
		

			let tsub : HTMLDivElement = flow.content;

			// let initdiv : HTMLDivElement = document.createElement("div");
			// //initdiv.className = "subinit";

			// tsub.appendChild(initdiv);
					


			let postdv : HTMLDivElement = document.createElement("div");

			let instCard = new ccweb.Card({
				title: "Post New Event",
				icon: "assignment",
				size: "full"
			});

			instCard.add(`Hi, and welcome to the event posting interface.  To post an event you must 
			be logged in to Conflict Chamber - please use one of the login buttons 
			at the top of the screen to log in via a Google or Facebook account.`);

			flow.add(instCard);



			//postdv.className = "posteventinst";
			// postdv.innerHTML = `<div class="fakeh3">Post new event</div>
			// <div class="flowrawtext">Hi, and welcome to the event posting interface.  To post an event you must 
			// be logged in to Conflict Chamber &mdash; please use one of the login buttons 
			// at the top of the screen to log in via a Google or Facebook account.</div>`;

			// initdiv.appendChild(postdv);

			// flow.show();
			

		},
		() => {
			submitAuthorized("true", false);
		});
	}

}

let _dgiFlow : ccweb.Flow = null;

function listDGI(loggedIn : boolean, s) : void {

	_dgiFlow = new ccweb.Flow("eventflow");
	setMainFocus(_dgiFlow.content);

	console.log(s);

	// let tsub: HTMLDivElement = <HTMLDivElement>(document.getElementById("tournament_submission"));
	// setMainFocus(tsub);

	// while (tsub.hasChildNodes()) {
	// 	tsub.removeChild(tsub.lastChild);
	// }

	// let initdiv : HTMLDivElement = document.createElement("div");
	// initdiv.className = "subinit";

	if( s != "true") {
		let failCard = new ccweb.Card({
			title: "Unauthorized",
			size: "full",
			icon: "assignment_late"
		})

		failCard.add(
			`This account is not authorized for tournament submission; if you 
			are supposed to be authorized for this, make sure you're logged 
			in to Conflict Chamber (by one of the sign-in buttons at the 
			top of the page) with an account attached to an authorized 
			email account.  You may need to refresh the page.  Please note
			that Facebook authentication is often slow to update; for staff 
			logins, Google is the preferred method.`);

		_dgiFlow.add(failCard);
		_dgiFlow.show();

		return;
	}

    ccweb.ajax("https://api.conflictchamber.com/events", (s : string) => {
        gotDGIEvents(s);
    });
	

}

function gotDGIEvents(s : string) : void {
	// let tsub: HTMLDivElement = <HTMLDivElement>(document.getElementById("tournament_submission"));
	// setMainFocus(tsub);

	_dgiFlow.clear();

	let card = new ccweb.Card({
		title: "DGI Tournament Results",
		size: "full",
		icon: "assignment"
	});

	_dgiFlow.add(card);

    let events : any = JSON.parse(s);

    let v : any[] = [];

    for( let ev of events ) {
        if( ev.dgi != 1 ) {
            continue;
		}

		let link : HTMLAnchorElement = document.createElement("a");

		link.href = "https://conflictchamber.com/?event=" + ev.uid;
		link.target = "_blank";
		link.className = "dgieventlink";
		link.appendChild(document.createTextNode(ev.name));

		card.content.appendChild(link);
		card.content.appendChild(document.createElement("div"));
	}

	_dgiFlow.show();

}

let _submitSeason = 0;
let _submitADR = false;
let _submitChampions = false;

export function submitAuthorized(s : string, dgiMode : boolean, tsub? : HTMLDivElement) {
	let flow : ccweb.Flow = null;

	if( tsub == null ) {
		flow = new ccweb.Flow("eventflow");
		tsub = flow.content;
	}

	setMainFocus(tsub);

	while (tsub.hasChildNodes()) {
		tsub.removeChild(tsub.lastChild);
	}

	// let initdiv : HTMLDivElement = document.createElement("div");
	// initdiv.className = "subinit";

	if( s != "true") {
		let unathCard = new ccweb.Card({
			title: "Unauthorized Access",
			icon: "assignment_late",
			size: "full"
		});


		unathCard.add(`This account is not authorized for tournament submission; if you 
		are supposed to be authorized for this, make sure you're logged 
		in to Conflict Chamber (by one of the sign-in buttons at the 
		top of the page) with an account attached to an authorized 
		email account.  You may need to refresh the page.  Please note
		that Facebook authentication is often slow to update; for staff 
		logins, Google is the preferred method.`)

		tsub.appendChild(unathCard.container);
		tsub.style.display = "";

		if( flow ) {
			flow.show();
		}

		return;
	}


	let content : HTMLDivElement = null;


	if( dgiMode ) {
		// initdiv.appendChild(document.createTextNode(
		// 	`DGI tournament results list submission`));

		let dgiCard = new ccweb.Card({
			title: "DGI Tournament Results Submission",
			icon: "assignment",
			size: "full"
		});

		tsub.appendChild(dgiCard.container);

		content = dgiCard.content;
	}
	else {
		let postCard = new ccweb.Card({
			title: "Post an Event",
			icon: "assignment",
			size: "full",
			expand: true
		});

		tsub.appendChild(postCard.container);
		content = postCard.content;
		
		let postdv : HTMLDivElement = document.createElement("div");

		postdv.className = "posteventinst";
		postdv.innerHTML = 
		`Hi, and welcome to the event posting interface.  Please provide the information below about your event,
		and feel free to contact me at <a href="mailto:anon@conflictchamber.com">anon@conflictchamber.com</a> or
		via Conflict Chamber's <a href="https://www.facebook.com/conflictchamber/">Facebook page</a> 
		if you have any questions or requests.
		<br>
		Some things to note:
		<ul>
			<li>The submission deadline is <b>not</b> enforced by the system; you will need to 
				manually disable submissions once the time is passed &mdash; this is done 
				primarily because there is typically some delays at the end of the submission 
				period, and it's designed to be more forgiving rather than less.</li>
			<li>The address field can be a bit fiddly; make sure you enter a reasonable 
			venue name, and test it via clicking "Test Header" below to make sure the map
			shows up how you're expecting.</li>
			<li>In general, make sure to test the header before submitting to ensure that the 
			event page looks like what you're expecting.</li>
		</ul>
		<br>`;

		//initdiv.appendChild(postdv);

		postCard.add(postdv);

	}

	// let sepLine : HTMLDivElement = document.createElement("div");
	// sepLine.className = "formsepline";
	// content.appendChild(sepLine);

	let detailsCard = new ccweb.Card({
		title: "Event Details",
		icon: "assignment",
		size: "full"
	});

	tsub.appendChild(detailsCard.container);
	content = detailsCard.content;

	_formControls = [];

	content.appendChild(formText("Name", "Name of the event being posted"));
	content.appendChild(formText("Date", "Date of the event", null, "date"));

	_eventTested = false;


	if( dgiMode ) {
		let sepSpace : HTMLDivElement = document.createElement("div");
		sepSpace.className = "formsepspace";
		content.appendChild(sepSpace);

		let addPlayer: HTMLDivElement = document.createElement("div");
		content.appendChild(addPlayer);


		let addPlayerFunc : () => void = () => {
			addTournamentPlayer(content, addPlayer, true);
		}

		content.appendChild(new ccweb.Button({
			text: "Add Player",
			size: "largefixed",
			click: addPlayerFunc			
		}).container);

		_playerEntries = [];

		_placeIndex = 1;
		addPlayerFunc();
		addPlayerFunc();
		addPlayerFunc();


		// let trail : HTMLDivElement = document.createElement("div");
		// trail.className = "tourntrail";
		// content.appendChild(trail);
	}
	else {
		content.appendChild(formText("URL", "Link for more information about the event", null, "url"));
		content.appendChild(formText("Venue name", "Name of the place where the event is being held"));
		content.appendChild(formText("Address"));
		content.appendChild(formText("Cover URL", "Large image at the top of the page", null, "url"));
		content.appendChild(formText("Inset URL", "Inset image with link", null, "url"));

		let sepSpace : HTMLDivElement = document.createElement("div");
		sepSpace.className = "formsepspace";
		content.appendChild(sepSpace);
		
		content.appendChild(formText("Submission deadline", null, null, "date"));
		content.appendChild(formNumber("Team size", "Leave at 1 for solo event", 1));

		_submitSeason = 0;
		_submitADR = false;
		_submitChampions = false;

		content.appendChild(formLine("List Type",
			ccweb.FactionList.buildListTypeDrop((lt : ccapi.ListType) => {
				_submitSeason = lt.season;
				_submitADR = lt.adr;
				_submitChampions = lt.champions;
			}, true), "Standard, Masters, or Champions"));

		content.appendChild(formNumber("Point size", null, 75));
		content.appendChild(formNumber("Minimum lists", null, 1));
		content.appendChild(formNumber("Maximum lists", null, 2));

		let headerCard = new ccweb.Card({
			title: "Event Header Test",
			icon: "assignment",
			size: "full"
		});

		tsub.appendChild(headerCard.container);
		content = headerCard.content;

		let headerDiv : HTMLDivElement = document.createElement("div");

		headerDiv.appendChild(document.createTextNode(`
			Once you have set up the event details to your liking, click the "Test Event Header"
			button to check what the event header will look like on the event page.  Pay 
			attention to the venue name and address fields; if they aren't configured 
			correctly you either won't see a map on the event header or see a map of Earth.
		`));
		content.appendChild(headerDiv);


		content.appendChild(new ccweb.Button({
			text: "Test Event Header",
			size: "largefixed",
			click: () => { clickTestEvent(headerDiv); }
		}).container);
	}


	let submit = new ccweb.Button({
		text: "Submit",
		size: "largefixed",
		click: dgiMode ? clickSubmit : clickPostEvent
	});

	tsub.appendChild(submit.container);


	if( flow ) {
		flow.show();
	}
}






export function gotTournamentList(text : string) {
    let tourn : HTMLElement = document.getElementById("tournaments");



	let initdiv : HTMLDivElement = document.createElement("div");
	initdiv.className = "subinit";
	initdiv.innerHTML =
		`Conflict Chamber's tournament list is provided by our users;
		please submit any tournament result -- large or small -- to
		improve our collection of results.  Major tournaments are marked
		with a <span>\ue894</span> symbol.`;
	tourn.appendChild(initdiv);



	let subbut : HTMLDivElement = document.createElement("div");
	subbut.appendChild(document.createTextNode("Submit Tournament"));
	subbut.id = "submit_tournament";
	subbut.className = "lb bh";
	//subbut.onclick = () => { submitTournament(); };
	tourn.appendChild(subbut);




	let sepLine : HTMLDivElement = document.createElement("div");
	sepLine.className = "formsepline";
	tourn.appendChild(sepLine);


    //tourn.insertBefore(document.createTextNode(text), document.getElementById("tournlast"));

	let data : any = JSON.parse(text);

	let dadd = (div : HTMLDivElement, text : string) : HTMLDivElement => {
		let newdiv : HTMLDivElement = document.createElement("div");
		newdiv.appendChild(document.createTextNode(text));
		div.appendChild(newdiv);

		return newdiv;
	};

	for( let i : number = 0; i < data.length; i++ ) {
		let td : any = JSON.parse(data[i]['jsondata']);

		let theader : HTMLDivElement = document.createElement("div");
		theader.className = "theader db bh";

		let venuename : string = "";
		let city : string = "";
		let datestr : string = "";

		if( td['venuefull'] ) {
			if( td['venuefull']['name']) {
				venuename = td['venuefull']['name'];
			}

			if( td['venuefull']['location']) {
				if( td['venuefull']['location']['city']) {
					city += td['venuefull']['location']['city'];
				}

				if( td['venuefull']['location']['state']) {
					if( city != "" ) {
						city += ", ";
					}

					city += td['venuefull']['location']['state'];
				}
				else if( td['venuefull']['location']['country'] ) {
					if( city != "" ) {
						city += ", ";
					}

					city += td['venuefull']['location']['country'];
				}
			}
		}

		if( city == "" && data[i]['city']) {
			city = data[i]['city'];
		}

		if( td['date']) {
			let d : Date = new Date(td['date']);
			datestr = d.toLocaleDateString("en-us", {
				year : "numeric",
				month: "long",
				day: "numeric"
			});
		}

		//console.log(td);


		let important : boolean = false;

		if( data[i]['approved'] && parseInt(data[i]['approved']) > 1) {
			important = true;
		}



		let hicon : HTMLDivElement = dadd(theader, "\u25b7");
		dadd(theader, td['name']);
		dadd(theader, venuename);
		dadd(theader, city);
		dadd(theader, datestr);


		tourn.appendChild(theader);

		let tholder : HTMLDivElement = document.createElement("div");
		tholder.style.display = "none";

		theader.onclick = (function() {
			let myHolder : HTMLDivElement = tholder;
			let myIcon : HTMLDivElement = hicon;

			return function() {
				if( myHolder.style.display == "none" ) {
					myHolder.style.display = "";
					myIcon.textContent = "\u25bd";
				}
				else {
					myHolder.style.display = "none";
					myIcon.textContent = "\u25b7";
				}

			};
		})();

		tourn.appendChild(tholder);

		if( important ) {
			tholder.style.display = "";
			hicon.textContent = "\u25bd";
			dadd(theader, "");
		}



		if( td['players'] ) {
			for( let j : number = 0; j < td['players'].length; j++ ) {
				let pheader : HTMLDivElement = document.createElement("div");

				let picon : HTMLDivElement = dadd(pheader, "");

				let place : string = "";
				let faction : string = "";


				if( td['players'][j]['place'] ) {
					let pnum : number = parseInt(td['players'][j]['place']);

					if( pnum == 11 || pnum == 12 || pnum == 13 ) {
						place = pnum + "th";
					}
					else if( pnum % 10 == 1 ) {
						place = pnum + "st";
					}
					else if( pnum % 10 == 2 ) {
						place = pnum + "nd";
					}
					else if( pnum % 10 == 3 ) {
						place = pnum + "rd";
					}
					else {
						place = pnum + "th";
					}
				}


				dadd(pheader, place);

				dadd(pheader, td['players'][j]['name']);

				tholder.appendChild(pheader);

				if( td['players'][j]['list']) {
					let slist : string = td['players'][j]['list'];

					let fid = ccapi.decodeCharSingle(slist, 1);

					if( (fid & 16) == 16 ) {
						fid -= 16;
					}

					faction = ccapi.Data._data.factions[fid].n;

					let div : HTMLDivElement = ccweb.Editor.displayList(slist);
					//tourn.insertBefore(div, document.getElementById("tournlast"));
					div.style.display = "none";
					div.className += " plist";
					tholder.appendChild(div);
					picon.textContent = "\u25b7";

					pheader.onclick = (function() {
						let myDiv : HTMLDivElement = div;
						let myIcon : HTMLDivElement = picon;

						return function() {
							if( myDiv.style.display == "none" ) {
								myDiv.style.display = "";
								myIcon.textContent = "\u25bd";
							}
							else {
								myDiv.style.display = "none";
								myIcon.textContent = "\u25b7";
							}

						};
					})();

					pheader.className = "pheader lb bh";
				}
				else {
					pheader.className = "pheader lb";
				}

				dadd(pheader, faction);

			}
		}
	}


}

function formLine(title: string, control: HTMLElement, hint?: string) {
	let ret: HTMLDivElement = document.createElement("div");

	ret.className = "formTH";

	let div1: HTMLDivElement = document.createElement("div");
	div1.appendChild(document.createTextNode(title));

	ret.appendChild(div1);


	ret.appendChild(control);

	if (hint) {
		let div3: HTMLDivElement = document.createElement("div");
		div3.appendChild(document.createTextNode(hint));

		ret.appendChild(div3);
	}

	return ret;

}



function formText(title: string, hint?: string, defaultValue?: string,
		inputType?: string)
		: HTMLDivElement {
	let inp: HTMLInputElement = document.createElement("input");
	inp.className = "formtextinput";

	if( inputType ) {
		inp.type = inputType;
	}
	else {
		inp.type = "text";
	}

	if( defaultValue ) {
		inp.value = defaultValue;
	}

	_formControls.push(inp);

	return formLine(title, inp, hint);
}

function formNumber(title: string, hint?: string, defaultValue?: number)
		: HTMLDivElement {
	let inp: HTMLInputElement = document.createElement("input");
	inp.className = "formnumberinput";
	inp.type = "number";

	if( defaultValue ) {
		inp.value = defaultValue.toString();
	}

	_formControls.push(inp);

	return formLine(title, inp, hint);
}


function formDate(title: string, hint?: string): HTMLDivElement {
	let inp: HTMLInputElement = document.createElement("input");
	inp.className = "formdateinput";
	inp.type = "date";

	_formControls.push(inp);

	return formLine(title, inp, hint);
}


class playerEntry {
	// showButton : HTMLDivElement;
	// editButton : HTMLDivElement;
	// clearButton : HTMLDivElement;

	placeInput : HTMLInputElement;
	nameInput : HTMLInputElement;
	codeInput : HTMLInputElement;
	rootNode : HTMLDivElement;
	listHolder : HTMLDivElement;
	live : boolean = true;
	dgiMode : boolean = false;

	private listCode : string;

	constructor(dgiMode: boolean) {
		this.dgiMode = dgiMode;

		let pl: HTMLDivElement = document.createElement("div");
		pl.className = this.dgiMode ? "formplayer formplayerdgi" : "formplayer";

		let pe : playerEntry = this;

		let placediv: HTMLDivElement = document.createElement("div");
		placediv.appendChild(document.createTextNode("Place"));
		pl.appendChild(placediv);

		this.placeInput = document.createElement("input");
		this.placeInput.type = "number";
		this.placeInput.className = "formnuminput";

		this.placeInput.value = "" + _placeIndex;
		_placeIndex++;

		pl.appendChild(this.placeInput);

		let playerdiv: HTMLDivElement = document.createElement("div");
		playerdiv.appendChild(document.createTextNode("Player"));
		pl.appendChild(playerdiv);

		this.nameInput = document.createElement("input");
		this.nameInput.type = "text";
		this.nameInput.className = "formnameinput";

		pl.appendChild(this.nameInput);



		pl.appendChild(new ccweb.Button({
			text: "Show",
			size: "medium",
			click: () => { this.clickShow(); }
		}).container);


		pl.appendChild(new ccweb.Button({
			text: "Edit",
			size: "medium",
			click: () => { this.clickEdit(); }
		}).container);


		pl.appendChild(new ccweb.Button({
			text: "Clear",
			size: "medium",
			click: () => { this.clickClear(); }
		}).container);

		pl.appendChild(new ccweb.Button({
			icon: "clear",
			size: "medium",
			click: () => { this.clickClose(); }
		}).container);



		if( this.dgiMode ) {
			let codeDiv : HTMLDivElement = document.createElement("div");
			codeDiv.appendChild(document.createTextNode("Code/URL"));
			codeDiv.className = "formcodename";

			pl.appendChild(codeDiv);

			this.codeInput = document.createElement("input");
			this.codeInput.type = "text";
			this.codeInput.className = "formcodeinput";

			pl.appendChild(this.codeInput);
		}

		this.listHolder = document.createElement("div");
		this.listHolder.className = this.dgiMode ? "formlistholderdgi" : "formlistholder";
		this.listHolder.style.display = "none";
		this.listHolder.appendChild(document.createTextNode("No list here yet!"));

		pl.appendChild(this.listHolder);



		this.rootNode = pl;
	}

	static _peEditor : ccweb.Editor = null;

	getListCode() : string { 
		let ret : string = this.listCode;

		if( !ret && this.codeInput ) {
			ret = this.codeInput.value;

			if( ret.indexOf("?") != -1 ) {
				ret = ret.substr(ret.indexOf("?") + 1);
			}
			else if( ret.indexOf("#") != -1 ) {
				ret = ret.substr(ret.indexOf("#") + 1);
			}

		}

		return ret;
	}

	clickEdit() : void {
		if( ccweb.Editor.currentEditor ) return;


		let pe : playerEntry = this;


		let editor: ccweb.Editor = new ccweb.Editor(
			null,
			-1,
			null,
			"Update list",
			{
				listSize: 75,
				useCallback: true,
				listType: {
					steamroller: false,
					adr: false,
					champions: false,
					season: 0,
					minLists: 1,
					maxLists: 3,
				}
			}, //{ useCallback: true },
			() => {

				let listCode : string =
					playerEntry._peEditor.currentList.al.toCode();

				pe.listCode = listCode;

				pe.editDone();
			}
			);

		editor.setEventMode(true);

		if( pe.listCode && pe.listCode.length > 3 ) {
			editor.restoreCode(pe.listCode);
		}

		editor.show();

		playerEntry._peEditor = editor;


	}

	editDone() : void {
		this.listCode = playerEntry._peEditor.currentList.al.toCode();

		playerEntry._peEditor.hide();
		playerEntry._peEditor.remove();
		playerEntry._peEditor = null;

		while( this.listHolder.hasChildNodes() ) {
			this.listHolder.removeChild(this.listHolder.lastChild);
		}

		this.listHolder.appendChild(ccweb.Editor.displayList(this.listCode));
	}

	clickClear() : void {
		if( ccweb.Editor.currentEditor ) return;

		while( this.listHolder.hasChildNodes() ) {
			this.listHolder.removeChild(this.listHolder.lastChild);
		}

		this.listHolder.appendChild(document.createTextNode("No list yet!"));
		this.listCode = null;
	}

	clickShow() : void {
		if( ccweb.Editor.currentEditor ) return;

		// while( this.showButton.hasChildNodes() ) {
		// 	this.showButton.removeChild(this.showButton.lastChild);
		// }

		if( this.listHolder.style.display == "none" ) {
			this.listHolder.style.display = "";
			// this.showButton.appendChild(document.createTextNode("Hide List"));
		}
		else {
			this.listHolder.style.display = "none";
			// this.showButton.appendChild(document.createTextNode("Show List"));
		}
	}

	clickClose() : void {
		if( ccweb.Editor.currentEditor ) return;

		this.live = false;
		this.rootNode.style.display = "none";
	}
}


let _playerEntries : playerEntry[] = [];

function addTournamentPlayer(parent : HTMLElement, before: HTMLElement, dgiMode: boolean): void {
	if( ccweb.Editor.currentEditor ) return;

	//let tsub: HTMLDivElement = <HTMLDivElement>(document.getElementById("tournament_submission"));
	let pe : playerEntry = new playerEntry(dgiMode);

	//tsub.insertBefore(pe.rootNode, document.getElementById("addplayerbutton"));
	parent.insertBefore(pe.rootNode, before);

	_playerEntries.push(pe);
}




function gotATC(s : string) {
    let tourn : HTMLElement = document.getElementById("team_listing");

	while( tourn.hasChildNodes() ) {
		tourn.removeChild(tourn.lastChild);
	}

	if( s == "UNAUTHORIZED") {
		tourn.appendChild(document.createTextNode("You are not authorized to view this."));
		return;
	}

	let teams : any = null;

	try {
		teams = JSON.parse(s);
	}
	catch(err) {
		console.log(s);
		tourn.appendChild(document.createTextNode("You are not authorized to view this."));
		return;
	}

	_teamData = teams;

	let cover : HTMLDivElement = document.createElement("div");
	cover.className = "eventcover";
	cover.style.backgroundImage = "url(\"https://scontent.xx.fbcdn.net/v/t1.0-9/s720x720/13178920_1216757838349426_8374780578802526869_n.jpg?oh=51fc4ae48090d5b7165d1f2ed100d77a&oe=593E6EEC\")";

	tourn.appendChild(cover);

	let picouter : HTMLDivElement = document.createElement("div");
	picouter.style.position = "relative";
	picouter.style.width = "0px";
	picouter.style.height = "0px;"

	let picanchor : HTMLAnchorElement = document.createElement("a");
	picanchor.className = "eventanchor";
	picanchor.href = "https://www.facebook.com/atcwmh/";
	picanchor.target = "_blank";

	let picture : HTMLDivElement = document.createElement("div");
	picture.className = "eventpicture";
	picture.style.backgroundImage = "url(\"https://scontent-ord1-1.xx.fbcdn.net/v/t1.0-1/p200x200/12705605_1153329461358931_2504705434823964013_n.jpg?oh=d8b2093c174df4b53bc173729bb07832&oe=5947C831\")";

	picanchor.appendChild(picture);
	picouter.appendChild(picanchor);
	tourn.appendChild(picouter);



	let initdiv : HTMLDivElement = document.createElement("div");
	initdiv.className = "eventinit";
	initdiv.innerHTML =
		`Americas Team Championship`;
	tourn.appendChild(initdiv);

	// let subbut : HTMLDivElement = document.createElement("div");
	// subbut.appendChild(document.createTextNode("Submit Tournament"));
	// subbut.id = "submit_tournament";
	// subbut.className = "lb bh";
	// subbut.onclick = submitTournament;
	// tourn.appendChild(subbut);

	let sepLine : HTMLDivElement = document.createElement("div");
	sepLine.className = "formsepline";
	tourn.appendChild(sepLine);



	let buttondiv : HTMLDivElement = document.createElement("div");
	buttondiv.className = "tournbholder";


	let JSONbutton : HTMLDivElement = document.createElement("div");
	JSONbutton.className = "lb bh jsonbut";
	JSONbutton.appendChild(document.createTextNode("Download JSON"));
	JSONbutton.onclick = downloadJSON;

	buttondiv.appendChild(JSONbutton);

	let printButton : HTMLDivElement = document.createElement("div");
	printButton.className = "lb bh jsonbut";
	printButton.appendChild(document.createTextNode("Print Steamroller Sheets"));
	printButton.onclick = printSteamrollerSheets;

	buttondiv.appendChild(printButton);

	tourn.appendChild(buttondiv);


	sepLine = document.createElement("div");
	sepLine.className = "formsepline";
	tourn.appendChild(sepLine);


    //tourn.insertBefore(document.createTextNode(text), document.getElementById("tournlast"));

	let dadd = (div : HTMLDivElement, text : string, className? : string)
			: HTMLDivElement => {
		let newdiv : HTMLDivElement = document.createElement("div");
		newdiv.appendChild(document.createTextNode(text));
		if( className ) {
			newdiv.className = className;
		}
		div.appendChild(newdiv);

		return newdiv;
	};

	//let teamList : string = "";

	for( let i : number = 0; i < teams.length; i++ ) {
		//let td : any = JSON.parse(data[i]['jsondata']);

		let td : any = null;

		try {
			td = JSON.parse(teams[i]);
		}
		catch(err) {
			console.log(teams[i]);
			tourn.appendChild(document.createTextNode("Unable to parse team."));
		}

		//teamList += td['name'] + "\x0d\x0a";

		let theader : HTMLDivElement = document.createElement("div");
		theader.className = "theader db bh";

		let venuename : string = "";
		let city : string = "";
		let datestr : string = "";


		let important : boolean = false;

		let hicon : HTMLDivElement = dadd(theader, "\u25b7");
		dadd(theader, td['name']);
		let valreport : HTMLDivElement = dadd(theader, venuename);
		dadd(theader, city);
		dadd(theader, datestr);


		tourn.appendChild(theader);

		let tholder : HTMLDivElement = document.createElement("div");
		tholder.style.display = "none";

		theader.onclick = (function() {
			let myHolder : HTMLDivElement = tholder;
			let myIcon : HTMLDivElement = hicon;

			return function() {
				if( myHolder.style.display == "none" ) {
					myHolder.style.display = "";
					myIcon.textContent = "\u25bd";
				}
				else {
					myHolder.style.display = "none";
					myIcon.textContent = "\u25b7";
				}

			};
		})();

		tourn.appendChild(tholder);

		let failed : boolean = false;
		let missingLists : number = 5;
		let invalidCount : number = 0;

		let casters : { [uid: number] : ccapi.Entry } = {};
		let castertext : string = "";


		if( td['players'] ) {
			for( let j : number = 0; j < td['players'].length; j++ ) {
				let pheader : HTMLDivElement = document.createElement("div");

				let picon : HTMLDivElement = dadd(pheader, "");

				let place : string = "P";

				if( j == 0 ) {
					place = "C";
				}
				else if( j == 5 ) {
					place = "A";
				}

				let faction : string = "";
				let status : string = "";

				if( j < 5 ) {
					status = "valfail";
				}

				// if( td['players'][j]['place'] ) {
				// 	let pnum : number = parseInt(td['players'][j]['place']);

				// 	if( pnum == 11 || pnum == 12 || pnum == 13 ) {
				// 		place = pnum + "th";
				// 	}
				// 	else if( pnum % 10 == 1 ) {
				// 		place = pnum + "st";
				// 	}
				// 	else if( pnum % 10 == 2 ) {
				// 		place = pnum + "nd";
				// 	}
				// 	else if( pnum % 10 == 3 ) {
				// 		place = pnum + "rd";
				// 	}
				// 	else {
				// 		place = pnum + "th";
				// 	}
				// }


				dadd(pheader, place);

				dadd(pheader, td['players'][j]['name']);

				//teamList += " - " + td['players'][j]['name'] + "\x0d\x0a";

				if( td['players'][j]['name'] != 'Alternate' ||
						(td['players'][j]['list'] != '' && td['players'][j]['list'] != null )  ) {
					tholder.appendChild(pheader);
				}

				if( td['players'][j]['list']) {
					let slist : string = td['players'][j]['list'];

					if( j < 5 ) {
						missingLists--;
					}

					let fid = ccapi.decodeCharSingle(slist, 1);

					if( (fid & 16) == 16 ) {
						fid -= 16;
					}

					faction = ccapi.Data._data.factions[fid].n;


					let div : HTMLDivElement = ccweb.Editor.displayList(slist,
						{ ignorePreRelease : true });
					//tourn.insertBefore(div, document.getElementById("tournlast"));
					div.style.display = "none";
					div.className += " plist";
					tholder.appendChild(div);
					picon.textContent = "\u25b7";

					pheader.onclick = (function() {
						let myDiv : HTMLDivElement = div;
						let myIcon : HTMLDivElement = picon;

						return function() {
							if( myDiv.style.display == "none" ) {
								myDiv.style.display = "";
								myIcon.textContent = "\u25bd";
							}
							else {
								myDiv.style.display = "none";
								myIcon.textContent = "\u25b7";
							}

						};
					})();

					pheader.className = "pheader lb bh";

					let tv = ccweb.Editor.tournamentValidation(slist,
						{ ignorePreRelease : true });

					if( tv.failureCount == 0 )
					{
						status = "valpass";
					}
					else
					{
						status = "valfail";
						invalidCount++;
					}

					for( let k : number = 0; k < tv.casters.length; k++ ) {
						if( casters[tv.casters[k].id] ) {
							if( castertext != "" ) {
								castertext += "; ";
							}
							castertext += tv.casters[k].v + " is duplicated";
							failed = true;
						}
						else {
							casters[tv.casters[k].id] = tv.casters[k];
						}
					}


				}
				else {
					pheader.className = "pheader lb";
				}

				dadd(pheader, faction);
				dadd(pheader, "", status);

				if( status == "valfail" ) {
					failed = true;
				}

			}
		}

		if( failed ) {
			dadd(theader, "", "valfailbig");
		}
		else {
			dadd(theader, "", "valpassbig");
		}

		let valtext : string = "";

		if( missingLists > 0 ) {
			valtext = missingLists + " missing list";

			if( missingLists > 1 ) {
				valtext += "s";
			}
		}

		if( invalidCount > 0) {
			if( valtext != "" ) {
				valtext += "; ";
			}

			valtext += invalidCount + " invalid list";
			if( invalidCount > 1 ) {
				valtext += "s";
			}
		}

		if( castertext != "" ) {
			if( valtext != "" ) {
				valtext += "; ";
			}

			valtext += castertext;
		}

		if( valtext == "" )
		{
			valtext = "Submission meets all validation criteria!";
		}

		valreport.appendChild(document.createTextNode(valtext));

		//teamList += "\x0d\x0a";
	}

	sepLine = document.createElement("div");
	sepLine.className = "formsepline";
	tourn.appendChild(sepLine);


	//console.log(teamList);
	//ccapi.download("teams.txt", teamList);


	// let CSVbutton : HTMLDivElement = document.createElement("div");
	// CSVbutton.className = "lb bh csvbut";
	// CSVbutton.appendChild(document.createTextNode("Download CSV"));
	// CSVbutton.onclick = downloadCSV;

	// tourn.appendChild(CSVbutton);


}


export function showATC(skipHistory? : boolean) : void {
	hideAll();
	manageHistory("ATC Lists", "atclists", skipHistory);

	let tsub: HTMLDivElement = <HTMLDivElement>(document.getElementById("team_listing"));

	setMainFocus(tsub);

	while (tsub.hasChildNodes()) {
		tsub.removeChild(tsub.lastChild);
	}

	tsub.innerHTML = `<div id="fbnews">
				<div class="loadholder">
					<span class="loadspinner"></span>
					<span class="loadtext">Loading event...</span>
				</div>
			</div>`;

	tsub.style.display = "";

	getATCLists(gotATC);
}



function printSteamrollerSheets() {
	let img : HTMLImageElement = new Image();
	img.onload = function() { printSteamrollerSheets2(); }
	img.src = "img/atc_logo.jpg";
}

function printSteamrollerSheets2() {
    let div : HTMLDivElement =
        <HTMLDivElement>document.getElementById("printout");

    while( div.hasChildNodes() ) {
        div.removeChild(div.lastChild);
    }

	let logoimg : HTMLImageElement = document.createElement("img");
	logoimg.src = "img/atc_logo.jpg";
	logoimg.className = "logoimg";
	div.appendChild(logoimg);

	for( let i : number = 0; i < _teamData.length; i++ ) {

		let team : any = {};
		team['players'] = [];

		let td : any = null;

		try {
			td = JSON.parse(_teamData[i]);
		}
		catch(err) {
			console.log(_teamData[i]);
		}

		team['name'] = td['name'];

		if( td['players'] ) {

			for( let j : number = 0; j < td['players'].length; j++ ) {
				let player : any = {};
				player['name'] = td['players'][j]['name'];

				if( td['players'][j]['list']) {
					let slist : string = td['players'][j]['list'];

					let fid = ccapi.decodeCharSingle(slist, 1);

					if( (fid & 16) == 16 ) {
						fid -= 16;
					}

					player['faction'] = ccapi.Data._data.factions[fid].n;
					player['cccode'] = td['players'][j]['list'];

					// if( !factions[player['faction']] ) {
					// 	factions[player['faction']] = {};
					// }

					div.appendChild(ccweb.Editor.buildSheet(td['players'][j]['list'],
							player['name'], team['name'], "img/atc_logo.jpg",
							"2017 Americas Team Championship"));
				}
			}
		}
	}

	// div.appendChild(buildSheet(null, null, null, "img/atc_logo.jpg",
	// 	"2017 Americas Team Championship Solo Masters"));

	window.print();
}


function downloadJSON() {

	let ret : any = [];

	// let factions : any = {};
	// let casters : any = {};
	//let entries : any = {};

	for( let i : number = 0; i < _teamData.length; i++ ) {

		let team : any = {};
		team['players'] = [];

		let td : any = null;

		try {
			td = JSON.parse(_teamData[i]);
		}
		catch(err) {
			console.log(_teamData[i]);
		}

		team['name'] = td['name'];

		if( td['players'] ) {

			for( let j : number = 0; j < td['players'].length; j++ ) {
				let player : any = {};
				player['name'] = td['players'][j]['name'];

				if( td['players'][j]['list']) {
					let slist : string = td['players'][j]['list'];

					let fid = ccapi.decodeCharSingle(slist, 1);

					if( (fid & 16) == 16 ) {
						fid -= 16;
					}

					player['faction'] = ccapi.Data._data.factions[fid].n;
					player['cccode'] = td['players'][j]['list'];

					// if( !factions[player['faction']] ) {
					// 	factions[player['faction']] = {};
					// }



					let stored : ccapi.StoredList = ccapi.parseCode(
						td['players'][j]['list']
					);

					player['list1'] = dumpList(stored.l);


					//let caster : string = ccapi.Data.entries[stored.l.list[0][0]].n;

					// if( !factions[player['faction']][caster] ) {
					// 	factions[player['faction']][caster] = 0;
					// }

					// factions[player['faction']][caster]++;

					if( stored.m ) {
						player['list2'] = dumpList(stored.m);

						//caster = ccapi.Data.entries[stored.m.list[0][0]].n;

						// if( !factions[player['faction']][caster] ) {
						// 	factions[player['faction']][caster] = 0;
						// }

						// factions[player['faction']][caster]++;


					}

				}

				team['players'].push(player);
			}
		}

		ret.push(team);
	}

	ccweb.download("ATC2017teams.json", JSON.stringify(ret));

}

export function cleanupTournament() : void {
	if( playerEntry._peEditor ) {
		playerEntry._peEditor.remove();
		playerEntry._peEditor = null;
	}
}
