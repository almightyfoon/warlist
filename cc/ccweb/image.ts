//namespace ccapi {

import { ArmyList } from "../ccapi/armylist";
import { SubList } from "../ccapi/sublist";

import { ArmyListView } from "./armylistview";
import { ajax } from "./ajax";

let _storedCSS: string = null;
let _storedFont: string = null;
let _imgSave: HTMLImageElement = null;

export function saveAsImage(list: ArmyListView): void {
    if (_storedCSS == null) {
        ajax("cc.css?CC_VER", (function () {
            var myList = list;
            return function (s: string): void {
                gotCSS(s, myList);
            }
        })());
    }
    else {
        gotCSS(_storedCSS, list);
    }
}

function saveImageCallback(al: ArmyListView): void {
    let canvas: HTMLCanvasElement = document.createElement("canvas");
    let slist: SubList = al.al.current();

    canvas.width = _imgSave.width;
    canvas.height = _imgSave.height;

    let ctx: CanvasRenderingContext2D = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(_imgSave, 0, 0);

    let a: HTMLAnchorElement = document.createElement("a");
    document.body.appendChild(a);

    let filename: string = al.al.getSaveFilename();

    a.download = filename + ".png";
    a.href = canvas.toDataURL("image/png");
    a.click();

    //location.href = canvas.toDataURL("image/png");
}

function gotCSS(cssText: string, al: ArmyListView): void {
    _storedCSS = cssText.replace(/\/\*IMGZ\*\//g, " display: none; ");

    if (_storedFont == null) {
        ajax('pragati.css?171', (function () {
            var myList = al;

            return function (s: string): void {
                gotCSS2(s, myList);
            }

        })());
    }
    else {
        gotCSS2(_storedFont, al);
    }
}

function gotCSS2(cssText: string, al: ArmyListView): void {
    _storedFont = cssText;

    let list: HTMLElement = al.rootNode;

    let ssheight: number = list.clientHeight - 87;
    let sswidth: number = list.clientWidth + 5;

    let data: string = '<svg xmlns="http://www.w3.org/2000/svg" width="'
        + sswidth + '" height="' + ssheight + '">';

    data += '<defs><style type="text/css"><![CDATA[';

    data += _storedFont;
    data += _storedCSS;

    data += ']]></style></defs>';

    let divclass: string = al.rootNode.className;
    divclass = divclass.replace("alanim", "").replace("armyList", "al2");


    let html: string = al.saveNode.innerHTML;

    //html = html.replace("<div class=\"listattach lb bh\"><span>&nbsp;</span>The Kingmaker's Army</div>", "");
    //html = html.replace("&nbsp;", "");

    html = html.replace(/&/g, "&amp;");
    html = html.replace(/'/g, "&apos;");

    // Don't know why this is needed.
    html = html.replace("armyListSaveInner\"", "armyListSaveInner alsid\" style=\"float: left\"");

    data += '<foreignObject width="100%" height="100%">'

        //+ '<div xmlns="http://www.w3.org/1999/xhtml" class="armyListImg al2 f' + al.factionID + '">'
        + '<div xmlns="http://www.w3.org/1999/xhtml" class="conflictchamber">'
        + '<div xmlns="http://www.w3.org/1999/xhtml" class="' + divclass + '">'
        //+ '<div class="armyList">'
        + html
        //+ '</div>'
        + '</div>'
        + '</div>'

        + '</foreignObject>' +
        '</svg>';

    //alert(html);

    let data2: string = 'data:image/svg+xml,' + encodeURIComponent(data);



    // let d: HTMLDivElement = document.createElement("div");
    // d.className = "conflictchamber";
    // d.style.position = "fixed";
    // d.style.left = "10px";
    // d.style.top = "10px";
    // d.style.zIndex = "7777";
    // d.style.backgroundColor = "white";
    // d.innerHTML = html;

    // document.body.appendChild(d);


    _imgSave = document.createElement("img");
    _imgSave.onload = (function () {
        var myList = al;
        return function (): void {
            saveImageCallback(al);
        }
    })();
    _imgSave.src = data2;


}

function buildSvgImageUrl(url: string): string {
    return url;
}

function loadImage(url: string,
    callback: (img: HTMLImageElement) => void): void {
    //let image = new window.Image();
    let image: HTMLImageElement = document.createElement("img");

    image.onload = function () {
        callback(image);
    };

    image.src = url;
}

function drawImageToCanvas(image: HTMLImageElement, canvas: HTMLCanvasElement): void {
    let context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
}

function readFromCanvas(canvas: HTMLCanvasElement): ImageData {
    return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
}


//}
