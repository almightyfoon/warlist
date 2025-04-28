

export { SubListView } from "./sublistview";
export { ArmyListView } from "./armylistview";
export { Editor } from "./editor";
export { FactionList } from "./factionlist";
export { FactionSelection } from "./factionselection";
export { Dialog } from "./dialog";
export { ajax } from "./ajax";
export { buildTournamentInterface } from "./dgi";
export { CardViewer } from "./cardviewer";
export * from "./widgets";

import * as ccapi from "../ccapi/ccapi";
import { Editor } from "./editor";


export function download(filename : string, text : string) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export function downloadBlob(filename : string, blob : any) {
  var element = document.createElement('a');
  element.setAttribute('href', window.URL.createObjectURL(blob));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export function attachStyles() : void {

  let links = [
    ["https://fonts.googleapis.com/css?family=Pragati+Narrow", null],
    ["https://fonts.googleapis.com/css?family=Open+Sans", null],
    ["https://fonts.googleapis.com/css?family=Roboto", null],
    ["https://fonts.googleapis.com/css?family=Fira+Sans", null],
    ["https://fonts.googleapis.com/css?family=Lato", null],
    ["https://fonts.googleapis.com/icon?family=Material+Icons", null],
    ["https://conflictchamber.com/cc.css", "screen, projection"],
    ["https://conflictchamber.com/cc_print.css", "print"],
  ];

  links.forEach((s : string[]) => {
    let link : HTMLLinkElement = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = s[0];

    if( s[1] ) {
      link.media = s[1];
    }

    document.head.appendChild(link);
  });

}


export function displayList(listCode : string, rules? : any) : HTMLDivElement {
  attachStyles();
  ccapi.loadData(null);
  

  if( !rules ) {
    rules = {};
  }

  return Editor.displayList(listCode, rules);
}

export function launchEditor(editorOptions: any) : void {
  attachStyles();

  let quitCallback = editorOptions['quitCallback'] || ( () => {} );
  let factionCallback = editorOptions['factionCallback'] 
    || ( (n: number) => {} );
  let updateCallback = editorOptions['updateCallback'] || ( (s: string) => {} );

    
  let e : Editor = new Editor(quitCallback, factionCallback, updateCallback);

  e.show();
}


