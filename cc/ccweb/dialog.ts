
import { Card } from "./widgets";

export class Dialog {

	private outer: HTMLDivElement;
	private div: HTMLDivElement;

	public card : Card;

	content: HTMLDivElement;
	closeCallback: () => void;

	private static _active: Dialog = null;

	static active(): Dialog {
		return this._active;
	}

	private standardConstruction() : void {

	}


	constructor(closeCallback: () => void, title : string, icon: string, extraClass? : string, 
		card? : Card, noClose? : boolean) 
	{
		this.closeCallback = closeCallback;

		this.outer = document.createElement("div");
		this.outer.className = "conflictchamber";

		this.card = card ? card : new Card({
			title: title,
			size: "dialog",
			extraClass: extraClass,
			icon: icon,
			exit: !noClose,
			onExit: noClose ? null : () => {
				this.close();
			}
		});

		this.div = document.createElement("div");
		this.div.className = "dlg";
		this.div.style.display = "none";
		this.outer.appendChild(this.div);

		let dlg: Dialog = this;


		this.div.onclick = (function () {
			let myThis = dlg;

			return function (): void {
				myThis.clickDialog();
			}
		})();

		this.div.tabIndex = 1;

		this.div.onkeydown = (function () {
			let myThis = dlg;

			return function (e: any): void {
				let evtobj: any = window.event ? event : e;

				if (evtobj.keyCode == 27) {
					myThis.close();
					evtobj.preventDefault();
				}
			}

		})();


		// let di: HTMLDivElement = document.createElement("div");
		// di.className = minUI ? "dimin" : ("di" + (extraClass ? (" " + extraClass) : ""));
		// this.div.appendChild(di);

		this.div.appendChild(this.card.container);

		let scroll: HTMLDivElement = document.createElement("div");
		scroll.className = "dlgscroll";
		//di.appendChild(scroll);

		this.card.content.appendChild(scroll);

		this.content = document.createElement("div");
		this.content.className = "dialogInner";
		scroll.appendChild(this.content);

		let clickInner = (function () {
			let myThis = dlg;

			return function (ev: Event): void {
				myThis.clickInner(ev);
			}
		})();

		this.card.container.onclick = clickInner;
		//this.card.title.container.onclick = clickInner;


		document.body.appendChild(this.outer);

	}

	clickDialog(): void {
		this.close();
	}

	clickInner(ev: Event): void {
		ev.stopPropagation();
	}

	show(): void {
		this.div.style.display = "";

		if (Dialog._active == null) {
			Dialog._active = this;
		}

		this.div.focus();
	}

	close(skipCallback? : boolean): void {
		if (!skipCallback && this.closeCallback) {
			this.closeCallback();
		}

		if( this.outer.parentNode == document.body ) {
			document.body.removeChild(this.outer);
		}

		if (Dialog._active == this) {
			Dialog._active = null;
		}
	}

	static closeFunc() {
		if (Dialog._active && Dialog._active.closeCallback) {
			Dialog._active.closeCallback();
		}
	}

	static escape() {
		if (Dialog._active) {
			Dialog._active.clickDialog();
		}
	}

	private static _inProgress : boolean = false;

	static progress(text : string) : void {
		if( Dialog.active() && !Dialog._inProgress ) {
			return;
		}

		Dialog._inProgress = true;

		if( Dialog._active ) {
			while( Dialog._active.content.hasChildNodes() ) {
				Dialog._active.content.removeChild(Dialog._active.content.lastChild);
			}

			Dialog._active.content.appendChild(document.createTextNode(text));
		}
		else {
			let dlg: Dialog = new Dialog(null, "Progress", "cached", null, 
				null, true);
				
			dlg.content.appendChild(document.createTextNode(text));
	
			dlg.show();
		}
	}

	static endProgress() : void {
		if( !Dialog._inProgress ) {
			return;
		}

		Dialog._active.close();
		Dialog._inProgress = false;
	}

	static getText(prompt: string, text: string, buttonText: string,
		callback: (s: string) => void): void {

		if (Dialog.active()) {
			return null;
		}

		let dlg: Dialog = new Dialog(null, prompt, "edit");

		// let header: HTMLDivElement = document.createElement("div");
		// header.className = "dlgheader";
		// header.appendChild(document.createTextNode(prompt));

		// dlg.content.appendChild(header);

		let edit: HTMLInputElement = document.createElement("input");
		edit.className = "listname";
		edit.type = "text";

		edit.value = text;

		edit.addEventListener("keyup", (function () {
			let myFunc: (s: string) => void = callback;
			let myEdit: HTMLInputElement = edit;
			let myDlg: Dialog = dlg;

			return function (event: any) {
				event.preventDefault();
				if (event.keyCode == 13) {
					myFunc(myEdit.value);
					dlg.close();
				}
			}

		})());

		dlg.content.appendChild(edit);

		let save: HTMLDivElement = document.createElement("div");
		save.className = "dlgsave lb bh";
		save.appendChild(document.createTextNode(buttonText));

		save.onclick = (function () {
			let myFunc: (s: string) => void = callback;
			let myEdit: HTMLInputElement = edit;
			let myDlg: Dialog = dlg;

			return function (event: any) {
				myFunc(myEdit.value);
				dlg.close();
			}

		})();

		dlg.content.appendChild(save);

		dlg.show();

		if (text != null) {
			edit.setSelectionRange(0, 9999);
		}

		edit.focus();
	}


}


