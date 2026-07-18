import { ArmyList, IArmyListView } from "../ccapi/armylist";
import { SubList, ISubListView } from "../ccapi/sublist";
import { Rules } from "../ccapi/defines";

import { SubListView } from "./sublistview";
import { Editor } from "./editor";
import { Button } from "./widgets";

export class ArmyListView implements IArmyListView {
    rootNode: HTMLElement;
    saveNode: HTMLElement;
    toolbarNode: HTMLElement;
    linkA: HTMLAnchorElement;
    addListButton : Button;

    al: ArmyList;
    interactive : boolean;


    createSubListView(sl : SubList) : ISubListView {
        return new SubListView(sl, this.interactive);
    }

    constructor(interactive: boolean, factionID: number,
            //lt: ListType, listSize: number, 
            aec: Editor, rules : Rules) {

        this.interactive = interactive;

        this.al = new ArmyList(this, interactive, factionID,
            //lt, listSize, 
            aec, rules);

        this.linkA = null;

        //this.outerNode = document.createElement("div");
        //this.outerNode.className = "conflictchamber";

        this.rootNode = document.createElement("div");
        this.rootNode.className = "armyList alSingle"
            + (this.al.interactive ? " alanim alactive" : "")
            //+ " f" + factionID
            ;
        //this.rootNode.style.display = "none";

        //this.outerNode.appendChild(this.rootNode);

        this.saveNode = document.createElement("div");
        this.saveNode.className = "armyListSave";
        this.rootNode.appendChild(this.saveNode);

        this.saveNode.appendChild((<SubListView>this.al.subLists[0].view).rootNode);

        if (this.al.interactive) {
            let div: HTMLElement = null;
            
            
            // div = document.createElement("div");
            // div.className = "sepe";
            // this.rootNode.appendChild(div);

            this.addListButton = new Button({
                text: "Add list",
                size: "largefixed",
                click: (button: Button) => {
                    this.al.addList();
                }
            });
            this.rootNode.appendChild(this.addListButton.container);

            // let addList: HTMLDivElement = document.createElement("div");
            // addList.appendChild(document.createTextNode("Add list"));
            // addList.className = "gcbutton lb bh";
            // addList.onclick = (function(alv : ArmyListView) {
            //     let myALV : ArmyListView = alv;

            //     return function() {
            //         alv.al.addList();
            //     };

            // })(this);
            // this.rootNode.appendChild(addList);
            // this.addListButton = addList;

            if( !aec.rules || ( !aec.rules.enforce && !aec.rules.useCallback ) ) {
                // let listOptions: HTMLDivElement = document.createElement("div");
                // listOptions.appendChild(document.createTextNode("List options"));
                // listOptions.className = "gcbutton lb bh";
                // listOptions.onclick = (function(alv : ArmyListView) {
                //     let myALV : ArmyListView = alv;

                //     return function() {
                //         alv.al.aec.listOptions();
                //     };

                // })(this);
                // this.rootNode.appendChild(listOptions);
            }
            else if( aec.exitTooltip ) {

                // let listOptions: HTMLDivElement = document.createElement("div");
                // listOptions.appendChild(document.createTextNode(aec.exitTooltip));
                // listOptions.className = "gcbutton lb bh";
                // listOptions.onclick = aec.submitCallback;
                // this.rootNode.appendChild(listOptions);

                let listOptionsButton = new Button({
                    text: aec.exitTooltip,
                    size: "largefixed",
                    click: aec.submitCallback
                });

                this.rootNode.appendChild(listOptionsButton.container);
            }


            // div = document.createElement("div");
            // div.className = "sepe";
            // this.rootNode.appendChild(div);

            this.toolbarNode = aec.buildToolbar(this);

            this.rootNode.appendChild(this.toolbarNode);

            this.al.optionsChanged(true);
        }

    }

    windowResized() : void {
        if( this.al.subLists.length > 1) {
            if( window.innerWidth > 1220 ) {
                this.rootNode.className = "armyList alDouble"
                    + (this.al.interactive ? " alanim alactive" : "") 
                    //+ " f" + this.al.factionID
                    ;
            }
            else {
                this.rootNode.className = "armyList alSingle"
                    + (this.al.interactive ? " alanim alactive" : "") 
                    //+ " f" + this.al.factionID
                    ;
            }
        }
    }

    repositionLists(): void {
        if( this.al.subLists.length > 1 && window.innerWidth > 1220 ) {
            this.rootNode.className = "armyList alDouble"
                + (this.al.interactive ? " alanim alactive" : "") 
                //+ " f" + this.al.factionID
                ;
        }
        else {
            this.rootNode.className = "armyList alSingle"
                + (this.al.interactive ? " alanim alactive" : "") 
                //+ " f" + this.al.factionID
                ;
        }


        while (this.saveNode.hasChildNodes()) {
            this.saveNode.removeChild(this.saveNode.firstChild);
        }


        let i = this.al.index;

        do {
            (<SubListView>this.al.subLists[i].view).activate(i == this.al.index);
            this.saveNode.appendChild((<SubListView>this.al.subLists[i].view).rootNode);
            i = (i + 1) % this.al.subLists.length;
        } while (i != this.al.index);


        for( let j : number = 0; j < this.al.subLists.length; j++ ) {
            (<SubListView>this.al.subLists[j].view).validate(this.al.rules);
        }


        if( this.addListButton ) {
            let maxLists : number = 3;

            if( this.al.rules && this.al.rules.listType ) {
                maxLists = this.al.rules.listType.maxLists;
            }

            //this.addListButton.style.display = this.al.subLists.length >= maxLists ? "none" : "";

            if( this.al.subLists.length >= maxLists ) {
                this.addListButton.hide();
            }
            else {
                this.addListButton.show();
            }

        }


        if (this.al.aec) {
            this.al.aec.syncOptions(this.al);
            this.al.aec.endChange();
        }

    }




}
