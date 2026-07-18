//namespace ccapi {

import { IEntryCallback, ArmyList } from "../ccapi/armylist";
import { SubList } from "../ccapi/sublist";
import { Entry, canAttach, isWarnoun } from "../ccapi/entry";
import { ArmyEntry, ThemeData, TypeDetail } from "../ccapi/defines";
import { Data } from "../ccapi/data";

export interface EntryOption {
    entry: Entry;
    pc: number;
    div: HTMLDivElement;
    pdiv: HTMLDivElement;
    choice: number;
    parent?: ArmyEntry;
}


export class DivBuilder {



    /**
     * Adjust the size of text in a div to fit a maximum width.
     * @param div The div to adjust text size in
     * @param maxWidth Maximum width to accept
     * @param size Initial font size
     */
    static adjustText(div: HTMLDivElement, maxWidth: number, size: number) {
        div.style.fontSize = size + "pt";

        while (div.clientWidth > maxWidth) {
            size--;
            div.style.fontSize = size + "pt";

            if (size < 5) {
                return;
            }
        }
    }





}

//}
