import * as ccweb from "../ccweb/ccweb";

export class MainFlow extends ccweb.Flow {

    constructor() {
        super();

        this.content.innerHTML = `
            <div class="cctitle"></div>
            <div class="titlefade">&nbsp;Warlist</div>

            <div id="versioninfo">Build CC_VER</div>

            <div id="abovefold">
                <div class="uicard ccdisclaimer">
                    Warmachine is the property of
                    <a href="https://steamforged.com">Steam Forged Games</a>.
                    Warlist is not affiliated with Steam Forged Games.
                    Bugs and suggestions can be filed on <a href="https://github.com" target="_blank">GitHub</a>.
                </div>
            </div>

            <div id="fbnews">
                <div class="loadholder">
                    <span class="loadspinner"></span>
                    <span class="loadtext">Loading news...</span>
                </div>
            </div>

        `;
    }
}