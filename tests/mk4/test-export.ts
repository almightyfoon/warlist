/**
 * Tests for mk4export.ts: listToText, encodeList, decodeList
 *
 * Runs standalone: npx tsx tests/mk4/test-export.ts
 */

import { readFileSync } from 'fs';
import { strictEqual, ok, deepStrictEqual } from 'assert';
import { Mk4Data } from '../../cc/ccapi/mk4data';
import { listToText, encodeList, decodeList } from '../../cc/ccapi/mk4export';
import type { Mk4List } from '../../cc/ccapi/mk4list';

// Bootstrap Mk4Data from local files (no server needed)
(globalThis as any).fetch = async (url: string) => {
    const path = url.replace('/data/', 'cc/data/');
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    return { ok: true, json: async () => data };
};

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (e: any) {
        console.log(`  FAIL  ${name}`);
        console.log(`        ${e.message}`);
        failed++;
    }
}

async function main() {
await Mk4Data.load();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Fane of Nyrro (a14) with Hysene (c1652) and Strygon (c1653, has hardPoints)
const fnArmy   = Mk4Data.armyById.get('a14')!;
const hysene   = Mk4Data.cardById.get('c1652')!;  // Warcaster
const strygon  = Mk4Data.cardById.get('c1653')!;  // Warbeast with hardPoints
const srRider  = Mk4Data.cardById.get('c1656')!;  // Strygon Rider (Solo, standalone)

function makeList(overrides: Partial<Mk4List> = {}): Mk4List {
    return {
        armyId: 'a14',
        leaderId: 'c1652',
        entries: [],
        commandCards: [],
        pointLimit: 75,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// encodeList / decodeList roundtrips
// ---------------------------------------------------------------------------
console.log('\nURL encode/decode roundtrip');

test('basic list (leader + empty entries) survives roundtrip', () => {
    const list = makeList();
    const decoded = decodeList(encodeList(list))!;
    ok(decoded, 'decodeList returned null');
    strictEqual(decoded.armyId,     list.armyId);
    strictEqual(decoded.leaderId,   list.leaderId);
    strictEqual(decoded.pointLimit, list.pointLimit);
    strictEqual(decoded.commandCards.length, 0);
    strictEqual(decoded.entries.length, 0);
});

test('null leader encodes and decodes as null', () => {
    const list = makeList({ leaderId: null });
    const decoded = decodeList(encodeList(list))!;
    strictEqual(decoded.leaderId, null);
});

test('command cards survive roundtrip', () => {
    const cmdId = Mk4Data.commandCards[0]?.id;
    ok(cmdId, 'no command cards in data');
    const list = makeList({ commandCards: [cmdId] });
    const decoded = decodeList(encodeList(list))!;
    deepStrictEqual(decoded.commandCards, [cmdId]);
});

test('multiple command cards preserve order', () => {
    const ids = Mk4Data.commandCards.slice(0, 3).map(c => c.id);
    ok(ids.length === 3, 'need at least 3 command cards');
    const list = makeList({ commandCards: ids });
    const decoded = decodeList(encodeList(list))!;
    deepStrictEqual(decoded.commandCards, ids);
});

test('warbeast entry preserves cardId', () => {
    const list = makeList({ entries: [{ cardId: 'c1653' }] });
    const decoded = decodeList(encodeList(list))!;
    strictEqual(decoded.entries.length, 1);
    strictEqual(decoded.entries[0].cardId, 'c1653');
});

test('entry with battleGroupLeader survives roundtrip', () => {
    const list = makeList({
        entries: [{ cardId: 'c1653', battleGroupLeader: 'c1652' }],
    });
    const decoded = decodeList(encodeList(list))!;
    strictEqual(decoded.entries[0].battleGroupLeader, 'c1652');
});

test('slot selections survive roundtrip', () => {
    ok(strygon?.hardPoints?.length, 'Strygon missing hardPoints');
    const slots = ['Muzzled', '', 'Feral'];
    const list = makeList({
        entries: [{ cardId: 'c1653', slotSelections: slots }],
    });
    const decoded = decodeList(encodeList(list))!;
    deepStrictEqual(decoded.entries[0].slotSelections, slots);
});

test('all-empty slotSelections are not encoded (omitted after decode)', () => {
    const list = makeList({
        entries: [{ cardId: 'c1653', slotSelections: ['', '', ''] }],
    });
    const decoded = decodeList(encodeList(list))!;
    ok(!decoded.entries[0].slotSelections, 'all-empty slots should be omitted');
});

test('multiple entries with mixed slots survive roundtrip', () => {
    const list = makeList({
        entries: [
            { cardId: 'c1653', slotSelections: ['Muzzled', 'Claws', ''] },
            { cardId: 'c1654' },
        ],
    });
    const decoded = decodeList(encodeList(list))!;
    strictEqual(decoded.entries.length, 2);
    deepStrictEqual(decoded.entries[0].slotSelections, ['Muzzled', 'Claws', '']);
    strictEqual(decoded.entries[1].cardId, 'c1654');
    ok(!decoded.entries[1].slotSelections);
});

test('invalid base64 string returns null', () => {
    strictEqual(decodeList('!!!not-base64!!!'), null);
});

test('wrong version byte returns null', () => {
    const buf = new Uint8Array(7);
    buf[0] = 99; // unknown version
    let bin = '';
    for (const b of buf) bin += String.fromCharCode(b);
    const enc = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    strictEqual(decodeList(enc), null);
});

test('version 1 URL decodes correctly (backward compat)', () => {
    // Manually build a v1 encoded list: a14, pointLimit=75, no leader, no cmd cards, no entries
    // Format: version(1b), army(1b), pointLimit(2b BE), leader(2b BE), cmdCount(1b)
    const bytes = [1, 14, 0, 75, 0, 0, 0];
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    const enc = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const decoded = decodeList(enc);
    ok(decoded, 'v1 URL should decode');
    strictEqual(decoded!.armyId,    'a14');
    strictEqual(decoded!.pointLimit, 75);
    strictEqual(decoded!.leaderId,   null);
    strictEqual(decoded!.commandCards.length, 0);
    strictEqual(decoded!.entries.length, 0);
});

test('army ID above 255 roundtrips correctly in version 2', () => {
    const list = makeList({ armyId: 'a300' });
    const decoded = decodeList(encodeList(list));
    ok(decoded, 'decodeList returned null');
    strictEqual(decoded!.armyId, 'a300');
});

test('command card ID above 255 roundtrips correctly in version 2', () => {
    const list = makeList({ commandCards: ['cmd300'] });
    const decoded = decodeList(encodeList(list));
    ok(decoded, 'decodeList returned null');
    deepStrictEqual(decoded!.commandCards, ['cmd300']);
});

// ---------------------------------------------------------------------------
// listToText — game mode line
// ---------------------------------------------------------------------------
console.log('\nlistToText — game mode');

const gameModes: [number, string][] = [
    [100, 'Grand Melee'],
    [75,  'Pitched Battle'],
    [50,  'Skirmish'],
    [30,  'Command'],
];

for (const [pts, mode] of gameModes) {
    test(`${pts} pts → "${mode} - ${pts} pts" on line 2`, () => {
        const lines = listToText(makeList({ pointLimit: pts })).split('\n');
        strictEqual(lines[2], `${mode} - ${pts} pts`);
    });
}

// ---------------------------------------------------------------------------
// listToText — header structure
// ---------------------------------------------------------------------------
console.log('\nlistToText — header');

test('line 0 is the supplied list name', () => {
    const lines = listToText(makeList(), 'Alpha Strike').split('\n');
    strictEqual(lines[0], 'Alpha Strike');
});

test('falls back to leader card name when no listName given', () => {
    const lines = listToText(makeList()).split('\n');
    strictEqual(lines[0], hysene.name);
});

test('line 1 is "{faction} - {army name}"', () => {
    const faction = Mk4Data.cards.find(c => c.factionId === fnArmy.factionId)?.faction ?? '';
    const lines = listToText(makeList()).split('\n');
    strictEqual(lines[1], `${faction} - ${fnArmy.name}`);
});

test('PC CARD header is present', () => {
    ok(listToText(makeList()).includes('PC      CARD'));
});

// ---------------------------------------------------------------------------
// listToText — column alignment
// ---------------------------------------------------------------------------
console.log('\nlistToText — column alignment');

test('leader name starts at col 8 (8-space indent)', () => {
    const lines = listToText(makeList(), 'Test List').split('\n');
    const leaderLine = lines.find(l => l.includes(hysene.name))!;
    ok(leaderLine, `leader "${hysene.name}" not in output`);
    strictEqual(leaderLine.indexOf(hysene.name), 8);
});

test('main BG cohort: PC at col 0, name at col 12', () => {
    // entry with no battleGroupLeader + COHORT_TYPES card → main BG
    const list = makeList({ entries: [{ cardId: 'c1653' }] });
    const cost  = Mk4Data.pointCost(strygon);
    const lines = listToText(list).split('\n');
    const line  = lines.find(l => l.includes(strygon.name))!;
    ok(line, `"${strygon.name}" not in output`);
    ok(line.startsWith(String(cost)), 'cohort PC not at col 0');
    strictEqual(line.indexOf(strygon.name), 12);
});

test('standalone entry: PC at col 0, name at col 8', () => {
    const list = makeList({ entries: [{ cardId: 'c1656' }] });
    const cost  = Mk4Data.pointCost(srRider);
    const lines = listToText(list).split('\n');
    const line  = lines.find(l => l.includes(srRider.name))!;
    ok(line, `"${srRider.name}" not in output`);
    ok(line.startsWith(String(cost)), 'standalone PC not at col 0');
    strictEqual(line.indexOf(srRider.name), 8);
});

test('hardpoint option line: cost at col 2, slot label at col 16', () => {
    ok(strygon.hardPoints?.length, 'Strygon missing hardPoints');
    const hp0 = strygon.hardPoints![0];   // Head slot
    const opt  = hp0.options[0];          // first option (e.g. Muzzled, cost 1)
    const list = makeList({
        entries: [{ cardId: 'c1653', slotSelections: [opt.name, '', ''] }],
    });
    const lines = listToText(list).split('\n');
    const hpLine = lines.find(l => l.includes(hp0.label.toUpperCase()) && l.includes(opt.name))!;
    ok(hpLine, 'hardpoint option line not found');
    strictEqual(hpLine.indexOf(hp0.label.toUpperCase()), 16);
    if (opt.pointCost > 0) {
        strictEqual(hpLine.indexOf(String(opt.pointCost)), 2);
    }
});

test('hardpoint line uses uppercase slot label', () => {
    const hp0  = strygon.hardPoints![0];
    const opt  = hp0.options[0];
    const list = makeList({
        entries: [{ cardId: 'c1653', slotSelections: [opt.name, '', ''] }],
    });
    const lines = listToText(list).split('\n');
    const hpLine = lines.find(l => l.includes(hp0.label.toUpperCase()))!;
    ok(hpLine, 'hardpoint line not found');
    ok(!hpLine.includes(hp0.label.toLowerCase().replace(/^./, c => c)), // not title-case
        'slot label should be uppercase');
});

// ---------------------------------------------------------------------------
// listToText — command cards section
// ---------------------------------------------------------------------------
console.log('\nlistToText — command cards');

test('no command card section when list has none', () => {
    ok(!listToText(makeList()).includes('COMMAND CARD'));
});

test('command card section header appears when cards present', () => {
    const cmdId = Mk4Data.commandCards[0]?.id;
    ok(cmdId, 'no command cards in data');
    ok(listToText(makeList({ commandCards: [cmdId] })).includes('PC      COMMAND CARD'));
});

test('command card name appears at col 8', () => {
    const cmd   = Mk4Data.commandCards[0];
    ok(cmd, 'no command cards in data');
    const lines = listToText(makeList({ commandCards: [cmd.id] })).split('\n');
    const line  = lines.find(l => l.includes(cmd.name))!;
    ok(line, `"${cmd.name}" not in output`);
    strictEqual(line.indexOf(cmd.name), 8);
});

test('command card cost included in TOTAL POINTS', () => {
    const cmd   = Mk4Data.commandCards.find(c => c.pointCost > 0);
    ok(cmd, 'no command card with non-zero cost');
    const lines = listToText(makeList({ commandCards: [cmd!.id] })).split('\n');
    const total = lines.find(l => l.startsWith('TOTAL POINTS'))!;
    ok(total, 'TOTAL POINTS line missing');
    strictEqual(total, `TOTAL POINTS  ${cmd!.pointCost}/75`);
});

// ---------------------------------------------------------------------------
// listToText — TOTAL POINTS footer
// ---------------------------------------------------------------------------
console.log('\nlistToText — totals');

test('TOTAL POINTS is last non-empty line', () => {
    const lines = listToText(makeList()).split('\n').filter(l => l.trim());
    ok(lines[lines.length - 1].startsWith('TOTAL POINTS'));
});

test('TOTAL POINTS shows 0 for empty list', () => {
    const lines = listToText(makeList({ pointLimit: 75 })).split('\n');
    const total = lines.find(l => l.startsWith('TOTAL POINTS'))!;
    strictEqual(total, 'TOTAL POINTS  0/75');
});

test('TOTAL POINTS reflects entry costs', () => {
    const cost  = Mk4Data.pointCost(srRider);
    const list  = makeList({ entries: [{ cardId: 'c1656' }] });
    const lines = listToText(list).split('\n');
    const total = lines.find(l => l.startsWith('TOTAL POINTS'))!;
    strictEqual(total, `TOTAL POINTS  ${cost}/75`);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

} // end main

main().catch(err => { console.error(err); process.exit(1); });
