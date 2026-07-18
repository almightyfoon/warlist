// Fails the check if the PR description hasn't actually been filled out --
// i.e. the required section headings are missing, or a section was left
// as just the template's HTML-comment placeholder.

const body = process.env.PR_BODY ?? "";

const REQUIRED_SECTIONS = ["Summary", "Test plan"];

function sectionContent(body, heading) {
    const re = new RegExp(`^##\\s*${heading}\\s*$`, "im");
    const match = re.exec(body);
    if (!match) return null;
    const start = match.index + match[0].length;
    const rest = body.slice(start);
    const nextHeading = /^##\s+/m.exec(rest);
    const raw = nextHeading ? rest.slice(0, nextHeading.index) : rest;
    return raw
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/^[\s\-\[\]xX]+$/gm, "")
        .trim();
}

let failed = false;

for (const heading of REQUIRED_SECTIONS) {
    const content = sectionContent(body, heading);
    if (content === null) {
        console.error(`Missing required PR description section: "## ${heading}"`);
        failed = true;
    } else if (content.length === 0) {
        console.error(`PR description section "## ${heading}" is empty -- fill it in.`);
        failed = true;
    }
}

if (failed) {
    console.error("\nSee .github/pull_request_template.md for the expected format.");
    process.exit(1);
}

console.log("PR description looks good.");
