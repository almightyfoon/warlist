import { Dialog } from "./ccweb";




let _mobileTested : boolean = false;
let _isMobile : boolean = false;

export function isMobile() : boolean {
    if( !_mobileTested ) {
        _mobileTested = true;

        _isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    return _isMobile;
}


export function adjustViewport() : void {
    //console.log("Adjusting viewport");

    let siteWidth : number = 850;
    let scale : number = screen.width / siteWidth

    let viewport = document.querySelector('meta[name="viewport"]');

    if( !viewport ) {
        viewport = document.createElement("meta");
        viewport.setAttribute("name", "viewport");
        document.head.appendChild(viewport);
    }
    
    viewport.setAttribute("content", "width="+siteWidth + ", initial-scale=" + scale);    
}

export function makeIcon(icon : string, extraClass? : string) : HTMLElement {
    let ret : HTMLElement = document.createElement("i");
    ret.className = "material-icons" + (extraClass ? " " + extraClass : "");
    ret.innerText = icon;

    return ret;
}



export class UIElement {
    container: HTMLDivElement;
    content: HTMLDivElement;

    constructor(className? : string) {
        this.container = document.createElement("div");

        if( className ) {
            this.container.className = className;
        }

        // Change in derived classes
        this.content = this.container;
    }

    visible() : boolean {
        return this.container.style.display != "none";
    }

    hide() {
        this.container.style.display = "none";
    }

    show() {
        this.container.style.display = "";
    }

    isHidden() : boolean {
        return this.container.style.display == "none";
    }

    add(childElement : HTMLElement | Text | UIElement | string | UIElement[]) : UIElement {
        if( typeof childElement === "string" ) {
            this.content.appendChild(document.createTextNode(childElement));
        }
        else if( childElement instanceof UIElement ) {
            this.content.appendChild(childElement.container);
        }
        else if( childElement instanceof Array ) {
            for( let uie of childElement ) {
                this.content.appendChild(uie.container);
            }
        }
        else {
            this.content.appendChild(childElement);
        }

        return this;
    }

    addIcon(icon : string, extraClass? : string) : UIElement {
        this.add(makeIcon(icon, extraClass));

        return this;
    }


    remove(childElement : HTMLElement) {
        this.content.removeChild(childElement);
    }

    addLine(childElement : HTMLElement | Text | UIElement | string | UIElement[],
            icon? : string) : UIElement {

        if( icon ) {
            let line = new IconLine(icon, childElement);

            this.add(line);
        }
        else {
            let line = new Line();

            line.add(childElement);
            this.add(line);
        }

        return this;
    }

    clear() : void {
        while( this.content.hasChildNodes() ) {
            this.content.removeChild(this.content.lastChild);
        }
    }
}

export class Flow extends UIElement {

    public static showCallback : (flow : Flow) => void = null;

    constructor(extraClass? : string) {
        super("conflictchamber " +
            (isMobile() ? "uimobileflow" : "uiflow")
            + (extraClass ? (" " + extraClass) : "")
        );


        Flow.hideFlows();

        if( isMobile() ) {
            adjustViewport();
        }

        document.body.appendChild(this.container);

        Flow._activeFlow = this;
    }

    loadingScreen(message : string) : void {
        this.content.innerHTML = `
                <div class="loadholder">
                    <span class="loadspinner"><i class="material-icons">refresh</i></span>
                    <span class="loadtext">Loading event...</span>
                </div>`;
    }

    static _activeFlow : Flow = null;


    static hideFlows() : void {
        if( Flow._activeFlow ) {
            Flow._activeFlow.hide();
        }
    }


    show() : void {
        Flow.hideFlows();
        Flow._activeFlow = this;

        super.show();

        if( Flow.showCallback ) {
            Flow.showCallback(this);
        }
    }

}

export class Indent extends UIElement {
    constructor(size? : string) {
        super("uiindent" + (size ? size : "medium"));
    }
}

export class Line extends UIElement {
    constructor(text? : string) {
        super("uiline");

        if( text ) {
            this.add(text);
        }
    }
}

export class IconLine extends UIElement {
    constructor(icon : string, childElement : HTMLElement | Text | UIElement | string | UIElement[]) {
        super("iconline");

        this.add(makeIcon(icon));

        let linediv : HTMLDivElement = document.createElement("div");

        if( typeof childElement == "string" ) {
            linediv.appendChild(document.createTextNode(childElement));
        }
        else if( childElement instanceof UIElement ) {
            linediv.appendChild(childElement.container);
        }
        else if( childElement instanceof Array ) {
            for( let uie of childElement ) {
                linediv.appendChild(uie.container);
            }
        }
        else {
            linediv.appendChild(childElement);
        }

        this.add(linediv);
    }
}


interface buttonOptions {
    click? : (button : Button) => void;
    text? : string;
    icon? : string;
    className? : string;
    size? : string;
}

export class Button extends UIElement {
    click : (button : Button) => void;
    icon : HTMLElement;
    text : Text;
    standardClass : string;



    constructor(options : buttonOptions) {
        let className : string = "wbut";

        if(options.className) {
            className = options.className + " " + className;
        }

        if(options.size ) {
            className = options.size + "button " + className;
        }

        super(className);

        this.standardClass = className;

        if( options.click ) {
            
            this.click = options.click;

            this.container.onclick = () => {
                this.click(this);
            };
        }

        if( options.icon ) {
            this.icon = makeIcon(options.icon);
            this.add(this.icon);
        }

        if( options.text ) {
            this.text = document.createTextNode(options.text);
            this.add(this.text);
        }

    }

    changeIcon(icon : string) : void {
        if( this.icon ) {
            this.icon.innerText = icon;
        }
    }

    changeText(text : string) : void {
        if( this.text ) {
            this.content.removeChild(this.text);

            this.text = document.createTextNode(text);
            this.add(this.text);
        }
    }

    setClick(click : (button : Button) => void) : void {
        this.click = click;
        this.container.onclick = () => {
            this.click(this);
        }

    }

    isSelected() : boolean {
        return this.container.className != this.standardClass;
    }

    select(sel : boolean) : void {
        if( sel ) {
            this.container.className = this.standardClass + " wbutsel";
        }
        else {
            this.container.className = this.standardClass;
        }
    }

}

export interface cardOptions {
    title? : string;
    icon? : string;
    expand? : boolean;
    startClosed? : boolean;
    extraClass? : string;
    subtitle? : string;
    mainButton? : Button;
    size? : string;
    button? : Button;
    exit? : boolean;
    onOpen? : (card : Card) => void;
    onClose? : (card : Card) => void;
    onExit? : (card : Card) => void;
}

export interface subheaderOptions {
    title? : string;
    icon? : string;
    expand? : boolean;
    close? : boolean;
    startClosed? : boolean;
    extraClass? : string;
    subtitle? : string;
    onOpen? : (sh : Subheader) => void;
    onClose? : (sh : Subheader) => void;
}



export class Card extends UIElement {
    onOpen : (card : Card) => void;
    onClose : (card : Card) => void;
    onExit : (card : Card) => void;
    private _dlg : Dialog;
    title : UIElement;
    expander : HTMLElement;
    tray : UIElement;


    constructor(options : cardOptions) {
        let className = "uicard";

        className += " " + (options.size ? options.size : "full") + "card";

        if( options.extraClass ) {
            className += " " + options.extraClass;
        }


        super(className);

        this.onOpen = options.onOpen;
        this.onClose = options.onClose;
        this.onExit = options.onExit;

        if( options.title || options.icon ) {
            this.title  = new UIElement("cardtitle");

            if( options.icon ) {
                this.title.addIcon(options.icon, "cardicon");
            }

            if( options.title ) {
                this.title.add(options.title);
            }

            if( options.subtitle ) {
                let subtitle = new UIElement("cardsubtitle");
                subtitle.add(options.subtitle);
                this.title.add(subtitle);
            }
                

            this.add(this.title);
        }

        this.content = document.createElement("div");
        this.container.appendChild(this.content);

        if( options.button ) {
            this.tray = new UIElement("cardtray");

            this.tray.add(options.button);

            this.container.appendChild(this.tray.container);
        }

        if( options.exit ) {
            this.expander = makeIcon("clear", "cardexpander");

            this.expander.onclick = () => {
                this.exit();
            };

            this.title.add(this.expander);
        }
        else if( options.expand ) {
            this.expander = makeIcon(options.startClosed ? "expand_more" : "expand_less", 
                "cardexpander");

            // this.expander.onclick = () => {
            //     this.toggle();
            // };

            if( this.title ) {
                this.title.content.onclick = () => {
                    this.toggle();
                }

                this.title.container.className += " expandcard";
            }


            this.title.add(this.expander);

            if( options.startClosed ) {
                this.content.style.display = "none";

                this.container.className += " cardclosed";

                if( this.tray ) {
                    this.tray.hide();
                }
            }

        }
    }

    setOpen(open : (card : Card) => void) : void {
        this.onOpen = open;
    }

    setClose(close : (card : Card) => void) : void {
        this.onClose = close;
    }

    exit(skipExitFunc? : boolean) : void {
        this.container.style.display = "none";

        if( !skipExitFunc && this.onExit ) {
            this.onExit(this);
        }
    }

    close(skipCloseFunc? : boolean) : void {
        this.content.style.display = "none";
        this.expander.innerText = "expand_more";
        

        if( this.tray ) {
            this.tray.hide();
        }

        this.container.className += " cardclosed";
        
        if( this.onClose && !skipCloseFunc ) {
            this.onClose(this);
        }
    }

    open(skipOpenFunc? : boolean) : void {
        this.content.style.display = "";
        this.expander.innerText = "expand_less";
        
        if( this.tray ) {
            this.tray.show();
        }

        this.container.className = 
            this.container.className.replace(" cardclosed", "");

        if( this.onOpen && !skipOpenFunc ) {
            this.onOpen(this);
        }
    }

    toggle(skipToggleFunc? : boolean) : void {
        if( this.content.style.display == "none" ) {
            this.open(skipToggleFunc);
        }
        else {
            this.close(skipToggleFunc);
        }
    }

    isEmpty() : boolean {
        return !this.content.hasChildNodes();
    }    

    toggle_old() : void {
        if( this.content.style.display == "none" ) {

            if( this.onOpen ) {
                this.onOpen(this);
            }

            this.content.style.display = "";
            this.expander.innerText = "expand_less";


            
            if( this.tray ) {
                this.tray.show();
            }

            this.container.className = 
                this.container.className.replace(" cardclosed", "");
        }
        else {
            this.content.style.display = "none";
            this.expander.innerText = "expand_more";
            

            if( this.tray ) {
                this.tray.hide();
            }

            this.container.className += " cardclosed";

        }
    }

    
    closeDialog() : void {
        this._dlg.close(true);
    }

    showDialog(closeCallback? : () => void) : void {
        let dlg : Dialog = new Dialog(
            closeCallback,
            null, null, null,
            this);

        this._dlg = dlg;
        
        if( this.onExit == null ) {
            //console.log("Fixing onExit");
            this.onExit = (card : Card) => {
                dlg.close();
            };
        }


        dlg.show();
    }


}


export class Subheader extends UIElement {

    //tray : UIElement;

    title : UIElement;
    expander : HTMLElement;
    onOpen : (sh : Subheader) => void;
    onClose : (sh : Subheader) => void;

    constructor(options : subheaderOptions) {
        let className = "uisubheader";

        if( options.extraClass ) {
            className += " " + options.extraClass;
        }

        super(className);

        this.onOpen = options.onOpen;
        this.onClose = options.onClose;

        this.title  = new UIElement("subheadertitle");

        if( options.subtitle ) {
            let subtitle = new UIElement("shsubtitle");
            subtitle.add(options.subtitle);
            this.title.add(subtitle);
        }

        if( options.icon ) {
            this.title.addIcon(options.icon, "shicon");
        }
        else {
            this.title.addIcon("clear", "shiconempty");
        }

        this.title.add(options.title);

        this.add(this.title);

        this.content = document.createElement("div");
        this.container.appendChild(this.content);

        // if( options.button ) {
        //     this.tray = new UIElement("cardtray");

        //     this.tray.add(options.button);

        //     this.container.appendChild(this.tray.container);
        // }

        if( options.expand ) {
            this.expander = makeIcon(options.startClosed ? "expand_more" : "expand_less", 
                "shexpander");

            this.expander.onclick = () => {
                this.toggle();
            };

            this.title.content.onclick = () => {
                this.toggle();
            };

            this.title.container.className += " expandsh";


            this.title.add(this.expander);

            if( options.startClosed ) {
                this.content.style.display = "none";

                this.container.className += " shclosed";

                // if( this.tray ) {
                //     this.tray.hide();
                // }
            }

        }
    }

    close(skipCloseFunc? : boolean) : void {
        if( this.onClose && !skipCloseFunc ) {
            this.onClose(this);
        }

        this.content.style.display = "none";
        this.expander.innerText = "expand_more";
        

        // if( this.tray ) {
        //     this.tray.hide();
        // }

        this.container.className += " shclosed";
    }

    open(skipOpenFunc? : boolean) : void {
        if( this.onOpen && !skipOpenFunc ) {
            this.onOpen(this);
        }

        this.content.style.display = "";
        this.expander.innerText = "expand_less";
        
        // if( this.tray ) {
        //     this.tray.show();
        // }

        this.container.className = 
            this.container.className.replace(" shclosed", "");
    }

    toggle(skipToggleFunc? : boolean) : void {
        if( this.content.style.display == "none" ) {
            this.open(skipToggleFunc);
        }
        else {
            this.close(skipToggleFunc);
        }
    }

    isEmpty() : boolean {
        return !this.content.hasChildNodes();
    }
    
}