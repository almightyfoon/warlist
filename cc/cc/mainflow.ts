import * as ccweb from "../ccweb/ccweb";

export class MainFlow extends ccweb.Flow {

    constructor() {
        super();

        this.content.innerHTML = `
            <div class="cctitle"></div>
            <div class="titlefade">&nbsp;Conflict Chamber</div>

            <div id="likeholder">
                <div class="fb-like" data-href="https://conflictchamber.com" data-width="330" data-layout="box_count" data-action="like" data-show-faces="false"
                    data-share="true">
                </div>
            </div>
            
			<div id="versioninfo">Build CC_VER</div>

            <div id="abovefold">
                <div class="uicard ccdisclaimer">
                    <a href="http://privateerpress.com/warmachine/the-game">Warmachine</a> and <a href="http://privateerpress.com/hordes/the-game">Hordes</a>				are the property of
                    <a href="http://privateerpress.com">Privateer Press</a>.  Conflict Chamber is not affiliated 
                    with Privateer Press. Bugs, complaints, and suggestions can be sent <a href="mailto:anon@conflictchamber.com">here</a>.
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