

import { Editor } from "./editor";
import { Rules, ListType } from "../ccapi/defines";
import { Card, Button } from "./widgets";
import * as ccapi from "../ccapi/ccapi";


	function div(className: string, text?: string) : HTMLDivElement {
		let ret: HTMLDivElement = document.createElement("div");
		ret.className = className;

		if (text != null) {
			ret.appendChild(document.createTextNode(text));
		}
		return ret;
	}


export class FactionSelection {
	listDrop: HTMLSelectElement;
	sizeinput: HTMLInputElement;
    sizeButtons: [Button, number][] = [];
	chosenSize: number;
	chosenFID: number = -1;
	rules: Rules;
	
    callback: (fid : number, rules : Rules, fs : FactionSelection) => void;

	private listType : ListType;

	buildListTypeDrop(/*callback: (lt : ListType) => void, postversion? : boolean*/) : HTMLSelectElement {
		let drop : HTMLSelectElement = document.createElement("select");
		drop.className = "typedrop";

		let knownRules : string = JSON.stringify(this.rules.listType);
		let found : boolean = false;

		let opt = function(n: string, rules: ListType) {
			let o : HTMLOptionElement = document.createElement("option");
			o.text = n;
			o.value = JSON.stringify(rules);

			drop.appendChild(o);

			if( knownRules == o.value ) {
				found = true;
			}
		};


		drop.onchange = () => {
			let coll : HTMLCollectionOf<HTMLOptionElement> =
				drop.selectedOptions;

			if( coll.length == 0 ) {
				this.rules.listType = {
					steamroller: false,
					champions: false,
					adr: false,
					season: 0,
					minLists: 1,
					maxLists: 3
				};
			}
			else if( coll.length == 1 ) {
				let op : HTMLOptionElement = coll.item(0);


				let lt : ListType = <ListType>JSON.parse(op.value);
				this.rules.listType = lt;
			}
		};


		opt("Standard", {
			steamroller: false,
			adr: false,
			champions: false,
			season: 0,
			minLists: 1,
			maxLists: 2
		});

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


		if( found ) {
			drop.value = JSON.stringify(this.rules.listType);
		}

		return drop;
    }
    
    chooseSize(size : number) : void {
        for( let i : number = 0; i < this.sizeButtons.length; i++ ) {
            this.sizeButtons[i][0].select(size == this.sizeButtons[i][1]);
        }

		this.chosenSize = size;
		this.rules.listSize = size;
	}

	private _inDialog : boolean = false;
	showDialog() : void {
		this._inDialog = true;

		this.card.showDialog(() => {
			this.handleCallback();
		});
	}

	private handleCallback() : void {

		if( this._inDialog ) {
			this.card.closeDialog();
			this._inDialog = false;
		}
		
		if( this.callback ) {
			this.callback(this.chosenFID, this.rules, this);
		}
	}
	
	buildOptionsHeader() : void {
        let sizeHeader : HTMLDivElement = this.card.content;


		let drop : HTMLSelectElement = this.buildListTypeDrop();

        this.listDrop = drop;
        
        sizeHeader.appendChild(drop);

		let sizes: number[] = [0, 10, 25, 50, 75, 100, 125, 200];

		for (let i = 0; i < sizes.length; i++) {
            //let sz: HTMLDivElement = div("lb bh");
            let sz : Button = new Button({
                text: "" + sizes[i],
                size: "medium",
                click: (function (fs : FactionSelection, size : number) {
                    let myThis : FactionSelection = fs;

                    return (button : Button) => {
                        myThis.chooseSize(size);
                    }
    
                })(this, sizes[i])
            });

			if (sizes[i] == this.chosenSize) {
                sz.select(true);
            }
            
			sizeHeader.appendChild(sz.container);
			this.sizeButtons.push([sz, sizes[i]]);
		}

		this.sizeinput = document.createElement("input");
		this.sizeinput.className = "sizeinput";
        this.sizeinput.type = "number";
        
		// this.sizeinput.oninput = (function (editor: Editor) {
		// 	let myEditor: Editor = editor;

		// 	return function () {
		// 		myEditor.inputSize();
		// 	};

        // })(null);
        
        this.sizeinput.oninput = () => {
            this.chooseSize(parseInt(this.sizeinput.value));
        };

        let inner = document.createElement("div");
        inner.className = "factionselcustom";
		inner.appendChild(document.createTextNode("Custom: "));
		inner.appendChild(this.sizeinput);

		sizeHeader.appendChild(inner);
	}

    card : Card;

    constructor(callback 
                : (fid : number, rules : Rules, fs : FactionSelection) => void, 
            rules : Rules, dialog : boolean) {

		this.rules = rules;
		this.callback = callback;

        if( !rules ) {
            this.rules = Editor.defaultRules;
        }

		this.setListType( rules ? rules.listType : null, true);
        
		this.chosenSize = rules ? rules.listSize : Editor.defaultSize;
		// Enforce list size selection
		this.rules.listSize = this.chosenSize;

        let fl : FactionSelection = this;
        
        this.card = new Card({
            size: dialog ? "widedialog" : "full",
            title: dialog ? "Edit Options" : "Build a list",
			expand: !dialog,
			exit: dialog,
            icon: "assignment"
        });

		if( !rules || !rules.enforce ) {
            let select: HTMLDivElement = document.createElement("div");
            select.className = "factionselectionprompt";
            select.appendChild(document.createTextNode("List settings and point value"));
            this.card.add(select);
    

			this.buildOptionsHeader();
		}

        let select: HTMLDivElement = document.createElement("div");
        select.className = "factionselectionprompt";
		select.appendChild(document.createTextNode("Select a faction"));
        this.card.add(select);


        for( let fid in ccapi.Data._data.factions ) {
            if( fid == "13" ) {
                continue;
            }

            this.card.add(new Button({
                text: ccapi.Data._data.factions[fid].n,
                size: "large",
                className: "faclist",
                click: () => { 
					this.selectFaction(parseInt(fid)); 
				}
            }));
        }

    }
    
    selectFaction(fid : number) : void {
		this.chosenFID = fid;
		this.handleCallback();
    }

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
						break;
				}
			}


		}
	}

	getListType() : ListType {
		return this.listType;
	}

	show(): void {
        this.card.show();
	}

	hide(): void {
        this.card.hide();
	}

}

