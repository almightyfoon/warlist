import ccapi = require("../../cc/ccapi/ccapi");


ccapi.loadData(null);

import * as fs from "fs";
import * as commander from "commander";

const testFolder = './data/';


commander
  .option("--rebase", "Reset test output to current")
  .option("--save", "Save variant runs")
  .option("--text <searchText>", "Only process test cases which contain <searchText>")
  .option("-c <testCase>", "Only process <testCase>")
  .option("-t <themeId>", "Only process theme <themeId>")
  .option("-s <searchText>", "Search for <searchText>")
  .option("-r <replaceText>", "Replace <searchText> with <replaceText> (or nothing if omitted)")
  .option("--ignore-prerelease", "Ignore pre-release entries")
  .option("--rebase-prerelease", "Rebase test cases that fail only due to pre-release")
  .option("--showpasses", "Show passed runs")
  .option("--themes", "Only test themes")
  .option("--lists", "Only test lists")
  .option("--check-disallowed", "Explicitly check disallowed entries on themes")
  .option("--skip-link", "Ignore the Conflict Chamber link")
  .option("--ignore-cid", "Ignore CID entries")
  .parse(process.argv);


interface testCase {
	listCode? : string,
	test? : string,
	testOrig? : string,
	actual? : string,
	actualOrig? : string,
	outputFile? : string,
	match? : boolean
	pass? : boolean
}

let testCases : testCase[] = [];

function evaluateTestCase(file : string, ignorePrerelease : boolean) : testCase {
	let tc : testCase = {};

	tc.outputFile = testFolder + file.replace(".code", ".out");
	tc.testOrig = fs.existsSync(tc.outputFile) 
		? fs.readFileSync(tc.outputFile, "utf-8")
		: "";

	if( ignorePrerelease ) {
		tc.testOrig = tc.testOrig
			.replace(/\n!!! Your army contains a pre-release entry.\n/g, "")
			.replace(/\n!!! Your army contains pre-release entries.\n/g, "");
	}


	tc.match = true;

	if( commander.text ) {
		tc.match = tc.match && tc.testOrig.indexOf(commander.text) > 0;
	}

	if( commander.S ) {
		let repText : string = "";

		if( commander.R ) {
			repText = commander.R;
		}

		tc.testOrig = tc.testOrig.replace(commander.S, repText);
	}


	tc.listCode = fs.readFileSync(testFolder + file, "utf-8");
	tc.listCode = tc.listCode.trim();

	let rules : ccapi.Rules = null;

	if( ignorePrerelease ) {
		rules = {
			ignorePreRelease : true
		};
	}

	let al : ccapi.ArmyList = ccapi.ArmyList.fromCode(tc.listCode, rules);

	tc.actualOrig = al.getTextList(rules);

	if( commander.skipLink ) {
		tc.actualOrig = tc.actualOrig.substr(tc.actualOrig.indexOf("\n"));
		tc.testOrig = tc.testOrig.substr(tc.testOrig.indexOf("\n"));
	}


	tc.test  = tc.testOrig.replace(/\r/g, "");
	tc.actual = tc.actualOrig.replace(/\r/g, "");

	tc.pass = tc.test == tc.actual;

	return tc;
}

// Process individual file
function processFile(file : string) {
	if( file.indexOf(".code") != -1 ) {

		if( commander.C && file != commander.C + ".code") {
			return;
		}

		let tc : testCase = evaluateTestCase(file, commander.ignorePrerelease);

		// Check for a test that fails normally but passes
		// on pre-release
		if( commander.rebasePrerelease && tc.match ) {
			// Not interested in cases that already pass
			if( tc.pass ) {
				tc.match = false;
			}
			else {
				let tc2 : testCase = evaluateTestCase(file, true);

				// Interested only in cases that fail before, but
				// pass with pre-release ignored
				tc.match = tc2.pass;
			}

		}

		if( tc.match ) {
			testCases.push(tc);
		}
	}

}


let report : string = "<!doctype html><html><head><title>Test report</title><body>";


if( !commander.themes && !commander.T ) {
	// Load test cases

	fs.readdirSync(testFolder).forEach(file => {
		processFile(file);
	});

	if( commander.rebase || commander.rebasePrerelease ) {
		let fails : number = 0;

		console.log("Rebasing:");

		for( let tc of testCases ) {
			if( tc.actual != tc.test ) {
				fails++;
				console.log(tc.outputFile);

				fs.writeFileSync(tc.outputFile, tc.actualOrig);
			}
		}
	}
	else {
		let passes : number = 0;
		let fails : number = 0;


		for( let tc of testCases ) {
			if( tc.pass ) {
				passes++;
			}
			else {
				fails++;
			}

			if( !tc.pass || commander.showpasses ) {

				let dispTest : string = tc.testOrig.replace(/\r/g, "").replace(/\n/g, "<br>");
				let dispActual : string = tc.actualOrig.replace(/\r/g, "").replace(/\n/g, "<br>");

				report +=
						"<div><div>" + tc.outputFile + "</div>"
						+ "<div style=\"width: calc(50vw - 20px); overflow-x: hidden; display: inline-block; border: 1px solid black;\"><code>" + dispTest + "</code></div>";

				if( !tc.pass ) {
						report += "<div style=\"width: calc(50vw - 20px); overflow-x: hidden; display: inline-block; border: 1px solid red; margin-left: 3px; \"><code>" + dispActual + "</code></div>"
				}
				report += "</div>";

				if( commander.save ) {
					let newFilename : string = tc.outputFile.replace(".out", ".new");

					fs.writeFileSync(newFilename, tc.actualOrig);
					console.log(newFilename);
				}
			}
		}

		console.log(passes + " passes; " + fails + " failures.");


	}

}


if( !commander.lists && !commander.C ) {
	// Test themes

	let themesTested : number = 0;
	let themesFailed : number = 0;

	for( let id in ccapi.Data.themeLists ) {
		//console.log(id);

		if( commander.T && commander.T != id ) {
			continue;
		}

		themesTested++;

		let res : any = {};
		res.allowed = [];
		res.required = [];
		res.free = [];

		let theme : ccapi.Theme = new ccapi.Theme(ccapi.Data.themeLists[id]);

		for( let eid in ccapi.Data.entries ) {
			let e : ccapi.Entry = ccapi.Data.entries[eid];

			if( e.fr ) {
				continue;
			}

			if( e.dec ) {
				continue;
			}

			if( e.themeunique && e.themeunique != theme.id() ) {
				continue;
			}

			if( theme.isAllowed(e, null) ) {
				res.allowed.push(parseInt(eid));
			}

			if( theme.isEntryRequired(e) ) {
				res.required.push(parseInt(eid));
			}

			if( theme.isFreebie(e) ) {
				res.free.push(parseInt(eid));
			}
		}

		let filename : string = testFolder + id + ".theme";

		let testOrig : string = null;

		try {
			testOrig = fs.readFileSync(filename, "utf-8");
		}
		catch(e) {
		}

		if( testOrig ) {
			let test : any = JSON.parse(testOrig);

			let themeReport : string = "";

			let checks : string[] = ["allowed", "required", "free"];

			for( let check of checks ) {
				for( let i : number = 0; i < res[check].length; i++ ) {
					if( test[check].indexOf(res[check][i]) == -1 ) {
						let important : boolean = true;

						if( check != "allowed" && !commander.checkDisallowed ) {
							if( res.allowed.indexOf(res[check][i]) == -1 ) {
								important = false;
							}
						}

						if( commander.ignoreCid && ccapi.Data.entries[res[check][i]].pr == 2 ) {
							important = false;
						}


						if( important ) {
							themeReport += "<br> - Additional " + check + " entry: "
								+ ccapi.Data.entries[res[check][i]].n;

							if( ccapi.Data.entries[res[check][i]].pr == 1 ) {
								themeReport += " (Pre-release)";
							}
							else if( ccapi.Data.entries[res[check][i]].pr == 2 ) {
								themeReport += " (CID)";
							}
						}
					}
				}

				for( let i : number = 0; i < test[check].length; i++ ) {
					if( res[check].indexOf(test[check][i]) == -1 ) {
						let important : boolean = true;

						if( check != "allowed" && !commander.checkDisallowed ) {
							if( res.allowed.indexOf(test[check][i]) == -1 ) {
								important = false;
							}
						}

						if( commander.ignoreCid && ccapi.Data.entries[test[check][i]].pr == 2 ) {
							important = false;
						}

						if( important ) {
							themeReport += "<br> - Missing " + check + " entry: "
								+ ccapi.Data.entries[test[check][i]].n;

							if( ccapi.Data.entries[test[check][i]].pr == 1 ) {
								themeReport += " (Pre-release)";
							}
							else if( ccapi.Data.entries[test[check][i]].pr == 2 ) {
								themeReport += " (CID)";
							}
						}
					}
				}
			}

			if( themeReport.length > 0 ) {
				report += "<div>Theme " + theme.name() + " ("
					+ id + "):\n" + themeReport + "</div>";

				themesFailed++;

				//console.log(report);
			}

		}
		else {
			console.log("No test case for " + theme.name());
		}

		if( commander.rebase ) {
			fs.writeFileSync(filename, JSON.stringify(res));
		}

	}

	console.log("" + themesTested + " themes tested; " + themesFailed + " failures.");
}



report += "</body></html>";

fs.writeFileSync("report.html", report);
