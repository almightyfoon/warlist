
import * as ccapi from "../ccapi/ccapi";
import * as ccweb from "../ccweb/ccweb";

import { authAjax } from "./cclogin";
import { ajaxPost } from "./ccstorage";
import { api, formatDate, eventData,
		printBlankSteamroller, basePrintSteamrollers,
		baseDownloadJSON, buildStatsInterface } from "./cctourn";
import { submitAuthorized } from "./ccsubtourn";



let _staffUI : HTMLDivElement = null;
let _staffDiv : HTMLDivElement = null;
let _registrations : ccweb.Card = null;
let _registrantsDiv : HTMLDivElement = null;
let _listDiv : HTMLDivElement = null;
let _staffEditor : ccweb.Editor = null;


function buildStaffList(eventId : number, staff: any) : ccweb.Card {

	let card : ccweb.Card = new ccweb.Card({
		title: "Event Staff (Staff Only)",
		icon: "assignment_ind",
		size: "half",
	});

	let addStaffLine = (crd : ccweb.Card, email : string, before : HTMLDivElement) => {
		let line : ccweb.Line = new ccweb.Line();

		line
		.add(new ccweb.Indent())
		.add(new ccweb.Button({ 
			click : ((email : string, eid : number
						, stline : ccweb.UIElement) => {

				return function() {
					//console.log("About to remove " + email);

					//stline.style.display = "none";
					stline.hide();

					authAjax(api("/removestaff/" + eid),
						"email=" + encodeURIComponent(email),
						null);
				};

			})(email, eventId, line), 
			size: "tiny",
			icon: "clear" 
		}))
		.add(new ccweb.Indent("tiny"))
		.add(email);

		if( before ) {
			crd.content.insertBefore(line.container, before);
		}
		else {
			crd.add(line);
		}
	};

	for( let staffEntry of staff ) {
		if( staffEntry.email ) {
			addStaffLine(card, staffEntry.email, null);
		}
	}

	let ldiv : HTMLDivElement = document.createElement("div");
	ldiv.className = "staffregadd";

	let srline : HTMLDivElement = document.createElement("div");
	srline.className = "staffregline";
	srline.appendChild(document.createTextNode("Add event staff:"));
	ldiv.appendChild(srline);

	let sredit : HTMLInputElement = document.createElement("input");
	sredit.type = "text";

	ldiv.appendChild(sredit);

	card.add(ldiv);

	card.add(new ccweb.Button({
		text: "Add",
		size: "small",
		click: ((eid : number, staffEdit : HTMLInputElement, 
					crd : ccweb.Card, before : HTMLDivElement) => {
			return () => {
				let email : string = sredit.value;
				sredit.value = "";

				if( !email || email.length < 3 ) {
					return;
				}

				authAjax(api("/addstaff/" + eid),
					"email=" + encodeURIComponent(email),
					null);

				addStaffLine(crd, email, before);

			}
		})(eventId, sredit, card, ldiv)
	}));


	card.addLine(
		`Event staff are identified via email addresses and are verified
		through Google or Facebook login of an account matching that
		email address.`
	);

	return card;
}

function getEventDesc() : string {
	let eventDesc : string = "";

	if( eventData()["regtype"] == 3 ) {
		if( isTeamEvent() ) {
			eventDesc = `This event is set to require pre-registration and registration is enabled.
				Click "Disable registration" to close registration.`;
		}
		else {
			eventDesc = `This event is set to require pre-registration and registration is enabled.
				Click "Open registration" to switch to open registration or "Disable registration" 
				to close registration.`;
		}
	}
	else if( eventData()["regtype"] == 4 ) {
		if( isTeamEvent() ) {
			eventDesc = `Registration for this event is closed.  Click "Enable registration" to 
				enable registration (with pre-registration required).`;
		}
		else {
			eventDesc = `Registration for this event is closed.  Click "Enable registration" to 
				enable registration (with pre-registration required), or "Open registration" to 
				allow open registration.`;
		}
	}
	else if( eventData()["regtype"] == 5 ) {
		eventDesc = `This event is set to publish lists.  Click one of the registration forms to 
			switch to that registration form or "Hide lists" to hide submitted`;

	}
	else if( eventData()["regtype"] == 6 ) {
		eventDesc = `This is an unpublished DGI event result.`;
		
	}
	else if( eventData()["regtype"] == 7 ) {
		eventDesc = `This is a published DGI event result.`;
		
	}
	else if( eventData()["regtype"] == 8 ) {
		eventDesc = `This event has open registration.  Click "Disable registration" to 
		disable registration or "Use pre-registration" to require pre-registration.`;
	}

	return eventDesc;
}

function isTeamEvent() : boolean {
	return eventData()["team_size"] && eventData()["team_size"] > 1;	
}

function buildStaffInterface(eventId : number, staff : any)
{
	if( _staffUI.hasChildNodes() ) {
		return;
	}

	let controlDiv = new ccweb.UIElement();

	let staffListCard = buildStaffList(eventId, staff);
	

	let tline : HTMLDivElement = null;


	let builtPanel = buildRegistrationPanel(eventId, null, 1, null, null);



	let desc = new ccweb.Card({
		size: "half",
		title: "Edit Details (Staff Only)",
		icon: "event"
	});

	let utils = new ccweb.Card({
		size: "half",
		title: "Utilities (Staff Only)",
		icon: "developer_board"
	});

	desc.add(getEventDesc());

	controlDiv.add(desc);
	controlDiv.add(utils);

	let editEvent : HTMLDivElement = document.createElement("div");
	editEvent.className = "lb bh jsonbut";
	editEvent.appendChild(document.createTextNode("Edit event"));
	editEvent.onclick = () => {
		if( ccweb.Dialog.active() ) {
			return;
		}
	
		let dlg: ccweb.Dialog = new ccweb.Dialog(null, "Edit Event Details", "edit");

		submitAuthorized("true", false, dlg.content);

		dlg.show();
	
	};

	//controlDiv.appendChild(editEvent);




	if( eventData()["regtype"] == 4 || eventData()["regtype"] == 5 || eventData()["regtype"] == 8 ) {
		let text : string = "Enable registration";

		if( eventData()["regtype"] == 8 || eventData()["regtype"] == 5 ) {
			text = "Use pre-registration";
		}

		desc.add(new ccweb.Button({
			text: text,
			size: "largefixed",
			click: ((eventId : number) => {

				return function() {
					authAjax(api("/enablereg/" + eventId), null,
						() => { location.reload()});
				};
	
			})(eventId)
		}));
	}

	if( !isTeamEvent() && (eventData()["regtype"] == 3 
			|| eventData()["regtype"] == 4 || eventData()["regtype"] == 5) ) {
		desc.add(new ccweb.Button({
			text: "Open registration",
			size: "largefixed",
			click: ((eventId : number) => {

				return function() {
					authAjax(api("/openreg/" + eventId), null,
						() => { location.reload()});
				};
	
			})(eventId)
		}));
	}

	if( eventData()["regtype"] == 3 || eventData()["regtype"] == 5 || eventData()["regtype"] == 8 ) {
		desc.add(new ccweb.Button({
			text: "Disable registration",
			size: "largefixed",
			click: ((eventId : number) => {

				return function() {
					authAjax(api("/disablereg/" + eventId), null,
						() => { location.reload()});
				};
	
			})(eventId)
		}));
	}

	if( eventData()["regtype"] == 3 ) {
		utils.add(new ccweb.Button({
			text: "Send all emails",
			size: "largefixed",
			click: () => {
				for( let i = 0; i < _sendAll.length; i++ ) {
					_sendAll[i]();
				}
	
				_sendAll = [];
			}
		}));
	}


	if( eventData()["regtype"] == 4 || eventData()["regtype"] == 3 ) {
		desc.add(new ccweb.Button({
			text: "Publish lists",
			size: "largefixed",
			click: ((eventId : number) => {

				return function() {
					authAjax(api("/publishlists/" + eventId), null,
						() => { location.reload()});
				};
	
			})(eventId)
		}));
	}

	if( eventData()["regtype"] == 6 ) {
		desc.add(new ccweb.Button({
			text: "Publish event",
			size: "largefixed",
			click: ((eventId : number) => {

				return function() {
					authAjax(api("/publishevent/" + eventId), null,
						() => { location.reload()});
				};
	
			})(eventId)
		}));
	}

	if( eventData()["regtype"] == 7 ) {
		desc.add(new ccweb.Button({
			text: "Hide event",
			size: "largefixed",
			click: ((eventId : number) => {

				return function() {
					authAjax(api("/hideevent/" + eventId), null,
						() => { location.reload()});
				};
	
			})(eventId)
		}));
	}
	
	

	utils.add(new ccweb.Button({
		text: "Print blank Steamroller sheet",
		size: "largefixed",
		click: printBlankSteamroller
	}));

	utils.add(new ccweb.Button({
		text: "Print all Steamroller sheets",
		size: "largefixed",
		click: staffPrintSheets
	}));

	utils.add(new ccweb.Button({
		text: "Download JSON",
		size: "largefixed",
		click: staffDownloadJSON
	}));


	if( eventData()["regtype"] < 5 ) {
		_staffUI.appendChild(buildStatsInterface(_staffData, true).container);
	}

	_staffUI.appendChild(builtPanel.panel.container);
	_staffUI.appendChild(staffListCard.container);

	_staffDiv.style.display = "block";

	_staffDiv.insertBefore(controlDiv.content, _staffDiv.firstElementChild);

}


function staffPrintSheets() {
	basePrintSteamrollers(_staffData, _staffTeams);
}

function staffDownloadJSON() {
	baseDownloadJSON(_staffData);
}

function deleteAlternate(eventId : number, uid : number, div : HTMLDivElement) {
	return () => {
		authAjax(api("/removeplayeruid/" + eventId + "/" + uid),
		null,
		null);

		div.style.display = "none";
	};
}

function editRegistration(eventId : number, oldListCode : string, 
	playerIndex : number, regCode : string, rules : ccapi.Rules)  {

	return () => {


		if( _staffEditor && _staffEditor.visible() ) {
			return;
		}

		// fixme maybe
		if( rules == null ) {
			rules = {
				listSize: 75,
				forbidCID: false,
				ignorePreRelease: true,
				enforce: true,
				listType: {
					steamroller: false,
					adr: false,
					champions: false,
					minLists: 1,
					maxLists: 3,
					season: null
				}
			};
		}

		_staffEditor = new ccweb.Editor(null,
			-1,
			null,
			"Update list",
			rules,
			() => {

				if( _staffEditor ) {
					_staffEditor.hide();
				}

				let newListCode : string =
					_staffEditor.currentList.al.toCode();

				let postData : string =
						"listcode=" + encodeURIComponent(newListCode)
						+ "&regcode=" + encodeURIComponent(regCode);

				if( playerIndex > 0 ) {
						postData += "&playerindex=" + encodeURIComponent("" + playerIndex);
				}

				ajaxPost(api("/submitregcode/" + eventId),
						(s: string) => {
							authAjax(api("/eventreg/" + eventId),
								null,
								((eventId : number) => {
									return (loggedIn : boolean, s : string) => {
										gotEventRegistration(eventId, loggedIn, s);
									}
								})(eventId));
						},
						postData
						);

			}
		);


		_staffEditor.setEventMode(true);

		if( oldListCode ) {
			_staffEditor.restoreCode(oldListCode);
		}
		
		_staffEditor.show();

	};

}

export function editTeam(team : any, callback? : () => void) {
	if( ccweb.Dialog.active() ) {
		return;
	}

	let dlg: ccweb.Dialog = new ccweb.Dialog(null, "Edit Team", "edit");

	let builtPanel = populateRegistrationPanel(
		dlg.card,
		team["event"],
		team["regcode"],
		team["playerNames"].length,
		((dialog : ccweb.Dialog, cb : () => void) => {
			return () => {
				dlg.close();

				if( cb ) {
					cb();
				}
			}
		})(dlg, callback), team["place"], true);

	if( builtPanel.emailInput ) {
		builtPanel.emailInput.value = team["email"];
	}

	builtPanel.nameInput.value = team["name"];

	for( let i : number = 0; i < builtPanel.nameInputs.length; i++ ) {
		let playerName : string = "";

		if( team.playerNames && team.playerNames.length > i ) {
			playerName = team.playerNames[i];
		}

		builtPanel.nameInputs[i].value = playerName;
	}


	//dlg.content.appendChild(builtPanel.panel.container);

	dlg.show();

	builtPanel.nameInput.focus();
}

function downloadTextFile(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}


let _staffTeams : any = null;
let _staffData : any = null;
let _sendAll : any[] = [];

export function gotEventRegistration(eventId : number, loggedIn : boolean,
			eventRegData : string) : void {

	

	let allData : any = JSON.parse(eventRegData);

	let rules : ccapi.Rules = <ccapi.Rules>JSON.parse(eventData()["rules"]);

	if( allData == null || !loggedIn) {
		_staffDiv.style.display = "none";
		return;
	}

	let data : any = allData[0];
	let teams : any = allData[1];
	let staff : any = allData[2];

	_staffTeams = teams;
	_staffData = data;

	buildStaffInterface(eventId, staff);

	let teamMap : any = {};

	if( teams.length > 0 ) {
		for( let team of teams ) {
			teamMap[team.uid] = team;
		}
	}

	if( _listDiv ) {
		while( _listDiv.hasChildNodes() ) {
			_listDiv.removeChild(_listDiv.lastChild);
		}
	}
	else {
		_listDiv = document.createElement("div");
		_registrantsDiv.appendChild(_listDiv);
	}

	_sendAll = [];

	let registrations = new ccweb.Card({
		size: "full",
		title: "Registrations (Staff Only)",
		icon: "people",
		expand: true
	});

	for( let i : number = 0; i < data.length; i++ ) {

		let div : HTMLDivElement = null;

		if( teams.length > 0 ) {
			div = document.createElement("div");
			div.className = "eventregline";

			let team : any = teamMap[data[i].team];

			if( team.divs == null ) {
				team.divs = [];
				team.shown = false;
			}

			if( team.playerNames == null ) {
				team.playerNames = [];
			}

			team.playerNames.push(data[i].name);

			team.divs.push(div);
			div.style.display = "none";

			let holder : HTMLDivElement = teamMap[data[i].team].holder;

			if( holder == null ) {
				holder = document.createElement("div");
				holder.className = "teamevent";

				holder.appendChild(new ccweb.Button({
					text: null,
					icon: "expand_more",
					size: "small",
					className: "eventshowhide",
					click: ((myTeam : any, myDiv : HTMLDivElement) => {

						return function(button : ccweb.Button) {
							myTeam.shown = !myTeam.shown;
	
							if( myTeam.shown ) {
								//console.log(button.icon.innerText);
								button.changeIcon("expand_less");
	
								for( let d of myTeam.divs ) {
									d.style.display = "block";
								}
							}
							else {
								//console.log(button.icon.innerText);
								button.changeIcon("expand_more");
	
								for( let d of myTeam.divs ) {
									d.style.display = "none";
								}
							}
	
						};
	
					})(team, null)
				}).container);

				let teamName : HTMLDivElement = document.createElement("div");
				teamName.className = "eventregteamname";
				teamName.appendChild(document.createTextNode(team.name));
				holder.appendChild(teamName);

				let email : HTMLAnchorElement = document.createElement("a");
				email.className = "eventregemail2";
				email.href = "mailto:" + team["email"];
				email.appendChild(document.createTextNode(team["email"]));
				holder.appendChild(email);

				let regcode : HTMLDivElement = document.createElement("div");
				regcode.className = "eventregcode2";
				regcode.appendChild(document.createTextNode(team["regcode"]));
                holder.appendChild(regcode);

                let valicon : HTMLDivElement = document.createElement("div");
                valicon.className = team.validated > 0 ? "regvalpass" : "regvalfail";
                holder.appendChild(valicon);

                let valtext : HTMLDivElement = document.createElement("div");
                valtext.className = "regvaltext";
                valtext.appendChild(document.createTextNode(team.validation));
				holder.appendChild(valtext);

				holder.appendChild(new ccweb.Button({
					text: "Edit",
					size: "small",
					className: "regteamedit",
					click: ((myTeam : any) => {

						return () => {
							editTeam(myTeam);
						};
	
					})(teamMap[data[i].team])
				}).container);


				let playerNames : string[] = [];
				

				let lastemail : HTMLDivElement = document.createElement("div");
				lastemail.className = "eventlastemail";
	
				if( teamMap[data[i].team]["emailsent"] ) {
					let dt : Date = new Date(teamMap[data[i].team]["emailsent"]);
					lastemail.appendChild(document.createTextNode(formatDate(dt)));
				}
				else {
					lastemail.appendChild(document.createTextNode("N/A"));
				}
	
				holder.appendChild(lastemail);
	

				if( !team.validated && eventData()["regtype"] != 7 )
				{
					holder.appendChild(new ccweb.Button({
						text: "Preview",
						size: "small",
						className: "regteampreview",
						click: previewButtonFunc(teamMap[data[i].team].regcode,
							eventId)
					}).container);

					let allowEmail : boolean = true;

					if( teamMap[data[i].team]["emailsent"] ) {
						let dt : Date = new Date(teamMap[data[i].team]["emailsent"]);
	
						if( (Date.now() - dt.getDate()) < (1000 * 60 * 60 * 24) ) {
							allowEmail = false;
						}
					}
				

					if( allowEmail ) {
						let clickFunc = sendButtonFunc(teamMap[data[i].team].regcode, eventId);

						let emailButton = new ccweb.Button({
							text: "",
							icon: "mail_outline",
							size: "small",
							className: "regteamsendemail",
							click: clickFunc
						});

						_sendAll.push(() => { clickFunc(emailButton); });

						holder.appendChild(emailButton.container);
					}
							

				}

				

				let delbut = new ccweb.Button({
					text: "",
					icon: "clear",
					size: "small",
					className: "eventdel",
					click: ((code : string, lineDiv : HTMLDivElement) => {


						return function() {
							//console.log("About to remove " + code);
	
							lineDiv.style.display = "none";
	
							authAjax(api("/removeplayer/" + eventId),
								"regcode=" + encodeURIComponent(code),
								null);
						};
	
					})(team["regcode"], holder)
				});

				holder.appendChild(delbut.container);

				teamMap[data[i].team].holder = holder;
			}

			holder.appendChild(div);
		}
		else {
			div = document.createElement("div");
			div.className = "eventregline soloevent";
		}



		let rname : HTMLDivElement = document.createElement("div");
		rname.className = "eventrealname";




		rname.appendChild(document.createTextNode(data[i]["name"]));
		div.appendChild(rname);



		if( teams.length == 0 ) {
			let email : HTMLAnchorElement = document.createElement("a");
			email.className = "eventregemail";
			email.href = "mailto:" + data[i]["email"];
			email.appendChild(document.createTextNode(data[i]["email"]));
			div.appendChild(email);

			let regcode : HTMLDivElement = document.createElement("div");
			regcode.className = "eventregcode";
			regcode.appendChild(document.createTextNode(data[i]["regcode"]));
			div.appendChild(regcode);

			div.appendChild(new ccweb.Button({
				text: "",
				icon: "clear",
				size: "small",
				className: "eventdel",
				click: ((code : string, lineDiv : HTMLDivElement) => {

					return function() {
						lineDiv.style.display = "none";
	
						authAjax(api("/removeplayer/" + eventId),
							"regcode=" + encodeURIComponent(code),
							null);
					};
	
				})(data[i]["regcode"], div)
			}).container);



			if( eventData()["regtype"] != 7 ) {
				div.appendChild(new ccweb.Button({
					text: "Preview",
					size: "small",
					className: "regteampreview",
					click: previewButtonFunc(data[i]["regcode"], eventId)
				}).container);

				let allowEmail : boolean = true;

				if( data[i]["emailsent"] ) {
					let dt : Date = new Date(data[i]["emailsent"]);

					if( (Date.now() - dt.getTime()) < (1000 * 60 * 60 * 24) ) {
						allowEmail = false;
					}
				}


				if( allowEmail ) {
					let clickFunc = sendButtonFunc(data[i]["regcode"], eventId);

					let emailButton = new ccweb.Button({
						text: "",
						icon: "mail_outline",
						size: "small",
						className: "regteamsendemail",
						click: clickFunc
					});

					_sendAll.push(() => { clickFunc(emailButton); });
					div.appendChild(emailButton.container);
				}
			
			}

			div.appendChild(new ccweb.Button({
				text: "Edit",
				size: "small",
				className: "regteamedit",
				click: ((myTeam : any) => {

					return () => {
						editTeam(myTeam, () => {
							if( ccweb.Dialog.active() ) {
								ccweb.Dialog.active().close();
							}
						});
					};
	
				})({
					event: eventData()["uid"],
					regcode: data[i]["regcode"],
					email: data[i]["email"],
					name: data[i]["name"],
					playerNames: [],
					place: data[i]["place"]
	
				})

			}).container);
		}


		let lastsub : HTMLDivElement = document.createElement("div");
		lastsub.className = "eventlastsubmit";

		if( data[i]["lastsubmission"] ) {
			let dt : Date = new Date(data[i]["lastsubmission"]);
			lastsub.appendChild(document.createTextNode(formatDate(dt)));
		}
		else {
			lastsub.appendChild(document.createTextNode("N/A"));
		}

		div.appendChild(lastsub);

		let lastvalid : HTMLDivElement = document.createElement("div");
		lastvalid.className = "eventlastvalid";

		if( data[i]["lastvalidation"] ) {
			let dt : Date = new Date(data[i]["lastvalidation"]);
			lastvalid.appendChild(document.createTextNode(formatDate(dt)));
		}
		else {
			lastvalid.appendChild(document.createTextNode("N/A"));
		}

		div.appendChild(lastvalid);

		if( teams.length == 0 ) {

			let lastemail : HTMLDivElement = document.createElement("div");
			lastemail.className = "eventlastemail";

			if( data[i]["emailsent"] ) {
				let dt : Date = new Date(data[i]["emailsent"]);
				lastemail.appendChild(document.createTextNode(formatDate(dt)));
			}
			else {
				lastemail.appendChild(document.createTextNode("N/A"));
			}

			div.appendChild(lastemail);
		}

		let val : HTMLDivElement = document.createElement("div");
		val.className = data[i]["validated"] == null ? "eventfail" :
				(data[i]["validated"] == 1 ? "eventpass" : "eventwarn");

		div.appendChild(val);

		if( data[i]["submittype"] == 1 ) {
			let stype : HTMLDivElement = document.createElement("div");
			stype.className = "eventusedregcode";
			div.appendChild(stype);
		}
		else if( data[i]["submittype"] == 2 ) {
			let stype : HTMLDivElement = document.createElement("div");
			stype.className = "eventusedauth";
			div.appendChild(stype);
		}


		let listholder : HTMLDivElement = null;

		if( teams.length > 0 ) {
			listholder = document.createElement("div");
			listholder.className = "eventlistholder";
			listholder.style.display = "none";
		}
		else {
			listholder = document.createElement("div");
			listholder.className = "eventlistholder";
			listholder.style.display = "none";
		}

        let regCode : string = null;

        if( teamMap[data[i].team] ) {
            regCode = teamMap[data[i].team].regcode;
		}
		else if( data[i]["regcode"]) {
			regCode = data[i]["regcode"];
		}
	
		div.appendChild(new ccweb.Button({
			text: "",
			icon: "edit",
			size: "small",
			className: "eventeditlist",
			click: editRegistration(eventId, data[i]["submission"], 
				data[i]["player"], regCode, rules)
		}).container);

		// Add delete button for alternates 

		if( teamMap && teamMap[data[i].team] && teamMap[data[i].team].playerNames.length 
				 > eventData()["team_size"] ) 
		{
			//console.log(data[i]);

			div.appendChild(new ccweb.Button({
				text: "",
				icon: "close",
				size: "small",
				className: "eventdeletealt",
				click: deleteAlternate(eventId, data[i].uid, div)
			}).container);
		}


		if( data[i]["submission"] ) {
			div.appendChild(new ccweb.Button({
				text: "",
				icon: "print",
				size: "small",
				className: "eventprintlist",
				click: ((code : string, pname : string, rounds : number,
						logo : string, ename : string) => {

					return function() {
						ccweb.Editor.printList(code, pname, rounds, ename, logo);
					};

				})(data[i]["submission"], data[i]["name"], eventData()["rounds"],
					eventData()["logo"], eventData()["name"])
			}).container);

			div.appendChild(new ccweb.Button({
				text: "Show List",
				size: "small",
				className: "eventshowsub",
				click: ((holder : HTMLDivElement, code : string) => {

						return (button : ccweb.Button) => {

							if( holder.childElementCount > 0 ) {
								if( holder.style.display == "none" ) {
									holder.style.display = "block";
									button.changeText("Hide List");
								}
								else {
									holder.style.display = "none";
									button.changeText("Show List");
								}
							}
							else {
								holder.appendChild(ccweb.Editor.displayList(code, rules));
								holder.style.display = "block";
								button.changeText("Hide List");
							}

						};
					})(listholder, data[i]["submission"])

			}).container);
		}
		else {
			let nosub : HTMLDivElement = document.createElement("div");
			nosub.className = "eventnosub";
			div.appendChild(nosub);
		}

		if( teams.length == 0 ) {
			// _listDiv.appendChild(div);
			// _listDiv.appendChild(listholder);
			registrations.add(div);
			registrations.add(listholder);
		}
		else {
			teamMap[data[i].team].holder.appendChild(div);
			teamMap[data[i].team].holder.appendChild(listholder);
		}
	}

	if( teams.length > 0 ) {
		for( let tid in teamMap ) {
			if( teamMap[tid].holder ) {
				//_listDiv.appendChild(teamMap[tid].holder);
				registrations.add(teamMap[tid].holder);
			}
		}
	}

	_staffDiv.style.display = "block";

	if( _registrations ) {
		_staffDiv.removeChild(_registrations.container);
	}

	_staffDiv.appendChild(registrations.container);
	_registrations = registrations;
}


export function initStaffUI() : HTMLDivElement {
		_staffDiv = document.createElement("div");
		//_staffDiv.className = "eventstaff";

		_staffUI = document.createElement("div");
        _staffDiv.appendChild(_staffUI);

        _staffDiv.style.display = "none";

		_registrantsDiv = document.createElement("div");
		_staffDiv.appendChild(_registrantsDiv);


        return _staffDiv;
}




	


function buildRegistrationPanel(eventId : number, regCode : string, 
	totalTeamMembers : number, callback : () => void, place : number, dialog? : boolean) :
	{
		panel: ccweb.Card;
		nameInputs : HTMLInputElement[];
		regButton : ccweb.Button;
		emailInput : HTMLInputElement;
		nameInput: HTMLInputElement;
	}
{
	let title : string = "Player Registration";
	let icon : string = "person_add";

	if( eventData()["team_size"] > 1 ) {
		title = "Team Registration";
		icon = "group_add";
	}

	if( dialog ) {
		title = "Edit " + title;
	}
	else {
		title += " (Staff Only)";
	}

	let newreg : ccweb.Card = new ccweb.Card({
		title: title,
		icon: icon,
		size: dialog ? "full" : "half"
	});

	let ret = populateRegistrationPanel(newreg, eventId, regCode, totalTeamMembers, callback, place, dialog);
	ret.panel = newreg;

	return ret;
}

function populateRegistrationPanel(newreg : ccweb.Card, eventId : number, regCode : string, 
		totalTeamMembers : number, callback : () => void, place : number, dialog? : boolean) : 
		{
			panel : ccweb.Card;
			nameInputs : HTMLInputElement[];
			regButton : ccweb.Button;
			emailInput : HTMLInputElement;
			nameInput: HTMLInputElement;
		} 
		
{


	// let s : string = "";


	// if( regCode ) {
	// 	s = "Edit " + s;
	// }

	// let ldiv : HTMLDivElement = document.createElement("div");
	// ldiv.className = "staffregheader";
	// ldiv.appendChild(document.createTextNode(s));
	// newreg.add(ldiv);


	let ldiv : HTMLDivElement = document.createElement("div");


	let s : string = " Name: ";

	if( eventData()["team_size"] > 1 ) {
		s = " Team Name: ";
	}

	let tline : HTMLDivElement = document.createElement("div");
	tline.className = "staffregline";
	tline.appendChild(document.createTextNode(s));
	ldiv.appendChild(tline);

	let newregname : HTMLInputElement = document.createElement("input");
	newregname.type = "text";
	ldiv.appendChild(newregname);

	newreg.add(ldiv);

	let newregedit : HTMLInputElement = null;
	let placeEdit : HTMLInputElement = null;


	if( eventData()["regtype"] != 7 ) {
		s = "Player email: ";

		if( eventData()["team_size"] > 1 ) {
			s = "Captain email: ";
		}
	
		tline = document.createElement("div");
		tline.className = "staffregline";
		tline.appendChild(document.createTextNode(s));
		ldiv.appendChild(tline);
	
		newregedit = document.createElement("input");
		newregedit.type = "text";
		ldiv.appendChild(newregedit);
	
		newreg.add(ldiv);
	}

	ldiv = document.createElement("div");

	let playerNames : HTMLInputElement[] = [];

	if( eventData()["team_size"] > 1 ) {
		for( let i : number = 0; i < eventData()["team_size"] || i < totalTeamMembers; i++ ) {
			let teamPlayer : HTMLDivElement = document.createElement("div");

			tline = document.createElement("div");
			tline.className = "staffregline";
			if( i < eventData()["team_size"]) {
			tline.appendChild(document.createTextNode("Player " + (i+1)));
			}
			else {
				tline.appendChild(document.createTextNode("Alternate " + (1 + i - eventData()["team_size"])));
			}
			teamPlayer.appendChild(tline);

			let playerName : HTMLInputElement = document.createElement("input");
			playerName.type = "text";
			teamPlayer.appendChild(playerName);

			playerNames.push(playerName);

			newreg.add(teamPlayer);
		}
	}

	if( eventData()["regtype"] == 7 ) {
		let placeEditLine : HTMLDivElement = document.createElement("div");

		tline = document.createElement("div");
		tline.className = "staffregline";
		tline.appendChild(document.createTextNode("Place"));

		placeEditLine.appendChild(tline);

		placeEdit = document.createElement("input");
		placeEdit.type = "number";

		placeEdit.value = "" + place;

		placeEditLine.appendChild(placeEdit);

		newreg.add(placeEditLine);
	}


	let regFunc = ((editEmail : HTMLInputElement, editName : HTMLInputElement,
		pNames : HTMLInputElement[], eventId : number, regCode : string, cb: () => void, 
		editPlace : HTMLInputElement) =>  {

		return () => {

			let postData : string = "name=" + encodeURIComponent(editName.value);
			editName.value = "";

			if( editEmail && editEmail.value.length > 0 ) {
				postData += "&email=" + encodeURIComponent(editEmail.value);
				editEmail.value = "";
			}

			for( let i : number = 0; i < pNames.length; i++ ) {
				postData += "&player" + (i+1) + "=" + encodeURIComponent(pNames[i].value);
			}

			if( regCode ) {
				postData += "&regcode=" + encodeURIComponent(regCode);
			}

			if( editPlace && editPlace.value ) {
				postData += "&place=" + encodeURIComponent(editPlace.value);
			}

			for( let pn of pNames ) {
				pn.value = "";
			}

			editName.focus();

			let apiCall : string = "/registerplayer/";

			if( regCode ) {
				apiCall = "/editplayer/";
			}

			//console.log(postData);

			if( regCode ) {
				ajaxPost(api(apiCall + eventId),
					(resp : string) => {
						if( cb ) {
							cb();
						}
					},
					postData);
			}
			else {
				authAjax(api(apiCall + eventId),
					postData,
					(loggedIn : boolean, s : string) => {

						if( cb ) {
							cb();
						}

						authAjax(api("/eventreg/" + eventId),
							null,
							((eventId : number) => {
								return (loggedIn : boolean, s : string) => {
									gotEventRegistration(eventId, loggedIn, s);
								}
							})(eventId));
					});
			}
		
		}

	})(newregedit, newregname, playerNames, eventId, regCode, callback, placeEdit);

	let newregbut = new ccweb.Button({
		text: regCode ? "Update" : "Register",
		size: "largefixed",
		click: regFunc
	});

	newreg.add(newregbut);

	let regEnter : (event : any) => void = ((f : any) => {
		return function(e : any) {
			e.preventDefault();

			if( e.keyCode == 13 ) {
				f();
			}
		}
	})(regFunc);

	if( newregedit ) {
		newregedit.addEventListener("keyup", regEnter);
	}

	newregname.addEventListener("keyup", regEnter);

	for( let hie of playerNames ) {
		hie.addEventListener("keyup", regEnter);
	}

	return {
		panel: newreg,
		nameInputs: playerNames,
		regButton: newregbut,
		emailInput: newregedit,
		nameInput: newregname
	}	
}

function sendButtonFunc(regCode : string, eventId : number) : any {

	return (button: ccweb.Button) => {
		//button.style.display = "none";
		button.hide();

		authAjax(api("/sendemail/" + eventId),
			"regcode=" + encodeURIComponent(regCode),
			() => {});
	};
}


function previewButtonFunc(regCode : string, eventId : number) : any {
	return (event : any) => {
		if( event && event.shiftKey ) {
			authAjax(api("/composeemail/" + eventId),
				"regcode=" + encodeURIComponent(regCode),
				(loggedIn : boolean, s : string) => {
					downloadTextFile("letter" + regCode, s);
				});

		}
		else authAjax(api("/composeemail/" + eventId),
			"regcode=" + encodeURIComponent(regCode),
			(loggedIn : boolean, s : string) => {
				if( ccweb.Dialog.active() ) {
					return;
				}

				let dlg: ccweb.Dialog = new ccweb.Dialog(null, "Preview Email", "mail");

				let headerEnd = s.indexOf("MIME-version");
				let startLoc = s.indexOf("<html>");
				let endLoc = s.indexOf("</html>");

				if( startLoc == -1 || headerEnd == -1 || endLoc == -1 ) {
					return;
				}

				let headerText = s.substr(0, headerEnd);
				headerText = headerText.replace(/</g, "&lt;");
				headerText = headerText.replace(/>/g, "&gt;");
				headerText = headerText.replace(/\n/g, "<br>");

				let bodyText = s.substr(startLoc + 6, endLoc - startLoc - 6);

				let header : HTMLDivElement = document.createElement("div");
				header.className = "emailpreviewheader";
				//header.appendChild(document.createTextNode(headerText));
				header.innerHTML = headerText;

				let emailBody : HTMLDivElement = document.createElement("div");
				emailBody.className = "emailpreviewbody";
				emailBody.innerHTML = bodyText;

				dlg.content.appendChild(header);
				dlg.content.appendChild(emailBody);

				dlg.content.parentElement.style.width = "600px";
				dlg.content.parentElement.parentElement.style.width = "600px";
				dlg.show();

			});
	};

}
