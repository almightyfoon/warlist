

function fadeMessage(txt: string): void {
    return;
}

export class Clipboard {
    private static target: HTMLTextAreaElement = null;

    static copy(text: string): void {
        let origSelectionStart: number = null;
        let origSelectionEnd: number = null;

        if (!Clipboard.target) {
            Clipboard.target = document.createElement("textarea");
            Clipboard.target.style.position = "absolute";
            Clipboard.target.style.left = "-9999px";
            Clipboard.target.style.top = "0";
            document.body.appendChild(Clipboard.target);
        }

        Clipboard.target.textContent = text;

        let currentFocus: HTMLElement = <HTMLElement>document.activeElement;
        Clipboard.target.focus();
        Clipboard.target.setSelectionRange(0, Clipboard.target.value.length);

        let succeed: boolean = document.execCommand("copy");

        if (currentFocus && typeof currentFocus.focus === "function") {
            currentFocus.focus();
        }

        Clipboard.target.textContent = "";
    }

}



