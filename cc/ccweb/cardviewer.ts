import { Entry, isWarbeast } from "../ccapi/entry";
import { isMobile, Button, Card } from "./widgets";

function fakeMobile() : boolean {
    return isMobile();
}


class LoadableImage {
    private preloaded : boolean = false;
    private image : HTMLImageElement;
    public holder : HTMLDivElement;

    constructor(src : string) {
        this.holder = document.createElement("div");
        this.holder.className = "cardplaceholder";
        this.holder.appendChild(document.createTextNode('...'));

        this.image = document.createElement("img");
        this.image.className = "cardimg";
        this.image.src = src;

        this.preloaded = this.image.complete;

        if( !this.preloaded ) {
            this.image.onload = () => {
                if( this.holder.style.display == "none" ) {
                    this.preloaded = true;
                    this.image.style.display = "";
                }
                else {
                    this.show(true);
                }
            }

            this.image.style.opacity = "0";
        }

        this.image.draggable = false;

        this.holder.appendChild(this.image);
    }

    show(display : boolean, offsetX? : number, offsetY? : number) : void {
        let loaded : boolean = this.image.complete;

        this.holder.style.display = display ? "" : "none";
        this.image.style.display = (display && loaded) ? "" : "none";

        if( display && loaded && !this.preloaded ) {
            this.preloaded = true;
            this.image.className += " fade-in";
        }
        else if( display && loaded ) {
            this.image.className = "cardimg";
            this.image.style.opacity = "1";
            this.image.style.display = "";
        }

        if( display && !(offsetX === undefined) ) {
            this.holder.style.position = "fixed";
            this.holder.style.left = offsetX + "px";
            this.holder.style.top = offsetY + "px";
        }

    }

    private _width : number = 0;
    private _height : number = 0;

    resize(imgWidth : number, imgHeight : number) : void {
        this._width = imgWidth;
        this._height = imgHeight;

        this.image.style.width = imgWidth + "px";
        this.image.style.height = imgHeight + "px";

        this.holder.style.width = imgWidth + "px";
        this.holder.style.height = imgHeight + "px";
        this.holder.style.lineHeight = imgHeight + "px";
        this.holder.style.fontSize = (imgHeight/8) + "px";
    }

    width() : number {
        return this._width;
    }

    height() : number {
        return this._height;
    }
}

export class CardViewer {
    public static cdn : string = null;

    public rootDiv : HTMLDivElement;

    private static suffixes : string[] = [ 
        "-002.jpg", 
        "-003.jpg", 
        "-005.jpg", 
        "-006.jpg",
        "-008.jpg",
        "-009.jpg",
        "-011.jpg",
        "-012.jpg"
    ];

    private static cardRatio : number = 1050 / 750;

    private xOffset : number;
    private yOffset : number;
    private sizeEast : boolean = false;

    private images : LoadableImage[] = [];

    private pageIndex : number = 0;
    private paging : boolean = true;
    private columns : number = 2;
    private title : HTMLDivElement;
    private titleText : string;
    private closeButton : Button;

    private warbeast : boolean = false;
    private overlay : HTMLImageElement;

    constructor(entry : Entry) {
        let mobile : boolean = fakeMobile();

        this.rootDiv = document.createElement("div");
        this.title = document.createElement("div");

        this.warbeast = isWarbeast(entry);

        this.overlay = document.createElement("img");
        this.overlay.src = "img/warbeast_overlay.png";
        this.overlay.style.display = "none";
        this.overlay.draggable = false;


        if( mobile ) {
            this.rootDiv.className = "conflictchamber cvscrim";
            this.title.className = "cvtitlemobile";

            let footer : HTMLDivElement = document.createElement("div");
            footer.className = "cvfootermobile";
            footer.appendChild(document.createTextNode("Tap or swipe left/right to switch cards; swipe up to close"));
            this.rootDiv.appendChild(footer);
        }
        else {
            this.rootDiv.className = "conflictchamber cardviewer";
            this.title.className = "cvtitle";
        }

        this.rootDiv.appendChild(this.title);

        console.log("mobile: " + mobile);

        if( !mobile ) {
            let settingsButton = new Button({
                icon: "settings",
                size: "small",
                className: "cvsettings",
                click: () => {
                    let card = new Card({
                        title: "Card Viewer Options",
                        icon: "settings", 
                        expand: false,
                        size: "narrowdialog",
                        exit: true,
                    });

                    card.addLine("Display columns:");

                    let columnButtons : Button[] = [];

                    for( let i : number = 1; i <= 4; i++ ) {
                        columnButtons.push(new Button({
                            size: "small",
                            text: "" + i,
                        }));
                    }

                    for( let i : number = 0; i < 4; i++ ) {
                        columnButtons[i].setClick((button : Button) => {
                            for( let oldbut of columnButtons ) {
                                oldbut.select(false);
                            }

                            button.select(true);

                            this.columns = i + 1;
                        });

                        columnButtons[i].select(i == this.columns - 1);
                    }

                    card.addLine(columnButtons);

                    card.addLine("");

                    card.addLine("Paging:")

                    let pagingOff = new Button({
                        size: "small",
                        text: "Off",
                    });

                    let pagingOn = new Button({
                        size: "small",
                        text: "On",
                    });

                    pagingOn.select(this.paging);
                    pagingOff.select(!this.paging);

                    pagingOn.setClick(() => {
                        this.paging = true;
                        pagingOn.select(true);
                        pagingOff.select(false);
                    });

                    pagingOff.setClick(() => {
                        this.paging = false;
                        pagingOn.select(false);
                        pagingOff.select(true);
                    });

                    card.addLine([pagingOff, pagingOn]);

                    card.addLine("");

                    card.add(`Resize the card viewer by clicking and
                    dragging the right side of the dialog.  If paging is enabled, you can switch 
                    between pages by using the scroll wheel over the card viewer or 
                    hitting Page Up/Page Down on your keyboard.`);



                    card.showDialog(() => {
                        this.applySettings();
                    });

                }
            });

            this.rootDiv.appendChild(settingsButton.container);

            this.closeButton = new Button({
                icon: "clear",
                size: "small",
                className: "cvbutton",
                click: () => { 
                    CardViewer.hide(); 
                }
            });

            this.rootDiv.appendChild(this.closeButton.container);

            this.rootDiv.appendChild(this.overlay);

            this.rootDiv.onpointerdown = (ev : PointerEvent) => {

                if( ev.target != this.rootDiv ) {
                    return;
                }

                this.rootDiv.setPointerCapture(ev.pointerId);
    
                this.sizeEast = ((this.rootDiv.offsetLeft 
                    + this.rootDiv.offsetWidth) - ev.clientX) < 10;
    
                this.xOffset = ev.clientX - this.rootDiv.offsetLeft;
                this.yOffset = ev.clientY - this.rootDiv.offsetTop;
    
                this.rootDiv.onpointermove = (ev : PointerEvent) => {
    
                    if( !this.sizeEast ) { 
                        this.rootDiv.style.left = (ev.clientX - this.xOffset) + "px";
                        this.rootDiv.style.top = (ev.clientY - this.yOffset) + "px";
    
                        this.lastX = ev.clientX - this.xOffset;
                        this.lastY = ev.clientY - this.yOffset;
                    }
                    else {
                        this.requestResize(ev.clientX - this.rootDiv.offsetLeft, ev.clientY - this.rootDiv.offsetTop);
                    }
                };
    
                this.rootDiv.onpointerup = (ev : PointerEvent) => {
                    this.rootDiv.onpointermove = null;
    
                    this.rootDiv.releasePointerCapture(ev.pointerId);
    
                    this.storeSettings();
                };
    
                ev.stopPropagation();
            };


        }
        else {
            this.rootDiv.ontouchstart = (ev : TouchEvent) => {
                ev.preventDefault();
                this.beginTap(ev.touches[0].screenX, ev.touches[0].screenY);
            };

            this.rootDiv.ontouchend = (ev : TouchEvent) => {
                ev.preventDefault();
                this.endTap(ev.touches[0].screenX, ev.touches[0].screenY);
            };

            this.rootDiv.onpointerdown = (ev : PointerEvent) => {
                ev.preventDefault();
                this.beginTap(ev.screenX, ev.screenY);
            };

            this.rootDiv.onpointerup = (ev : PointerEvent) => {
                ev.preventDefault();
                this.endTap(ev.screenX, ev.screenY);
            }

            this.rootDiv.onmousedown = (ev : MouseEvent) => {
                ev.preventDefault();
                this.beginTap(ev.screenX, ev.screenY);
            };

            this.rootDiv.onmouseup = (ev : MouseEvent) => {
                ev.preventDefault();
                this.endTap(ev.screenX, ev.screenY);
            }


            // this.rootDiv.onpointerdown = (ev : PointerEvent) => {
            //     this.tapStart = ev.clientY;

            //     this.rootDiv.setPointerCapture(ev.pointerId);

            //     ev.preventDefault();
            //     ev.stopPropagation();
            // };

            // this.rootDiv.onpointerup = (ev : PointerEvent) => {

            //     if( ev.clientY - this.tapStart < -20 ) {
            //         CardViewer.hide();
            //     }
            //     else {
            //         this.pageDown();
            //     }

            //     ev.preventDefault();
            //     ev.stopPropagation();

            //     this.rootDiv.releasePointerCapture(ev.pointerId);
            // };
        }

        document.body.appendChild(this.rootDiv);

        this.rootDiv.onwheel = (ev : WheelEvent) => {

            if( this.paging ) {
                if( ev.deltaY < 0 ) {
                    this.pageUp();
                }
                else {
                    this.pageDown();
                }


            }

            ev.stopPropagation();
            return false;
        };



        this.showCards(entry, true);
    }

    pageUp() : void {
        let maxPages : number = Math.ceil(this.images.length / this.columns);

        this.pageIndex = (maxPages + this.pageIndex - 1) % maxPages;

        this.updateOverlay(0,0);
        this.setImageVisibility();

    }

    pageDown() : void {
        let maxPages : number = Math.ceil(this.images.length / this.columns);

        this.pageIndex = (maxPages + this.pageIndex + 1) % maxPages;

        this.updateOverlay(0,0);
        this.setImageVisibility();
    }



    setImageVisibility() : void {
        let columnIndex : number = 0;

        for( let i : number = 0; i < this.images.length; i++ ) {

            let display : boolean = (!this.paging 
                || Math.floor(i / this.columns) == this.pageIndex);

            if( fakeMobile() && display ) {

                let offsetY : number = 24 + (((window.innerHeight - 56)
                - this.images[i].height()) /2);


                let xcell : number = (window.innerWidth - 6) / this.columns;


                let offsetX : number = 
                    3 + (columnIndex * xcell) + ((xcell - this.images[i].width())/2);


                this.images[i].show(display, offsetX, offsetY);

                columnIndex++;
            }
            else {
                this.images[i].show(display);
            }
        }

        while( this.title.hasChildNodes() ) {
            this.title.removeChild(this.title.lastChild);
        }

        let titleText : string = "";

        if( this.paging ) {
            titleText = "[" + (this.pageIndex + 1) + " / " + 
                Math.ceil(this.images.length / this.columns) + "] ";
        }

        titleText += this.titleText;

        this.title.appendChild(document.createTextNode(titleText));

    }

    showCards(entry : Entry, autoPlace? : boolean) {
        //console.log("Calling showCards " + autoPlace);

        this.images = [];

        this.pageIndex = 0;

        this.titleText = entry.n;
        this.warbeast = isWarbeast(entry);

        while( this.rootDiv.childElementCount > (fakeMobile() ? 2 : 4) ) {
            this.rootDiv.removeChild(this.rootDiv.lastChild);
        }


        for( let i : number = 0; i < entry.E; i++ ) {

            let holder : LoadableImage = 
                    new LoadableImage(CardViewer.cdn + entry.D + CardViewer.suffixes[i]);

            this.images.push(holder);
                    
            this.rootDiv.appendChild(holder.holder);
        }

        if( fakeMobile() ) {
            this.paging = true;

            let freeWidth : number = window.innerWidth - 20;
            let freeHeight : number = window.innerHeight - 56;

            let imgWidth : number = 0;
            let imgHeight : number = 0;
        

            if( freeWidth * CardViewer.cardRatio < freeHeight ) {
                this.columns = 1;

                imgHeight = freeWidth * CardViewer.cardRatio;
                imgWidth = freeWidth;
            }
            else {
                imgHeight = freeHeight;
                imgWidth = imgHeight / CardViewer.cardRatio;

                this.columns = Math.floor(freeWidth / (imgWidth + 6));
            }

            for( let img of this.images ) {
                img.resize(imgWidth, imgHeight);
            }

            this.updateOverlay(imgWidth, imgHeight);
            this.setImageVisibility();
            this.rootDiv.style.display = "";
        }
        else {
            this.loadSettings(autoPlace || this.rootDiv.style.display == "none");
        }
    }

    storeSettings() : void {
        localStorage.setItem("cvrx", "" + this.lastRequestX);
        localStorage.setItem("cvry", "" + this.lastRequestY);
        localStorage.setItem("cvx", "" + this.lastX);
        localStorage.setItem("cvy", "" + this.lastY);
        localStorage.setItem("cvpaging", "" + this.paging);
        localStorage.setItem("cvcols", "" + this.columns);
    }

    applySettings() : void {
        this.requestResize(this.lastRequestX, this.lastRequestY);
    }

    loadSettings(autoPlace : boolean) : void {
        if( localStorage.getItem("cvrx") ) {
            this.rootDiv.style.left = localStorage.getItem("cvx") + "px";
            this.rootDiv.style.top = localStorage.getItem("cvy") + "px";

            this.paging = localStorage.getItem("cvpaging") != "false";

            if( localStorage.getItem("cvcols") ) {
                this.columns = parseInt(localStorage.getItem("cvcols"));
            }
            else {
                this.columns = 2;
            }

            this.requestResize(parseFloat(localStorage.getItem("cvrx")), 
                parseFloat(localStorage.getItem("cvry")));
        }
        else {
            this.rootDiv.style.left = "860px";
            this.rootDiv.style.top = "30px";
            this.requestResize(600, 200);
        }

        this.setImageVisibility();


        this.rootDiv.style.display = "";

        if( autoPlace ) {

            if( this.rootDiv.offsetLeft + this.rootDiv.offsetWidth > window.innerWidth ) {
                this.rootDiv.style.left = (window.innerWidth - this.rootDiv.offsetWidth) + "px";
            }

            if( this.rootDiv.offsetTop + this.rootDiv.offsetHeight > window.innerHeight ) {
                this.rootDiv.style.top = (window.innerHeight - this.rootDiv.offsetHeight) + "px";
            }

            if( this.rootDiv.offsetTop < 0 ) {
                this.rootDiv.style.top = "0px";
            }

            if( this.rootDiv.offsetLeft < 0 ) {
                this.rootDiv.style.left = "0px";
            }

        }

    }

    private tapX : number = 0;
    private tapY : number = 0;

    beginTap(x : number, y : number) : void {
        this.tapX = x;
        this.tapY = y;
    }

    endTap(x : number, y : number) : void {

        if( (this.tapY - y > 20) && (this.tapY - y > (Math.abs(x - this.tapX))) ) {
            CardViewer.hide();
        }
        else {
            if( this.tapX - x < 2 ) {
                this.pageDown();
            }
            else {
                this.pageUp();
            }
        }
    }

    private lastRequestX : number;
    private lastRequestY : number;
    private lastX : number;
    private lastY : number;


    requestResize(x : number, y : number) {

        if( x < 200 ) {
            x = 200;
        }

        if( y < 200 ) {
            y = 200;
        }

        this.lastRequestX = x;
        this.lastRequestY = y;

        let width : number = x;

        let cols : number = this.columns;
        let rows : number = Math.ceil(this.images.length / cols);

        if( this.paging ) {
            rows = 1;
        }

        this.rootDiv.style.width = (width + 2) + "px";

        let imgWidth : number = (x - 10 - (cols * 3)) / cols;
        let imgHeight : number = imgWidth * CardViewer.cardRatio;

        this.rootDiv.style.height = (4 + (rows * (imgHeight + 6))) + "px";

        for( let i : number = 0; i < this.images.length; i++ ) {
            this.images[i].resize(imgWidth, imgHeight);
        }

        this.updateOverlay(imgWidth, imgHeight);
        this.setImageVisibility();
    }

    updateOverlay(imgWidth : number, imgHeight : number) : void {
        let showOverlay : boolean = this.warbeast && this.pageIndex == 0;

        if( imgWidth < 1 ) {
            this.overlay.style.display = showOverlay ? "" : "none";
        }
        else if( showOverlay ) {
            this.overlay.style.width = imgWidth + "px";
            this.overlay.style.height = imgHeight + "px";
            this.overlay.style.zIndex = "2";
            this.overlay.style.position = "absolute";
            this.overlay.style.left = "6px";
            this.overlay.style.top = "25px";
            this.overlay.style.display = "";
        }
        else {
            this.overlay.style.display = "none";
        }
    }

    private static viewer : CardViewer = null;

    static viewCard(entry : Entry) : void {

        if( !entry || !entry.D || !entry.E || !CardViewer.cdn ) {
            CardViewer.hide();
            return;
        }

        if( CardViewer.viewer == null ) {
            CardViewer.viewer = new CardViewer(entry);
        }
        else {
            CardViewer.viewer.showCards(entry);
        }
    }

    public static hide() {
        if( CardViewer.viewer ) {
            CardViewer.viewer.rootDiv.style.display = "none";
        }
    }

    public static windowResized() : void {
        if( fakeMobile() ) {
            CardViewer.hide();
        }
    }

    public static handleKeyPress(evtobj: any) : boolean {

        if( !CardViewer.viewer || CardViewer.viewer.rootDiv.style.display == "none" ) {
            return false;
        }

        if( evtobj.keyCode == 27 ) {
            CardViewer.hide();
            return true;
        }
        else if( evtobj.keyCode == 33 ) {
            CardViewer.viewer.pageUp();
            evtobj.preventDefault();
            return true;
        }
        else if( evtobj.keyCode == 34 ) {
            CardViewer.viewer.pageDown();
            evtobj.preventDefault();
            return true;
        }

        return false;
    }

}

