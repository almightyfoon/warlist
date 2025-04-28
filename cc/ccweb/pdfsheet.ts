// Code for PDF sheet generation

import { ArmyList } from "../ccapi/armylist";
import { SubList } from "../ccapi/sublist";
import { ArmyEntry, ThemeData, Rules } from "../ccapi/defines";
import { Entry } from "../ccapi/entry";
import { Data } from "../ccapi/data";
import { Dialog } from "./dialog";

export interface SheetOptions {
    logo? : string;
    title? : string; 
    rounds? : number; 
    qrcode? : boolean;
};

interface ListDisplayOptions {
    barHeight : number;
    entrySpacing : number;
    childSpacing : number;
    fontSize : number;
    iconSize : number;
}

interface SheetDisplayOptions {
    listOptions : ListDisplayOptions;
    lineHeight : number;
    lineRadius : number;
    headerFactor : number;
    iconColor : string;
    shadeColor : string;
}

class ResourceLoader {
    private resourceCount : number = 0;
    private resourceObject : any = {};
    private resourceCallback : any = null;

    checkResources() : void {
        this.resourceCount--;
    
        if( this.resourceCount == 0 ) {
            this.resourceCallback(this.resourceObject);
        }
    }
    
    constructor(resources : string[][], callback : any) {
        this.resourceCount = resources.length;
        this.resourceObject = {};
        this.resourceCallback = callback;
    
    
        for( let i : number = 0; i < resources.length; i++ ) {
    
            if( resources[i].length == 3 ) {
                window.fetch(resources[i][1])
                    .then(response => response.arrayBuffer())
                    .then(data => { this.resourceObject[resources[i][0]] = data; 
    
                        this.checkResources();
                    });
            }
            else {
                window.fetch(resources[i][1])
                    .then(response => response.text())
                    .then(txt => { this.resourceObject[resources[i][0]] = txt; 
    
                        this.checkResources();
                    });
            }
        }
    
    }


};


function formatDate(dt : Date | string, showTime : boolean) : string {

    if( typeof dt === "string" ) {
        dt = new Date(dt);
    }

	let ret : string = "";

	ret += ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
			"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getMonth()];

	ret += " " + dt.getDate();

    if( showTime ) {
        let hr : number = dt.getHours();
        let ampm : string = "am";

        if( hr > 12 ) {
            hr -= 12;
            ampm = "pm";
        }

        let min : any = dt.getMinutes();

        if( min < 10 ) {
            min = "0" + min;
        }

        ret += " " + hr + ":" + min + " " + ampm;
    }
    else {
        ret += ", " + dt.getFullYear();
    }

	return ret;
}


export class CCPDFDocument {
    // External code called here
    private PDFDocument : any = null;
    private SVGtoPDF : any = null;
    private printJS : any = null;
    private qrcode : any = null;
    private blobStream : any = null;

    // Working margins
    private innerTop : number = 21;
    private innerLeft : number = 21;
    private innerBottom : number = 771;
    private innerRight : number = 591;
    private innerWidth : number = this.innerRight - this.innerLeft;

    // local state
    private pdf : any = null;
    private pdfstream : any = null;
    private readyCallback : (doc : CCPDFDocument) => void = null;
    private resources : any = {};

    private options : SheetDisplayOptions = {
        lineHeight : 16,
        lineRadius : 4,
        headerFactor : 1.5,
        iconColor:  "#777777",
        shadeColor: "#dfdfdf",
        listOptions : {
            barHeight: 16,
            childSpacing: 3,
            entrySpacing: 5,
            fontSize: 12,
            iconSize: 14,
        }
    };

    private sheetOptions : SheetOptions = null;


    constructor(options : SheetOptions, 
        readyCallback : (doc : CCPDFDocument) => void) 
    {
        this.sheetOptions = options;

        new ResourceLoader([
            ["logo", "pdfsheet/logo-small.svg"],
            ["logobig", "pdfsheet/logo.svg"],
            ["font", "GearedSlab.ttf", null],
            ["icons", "MaterialIcons-Regular.ttf", null],
            ["listfont", "FiraSans-Regular.ttf", null],
            ["narrow", "PragatiNarrow-Regular.ttf", null],
            ["codepoints", "pdfsheet/codepoints.txt"]
        ], (resOb : any) => this.resourcesLoaded(resOb) );

        this.readyCallback = readyCallback;
    }


    initializeDocument(resOb : any) : void {
        let doc : any = new this.PDFDocument({
            size: "letter",
            layout: "portrait",
            margin: 50,
            autoFirstPage: false
        });

        this.pdf = doc;

        doc.font(resOb.font);
        doc.font(resOb.icons);
        doc.font(resOb.listfont);
        doc.font(resOb.narrow);

        this.pdfstream = doc.pipe(this.blobStream());

        
        if( this.readyCallback ) {
            this.readyCallback(this);
        }

    }

    end() : void {
        this.pdf.end();
    }

    print(callback? : () => void) : void {
        this.pdfstream.on("finish", () => {
            let url = this.pdfstream.toBlobURL("application/pdf");
        
            this.printJS({
                printable: url,
                type: "pdf",
                showModal : true,
                //onLoadingStart : () => { console.log("OnLoadingStart"); },
                //onLoadingEnd : () => { console.log("OnLoadingEnd"); },
                onPrintDialogClose : callback // () => { console.log("Dialog closed?"); },
            });
        });
    }


    resourcesLoaded(resOb : any) : any {
        this.resources = resOb;

        require.config({
            urlArgs : null
        });
    
        require(['pdfsheet/pdfkit',
             'pdfsheet/source2',
              'pdfsheet/blob-stream',
            'pdfsheet/print.min',
            'pdfsheet/qrcode' ], (PDFDocument, stp, blobStream, printJS, qrcode) => {


            // Load supporting code
            this.PDFDocument = PDFDocument;
            this.SVGtoPDF = stp.SVGtoPDF;
            this.blobStream = blobStream;
            this.printJS = printJS;
            this.qrcode = qrcode;

            // Call the logic that's not horribly nested
            this.initializeDocument(resOb);
        });
    
    }

    renderTitleBar(left : number, top : number, right : number, 
        bottom : number, text? : string) : number 
    {
        this.pdf.moveTo(left, top + this.options.lineRadius)
            .quadraticCurveTo(left, top, left + this.options.lineRadius, top)
            .lineTo(right - this.options.lineRadius, top)
            .quadraticCurveTo(right, top, right, top + this.options.lineRadius)
            .lineTo(right, bottom)
            .lineTo(left, bottom)
            .lineTo(left, top + this.options.lineRadius)
            .lineWidth(0.5)
            .fillAndStroke("black", "black");

        if( text ) {
            this.renderText(text, "GearedSlab-Regular", "white", 12,
                left, top + 2, right, bottom, "center");
        }

        return bottom - top;
    }

    renderResultsBlock(al : ArmyList, top : number) : number {
        // Record block

        let y : number = top;

        let rowIndex : number = 0;

        let columns : any[] = 
        [
            {
                title: "Round",
                width: 75,
                text: () => "" + rowIndex,
            },
            {
                title: "Opponent Name",
                width: 360,
                text: null
            },
            { 
                title: "List Played",
                width: 90,
                text: () => al.subLists.length == 3 ? "1 / 2 / 3" 
                    : (al.subLists.length == 2 ? "1 / 2" : "1")
            },
            {
                title: "Result",
                width: 90,
                text: () => "W / L / T"
            },
            {
                title: "Control Points",
                width: 150,
                text: null
            },
            { 
                title: "Battle Points",
                width: 195,
                text: null
            }
        ];

        let virtualWidth : number = 0;

        columns.forEach((v) => { virtualWidth += v.width; });
        columns.forEach((v) => { v.width = this.innerWidth * v.width / virtualWidth});

        y += this.options.lineHeight/2;
        let x : number = this.innerLeft;

        this.renderTitleBar(this.innerLeft, y, this.innerRight, 
            y + this.options.lineHeight);

        let colX : number = this.innerLeft;

        for( let columnIndex : number = 0; columnIndex < columns.length;
            columnIndex++ ) 
        {

            if( columns[columnIndex].title ) {
                let text : string = columns[columnIndex].title;

                this.pdf
                    .fillColor("white")
                    .font("GearedSlab-Regular")
                    .fontSize(11);


                let textHeight : number = this.pdf.heightOfString(text);
                //let textHeight : number = 12;

                this.pdf
                    .text(text, colX, y + 1 + ((this.options.lineHeight - textHeight)/2), {
                        width: columns[columnIndex].width,
                        align: "center"
                    });
            }

            colX += columns[columnIndex].width;
        }

        y += this.options.lineHeight;

        let tableTop : number = y;

        for( rowIndex = 1; rowIndex <= this.sheetOptions.rounds; rowIndex++ ) {
            this.pdf.moveTo(x, y)
            .lineTo(x + this.innerWidth, y)
            .lineTo(x + this.innerWidth, y + this.options.lineHeight)
            .lineTo(x, y + this.options.lineHeight)
            .lineTo(x, y)
            .lineWidth(0.5)
            .fillAndStroke( rowIndex % 2 == 0 ? "white" : 
                this.options.shadeColor, "black");

            colX = this.innerLeft;

            for( let columnIndex : number = 0; columnIndex < columns.length - 1;
                columnIndex++ ) 
            {

                if( columns[columnIndex].text ) {
                    let text : string = columns[columnIndex].text();

                    this.pdf
                        .fillColor("black")
                        .font("FiraSans-Regular")
                        .fontSize(11);


                    let textHeight : number = this.pdf.heightOfString(text);
                    //let textHeight : number = 12;

                    this.pdf
                        .text(text, colX, y + ((this.options.lineHeight - textHeight)/2), {
                            width: columns[columnIndex].width,
                            align: "center"
                        });
                }

                colX += columns[columnIndex].width;
            }
    

            y += this.options.lineHeight;
        }

        let tableBottom : number = y;
        colX = this.innerLeft;

        for( let columnIndex : number = 0; columnIndex < columns.length - 1;
            columnIndex++ ) 
        {
            colX += columns[columnIndex].width;
            this.pdf.moveTo(colX, tableTop)
                .lineTo(colX, tableBottom)
                .lineWidth(0.5)
                .stroke("black");

        }

        // Return the y-distance covered by the block
        return y - top;
    }

    renderTitle(al : ArmyList, top : number, playerName? : string, 
        teamName? : string) : number 
    {
        // Header
        
        // this.pdf.moveTo(x, y + radius)
        //     .quadraticCurveTo(x, y, x + radius, y)
        //     .lineTo(x + this.innerWidth - radius, y)
        //     .quadraticCurveTo(x + this.innerWidth, y, x + this.innerWidth, y + radius)
        //     .lineTo(x + this.innerWidth, y + lineHeight * headerFactor)
        //     .lineTo(x, y + lineHeight * headerFactor)
        //     .lineTo(x, y + radius)
        //     .lineWidth(0.5)
        //     .fillAndStroke("black", "black");

        let gap : number = 54;

        let left : number = this.innerLeft + gap;
        let right : number = this.innerRight;

        if( this.sheetOptions.qrcode ) {
            right -= gap;
        }

        let titleWidth : number = right - left;

        let y : number = top;
        let x : number = left;
        
        y += this.options.lineHeight * this.options.headerFactor + 4;

        let headerHeight : number = this.options.lineHeight * 5 / 3;
        let factionSeparator : number = right - 160;
        
        this.pdf.moveTo(x, y)
            .lineTo(x + titleWidth, y)
            .lineTo(x + titleWidth, y + headerHeight)
            .lineTo(x, y + headerHeight)
            .lineTo(x, y)
            .moveTo(factionSeparator, y)
            .lineTo(factionSeparator, y + headerHeight)
            .lineWidth(0.5)
            .fillAndStroke("white", "black");

        if( al && al.factionID ) {
            let factionTitle : string = Data._data.factions[al.factionID].n;

            this.renderText(factionTitle, "FiraSans-Regular", "black", 14,
                factionSeparator, y, 
                right, y + headerHeight, "center");
        }

        if( teamName ) {
            this.renderText(teamName, "GearedSlab-Regular", "black", 15,
                left + 4, y + 4, factionSeparator + 100, y + this.options.lineHeight, "left");

            this.renderText(playerName, "FiraSans-Regular", "black", 14,
                left, y + 2 * this.options.lineHeight / 3, factionSeparator - 5, 
                y + headerHeight, "right");
        }
        else if( playerName ) {
            this.renderText(playerName, "FiraSans-Regular", "black", 15,
                left, y, factionSeparator, y + headerHeight, "center");
        }

        y += headerHeight;
        
        this.pdf.lineWidth(2)
            .fillColor("black")
            .font("GearedSlab-Regular")
            .fontSize(22)
            .text(this.sheetOptions.title, this.innerLeft, this.innerTop + 4, {
                width: this.innerWidth,
                align: "center"
            });
        
        // CC logo upper left
        this.SVGtoPDF(this.pdf, this.resources.logobig, this.innerLeft - 2, 
            this.innerTop + 8, 
            {
                width: gap + 4,
                height: gap + 4
            });

        // QR code upper right
    
	if( this.sheetOptions.qrcode ) {
	let qrVersion : number = 6;

	if( al.subLists.length > 2 ) {
		qrVersion = 10;
	}

            let qr : any = this.qrcode(qrVersion, "L");

            let url : string = "https://conflictchamber.com?" + al.toCode();
            qr.addData(url, "Byte");
            qr.make();

            let qrsvg : string = qr.createSvgTag(gap / 33, 0);

            this.SVGtoPDF(this.pdf, qrsvg, 3 + this.innerRight - gap, this.innerTop + 6);
        }
    

        return y - top;
    }

    renderArmyValidation(al : ArmyList, rules : Rules, top : number) : number {
        let y : number = top;

        // Core validation text

        let now : Date = new Date();

        let valText : string = " -- "
            + now.toUTCString() + " (build CC_VER)";

        if( rules ) {
            valText += "; " + rules.listSize + " points";

            if( rules.ignorePreRelease ) {
                valText += "; Ignoring pre-release";
            }
            else if( rules.preReleaseDate ) {
                valText += "; Event date " 
                    + formatDate(rules.preReleaseDate, false);
            }

            if( rules.listType && rules.listType.champions ) {
                valText += "; Champions Season " + rules.listType.season;
            }
        }

        let valState : number = al.getValidationState(rules);

        let valColor : string = "black";

        if( valState == 0 ) {
            valText = "Validated" + valText;
        }
        else if ( valState > 1 ) {
            valText = "VALIDATION FAILURE" + valText;
            valColor = "red";
        }
        else {
            valText = "Validated (with warnings)" + valText;
        }

        this.renderText(valText, "FiraSans-Regular", valColor, 9,
            this.innerLeft, y, this.innerRight, y + this.options.lineHeight,
            "center");

        y += this.options.lineHeight * 5/4;

        return y - top;
    }

    renderArmyList(al : ArmyList, playerName? : string, teamName? : string, 
        rules? : Rules) : void 
    {
        // Add page to the PDF document
        this.pdf.addPage();

        let y : number = this.innerTop;

        // Render title and results blocks
        y += this.renderTitle(al, y, playerName, teamName);

        y += this.renderResultsBlock(al, y);

        y += this.options.lineHeight / 4;

        y += this.renderArmyValidation(al, rules, y);


        // Calculate sublist locations

        let fraction : number = 0.5;

        if( al.subLists.length == 3 ) {
            fraction = 1 / 3;
        }

        let x : number = this.innerLeft;

        // Render the sublists
        for( let i : number = 0; i < al.subLists.length; i++ ) {
            this.renderSubList(x, y, x + (fraction * this.innerWidth), 
                this.innerBottom - this.options.lineHeight * 2,
                al.subLists[i]);

            x += (fraction * this.innerWidth);
        }


        // Put logo and trailing line at the bottom
        let ratio : number = 318 / 211;

        let logoWidth : number = 24;
        let logoHeight : number = 24 / ratio;

        let logoX : number = this.innerLeft + (this.innerWidth / 2) 
            - (logoWidth / 2);
        let logoY : number = this.innerBottom - logoHeight;

        let logoMid : number = logoY + (logoHeight / 2);

        this.pdf
            //.rect(logoX, logoY, logoWidth, logoHeight)
            .lineWidth(1.0)
            .moveTo(this.innerLeft + 20, logoMid)
            .lineTo(logoX - 20, logoMid)
            .moveTo(logoX + logoWidth + 20, logoMid)
            .lineTo(this.innerRight - 20, logoMid)
            .stroke("black");

        this.SVGtoPDF(this.pdf, this.resources.logo, logoX, logoY, {
            width: logoWidth,
            height: logoHeight
        });

        // CID -- draw big CID mark if we're in CID

        if( al.isCID() ) {
            let centerX : number = this.innerLeft + ((this.innerRight - this.innerLeft) / 2);
            let centerY : number = this.innerTop + ((this.innerBottom - this.innerTop) / 2);

            centerY += 100;

            this.pdf 
                .font("GearedSlab-Regular")
                .fillColor("black")
                .opacity(0.1)
                .fontSize(450);

            let textWidth : number = this.pdf.widthOfString("CID");
            let textHeight : number = this.pdf.widthOfString("CID");

            this.pdf
                .rotate(-45, { origin: [centerX, centerY]})
                .translate(25, 50)
                .text("CID", centerX - (textWidth/2), centerY - (textHeight/2));
        }

    }

    getEntryIcon(e : Entry) : string {
        let icon : string = Data.typeDetails[Data._data.typenames[e.t]].icon;
        let index : number = this.resources.codepoints.indexOf(icon + " ");

        if( index != -1 ) {
            let hexCode = this.resources.codepoints.substr(index + icon.length + 1, 4);

            let charNumber = parseInt(hexCode, 16);
            return String.fromCharCode(charNumber);
        }
        else {
            return "\ue8af";
        }
    }

    calculateHeight(sl : SubList, opt : ListDisplayOptions) : number {
        let ret : number = 0;

        for( let i : number = 0; i < sl.armyEntries.length; i++ ) {
            let ae : ArmyEntry = sl.armyEntries[i];

            ret += opt.barHeight;

            if( ae.entry.v ) {
                ret += 2 * opt.barHeight / 3;
            }

            for( let j : number = 0; j < ae.children.length; j++ ) {
                ret += opt.barHeight;
                ret += opt.childSpacing;
            }

            if( i > 0 ) {
                ret += opt.entrySpacing;
            }
        }

        return ret;
    }

    renderEntry(ae : ArmyEntry, left : number, top : number, right : number,
        opt : ListDisplayOptions) : number 
    {
        let barHeight : number = opt.barHeight;
        let big : boolean = ae.entry.v && ae.entry.v.length > 0;

        if( big ) {
            barHeight += 2 * opt.barHeight / 3;
        }

        let bottom : number = top + barHeight;

        this.pdf
            .lineWidth(0.25)
            .roundedRect(left, top, right - left, bottom - top, 2)
            .stroke();


        this.pdf
            .fillColor(this.options.iconColor)
            .font("MaterialIcons-Regular")
            .fontSize(opt.iconSize + (big ? 2 : 0));

        let iconText : string = this.getEntryIcon(ae.entry);

        // heightOfString on icons sometimes gets into an 
        // infinite loop
        let h : number = opt.iconSize + (big ? 2 : 0);

        // Just, in general, avoid asking PDFKit to
        // calculate the size of a printed icon.
        this.pdf            
            .text(iconText,
                left + 4, top + ((barHeight - h) / 2)
                // ,
                // {
                //     width: 12,
                //     align: "center"
                // }
                );

        this.pdf
            .fillColor("black")
            .font("PragatiNarrow-Regular")
            .fontSize(opt.fontSize);

        h = this.pdf.heightOfString(ae.baseText);

        if( big ) {
            this.pdf
                .text(ae.baseText, 
                    left + 26, (bottom - h) + (opt.fontSize / 4), 
                    {
                        width: (right - left) - 52,
                        align: "left"
                    });

            this.pdf 
                    .text(ae.entry.v,
                        left + 22, top - (opt.fontSize / 4),
                        {
                            width: (right - left) - 48,
                            align: "left"
                        });
        }
        else {
            this.pdf
                .text(ae.baseText, 
                    left + 20, top + ((barHeight - h) / 2), 
                    {
                        width: (right - left) - 46,
                        align: "left"
                    });
        }

        this.pdf 
            .fillColor("black")
            .font("FiraSans-Regular")
            .fontSize(opt.fontSize);

        h = this.pdf.heightOfString(ae.costText);

        this.pdf
            .text(ae.costText,
                right - 36, top + ((barHeight - h) / 2),
                {
                    width: 32,
                    align: "center"
                });


        return bottom - top;
    }

    renderText(text : string, font : string, color : string, size : number,
        left : number, top : number, right : number, bottom : number, 
        align: string) : void 
    {
        this.pdf 
            .fillColor(color)
            .font(font)
            .fontSize(size);

        let options : any = {
            width: right - left,
            align: align,
            lineBreak: false
        };

        let textHeight : number = this.pdf.heightOfString(text, options);

        this.pdf
            .text(text,
                left, top + (((bottom - top) - textHeight) / 2),
                options);
    }


    renderThemeBlock(left : number, top : number, right : number,
        sl : SubList) : number 
    {
        let y : number = top;

        let lines : string[] = [];

        let il : number = left + 4;
        let ir : number = right - 4;

        let tl : number = il + 4;
        let tr : number = ir - 4;


        if( sl.inTheme() ) {
            lines.push(sl.theme.name());

            lines.push("*" + sl.themeFreebieText());

            let themeData : ThemeData = Data._data.themelists[sl.theme.id()];            

            // lines.push(themeData.tb1text);
            // lines.push(themeData.tb2text);

            for( let i : number = 0; i < themeData.tb.length; i ++ ) {
                lines.push(themeData.tb[i]);
            }
        }
        else {
            lines.push(Data.factionShort[sl.pal.factionID] + " Army");
            lines.push("*No theme benefits");
        }

        y += this.renderTitleBar(il, top, ir,
            top + this.options.lineHeight, lines[0]);

        let vals : string[] = sl.getValidationArray(true);

        for( let i : number = 0; i < vals.length; i++ ) {
            lines.push(vals[i]);
        }

        let warned : boolean = false;
        let failed : boolean = false;
    

        for( let i : number = 1; i < lines.length; i++ ) {
            this.pdf
                .font("FiraSans-Regular")
                .fontSize(9);

            let localTL : number = tl;
            let warnIcon : string = null;

            let text = lines[i];
            text = text.replace("&ndash;", "-");


            let alignment : string = "left";

            if( text.substr(0, 1) == "*" ) {
                text = text.substr(1);
                alignment = "center";
            }
            else if( text.substr(0, 1) == "!" ) {
                text = text.substr(1);
                localTL += 16;
                warned = true;
                warnIcon = "\ue002";
            }
            else if( text.substr(0, 1) == "#" ) {
                text = text.substr(1);
                localTL += 16;
                failed = true;
                warnIcon = "\ue5c9";
            }

            let options : any = {
                width: tr - localTL,
                align: alignment
            };

            let textHeight : number = this.pdf.heightOfString(text, options);

            this.pdf
                .moveTo(il, y)
                .lineTo(il, y + textHeight + 4)
                .lineTo(ir, y + textHeight + 4)
                .lineTo(ir, y)
                .lineWidth(0.5)
                .fillAndStroke( i % 2 == 0 ? "white" : 
                    this.options.shadeColor, "black");

            this.pdf
                .font("FiraSans-Regular")
                .fontSize(9)
                .fillColor("black")
                .text(text, localTL, y + 2, options);

            if( warnIcon ) {
                this.pdf 
                    .font("MaterialIcons-Regular")
                    .fontSize(12)
                    .fillColor("black")
                    .text(warnIcon, tl + 1, y + 1);
            }

            y += textHeight + 4;
        }

        this.renderText("" + sl.armyCost(), "GearedSlab-Regular",
            "white", 15, right - 30, top + 3, right - 10,
            top + this.options.lineHeight, "center");


        let listIcon : string = "\ue876";
        let iconOffset : number = 2;

        if( warned ) {
            listIcon = "\ue002";
        }

        if( failed ) {
            listIcon = "\ue5c9";
            iconOffset = 1;
        }

        this.pdf
            .font("MaterialIcons-Regular")
            .fontSize(14)
            .fillColor("white")
            .text(listIcon, left + 7, top + iconOffset);

        return y - top;
    }
    
    renderSubList(left : number, top : number, right : number,
        bottom : number, sl : SubList ) : void {

        // this.pdf
        //     .lineWidth(0.5)
        //     .moveTo(left, top)
        //     .lineTo(right, top)
        //     .lineTo(right, bottom)
        //     .lineTo(left, bottom)
        //     .lineTo(left, top)
        //     .stroke("blue");
            
        let y : number = top;

        y += this.renderThemeBlock(left, top, right, sl);

        y += this.options.lineHeight / 2;


        let opt : ListDisplayOptions = this.options.listOptions;

        let calcHeight : number = this.calculateHeight(sl, opt);

        if( calcHeight + y > bottom ) {
            console.log("*** TOO LONG ***");
        }

        // this.pdf
        //     .lineWidth(0.5)
        //     .moveTo(left, y)
        //     .lineTo(right, y)
        //     .lineTo(right, y + calcHeight)
        //     .lineTo(left, y + calcHeight)
        //     .lineTo(left, y)
        //     .stroke("blue");


        for( let i : number = 0; i < sl.armyEntries.length; i++ ) {
            let ae : ArmyEntry = sl.armyEntries[i];

            y += this.renderEntry(ae, left + 6, y, right - 6, opt);

            let linkX : number = left + 10;
            let linkTop : number = y;
            let linkBottom : number = y;

            for( let j : number = 0; j < ae.children.length; j++ ) {

                y += opt.childSpacing;

                let child : ArmyEntry = ae.children[j];

                linkBottom = y + (opt.barHeight / 2);

                y += this.renderEntry(child, left + 16, y, right - 6, opt);

                this.pdf 
                    .lineWidth(1)
                    .moveTo(left + 16, linkBottom)
                    .lineTo(linkX, linkBottom)
                    .stroke();
            }

            if( linkBottom != linkTop ) {
                this.pdf
                    .lineWidth(1)
                    .moveTo(linkX, linkTop)
                    .lineTo(linkX, linkBottom)
                    .stroke();
            }

            y += opt.entrySpacing;

        }
            
    }
    
    
}


function ready(doc : CCPDFDocument, code : string, rules : Rules) : void {
    Dialog.progress("Building army list...");

    setTimeout(() => {
        let al : ArmyList = ArmyList.fromCode(code);

        doc.renderArmyList(al, null, null, rules);

        doc.end();
        doc.print(() => Dialog.endProgress());
    }, 0);
}

export function buildPDFSheet(code : string, playerName : string,
    options : SheetOptions, rules : Rules) : void
{
    if( !options.rounds ) {
        options.rounds = 5;
    }

    if( !options.title ) {
        options.title = "Steamroller 2019 Record Sheet";
    }

    Dialog.progress("Loading PDF resources...");

    let doc : CCPDFDocument = new CCPDFDocument(options, 
        (doc) => ready(doc, code, rules));

}
