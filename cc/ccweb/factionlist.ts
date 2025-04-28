
//namespace ccapi {

import { Editor } from "./editor";
import { ListType } from "../ccapi/defines";

	function div(className: string, text?: string) : HTMLDivElement {
		let ret: HTMLDivElement = document.createElement("div");
		ret.className = className;

		if (text != null) {
			ret.appendChild(document.createTextNode(text));
		}
		return ret;
	}


export class FactionList {
	editor: Editor;
	outerNode: HTMLDivElement;
	rootNode: HTMLDivElement;
	holder: HTMLDivElement;
	header: HTMLDivElement;
	factionHeader: HTMLDivElement;
	factionInner: HTMLDivElement;
	listDrop: HTMLSelectElement;
	sizeinput: HTMLInputElement;
	sizeButtons: HTMLDivElement[] = [];

	private listType : ListType;

	static buildListTypeDrop(callback: (lt : ListType) => void, postversion? : boolean) : HTMLSelectElement {
		let drop : HTMLSelectElement = document.createElement("select");
		drop.className = "typedrop";

		let opt = function(n: string, rules: ListType) {
			let o : HTMLOptionElement = document.createElement("option");
			o.text = n;
			o.value = JSON.stringify(rules);

			drop.appendChild(o);
		};


		drop.onchange = (function(cb : (lt : ListType) => void) {

			//let myThis : FactionList = fl;
			let myCallback : (lt : ListType) => void = cb;


			return function() {
				let coll : HTMLCollectionOf<HTMLOptionElement> =
					drop.selectedOptions;

				if( coll.length == 0 ) {
					myCallback({
						steamroller: false,
						champions: false,
						adr: false,
						season: 0,
						minLists: 1,
						maxLists: 3
					});
				}
				else if( coll.length == 1 ) {
					let op : HTMLOptionElement = coll.item(0);

					myCallback(<ListType>(JSON.parse(op.value)));
				}
			}

		})(callback);


		opt("Standard", {
			steamroller: false,
			adr: false,
			champions: false,
			season: 0,
			minLists: 1,
			maxLists: 2
		});

		// opt("Company of Iron", {
		// 	steamroller: false,
		// 	adr: false,
		// 	champions: false,
		// 	season: 0,
		// 	minLists: 1,
		// 	maxLists: 1,
		// 	coi: true
		// });

		// opt("Steamroller", {
		// 	steamroller: false,
		// 	adr: false,
		// 	champions: false,
		// 	season: 0,
		// 	minLists: 1,
		// 	maxLists: 2
		// });


		opt("Oblivion Dyad", {
			steamroller: false,
			adr: false,
			champions: false,
			season: 0,
			minLists: 2,
			maxLists: 2,
			oblivion: true,
			noblivion: false
		});

		opt("Oblivion Trinity", {
			steamroller: false,
			adr: false,
			champions: false,
			season: 0,
			minLists: 3,
			maxLists: 3,
			oblivion: true,
			noblivion: false
		});

		opt("Oblivion Champions", {
			steamroller: false,
			adr: false,
			champions: true,
			season: 10,
			minLists: 1,
			maxLists: 2,
			oblivion: true,
			noblivion: false
		});		

		opt("Classic Dyad", {
			steamroller: false,
			adr: false,
			champions: false,
			season: 0,
			minLists: 2,
			maxLists: 2,
			oblivion: false,
			noblivion: true
		});

		opt("Classic Trinity", {
			steamroller: false,
			adr: false,
			champions: false,
			season: 0,
			minLists: 3,
			maxLists: 3,
			oblivion: false,
			noblivion: true
		});

		opt("Classic Champions", {
			steamroller: false,
			adr: false,
			champions: true,
			season: 10,
			minLists: 1,
			maxLists: 2,
			oblivion: false,
			noblivion: true
		});


		// hoo-fucking-ray I can kill this


		// for( let season : number = 8; season >= 5; season-- ) {

		// 	if( postversion ) {
		// 		opt("Masters (S" + season + ")", {
		// 			steamroller: false,
		// 			adr: true,
		// 			champions: false,
		// 			season: season,
		// 			minLists: 2,
		// 			maxLists: 2
		// 		});
		
		// 		opt("Champions (S" + season + ")", {
		// 			steamroller: false,
		// 			adr: false,
		// 			champions: true,
		// 			season: season,
		// 			minLists: 2,
		// 			maxLists: 2
		// 		});

		// 	}
		// 	else {
		// 		opt("Masters Dyad (S" + season + ")", {
		// 			steamroller: false,
		// 			adr: true,
		// 			champions: false,
		// 			season: season,
		// 			minLists: 2,
		// 			maxLists: 2
		// 		});
		
		// 		opt("Masters Triad (S" + season + ")", {
		// 			steamroller: false,
		// 			adr: true,
		// 			champions: false,
		// 			season: season,
		// 			minLists: 3,
		// 			maxLists: 3
		// 		});

		
		// 		if( season < 8 ) {
		// 			opt("Champions Dyad (S" + season + ")", {
		// 				steamroller: false,
		// 				adr: false,
		// 				champions: true,
		// 				season: season,
		// 				minLists: 2,
		// 				maxLists: 2
		// 			});
			
						
		// 			opt("Champions Triad (S" + season + ")", {
		// 				steamroller: false,
		// 				adr: false,
		// 				champions: true,
		// 				season: season,
		// 				minLists: 3,
		// 				maxLists: 3
		// 			});
		// 		}
		// 		else {
		// 			opt("Champions (S" + season + ")", {
		// 				steamroller: false,
		// 				adr: false,
		// 				champions: true,
		// 				season: season,
		// 				minLists: 1,
		// 				maxLists: 2
		// 			});
		// 		}
		// 	}
		// }

		return drop;
	}

	buildOptionsHeader() : void {
		this.header.appendChild(div("sizeText", "Select an encounter size:"));

		let sizeHeader: HTMLDivElement = div("sizeHeader");

		//let sizes: number[] = [200, 125, 100, 75, 50, 25, 10, 0];
		let sizes: number[] = [0, 10, 25, 50, 75, 100, 125, 200];

		for (let i = 0; i < sizes.length; i++) {
			let sz: HTMLDivElement = div("lb bh alsize");

			if (sizes[i] == Editor.defaultSize) {
				sz.className += " sel";
			}
			sz.innerText = "" + sizes[i];
			sz.onclick = (function (editor: Editor) {
				let mySize = sizes[i];
				let myEditor = editor;

				return function () {
					myEditor.setSize(mySize);
				};

			})(this.editor);

			sizeHeader.appendChild(sz);
			this.sizeButtons.push(sz);
		}

		this.header.appendChild(sizeHeader);

		let sizeSecond: HTMLDivElement = div("sizesecond");

		let inner: HTMLDivElement = document.createElement("div");

		let drop : HTMLSelectElement = FactionList.buildListTypeDrop((lt : ListType) => {
			this.setListType(lt, true);
		});

		this.listDrop = drop;
		



		inner.appendChild(drop);

		sizeSecond.appendChild(inner);

		this.sizeinput = document.createElement("input");
		this.sizeinput.className = "sizeinput";
		this.sizeinput.type = "number";

		this.sizeinput.oninput = (function (editor: Editor) {
			let myEditor: Editor = editor;

			return function () {
				myEditor.inputSize();
			};

		})(this.editor);


		inner = document.createElement("div");
		inner.appendChild(document.createTextNode("Custom: "));
		inner.appendChild(this.sizeinput);

		sizeSecond.appendChild(inner);

		this.header.appendChild(sizeSecond);
	}


	constructor(editor: Editor) {
		this.setListType(editor.rules ? editor.rules.listType : null, true);
		this.editor = editor;

		let fl: FactionList = this;


		this.outerNode = div("conflictchamber cctl");

		this.rootNode = div("factionList");

		if( this.editor.rules && this.editor.rules.enforce ) {
			this.rootNode.className += " fllimited";
		}


		this.outerNode.appendChild(this.rootNode);

		this.holder = div("lohholder");
		this.rootNode.appendChild(this.holder);

		this.header = div("listOptionsHeader");
		this.holder.appendChild(this.header);

		if( !this.editor.rules || !this.editor.rules.enforce ) {
			this.buildOptionsHeader();
		}

		this.factionHeader = document.createElement("div");
		this.factionHeader.className = "factionHeader";
		this.rootNode.appendChild(this.factionHeader);

		let select: HTMLDivElement = document.createElement("div");
		select.appendChild(document.createTextNode("Select a faction"));
		this.factionHeader.appendChild(select);

		this.factionInner = document.createElement("div");
		this.factionInner.className = "factionInner";
		this.rootNode.appendChild(this.factionInner);

		if( this.editor.rules && this.editor.rules.enforce ) {
			let cancelbut : HTMLDivElement = document.createElement("div");
			cancelbut.className = "cancelbut lb bh";

			cancelbut.onclick = ((editor : Editor) => {

				return () => {
					editor.hide();
				}

			})(this.editor);
			this.rootNode.appendChild(cancelbut);
		}



		//this.setSteamrollerCheck(Editor.defaultSteamroller);
	}

	// clickSR() {
	// 	this.setSteamrollerCheck(!this.getSteamrollerCheck());
	// 	Editor.defaultSteamroller = this.getSteamrollerCheck();
	// }

	setListType(lt: ListType, skipUpdate?: boolean) {
		if( lt == null ) {
			this.listType = {
				steamroller: false,
				champions: false,
				adr: false,
				season: 0,
				minLists: 1,
				maxLists: 3
			};
		}
		else {
			this.listType = lt;
		}

		if( !skipUpdate && this.listDrop && this.listDrop.options ) {
			let opts : HTMLOptionsCollection = this.listDrop.options;

			for( let i : number = 0; i < opts.length; i++ ) {
				let ob : any = JSON.parse((<HTMLOptionElement>opts[i]).value);

				if( lt.steamroller == ob.steamroller
					&& lt.adr == ob.adr
					&& lt.champions == ob.champions
					&& lt.minLists == ob.minLists
					&& lt.maxLists == ob.maxLists
					&& lt.season == ob.season ) {
						opts.selectedIndex = i;
						//console.log("found");
						break;
				}
			}


		}
	}

	getListType() : ListType {
		return this.listType;
	}

	show(): void {
		this.outerNode.style.display = "";
	}

	hide(): void {
		this.outerNode.style.display = "none";
	}

}



//}
