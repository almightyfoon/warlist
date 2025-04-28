
//namespace ccapi {

import { ArmyList } from "../ccapi/armylist";
import { SubList } from "../ccapi/sublist";

import { Editor } from "./editor";
import { Dialog } from "./dialog";
import { EntryOption } from "./builddiv";

    export class Search {

        private dlg: Dialog;
        private editor: Editor;
        private options: [HTMLElement, string][];
        private buttons: [HTMLElement, number][];
        private edit: HTMLInputElement;
        private al: ArmyList;
        private sel: number;
        private selfunc: (ev: any) => void;

        constructor(editor: Editor) {
            this.editor = editor;
            this.options = [];
            this.buttons = [];
            this.edit = null;
            this.al = editor.currentList.al;
            this.sel = 0;
            this.selfunc = null;
        }

        updateSearch(): void {
            let query: string = this.edit.value.toLowerCase();

            let moveSel: boolean = this.sel < 0;

            for (let i = 0; i < this.options.length; i++) {
                if (this.options[i][1].toLowerCase().indexOf(query) == -1) {
                    this.options[i][0].style.display = "none";

                    if (this.buttons[this.sel] && i == this.buttons[this.sel][1]) {
                        moveSel = true;
                    }
                }
                else {
                    this.options[i][0].style.display = "";
                }
            }

            if (moveSel) {
                if (!this.moveSel(1, false)) {
                    if (!this.moveSel(-1, false, true)) {
                        this.sel = -1;
                        this.selfunc = null;
                    }
                }
            }

        }

        moveSel(dir: number, tab: boolean, force?: boolean): boolean {
            let sel: number = this.sel;

            while ( ((dir == 1 && sel == -1) || (sel >= 0)) && sel < this.buttons.length) {
                sel += dir;

                if( !this.buttons[sel] ) {
                    break;
                }

                if( !this.options[this.buttons[sel][1]] ) {
                    break;
                }

                if ( this.options[this.buttons[sel][1]][0].style.display != "none") {
                    break;
                }
            }

            if (sel < this.buttons.length && sel != this.sel && this.buttons[this.sel] ) {
                let oldclass: string = this.buttons[this.sel][0].className;
                oldclass = oldclass.substr(0, oldclass.indexOf(" editsel"));

                if( this.buttons[this.sel] ) {
                    this.buttons[this.sel][0].className = oldclass;
                }

                if( this.buttons[sel] ) {
                    this.buttons[sel][0].className += " editsel";
                    this.selfunc = this.buttons[sel][0].onclick;
                }

                this.sel = sel;

                return true;
            }
            else if( force ) {
                for( let i : number = 0; i < this.buttons.length; i++ ) {
                    if( this.options[this.buttons[i][1]][0].style.display != "none" ) {
                        this.sel = i;
                        this.selfunc = this.buttons[i][0].onclick;

                        if( this.buttons[i][0].className.indexOf("editsel") == -1 ) {
                            this.buttons[i][0].className += " editsel";
                        }

                        return true;
                    }
                }

                return false;
            }
            else {
                return false;
            }

        }

        keyDown(e: any): void {
            let evtobj: any = window.event ? event : e;

            if (evtobj.keyCode == 38) // up arrow
            {
                this.moveSel(-1, false);
                evtobj.preventDefault();
            }
            else if (evtobj.keyCode == 40) // down arrow
            {
                this.moveSel(1, false);
                evtobj.preventDefault();
            }
            else if (evtobj.keyCode == 9) // tab
            {
                if (evtobj.shiftKey) {
                    this.moveSel(-1, true);
                }
                else {
                    this.moveSel(1, true);
                }

                evtobj.preventDefault();
            }
            else if (evtobj.keyCode == 13) // enter
            {
                if (this.selfunc != null && this.sel >= 0 && this.sel < this.buttons.length ) {
                    if (this.options[this.buttons[this.sel][1]][0].style.display != "none") {
                        this.selfunc(null);
                    }
                }

                evtobj.preventDefault();
            }

        }

        clickSearch(): void {
            let dlg: Dialog = new Dialog(null, "Search", "search", "searchdialog");

            let editholder: HTMLDivElement = document.createElement("div");
            editholder.className = "editholder";

            let icon: HTMLDivElement = document.createElement("div");
            icon.className = "searchicon";
            editholder.appendChild(icon);

            this.edit = document.createElement("input");
            this.edit.className = "searchedit";
            this.edit.type = "text";

            let search: Search = this;

            editholder.appendChild(this.edit);

            dlg.content.appendChild(editholder);


            let auto: (ev: MouseEvent) => any = null;
            let added: { [n: number]: boolean } = {};

            let first: boolean = true;

            for (let i: number = 0; i < this.editor.options.length; i++) {
                let pdiv: HTMLDivElement = this.editor.options[i].pdiv;

                if (pdiv.style.display == "none")
                    continue;
                if (added[this.editor.options[i].entry.id])
                    continue;

                added[this.editor.options[i].entry.id] = true;

                let node: HTMLElement = <HTMLElement>pdiv.cloneNode(true);
                let choice: number = 0;

                for (let j: number = 0; j < node.children.length; j++) {
                    if (node.children[j].className.indexOf("elopt") > -1) {
                        for (let k: number = 0; k < (<HTMLElement>node.children[j]).children.length; k++) {
                            let button: HTMLElement = <HTMLElement>((<HTMLElement>node.children[j]).children[k]);
                            if (button.className == "ob bh" || button.className == "ob bh otm") {
                                //button.className = "ob bh";

                                let sthis: Search = this;

                                let selfunc: (ev: any) => void = (function () {
                                    let myThis: Editor = sthis.editor;
                                    let mySlist: SubList = sthis.al.current();
                                    let myOption: EntryOption = sthis.editor.options[i];
                                    let myChoice: number = choice;
                                    let myDlg: Dialog = dlg;

                                    return function (ev: any) {
                                        // myThis.entryCallback(mySlist, myOption.entry,
                                        //     myChoice, null, false, mySlist.pal.interactive);

                                        mySlist.insertEntry(myOption.entry, myChoice, 
                                            null, false, null, false);

                                        myThis.endChange();

                                        myDlg.close();
                                    };

                                })();

                                button.onclick = selfunc;


                                if (first) {
                                    button.className += " editsel";
                                    first = false;
                                    this.sel = this.buttons.length;
                                    this.selfunc = selfunc;
                                }

                                // todo: Ensure theme list checking is applied
                                // if( validRet[2] ) {
                                //     button.children[k].className += " otm";
                                // }

                                this.buttons.push([button, this.options.length]);

                                choice++;

                            }
                        }
                    }
                }

                dlg.content.appendChild(node);

                this.options.push([node, this.editor.options[i].entry.n]);
            }

            this.edit.onkeydown = (function () {
                let myThis = search;

                return function (e: any): void {
                    myThis.keyDown(e);
                };
            })();


            this.edit.onkeyup = (function () {
                let myThis: Search = search;

                return function (): void {
                    myThis.updateSearch();
                };
            })();

            dlg.show();
            this.edit.focus();

        }


    }

//}
