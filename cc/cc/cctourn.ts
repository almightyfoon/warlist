
import * as ccapi from "../ccapi/ccapi";
import * as ccweb from "../ccweb/ccweb";

import { hideAll, setMainFocus, manageHistory } from "./ccmain";
import { restGet, ajaxPost, getATCLists, getEvent } from "./ccstorage";
import { authAjax } from "./cclogin";
import { gotEventRegistration, initStaffUI,
	editTeam } from "./ccstaff";

import { CCPDFDocument } from "../ccweb/pdfsheet";
import { ArmyList } from "../ccapi/armylist";
import { Data } from "../ccapi/data";


export function api(s : string) {
	return "https://api.conflictchamber.com" + s;
}

export function eventData() : any {
	return _eventData;
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

let _refreshTeam : () => void = null;

export function formatDate(dt : Date) : string {
	let ret : string = "";

	ret += ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
			"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getMonth()];

	ret += " " + dt.getDate();

	let hr : number = dt.getHours();
	let ampm : string = "am";

	if( hr > 12 ) {
		hr -= 12;
		ampm = "pm";
	}

	let min : any = dt.getMinutes();

	if( min < 10 ) {
		min = "0" + min;
	}

	ret += " " + hr + ":" + min + " " + ampm;


	return ret;
}

export function formatDateLong(dt : Date) : string {
	let ret : string = "";

	ret += ["January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"][dt.getMonth()];

	ret += " " + dt.getDate();

	ret += ", " + dt.getFullYear();


	return ret;
}


let _tsEditor : ccweb.Editor = null;

export function dumpList(ls : ccapi.ListState) : any {
	let ret : any = {};

	if( ls.tl > 0 ) {
		ret['theme'] = ccapi.Data._data.themelists[ls.tl].n;
	}
	else if( ls.tl < 0 ) {
		ret['theme'] = ccapi.Data._data.themelists[ls.tl].n;
	}

	ret['list'] = [];

	for( let i : number = 0; i < ls.list.length; i++ ) {
		let e : ccapi.Entry = ccapi.Data.entries[ls.list[i][0]];

		let n : string = e.v || e.n;

		// if( !_entries[e.n] )
		// 	_entries[e.n] = 0;
		// _entries[e.n]++;

		if( ls.list[i][2] ) {
			n = "(S) " + n;
		}


		if( e.C && e.C.length == 2 ) {
			if( ls.list[i][1] == 0 ) {
				n += " (min)";
			}
			else {
				n += " (max)";
			}
		}
		else if( e.C && e.C.length == 3 ) {
			n += " (" + (ls.list[i][1] + 1) + ")";
		}

		ret['list'].push(n);
	}


	return ret;
}


function getStyle(className) : CSSStyleRule {
	for( let i : number = 0; i < document.styleSheets.length; i++ ) {
		let ss : StyleSheet = document.styleSheets[i];

		if ( !( ss instanceof CSSStyleSheet ) ) {
			continue;
		}

		let rules : CSSRuleList = null;

		try {
			rules  = ss.rules || ss.cssRules;
		}
		catch(e) {

		}

		if( !rules ) {
			continue;
		}

		for (let  r = 0; r < rules.length; r++) {
			let rule : CSSRule = rules[r];

			if( !( rule instanceof CSSStyleRule ) ) {
				continue;
			}

			if( rule.selectorText == className ) {
				return rule;
			}
		}
	}

	return null;
}

function fillStyleFromCSS(ctx : CanvasRenderingContext2D,
	rule : CSSStyleRule,
	cx : number,
	cy : number,
	radius : number,
	angle : number,
	next : number)
{
	let fillStyle : CanvasGradient = null;

	let str : string = rule.style.background;

	let fparen : number = str.indexOf("(");
	let eparen : number = str.lastIndexOf(")");

	if( fparen > 0 && eparen > 0 ) {
		let sub : string = str.substr(fparen + 1,
			eparen - fparen - 1);

		let sec : string[] = sub.split(" rgb");

		if( sec.length > 1 ) {
			let mid : number = (angle + next) / 2;


			// fillStyle = ctx.createLinearGradient(cx, cy,
			// 	cx + (Math.cos(mid) * radius),
			// 	cy + (Math.sin(mid) * radius));

			fillStyle = ctx.createRadialGradient(cx, cy, 0,
				cx, cy, radius );

			for( let j : number = 1; j < sec.length; j++ ) {
				let lastSpace : number = sec[j].lastIndexOf(" ");
				if( lastSpace < 0 ) {
					continue;
				}

				let color : string = "rgb" + sec[j].substr(0, lastSpace);
				let stop : number = parseInt(sec[j].substr(lastSpace + 1));

				fillStyle.addColorStop(stop / 100, color);
			}

		}
	}

	return fillStyle;
}

function pieChart(title : string, data : any, size : number) : HTMLDivElement {

	let defaultGradients = [
		[ "rgb(178,255,73)", "rgb(240,255,50)", "rgb(90,120,0)" ],
		[ "rgb(73,255,178)", "rgb(50,255,240)", "rgb(0,120,90)" ],
		[ "rgb(178,73,255)", "rgb(140,50,255)", "rgb(90,0,120)" ],
		[ "rgb(255,73,178)", "rgb(255,50,140)", "rgb(120,0,90)" ],
		[ "rgb(255,178,73)", "rgb(255,140,50)", "rgb(120,90,0)" ],
		[ "rgb(73,178,255)", "rgb(50,140,255)", "rgb(0,90,120)" ],
		[ "rgb(200, 255, 255)", "rgb(80, 255, 255)", "rgb(0, 120, 120)"],
		[ "rgb(255, 255, 200)", "rgb(255, 255, 80)", "rgb(120, 120, 0)"],
		[ "rgb(255, 200, 255)", "rgb(255, 80, 255)", "rgb(120, 0, 120)"],
		[ "rgb(200, 255, 200)", "rgb(80, 255, 80)", "rgb(0, 120, 0)"],
		[ "rgb(255, 200, 200)", "rgb(255, 80, 80)", "rgb(120, 0, 0)"],
		[ "rgb(200, 200, 255)", "rgb(80, 80, 255)", "rgb(0, 0, 120)"],
	];

	let div : HTMLDivElement = document.createElement("div");

	if( title ) {
		let titleDiv : HTMLDivElement = document.createElement("div");
		titleDiv.className = "pietitle";
		titleDiv.appendChild(document.createTextNode(title));
		div.appendChild(titleDiv);
	}

	let canvas : HTMLCanvasElement = document.createElement("canvas");
	let tholder : HTMLDivElement = document.createElement("div");
	tholder.className = "pietableholder";


	div.appendChild(tholder);

	div.appendChild(canvas);

	canvas.height = size;
	canvas.width = size;
	canvas.style.height = size + "px";
	canvas.style.width = size + "px";

	let ctx = canvas.getContext("2d");

	let total : number = 0;

	let keys : string[] = [];

	for( let k in data ) {
		total += data[k];
		keys.push(k);
	}

	keys.sort((a : string, b: string) => {
		return data[b] - data[a];
	});

	let table : HTMLTableElement = document.createElement("table");
	tholder.appendChild(table);


	let cx = size/2;
	let cy = size/2;
	let radius = (size/2) - 2;

	let angle : number = 0;
	let angles : number[] = [];

	for( let ii : number = 0; ii < keys.length; ii++  ) {
		let k : string = keys[ii];

		let next : number =
			angle + (data[k] / total) * Math.PI * 2;

		let fillStyle : CanvasGradient = null;
		let iconFill : string = null;
		let iconBG : string = null;

		for( let fid in ccapi.Data._data.factions ) {
			if( ccapi.Data._data.factions[fid].n == k ) {
				let rule : CSSStyleRule = getStyle(".conflictchamber .f" + fid);

				if( rule ) {
					fillStyle = fillStyleFromCSS(ctx, rule, cx, cy,
						radius, angle, next);

					iconFill = "conflictchamber f" + fid;
				}
			}
		}

		if( !fillStyle && (k == "null" || !k || k == "undefined") ) {
			fillStyle = ctx.createRadialGradient(cx, cy, 0,
					cx, cy, radius);

			fillStyle.addColorStop(0, "rgb(240,240,240)");
			fillStyle.addColorStop(0.7, "rgb(180,180,180)");
			fillStyle.addColorStop(1, "rgb(40,40,40)");

			iconBG = "linear-gradient(135deg, "
				+ "rgb(240,240,240) 0%, "
				+ "rgb(180,180,180) 70%, "
				+ "rgb(40,40,40) 100%)";
		}
		else if( !fillStyle && defaultGradients.length > 0 ) {
			let grad : string[] = defaultGradients.pop();

			fillStyle = ctx.createRadialGradient(cx, cy, 0,
					cx, cy, radius);

			fillStyle.addColorStop(0, grad[0]);
			fillStyle.addColorStop(0.7, grad[1]);
			fillStyle.addColorStop(1, grad[2]);

			iconBG = "linear-gradient(135deg, "
				+ grad[0] + " 0%, "
				+ grad[1] + " 70%, "
				+ grad[2] + " 100%)";
		}


		let tr : HTMLTableRowElement = document.createElement("tr");

		let td : HTMLTableCellElement = document.createElement("td");
		let iconDiv : HTMLDivElement = document.createElement("div");
		iconDiv.className = iconFill;

		if( iconBG ) {
			iconDiv.style.background = iconBG;
		}

		td.appendChild(iconDiv);
		tr.appendChild(td);

		td = document.createElement("td");
		td.appendChild(document.createTextNode(
			(k == "null" || !k || k == "undefined") ? "None" : k));

		tr.appendChild(td);

		td = document.createElement("td");
		td.appendChild(document.createTextNode(data[k]));
		tr.appendChild(td);

		table.appendChild(tr);


		ctx.beginPath();
		ctx.fillStyle = fillStyle || "red";
		ctx.arc(cx, cy, radius, angle, next);
		ctx.lineTo(cx, cy);
		ctx.fill();

		angles.push(next);

		angle = next;
	}

	if( angles.length > 1 ) {
		for( let i : number = 0; i < angles.length; i++ ) {
			ctx.beginPath();
			ctx.lineWidth = 2;
			ctx.strokeStyle = "white";

			ctx.moveTo(cx, cy);
			ctx.lineTo(cx + radius * Math.cos(angles[i]),
				cy + radius * Math.sin(angles[i]));
			ctx.stroke();
		}
	}

	ctx.beginPath();
	ctx.lineWidth = 4;
	ctx.strokeStyle = "white";
	ctx.arc(cx, cy, radius, 0, Math.PI * 2);
	ctx.stroke();

	return div;

};

function showStats(players : any) {
	let dlg : ccweb.Dialog = new ccweb.Dialog(null, "Stats", "assessment");
	dlg.content.parentElement.style.width = "812px";
	dlg.content.parentElement.parentElement.style.width = "812px";

	dlg.content.appendChild(buildStats(players));

	dlg.show();
}

function printStats(players : any) : void {
	let div : HTMLDivElement = ccweb.Editor.clearPrintout();

	div.appendChild(buildStats(players, true));

	window.print();

}


function buildStats(players : any, expandTabs? : boolean) : HTMLDivElement {
	let ret : any = buildRawData(players);

	let counts : any = {};
	let facCount : any = {};

	for( let list of ret ) {

		let inc = (a : any, s : string) => {
			if( !a[s] ) {
				a[s] = 1;
			}
			else {
				a[s]++;
			}
		};

		if( list.faction ) {
			//console.log(list);

			inc(facCount, list.faction);

			let fac : any = counts[list.faction];

			if( fac == null ) {
				fac = {};
				fac.casters = {};
				fac.themes = {};
				fac.entries = {};
				counts[list.faction] = fac;
			}


			if( list.list1 ) {
				inc(fac.themes, list.list1.theme);
				inc(fac.casters, list.list1.list[0]);

				for( let i : number = 1; i < list.list1.list.length; i++ ) {
					inc(fac.entries, list.list1.list[i]);
				}
			}

			if( list.list2 ) {
				inc(fac.themes, list.list2.theme);
				inc(fac.casters, list.list2.list[0]);

				for( let i : number = 1; i < list.list2.list.length; i++ ) {
					inc(fac.entries, list.list2.list[i]);
				}
			}
		}


	}

	let statsDiv : HTMLDivElement = document.createElement("div");
	statsDiv.className = "statsdisplay";

	statsDiv.appendChild(new ccweb.Button({
		text: "",
		icon: "print",
		size: "small",
		className: "eventprintstats",
		click: ((playerData : any) => {
			return () => {
				printStats(playerData);
			};
		})(players)
	}).container);


	let bigPie : HTMLDivElement = pieChart("Faction Overview", facCount, 400);
	bigPie.className = "pieeventoverview";
	statsDiv.appendChild(bigPie);


	for( let k in counts ) {

		if( !k || k == "undefined" || k == "null") {
			continue;
		}

		//let pholder : HTMLDivElement = document.createElement("div");
		//pholder.className = "statsfactionholder";

		let factionStats = new ccweb.Subheader({
			//title: ccapi.Data._data.factions[k].n,
			title: k,
			expand: true,
			icon: "pie_chart",
			startClosed: !expandTabs
		});


		// todo - replace print button
		// if( expandTabs ) {
		// 	let printHelper : HTMLDivElement = document.createElement("div");
		// 	printHelper.className = "pieprintspacertop";
		// 	pholder.appendChild(printHelper);
		// }


		// let pheader : HTMLDivElement = document.createElement("div");
		// pholder.appendChild(pheader);

		// let picon : HTMLDivElement = dadd(pheader, "");

		let faction : string = "";
		let status : string = "";

		let pie : HTMLDivElement = pieChart("Casters", counts[k].casters, 200);
		pie.className = "piefactionoverview";
		//detailsDiv.appendChild(pie);
		factionStats.add(pie);

		pie = pieChart("Themes", counts[k].themes, 200);
		pie.className = "piefactionoverview";
		//detailsDiv.appendChild(pie);
		factionStats.add(pie);

		let entriesDiv : HTMLDivElement = document.createElement("div");
		entriesDiv.className = "pieentries";
		let entriesTitle : HTMLDivElement = document.createElement("div");
		entriesTitle.appendChild(document.createTextNode("List Entries Used"));
		entriesTitle.className = "pietitle";
		entriesDiv.appendChild(entriesTitle);

		let entriesTable : HTMLTableElement = document.createElement("table");

		let entries : string[] = [];



		for( let e in counts[k].entries ) {
			entries.push(e);
		}

		entries.sort((a : string, b : string) => {
			return counts[k].entries[b] - counts[k].entries[a];
		});

		let rows : number = Math.ceil(entries.length / 3);


		let addCell = (tr : HTMLTableRowElement, e : string) => {
			let td : HTMLTableCellElement = document.createElement("td");
			td.appendChild(document.createTextNode(e));
			tr.appendChild(td);

			td = document.createElement("td");
			td.appendChild(document.createTextNode("" + counts[k].entries[e]));

			tr.appendChild(td);
		};

		for( let r : number = 0; r < rows; r++ ) {

			let tr : HTMLTableRowElement = document.createElement("tr");

			addCell(tr, entries[r]);

			if( rows + r < entries.length ) {
				addCell(tr, entries[rows + r]);
			}

			if( (2 * rows) + r < entries.length) {
				addCell(tr, entries[(2 * rows) + r]);
			}

			entriesTable.appendChild(tr);
		}

		entriesDiv.appendChild(entriesTable);


		//detailsDiv.appendChild(entriesDiv);
		//pholder.appendChild(detailsDiv);
		factionStats.add(pie);
		factionStats.add(entriesDiv);
		

		// todo fix print button
		// if( expandTabs ) {
		// 	let printHelper : HTMLDivElement = document.createElement("div");
		// 	printHelper.className = "pieprintspacerbottom";
		// 	pholder.appendChild(printHelper);
		// }


		// statsDiv.appendChild(pheader);
		// statsDiv.appendChild(detailsDiv);

		//statsDiv.appendChild(pholder);
		statsDiv.appendChild(factionStats.container);
	}

	return statsDiv;
}

export function buildRawData(players : any, teams? : any) : any {

	let ret : any = [];

	let teamLookup : any = {};

	if( teams ) {
		for( let i : number = 0; i < teams.length; i++) {
			teamLookup[teams[i].uid] = [];
		}
	}

	for( let i : number = 0; i < players.length; i++ ) {
		let player : any = {};
		player["name"] = players[i]["name"];

		if( players[i]["submission"]) {
			let slist : string = players[i]["submission"];

			let fid = ccapi.decodeCharSingle(slist, 1);

			if( (fid & 16) == 16 ) {
				fid -= 16;
			}

			if( fid == 0 ) {
				fid = 16;
			}

			player["faction"] = ccapi.Data._data.factions[fid].n;
			player["cccode"] = players[i]["submission"];

			let stored : ccapi.StoredList = ccapi.parseCode(
				players[i]["submission"]
			);

			player["list1"] = dumpList(stored.l);

			if( stored.m ) {
				player["list2"] = dumpList(stored.m);
			}

		}

		ret.push(player);

		if( teams ) {
			teamLookup[players[i]["team"]].push(player);
		}
	}

	if( teams ) {
		let teamRet : any = [];

		for( let i : number = 0; i < teams.length; i++) {
			teamRet.push({
				name: teams[i].name,
				players: teamLookup[teams[i].uid]
			});
		}

		return teamRet;
	}

	return ret;
}

export function baseDownloadJSON(players : any) {

	//console.log(_eventData);

	let filename : string = _eventData["name"] + ".json";
	filename = filename.replace(/ /g, "_");

	ccweb.download(filename, JSON.stringify(buildRawData(players,
		_eventData["teams"] && _eventData["teams"].length > 0 ? _eventData["teams"] : null)));
}

function downloadCSV() {
	require(["jszip.min"], function(jszip) {
		//console.log(jszip);
		let zip : any = jszip();

		let teamList : string = "team_id,team_name\n";
		let playerList : string = "player_id,player_name,team_id\n";
		let listsList : string = "list_id,player_id,faction_id,leader,list,cccode\n";

		let teams : any = _eventData["teams"] && _eventData["teams"].length > 0 ? _eventData["teams"] : null;

		if( teams ) {
			for( let i : number = 0; i < teams.length; i++ ) {
				teamList += teams[i]["uid"] + ",\"" +
					teams[i]["name"].replace(/"/g, "\"\"") + "\"\n";
			}
		}

		let players : any = _eventData["players"];

		for( let i : number = 0; i < players.length; i++ ) {
			let player : any = {};
			player["name"] = players[i]["name"];

			if( players[i]["submission"]) {
				let slist : string = players[i]["submission"];

				let fid = ccapi.decodeCharSingle(slist, 1);

				if( (fid & 16) == 16 ) {
					fid -= 16;
				}

				if( fid == 0 ) {
					fid = 16;
				}

				player["faction"] = ccapi.Data._data.factions[fid].n;
				player["cccode"] = players[i]["submission"];

				let stored : ccapi.StoredList = ccapi.parseCode(
					players[i]["submission"]
				);

				player["list1"] = dumpList(stored.l);

				playerList += players[i]["uid"] + ",";
				playerList += "\"" + player["name"].replace(/"/g, "\"\"") + "\",";
				playerList += "" + players[i]["team"] + "\n";



				let all : ccapi.ArmyList = ccapi.fromCode(player["cccode"]);

				for( let j : number = 0; j < all.subLists.length; j++ ) {
					listsList += "" + (parseInt(players[i]["uid"]) * 2 + j) + ",";
					listsList += players[i]["uid"] + ",";
					listsList += "" + fid + ",";

					if( all.subLists[j].casters.length == 0 ) {
						listsList += "\"none\",";
					}
					else {
						listsList += "\"" + all.subLists[j].casters[0].entry.v + "\",";
					}
					let textList : string = all.subLists[j].getTextList();
					textList = textList.replace(/\n/g, "\\n");
					textList = textList.replace(/"/g, "\"\"");

					listsList += "\"" + textList + "\",";
					listsList += "\"" + player["cccode"] + "\"\n";

				}



			}
		}


		let factionList : string = "";
		factionList += "1,\"Cygnar\"\n";
		factionList += "2,\"Protectorate of Menoth\"\n";
		factionList += "3,\"Khador\"\n";
		factionList += "4,\"Cryx\"\n";
		factionList += "5,\"Retribution of Scyrah\"\n";
		factionList += "6,\"Mercenaries\"\n";
		factionList += "7,\"Trollbloods\"\n";
		factionList += "8,\"Circle Orboros\"\n";
		factionList += "9,\"Skorne\"\n";
		factionList += "10,\"Legion of Everblight\"\n";
		factionList += "11,\"Minions\"\n";
		factionList += "12,\"Convergence of Cyriss\"\n";
		factionList += "14,\"Grymkin\"\n";
		factionList += "15,\"Crucible Guard\"\n";

		zip.file("factions.csv", factionList);
		zip.file("teams.csv", teamList);
		zip.file("players.csv", playerList);
		zip.file("lists.csv", listsList);

		zip.generateAsync({type:"blob"})
		.then(function(content) {
			// see FileSaver.js
			//ccweb.download("example.zip", content);
			//console.log(content);
			ccweb.downloadBlob(_eventData["name"].replace(/ /g, "_") + "_csv.zip", content);
		});
	});

}


function downloadJSONNew() {

	if( !_eventData || !_eventData["players"]) {
		return;
	}

	baseDownloadJSON(_eventData["players"]);
}

export function showEvent(eid : number, skipHistory? : boolean, regCode? : string) : void {
	hideAll();

	let flow : ccweb.Flow = new ccweb.Flow("eventflow");

	setMainFocus(flow.container);

	flow.loadingScreen("Loading event...");

	getEvent(flow, eid, skipHistory, gotEvent, regCode);
}

let _editRegcode : HTMLInputElement = null;
let _submitResults : HTMLDivElement = null;


function displaySubmittedList(loggedIn : boolean,
			submitResults : HTMLDivElement, respBase : string,
			listCode : string, rules : ccapi.Rules,
			isValidated : boolean, validIcon : HTMLDivElement,
			listWarning : HTMLDivElement) {

	while( submitResults.hasChildNodes() ) {
		submitResults.removeChild(submitResults.lastChild);
	}

	if( loggedIn ) {
		if( respBase && respBase.substr(0, 3) == "Inv" ) {
			submitResults.appendChild(document.createTextNode(respBase));
		}
		else if( listCode ) {
			submitResults.appendChild(document.createTextNode("This is your submitted list as retrieved from our records:"));

			if( !isValidated ) {
				let warn : HTMLDivElement = document.createElement("div");
				warn.className = "listsubwarning";
				warn.appendChild(document.createTextNode("Note! Your currently submitted list fails the validation required for this event; please correct these problems before the list submission deadline."));
				submitResults.appendChild(warn);
			}

			//console.log(rules);

			submitResults.appendChild(ccweb.Editor.displayList(listCode, rules));

		}
		else {
			submitResults.appendChild(document.createTextNode("You have no submitted list."));
		}
	}
	else {
		submitResults.appendChild(document.createTextNode("Login error on submission."));
	}

	if( validIcon ) {
		let warningText : string = "No list submitted";
		let iconClass : string = "teameventfail";

		if( listCode ) {
			if( isValidated ) {
				warningText = "List validated";
				iconClass = "teameventpass";
			}
			else {
				warningText = "Invalid list submitted";
				iconClass = "teameventwarn";
			}
		}

		while( listWarning.hasChildNodes() ) {
			listWarning.removeChild(listWarning.lastChild);
		}

		listWarning.appendChild(document.createTextNode(warningText));
		validIcon.className = iconClass;
	}


	submitResults.style.display = "block";
}

function gotSubmission(loggedIn : boolean, respBase : string,
			submitResults : HTMLDivElement, teamVal : HTMLDivElement,
			validIcon? : HTMLDivElement, listWarning? : HTMLDivElement) : void {
	let listCode : string = "";
	let isValidated : boolean = false;
	let rulesText : string = null;

	if( respBase && respBase.length > 0
		&& respBase != "null" && respBase != "false") {
		let parsedResponse : any = JSON.parse(respBase);

		isValidated = parsedResponse["valid"];
		listCode = parsedResponse["code"];
		rulesText = parsedResponse["rules"];

		if( teamVal ) {

			teamVal.firstElementChild.className =
				parsedResponse["teamvalidated"] ? "teamvalpass" : "teamvalfail";
			teamVal.lastElementChild.textContent =
				parsedResponse["teamvalidation"];

		}
	}

	let rules : ccapi.Rules =
		{ ignorePreRelease : true };


	if( rulesText ) {
		//console.log(rulesText);
		rules = <ccapi.Rules>(JSON.parse(rulesText));
	}

	displaySubmittedList(loggedIn, submitResults, respBase, listCode,
		rules, isValidated, validIcon, listWarning);
}


let _eventData : any = null;

export function printBlankSteamroller() : void {
	if( !_eventData ) {
		return;
	}

	if( _eventData["logo"] ) {
		let img : HTMLImageElement = new Image();
		img.onload = function() { printBlankSteamroller2(); }
		img.src = _eventData["logo"];
	}
	else {
		printBlankSteamroller2();
	}

}

function printSteamrollerSheetsNew() : void {
	if( !_eventData || !_eventData["players"]) {
		return;
	}

	if( _eventData["logo"] ) {
		let img : HTMLImageElement = new Image();
		img.onload = function() { printSteamrollerSheetsNew2(); }
		img.src = _eventData["logo"];
	}
	else {
		printSteamrollerSheetsNew2();
	}
}


let _pdfSheetIndex : number = 0;
let _pdfTeamMap : any = null;
let _pdfRules : ccapi.Rules = null;
let _pdfPlayers : any = null;
let _pdfDoc : CCPDFDocument = null;

function processSheet() : void {
	if( _pdfPlayers[_pdfSheetIndex]["submission"] ) {

		let teamName : string = null;

		ccweb.Dialog.progress("Processing player " + (_pdfSheetIndex+1) + " of "
			+ _pdfPlayers.length + "...");

		if( _pdfPlayers[_pdfSheetIndex].team && _pdfTeamMap[_pdfPlayers[_pdfSheetIndex].team] ) {
			teamName = _pdfTeamMap[_pdfPlayers[_pdfSheetIndex].team].name;
		}


		let al : ArmyList = 
			ArmyList.fromCode(_pdfPlayers[_pdfSheetIndex]["submission"]);

		_pdfDoc.renderArmyList(al, _pdfPlayers[_pdfSheetIndex]["name"], teamName, _pdfRules);
	
		// div.appendChild(ccweb.Editor.buildSheet(
		// 	players[i]["submission"],
		// 	players[i]["name"],
		// 	teamName,
		// 	eventData()["logo"],
		// 	eventData()["name"],
		// 	eventData()["rounds"]
		// ));
	}

	_pdfSheetIndex++;

	if( _pdfSheetIndex < _pdfPlayers.length ) {
		setTimeout(processSheet, 0);
	}
	else {
		ccweb.Dialog.progress("Finalizing printout...");
		setTimeout(finalizeSheet, 0);
	}

}

function finalizeSheet() : void {
    _pdfDoc.end();
	_pdfDoc.print(() => { ccweb.Dialog.endProgress(); });
}

function docReady(doc : CCPDFDocument, players : any, teams : any) : void {
	let rules : ccapi.Rules = <ccapi.Rules>JSON.parse(eventData()["rules"]);

	// console.log(rules);
	
	_pdfTeamMap = {};
	_pdfRules = rules;

	if( teams.length > 0 ) {
		for( let team of teams ) {
			_pdfTeamMap[team.uid] = team;
		}
	}	

	_pdfPlayers = players;

	_pdfDoc = doc;

	setTimeout(processSheet, 0);

	// for( let i : number = 0; i < players.length; i++ ) {

	// }
}


export function basePrintSteamrollers(players: any, teams: any) {

	// console.log("basePrintSteamrollers");

	// if( true ) {
		ccweb.Dialog.progress("Loading PDF Resources...");

		let doc : CCPDFDocument = new CCPDFDocument({
			rounds: eventData()["rounds"] ? eventData()["rounds"] : 5,
			title: eventData()["name"],
			logo: null
		}, (doc) => docReady(doc, players, teams));


	// 	return;
	// }

	// let div : HTMLDivElement = ccweb.Editor.clearPrintout();

	// let teamMap : any = {};

	// if( teams.length > 0 ) {
	// 	for( let team of teams ) {
	// 		teamMap[team.uid] = team;
	// 	}
	// }

	// let first : boolean = true;

	// for( let i : number = 0; i < players.length; i++ ) {
	// 	if( players[i]["submission"] ) {
	// 		if( first ) {
	// 			first = false;

	// 			let pageBreak : HTMLDivElement = document.createElement("div");
	// 			pageBreak.className = "page-break";
	// 			div.appendChild(pageBreak);
	// 		}

	// 		let teamName : string = null;

	// 		if( players[i].team && teamMap[players[i].team] ) {
	// 			teamName = teamMap[players[i].team].name;
	// 		}

	// 		div.appendChild(ccweb.Editor.buildSheet(
	// 			players[i]["submission"],
	// 			players[i]["name"],
	// 			teamName,
	// 			eventData()["logo"],
	// 			eventData()["name"],
	// 			eventData()["rounds"]
	// 		));
	// 	}
	// }

	// if( !first ) {
	// 	window.print();
	// }
}

function printSteamrollerSheetsNew2() : void {
	basePrintSteamrollers(_eventData["players"], _eventData["teams"]);
}


function buildTeamInterface(players : any, eid : number, ra : HTMLDivElement,
			otherRules : ccapi.Rules, editControl : HTMLInputElement,
			teamValidated : boolean, teamValidation : string,
			teamEmail : string, teamRegCode : string, teamName : string) {

	let teamData : any = {};
	teamData["event"] = eid;
	teamData["email"] = teamEmail;
	teamData["name"] = teamName;
	teamData["regcode"] = teamRegCode;
	teamData["playerNames"] = [];

	for( let i : number = 0; i < players.length; i++ ) {
		teamData["playerNames"].push(players[i].name);
	}


	let teamTitle : HTMLDivElement = document.createElement("div");
	teamTitle.className = "eventteamtitle";
	teamTitle.appendChild(document.createTextNode(teamName));

	ra.appendChild(teamTitle);
	

	ra.appendChild(new ccweb.Button({
		text: "Edit Team",
		size: "largefixed",
		click: ((td : any) => {
			return () => {
				console.log(td);
	
				editTeam(td, () => {
					if( _refreshTeam ) {
						_refreshTeam();
					}
				});
			};
		})(teamData)
	}).container);

	if( _eventData["alternates"] > 0 ) {
		// let addAltButton : HTMLDivElement = document.createElement("div");
		// addAltButton.className = "lb bh jsonbut";
		// addAltButton.appendChild(document.createTextNode("Add Alternate"));

		// addAltButton.onclick = ((regCode : string) => {
		// 	return () => {
		// 		ajaxPost(api("/addalternate"),
		// 		(resp : string) => {
		// 			if( _refreshTeam ) {
		// 				_refreshTeam();
		// 			}
		// 		},
		// 		"regcode=" + encodeURIComponent(regCode));
		// 	};
		// })(teamRegCode);

		// ra.appendChild(addAltButton);

		ra.appendChild(new ccweb.Button({
			text: "Add Alternate",
			size: "largefixed",
			click: ((regCode : string) => {
				return () => {
					ajaxPost(api("/addalternate"),
					(resp : string) => {
						if( _refreshTeam ) {
							_refreshTeam();
						}
					},
					"regcode=" + encodeURIComponent(regCode));
				};
			})(teamRegCode)
		}).container);
	}




	let teamValDiv : HTMLDivElement = document.createElement("div");
	teamValDiv.className = "teamval";

	let teamValIcon : HTMLDivElement = document.createElement("div");
	teamValIcon.className = teamValidated ? "teamvalpass" : "teamvalfail";
	teamValDiv.appendChild(teamValIcon);

	let teamValText : HTMLDivElement = document.createElement("div");
	teamValText.innerText = teamValidation;
	teamValDiv.appendChild(teamValText);

	ra.appendChild(teamValDiv);

	//for( let player of players ) {
	for( let i : number = 0; i < players.length; i++ ) {
		let player = players[i];
		//console.log(player);


		let playerDiv : HTMLDivElement = document.createElement("div");
		playerDiv.className = "regteamplayer";

		if( i >= eventData()["team_size"]) {
			playerDiv.className += " regalt";
		}

		let nameSpan : HTMLSpanElement = document.createElement("span");


		nameSpan.appendChild(document.createTextNode(player.name));
		playerDiv.appendChild(nameSpan);

		let toggleButton = new ccweb.Button({
			text: "Show List",
			size: "medium",
			className: "regteamshowlist"
		});

		playerDiv.appendChild(toggleButton.container);

		let editButton = new ccweb.Button({
			text: "Edit List",
			size: "medium",
			className: "regteameditlist"
		});

		playerDiv.appendChild(editButton.container);


		let validIcon : HTMLDivElement = document.createElement("div");
		//validIcon.className = iconClass;
		playerDiv.appendChild(validIcon);


		let listWarning : HTMLDivElement = document.createElement("div");
		//listWarning.appendChild(document.createTextNode(warningText));
		playerDiv.appendChild(listWarning);

		let playerList : HTMLDivElement = document.createElement("div");
		playerList.className = "telh";
		playerList.style.display = "none";

		displaySubmittedList(true, playerList, null, player["code"],
			otherRules, player["valid"], validIcon, listWarning);

		playerList.style.display = "none";

		playerDiv.appendChild(playerList);

		toggleButton.setClick(((myList : HTMLDivElement) => {

			return (button : ccweb.Button) => {
				if( myList.style.display == "none" ) {
					myList.style.display = "block";
					button.changeText("Hide List");
				}
				else {
					myList.style.display = "none";
					button.changeText("Show List");
				}
			};

		})(playerList));

		editButton.setClick(((eventId : number, myPlayer : any, toggle : ccweb.Button) => {

			return () => {
				if( _tsEditor && _tsEditor.visible() ) {
					return;
				}

				let editor: ccweb.Editor = new ccweb.Editor(
						null,
						-1, 
						null,
						"Submit list",
						otherRules,
						() => {
							if( _tsEditor ) {
								_tsEditor.hide();
							}

							let listCode : string =
								_tsEditor.currentList.al.toCode();

							myPlayer["code"] = listCode;

							//console.log("Submit called");
							//console.log(listCode);

							if( editControl ) {
								ajaxPost(api("/submitregcode/" + eventId),
									(s : string) => {
										gotSubmission(true, s, playerList, teamValDiv, validIcon, listWarning);
										toggle.changeText("Hide List");
									},
									"regcode=" + encodeURIComponent(editControl.value)
									+ "&listcode=" + encodeURIComponent(listCode)
									+ "&playerindex=" + encodeURIComponent(player["index"]));
							}
							else {
								authAjax(api("/submitauthcode/" + eventId),
									"listcode=" + encodeURIComponent(listCode)
									+ "&playerindex=" + encodeURIComponent(player["index"]),
									(li : boolean, s : string) => {
										gotSubmission(li, s, playerList, teamValDiv, validIcon, listWarning);
										toggle.changeText("Hide List");
									});
							}
						});

				editor.setEventMode(true);


				let listCode : string = player["code"];

				if( listCode && listCode.length > 3 ) {
					editor.restoreCode(listCode);
				}

				editor.show();

				_tsEditor = editor;
			};

		})(eid, player, toggleButton));

		ra.appendChild(playerDiv);
	}
}



function regCodeAuthenticated2(autoReg : HTMLDivElement, entryReg : HTMLDivElement,
		eventId : number, otherRules : ccapi.Rules, edit : HTMLInputElement) {

	let innerFunction = onAuthenticatedRegistration(autoReg, entryReg,
		eventId, otherRules, edit);

	return function(respBase : string) {
		innerFunction(true, respBase);
	}
}


function onAuthenticatedRegistration(autoReg : HTMLDivElement,
		entryReg : HTMLDivElement, eventId : number, otherRules : ccapi.Rules,
		edit : HTMLInputElement) {

	return function(li : boolean, respBase : string) {

		if( entryReg.style.display == "none" ) {
			while( autoReg.hasChildNodes() ) {
				autoReg.removeChild(autoReg.lastChild);
			}

			autoReg.appendChild(document.createTextNode("Your team is registered for this event. "));

			//return;
		}

		let resp : string = "false";
		let isValidated : boolean = false;
		let rulesText : string = null;
		let players : any = null;
		let teamValidated : boolean = false;
		let teamValidation : string = "Unknown";
		let regCode : string = null;
		let playerEmail : string = null;
		let playerName : string = null;

		let rules : ccapi.Rules = ccweb.Editor.defaultRules;
			//{ ignorePreRelease : true };

		if( respBase && respBase.length > 0
			&& respBase != "null" && respBase != "false") {
			let parsedResponse : any = JSON.parse(respBase);

			if( parsedResponse.players ) {
				players = parsedResponse.players;
			}
			else {
				isValidated = parsedResponse["valid"];
				resp = parsedResponse["code"];
			}

			regCode = parsedResponse["regcode"];
			playerEmail = parsedResponse["email"];
			rulesText = parsedResponse["rules"];

			if( rulesText ) {
				rules = <ccapi.Rules>(JSON.parse(rulesText));
				//console.log(rules);
			}
		
			playerName = parsedResponse["name"];

			teamValidated = parsedResponse["validated"];
			teamValidation = parsedResponse["validation"];
		}
		else {
			autoReg.style.display = "none";
			entryReg.style.display = "block";

			if( edit ) {
				edit.value = "";
				edit.focus();

				//alert("Invalid validation code.");
				_submitResults.innerText = "Invalid validation code.";
				_submitResults.style.display = "block";
			}

			return;
		}


		autoReg.style.display = "block";
		entryReg.style.display = "none";

		if( players ) {
			buildTeamInterface(players, eventId, autoReg,
				otherRules, edit, teamValidated, teamValidation,
				playerEmail, regCode, playerName);
		}
		else {
			displaySubmittedList(li, _submitResults, respBase, resp,
				rules, isValidated, null, null);


			autoReg.appendChild(new ccweb.Button({
				text: "Launch Editor",
				size: "largefixed",
				click:  ((eventId : number, listCode : string,
						editControl : HTMLInputElement) => {
					return () => {
						if( _tsEditor ) {
							_tsEditor.show();
						}
						else {


							let editor: ccweb.Editor = new ccweb.Editor(
									null,
									-1,
									null,
									"Submit list",
									otherRules,
									() => {
										if( _tsEditor ) {
											_tsEditor.hide();
										}

										let listCode : string =
											_tsEditor.currentList.al.toCode();

										if( editControl ) {
											ajaxPost(api("/submitregcode/" + eventId),
												(s : string) => {
													gotSubmission(true, s, _submitResults, null);
												},
												"regcode=" + encodeURIComponent(editControl.value)
												+ "&listcode=" + encodeURIComponent(listCode));
										}
										else {
											authAjax(api("/submitauthcode/" + eventId),
												"listcode=" + encodeURIComponent(listCode),
												(li : boolean, s: string) => {
													gotSubmission(li, s, _submitResults, null);
												});
										}
									});

							editor.setEventMode(true);


							if( listCode && listCode.length > 3 ) {
								editor.restoreCode(listCode);
							}
							
							editor.show();

							_tsEditor = editor;
						}

					};
				})(eventId, resp, edit)
			}).container);
		}

	};

}

function authenticatedRegistration(re : HTMLDivElement, ra: HTMLDivElement,
			eid : number, otherRules : ccapi.Rules) {

	return onAuthenticatedRegistration(ra, re, eid,
		otherRules, null);
}


function printBlankSteamroller2() : void {
	let div : HTMLDivElement = ccweb.Editor.clearPrintout();

	div.appendChild(ccweb.Editor.buildSheet(
		null,
		null,
		null,
		_eventData["logo"],
		_eventData["name"],
		_eventData["rounds"]
	));

	window.print();
}

export function buildEventHeader(content : HTMLDivElement, ev : any, rules : ccapi.Rules) : void {
	let cover : HTMLDivElement = document.createElement("div");
	cover.className = "eventcover";

	if( ev["cover"] ) {
		cover.style.backgroundImage = "url(\""+ ev["cover"] + "\")";
	}
	else {
		cover.style.backgroundImage = "url(\"img/event_default.jpg\")";
	}

	content.appendChild(cover);

	let picouter : HTMLDivElement = document.createElement("div");
	picouter.style.position = "relative";
	picouter.style.width = "0px";
	picouter.style.height = "0px;"

	let picanchor : HTMLAnchorElement = document.createElement("a");
	picanchor.className = "eventanchor";
	picanchor.href = ev["url"];
	picanchor.target = "_blank";

	if( ev["inset"]) {
		let picture : HTMLDivElement = document.createElement("div");
		picture.className = "eventpicture";
		picture.style.backgroundImage = "url(\"" + ev["inset"] + "\")";

		picanchor.appendChild(picture);
		picouter.appendChild(picanchor);
		content.appendChild(picouter);
	}


	let fadediv : HTMLDivElement = document.createElement("div");
	fadediv.className = "eventfade";
	content.appendChild(fadediv);

	let titlediv : HTMLDivElement = document.createElement("div");
	titlediv.className = "eventtitle";
	titlediv.appendChild(document.createTextNode(ev["name"]));
	content.appendChild(titlediv);


	let init = new ccweb.Card({
		size: "half",
		title: "Event Details",
		icon: "event"
	});

	// let initdiv : HTMLDivElement = document.createElement("div");
	// initdiv.className = "eventinit";

	let isp : HTMLSpanElement = null;



	if( rules && rules.postedEventDate ) {
		let d : Date = new Date(rules.postedEventDate);
		init.addLine(formatDateLong(d), "event");
	}
	else if( rules && rules.preReleaseDate ) {
		let d : Date = new Date(rules.preReleaseDate);
		init.addLine(formatDateLong(d), "event");
	}

	if( ev["submission_deadline"] ) {
		init.addLine("Submissions due: " + ev["submission_deadline"], "alarm");
	}

	if( ev["regtype"] == 3 ) {
		init.addLine("Pre-registration required", "assignment_turned_in");
	}
	else if( ev["regtype"] == 4 ) {
		init.addLine("Registration is closed", "lock");
	}
	else if( ev["regtype"] == 5 ) {
		init.addLine("Lists published", "airplay");
	}
	else if( ev["regtype"] == 6 ) {
		init.addLine("Unpublished results", "live_help");
	}
	else if( ev["regtype"] == 7 ) {
		init.addLine("Tournament results", "account_balance");
	}
	else if( ev["regtype"] == 8 ) {
		init.addLine("Open registration", "how_to_vote");
	}



	if( ev["team_size"] > 1 ) {
		let text : string = "" + ev["team_size"] + " player teams";

		if( ev["alternates"] > 0 ) {
			text += "; " + ev["alternates"] + " alternate";

			if( ev["alternates"] > 1 ) {
				text += "s";
			}
		}

		init.addLine(text, "group");
	}

	if( rules ) {
		let rulesText = "" + rules.listSize + " point";

		if( rules.oblivion ) {
			rulesText += " Oblivion";
		}

		if( !rules.listType.champions && rules.listType.maxLists == 2 && rules.listType.minLists == 2 ) {
			rulesText += " Masters Dyad";
		}
		else if( !rules.listType.champions && rules.listType.maxLists == 3 && rules.listType.minLists == 3 ) {
			rulesText += " Masters Triad";
		}
		else if( rules.listType.champions && rules.listType.maxLists == 2 /*&& rules.listType.minLists == 2*/ ) {
			rulesText += " Champions";
		}
		// else if( rules.listType.champions && rules.listType.maxLists == 3 && rules.listType.minLists == 3 ) {
		// 	rulesText += " Champions Triad";
		// }
		else {
			if( rules.listType.minLists == rules.listType.maxLists ) {
				rulesText += " " + rules.listType.minLists + " list";
			}
			else {
				rulesText += " " + rules.listType.minLists + "-" +
					rules.listType.maxLists + " list";
			}

			if( rules.listType.champions ) {
				rulesText += " Champions";
			}
			else if( rules.listType.adr ) {
				rulesText += " Masters";
			}
			else {
				rulesText += " Steamroller";
			}

		}

		init.addLine(rulesText, "assessment");
	}

	if( ev["url"] ) {
		let url : HTMLAnchorElement = document.createElement("a");
		url.href = ev["url"];
		url.appendChild(document.createTextNode(ev["url"]));

		init.addLine(url, "link");
	}

	content.appendChild(init.container);


	if( ev["address"]) {
		let mapCard = new ccweb.Card({
			size: "half",
			extraClass: "mapcard"
		});

		content.appendChild(mapCard.container);

		let map : HTMLIFrameElement = document.createElement("iframe");
		map.src = "https://www.google.com/maps/embed/v1/place?key=AIzaSyCH0_vev1nugnX5lBqc1xltOIUB2ke8nps&q="
			+ encodeURIComponent(ev["venue_name"] + "," + ev["address"]);

		map.setAttribute("allowfullscreen", "");
		map.setAttribute("width", "" + (mapCard.container.offsetWidth - 3));
		map.setAttribute("height", "260");
		map.frameBorder = "0";

		mapCard.add(map);

	}

	
}

function gotEvent(flow : ccweb.Flow, eid : number, skipHistory : boolean, 
		s : string, regCode : string) 
{
	flow.clear();

	let ev : any = null;
	let rules : ccapi.Rules = null;

	//console.log(s);

	try {
		ev = JSON.parse(s);
		rules = <ccapi.Rules>JSON.parse(ev["rules"]);
	}
	catch(err)
	{
		flow.add(document.createTextNode("Event not found"));
		return;
	}


	_eventData = ev;


	manageHistory(ev["name"], "event=" + eid, skipHistory);

	buildEventHeader(flow.content, ev, rules);


	if( ev["regtype"] == 4 ) {
		_submitResults = document.createElement("div");
		_submitResults.className = "eventsubmitresults";
		_submitResults.style.display = "none";

		//_submitButton = document.createElement("div");
		let regauto : HTMLDivElement = document.createElement("div");


		// let subdiv : HTMLDivElement = document.createElement("div");
		// subdiv.className = "regsub";
		// subdiv.appendChild(document.createTextNode(
		// 	`List registration for this event is closed.`));

		// tourn.appendChild(subdiv);

		let sub = new ccweb.Card({
			size: "full",
			title: "Registration",
			icon: "assignment"
		});

		sub.add("List registration for this event is closed.");
		flow.add(sub.container);
	}

	let publicLists : boolean = 
		ev["regtype"] == 5 || ev["regtype"] == 6 || ev["regtype"] == 7;

	if( publicLists ) {
		flow.add(buildStatsInterface(ev["players"]).container);
		//tourn.appendChild(document.createElement("hr"));
	}


	let teamMap : any = {};
	let teamCount : any = {};

	let playerCard : ccweb.Card = null;

	if( ev["teams"] && ev["teams"].length > 0 ) {
		//console.log("loading teams");

		for( let i : number = 0; i < ev["teams"].length; i++) {
			let failed : boolean = !ev["teams"][i]["validated"];

			// if( failed ) {
			// 	dadd(theader, "", "valfailbig");
			// }
			// else {
			// 	dadd(theader, "", "valpassbig");
			// }

			let valtext : string = ev["teams"][i]["validation"];

			// valreport.appendChild(document.createTextNode(valtext));



			let theader = new ccweb.Card({
				title: ev["teams"][i]["name"],
				icon: "group",
				subtitle: valtext,
				expand: true,
				startClosed: true,
			});

			flow.add(theader.container);
			teamMap[ev["teams"][i]["uid"]] = theader.content;


		}
	}
	else if( publicLists ) {
		playerCard = new ccweb.Card({
			title: "Players",
			icon: "group",
		});
	
		flow.add(playerCard.container);
	}

	//console.log(ev);

	if( ev["players"] ) {

		for( let i : number = 0; i < ev["players"].length; i++ ) {

			let faction : string = null;
			let icon : string = "done_outline";
			let slist : string = null;

			if( ev["players"][i]["submission"] ) {
				slist  = ev["players"][i]["submission"];

				let fid = ccapi.decodeCharSingle(slist, 1);

				if( (fid & 16) == 16 ) {
					fid -= 16;
				}

				if( fid == 0 ) {
					fid = 16;
				}

				faction = ccapi.Data._data.factions[fid].n;

				let tv = ccweb.Editor.tournamentValidation(slist,
					{ ignorePreRelease : true });

				if( tv.failureCount == 0 )
				{
					icon = "done_outline";
				}
				else
				{
					icon = "warning";
				}

				if( ev["regtype"] == 7 || ev["regtype"] == 6 ) {
					//status = "place";
					//icon = "looks_one";
					let placeNum = parseInt(ev["players"][i]["place"]);

					if( placeNum >= 0 && placeNum <= 6 ) {
						icon = ["reorder", "looks_one", "looks_two",
							"looks_3", "looks_4", "looks_5", "looks_6"][placeNum];
					}
					else {
						icon = "reorder";
					}
				}
				
			}
			else {
				icon = "contact_support";
			}

			let alternate : boolean = false;

			let pheader = new ccweb.Subheader({
				title: ev["players"][i].name,
				icon: icon,
				expand: true,
				startClosed: true,
				subtitle: faction,
				onOpen: (function(
						myList : string,
						myRules : ccapi.Rules) {
		
					return function(sh : ccweb.Subheader) {
						if( !sh.content.hasChildNodes() ) {
							sh.content.appendChild(
								ccweb.Editor.displayList(myList, myRules)
							);
						}
		
					};
				})(slist, rules)
			});

	



			// todo - fix place

			//let place : string = "";
			//dadd(pheader, place);

			//dadd(pheader, ev["players"][i]["name"]);

			if( ev["players"][i]["team"] && teamMap[ev["players"][i]["team"]] ) {
				teamMap[ev["players"][i]["team"]].appendChild(pheader.container);

				if( !teamCount[ev["players"][i]["team"]] ) {
					teamCount[ev["players"][i]["team"]] = 1;
				}
				else {
					teamCount[ev["players"][i]["team"]]++;
				}

				if( teamCount[ev["players"][i]["team"]] > eventData()["team_size"] ) {
					alternate = true;
				}
			}
			else {
				playerCard.add(pheader);
			}

			// if( alternate ) {
			// 	//pheader.className += " pheaderalt";
			// 	// todo: fix alternate
			// }
		}

	}

	let finalizeFunc : () => void = null;

	if( ev["regtype"] == 3 || ev["regtype"] == 4 || ev["regtype"] == 5 
		|| ev["regtype"] == 6 || ev["regtype"] == 7 || ev["regtype"] == 8 ) {

		if( ev["logo"] ) {
			let img : HTMLImageElement = document.createElement("img");
			img.className = "eventlogo";
			img.src = ev["logo"];
			flow.add(img);

			img.style.display = "none";
		}

		if( ev["regtype"] == 3 || ev["regtype"] == 8 ) {
			_submitResults = document.createElement("div");
			_submitResults.className = "eventsubmitresults";
			_submitResults.style.display = "none";

			let regauto : HTMLDivElement = document.createElement("div");

			let sub = new ccweb.Card({
				title: "Registration",
				size: "full",
				icon: "assignment"
			});

			if( ev["regtype"] == 3 ) {
				sub.add(
					`This event requires pre-registration; if you have recieved a
					registration code, enter it below or log in (using the login
					buttons at the top of the page) with a Google or Facebook
					account attached to an email address registered with the
					event organizer.`);
	
			}
			else {
				sub.add(
					`This is an open registration event.  If you are logged 
					in to Conflict Chamber with a Google or Facebook account,
					you can submit a registration to the event.`);
			}

			let r : any = JSON.parse(ev["rules"]);

			r.preReleaseDate = new Date(r.preReleaseDate);

			let r2 : ccapi.Rules = <ccapi.Rules>(r);


			let regentry : HTMLDivElement = document.createElement("div");
			regentry.className = "regentry";

			if( ev["regtype"] == 3 ) {
				regentry.appendChild(document.createTextNode("Registration code: "));

				let regedit : HTMLInputElement = document.createElement("input");
				regedit.type = "text";

				if( regCode && regCode.length > 0 ) {
					regedit.value = regCode;
				}

				regentry.appendChild(regedit);

				let launchButton = new ccweb.Button({
					text: "Submit Code",
					size: "largefixed",
					click : ((edit : HTMLInputElement, eventId : number,
							autoReg : HTMLDivElement, entryReg : HTMLDivElement) => {
						return () => {
							if( !edit.value || edit.value == "") {
								//alert("Please enter a validation code.");
								_submitResults.innerText = "Please enter a validation code.";
								_submitResults.style.display = "block";
							}
							else {
								if( _eventData["team_size"] > 1 ) {
									_refreshTeam = (() => {
		
										return () => {
											ajaxPost(api("/checkteamreg/" + eventId),
												regCodeAuthenticated2(autoReg, entryReg, eventId,
													r2, edit),
												"code=" + edit.value);
										};
		
									})();
		
									_refreshTeam();
								}
								else {
									ajaxPost(api("/checkreg/" + eventId),
										regCodeAuthenticated2(autoReg, entryReg, eventId,
											r2, edit),
										"code=" + edit.value);
								}
							}
						};
					})(regedit, eid, regauto, regentry)
				});


				let regEnter : (event : any) => void = ((f : any) => {
					return function(e : any) {
						e.preventDefault();
	
						if( e.keyCode == 13 ) {
							f();
						}
					}
				})(launchButton.click);
				
				if( regCode && regCode.length > 0 ) {
					finalizeFunc = () => {
						launchButton.click(null);
					};
				}
	
				regedit.addEventListener("keyup", regEnter);
	
				regentry.appendChild(launchButton.container);
				
					
			}
			else {
				let submitreg = () => {
					regentry.appendChild(new ccweb.Button({
						text: "Register for Event",
						size: "largefixed",
						click: () => {
							authAjax(api("/selfreg/" + eid),
								null,
								authenticatedRegistration(regentry, regauto, eid, r2));
						}
					}).container);
				};

				if( (<any>window)._idToken ) {
					submitreg();
				}
				else {
					if( (<any>window)._loginCallback == null ) {
						(<any>window)._loginCallback = [];
					}

					(<any>window)._loginCallback.push(submitreg);
				}
			}


			sub.add(regentry);

			regauto.className = "regauto";
			regauto.style.display = "none";

			if( _eventData["team_size"] > 1 ) {
				regauto.appendChild(document.createTextNode("Your team is registered for this event. "));
			}
			else {
				regauto.appendChild(document.createTextNode("You are registered for this event. "));
			}

			sub.add(regauto);

			sub.add(_submitResults);

			flow.add(sub.container);

			if( _eventData["team_size"] > 1 ) {
				_refreshTeam = () => {
					authAjax(api("/isregteam/" + eid),
						null,
						authenticatedRegistration(regentry, regauto, eid, r2));
				};

				_refreshTeam();
			}
			else {
				authAjax(api("/isreg/" + eid),
					null,
					authenticatedRegistration(regentry, regauto, eid, r2));
			}
		}

		authAjax(api("/eventreg/" + eid),
			null,
			((eventId : number) => {
				return (loggedIn : boolean, s: string) => {
					gotEventRegistration(eventId, loggedIn, s);
				};
			})(eid)
			);


		let staffDiv = initStaffUI();


		staffDiv.style.display = "none";
		flow.add(staffDiv);
	}



	if( ev["regtype"] == 5 ) {
		let utils = new ccweb.Card({
			title: "Utilities",
			icon: "developer_board",
			size: "half"
		});

		utils.add(new ccweb.Button({
			text: "Print Steamroller Sheets",
			size: "largefixed",
			click: printSteamrollerSheetsNew
		}));

		utils.add(new ccweb.Button({
			text: "Download JSON",
			size: "largefixed",
			click: downloadJSONNew
		}));

		utils.add(new ccweb.Button({
			text: "Download CSV",
			size: "largefixed",
			click: downloadCSV
		}));
		


		flow.add(utils.container);
	}

	//tourn.appendChild(buttondiv);

	// sepLine = document.createElement("div");
	// sepLine.className = "formsepline";
	// tourn.appendChild(sepLine);

	let fbHolder : HTMLDivElement = document.createElement("div");
	fbHolder.className = "fbcommentsholder";

	let fbComments : HTMLDivElement = document.createElement("div");
	fbComments.className = "fb-comments";
	fbComments.setAttribute("data-href",
		"https://conflictchamber.com/?event=" + eid);
	fbComments.setAttribute("data-width", "780");
	fbComments.setAttribute("data-numposts", "5");
	fbComments.setAttribute("data-colorscheme", "light");
	fbComments.setAttribute("data-order-by", "time");

	fbHolder.appendChild(fbComments);
	flow.add(fbHolder);

	(<any>window).fbOb.XFBML.parse();

	if( finalizeFunc ) {
		finalizeFunc();
	}
}


export function buildStatsInterface(players : any, staffOnly? : boolean) : ccweb.Card {
	return new ccweb.Card({
		size: "full",
		title: "Event Submission Statistics"
			+ (staffOnly ? " (Staff Only)" : ""),
		icon: "pie_chart",
		expand: true,
		startClosed: true,
		onOpen: (function(playerData : any) {

			return function(card : ccweb.Card) {
				if( !card.content.hasChildNodes() ) {
					card.content.appendChild(buildStats(playerData));
				}
			};
			})(players)
	});
}
