//namespace ccapi {

import { _encoding, _decoding } from "./data";
import { Magic } from "./defines";

    export function getCasters(code : string) : number[] {
        // console.log(_encoding);
        // console.log(_decoding);
        // console.log(encodeChar(61));

        let casters: number[] = [];

        let initial : number = 10;

        if( code.substr(6, 2) != "_-" && code.substr(6, 2) != "_Z" ) {
            initial -= 4;
        }

        let slist : number[] = decodeSubList(decodeChar(code, initial));

        if( slist && slist.length > 0 ) {
            casters.push(slist[0]);
        }

        let index : number = initial + 2;

        while( index < code.length) {
            if( code.substr(index, 2) == "__" && index < code.length - 8 ) {

                let offset : number = 6;

                if( code.substr(index + 2, 2) != "_-" && code.substr(index + 2, 2) != "_Z") {
                    offset -= 4;
                }

                slist = decodeSubList(decodeChar(code, index + offset));

                if( slist && slist.length > 0 ) {
                    casters.push(slist[0]);
                }
            }
            index += 2;
        }

        return casters;
    }

    export function decodeCharSingle(str: string, offset: number): number {
        let c = str.charCodeAt(offset);

        if (c >= "0".charCodeAt(0) && c <= "9".charCodeAt(0)) {
            return c - "0".charCodeAt(0);
        }
        else if (c >= "a".charCodeAt(0) && c <= "z".charCodeAt(0)) {
            return 10 + (c - "a".charCodeAt(0));
        }
        else if (c >= "A".charCodeAt(0) && c <= "Z".charCodeAt(0)) {
            return 36 + (c - "A".charCodeAt(0));
        }
        else if (c == "-".charCodeAt(0)) {
            return 62;
        }
        else if (c == "_".charCodeAt(0)) {
            return 63;
        }
        else {
            return -1;
        }
    }

    export function decodeChar(str: string, offset: number): number {
        return (decodeCharSingle(str, offset) * 64) + decodeCharSingle(str, offset + 1);
    }

    export function encodeCharSingle(val: number): string {
        if (val >= 0 && val < 10) {
            return String.fromCharCode("0".charCodeAt(0) + val);
        }
        else if (val >= 10 && val < 36) {
            return String.fromCharCode("a".charCodeAt(0) + (val - 10));
        }
        else if (val >= 36 && val < 62) {
            return String.fromCharCode("A".charCodeAt(0) + (val - 36));
        }
        else if (val == 62) {
            return "-";
        }
        else if (val == 63) {
            return "_";
        }

        return "?";
    }

    export function encodeChar(val: number): string {
        return encodeCharSingle(Math.floor(val / 64)) + encodeCharSingle(val % 64);
    }

    export function encodeSubList(sl: number[]): string {
        let id: number = sl[0];
        let choice: number = 0;

        if (sl.length > 1 && sl[1] != null && sl[1] > -1) {
            choice = sl[1];
        }

        let sle: string = "" + sl[0] + "_" + choice;

        // if (sl.length > 2) {
        //     sle += "_" + sl[2];
        // }

        let val: number = _encoding[sle];

        if (val == null) {
            // console.log("Invalid sublist");
            // console.log(sle);
            // console.log(sl);
            // console.log(_encoding);
            //alert("Invalid sublist");
            return "";
        }

        let ret : string = "";

        if( sl[2] == 1 ) {
            ret += encodeChar(Magic.specialistCode);
        }

        ret += encodeChar(val);

        return ret;
    }

    export function decodeSubList(sl: number, specialist? : boolean): number[] {
        let decoded : number[] = _decoding[sl];

        if (decoded == null) {
            //alert("Invalid sublist: " + sl);
            console.log("Invalid sublist");
            console.log(sl);
            console.log(_decoding);

            return null;
        }

        let ret : number[] = [0,0,0];

        ret[0] = decoded[0];
        ret[1] = decoded[1];
        ret[2] = specialist ? 1 : 0;

        return ret;
    }


//}
