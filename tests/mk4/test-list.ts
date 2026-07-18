/**
 * Tests for mk4list.ts: canAdd, addCard, pointsSpent, serialise/deserialise,
 * toggleCommandCard, removeEntry.
 *
 * Runs standalone: npx tsx tests/mk4/test-list.ts
 */

import { readFileSync } from 'fs';
import { strictEqual, ok, deepStrictEqual } from 'assert';
import { Mk4Data } from '../../cc/ccapi/mk4data';
import {
    canAdd, addCard, pointsSpent, pointsRemaining,
    serialise, deserialise, toggleCommandCard, removeEntry, setLeader,
} from '../../cc/ccapi/mk4list';
import type { Mk4List } from '../../cc/ccapi/mk4list';

// Bootstrap Mk4Data from local files
(globalThis as any).fetch = async (url: string) => {
    const path = url.replace('/data/', 'cc/data/');
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    return { ok: true, json: async () => data };
};

// ---------------------------------------------------------------------------
// Harness
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
//   Army: Fane of Nyrro (a14)
//   c1652  Hysene, the Executioner  Warcaster  FA:C  cost:0
//   c1653  Strygon                  Warbeast   FA:4  cost:5
//   c1654  Sybaris                  Warbeast   FA:C  cost:14
//   c1656  Strygon Rider            Solo       FA:2  cost:8
//   c1657  Fane Knights             Unit       FA:4  cost:6
//   c1658  Sythyss Prophet          CA→c1657   FA:4  cost:2
//   c1004  Magnus the Unstoppable   Solo(merc) FA:C  cost:20  (explicit include)
//   c959   Carver Ultimus           Solo(merc) FA:C  cost:20  (explicit include, true merc)
//   Army: House Kallyss (a19)
//   c493   Lanyssa Ryssyl           Solo       FA:C  cost:18  pairedWith:[c510,c512]
// ---------------------------------------------------------------------------

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
// canAdd — basic
// ---------------------------------------------------------------------------
console.log('\ncanAdd — basic');

test('valid card returns ok:true', () => {
    ok(canAdd(makeList(), 'c1653').ok);
});

test('unknown card ID returns ok:false', () => {
    ok(!canAdd(makeList(), 'c9999').ok);
});

test('leader type blocked (selected separately)', () => {
    ok(!canAdd(makeList(), 'c1652').ok, 'Warcaster should not be addable via canAdd');
});

// ---------------------------------------------------------------------------
// canAdd — field allowance
// ---------------------------------------------------------------------------
console.log('\ncanAdd — field allowance');

test('FA:C card allowed once', () => {
    ok(canAdd(makeList(), 'c1654').ok);
});

test('FA:C card blocked when already in list', () => {
    const list = addCard(makeList(), 'c1654');
    ok(!canAdd(list, 'c1654').ok);
});

test('FA:2 card allowed twice', () => {
    const list1 = addCard(makeList(), 'c1656');
    ok(canAdd(list1, 'c1656').ok, 'Should allow second FA:2 card');
});

test('FA:2 card blocked after two copies', () => {
    const list2 = addCard(addCard(makeList(), 'c1656'), 'c1656');
    ok(!canAdd(list2, 'c1656').ok);
});

test('FA:4 card allowed up to four copies', () => {
    let list = makeList();
    for (let i = 0; i < 4; i++) list = addCard(list, 'c1653');
    ok(!canAdd(list, 'c1653').ok, 'Should block 5th copy of FA:4 card');
    strictEqual(list.entries.length, 4);
});

// ---------------------------------------------------------------------------
// canAdd — points
// ---------------------------------------------------------------------------
console.log('\ncanAdd — points');

test('blocked when 0-point list cannot afford cheapest card', () => {
    ok(!canAdd(makeList({ pointLimit: 0 }), 'c1653').ok);
});

test('blocked when adding would exceed point limit', () => {
    // c1654 Sybaris costs 14; fill up so only 13 remain
    let list = makeList({ pointLimit: 13 });
    ok(!canAdd(list, 'c1654').ok);
});

test('allowed when points exactly sufficient', () => {
    // c1656 Strygon Rider has no hardpoints — pointCost exactly equals pointLimit
    ok(canAdd(makeList({ pointLimit: 8 }), 'c1656').ok);
});

// ---------------------------------------------------------------------------
// canAdd — command attachments
// ---------------------------------------------------------------------------
console.log('\ncanAdd — command attachments');

test('CA blocked when target unit not in list', () => {
    // c1658 Sythyss Prophet attaches to c1657 Fane Knights
    ok(!canAdd(makeList(), 'c1658').ok);
});

test('CA allowed when target unit in list', () => {
    const list = addCard(makeList(), 'c1657');
    ok(canAdd(list, 'c1658').ok);
});

test('CA blocked when unit already has one', () => {
    const list = addCard(addCard(makeList(), 'c1657'), 'c1658');
    ok(!canAdd(list, 'c1658').ok);
});

// ---------------------------------------------------------------------------
// canAdd — true mercs
// ---------------------------------------------------------------------------
console.log('\ncanAdd — true mercs');

test('first true merc allowed', () => {
    ok(canAdd(makeList(), 'c1004').ok);
});

test('second true merc blocked', () => {
    const list = addCard(makeList(), 'c1004');
    ok(!canAdd(list, 'c959').ok);
});

// ---------------------------------------------------------------------------
// addCard
// ---------------------------------------------------------------------------
console.log('\naddCard');

test('addCard appends entry', () => {
    const list = addCard(makeList(), 'c1653');
    strictEqual(list.entries.length, 1);
    strictEqual(list.entries[0].cardId, 'c1653');
});

test('addCard no-ops when canAdd fails', () => {
    const list = makeList({ pointLimit: 0 });
    const after = addCard(list, 'c1653');
    strictEqual(after.entries.length, 0);
});

test('addCard auto-joins companions', () => {
    // c493 Lanyssa (Solo) pairedWith [c510 Benkei, c512 Sasha] in House Kallyss (a19)
    const list: Mk4List = { armyId: 'a19', leaderId: null, entries: [], commandCards: [], pointLimit: 75 };
    const after = addCard(list, 'c493');
    strictEqual(after.entries.length, 1);
    const companions = after.entries[0].companionCardIds ?? [];
    ok(companions.includes('c510'), 'Benkei should be auto-joined');
    ok(companions.includes('c512'), 'Sasha should be auto-joined');
});

// ---------------------------------------------------------------------------
// pointsSpent / pointsRemaining
// ---------------------------------------------------------------------------
console.log('\npointsSpent / pointsRemaining');

test('empty list costs 0', () => {
    strictEqual(pointsSpent(makeList()), 0);
});

test('single entry cost added', () => {
    // c1653 Strygon costs 5
    const list = addCard(makeList(), 'c1653');
    strictEqual(pointsSpent(list), 5);
});

test('multiple entries summed', () => {
    let list = addCard(makeList(), 'c1653'); // 5
    list     = addCard(list, 'c1656');       // 8
    strictEqual(pointsSpent(list), 13);
});

test('command card cost included', () => {
    // cmd7 Heavy Airdrop 1 costs 5
    const list = makeList({ commandCards: ['cmd7'] });
    strictEqual(pointsSpent(list), 5);
});

test('pointsRemaining = limit - spent', () => {
    const list = addCard(makeList({ pointLimit: 75 }), 'c1653'); // spent 5
    strictEqual(pointsRemaining(list), 70);
});

// ---------------------------------------------------------------------------
// serialise / deserialise
// ---------------------------------------------------------------------------
console.log('\nserialise / deserialise');

test('empty list roundtrips', () => {
    const list = makeList();
    const back = deserialise(serialise(list));
    ok(back, 'deserialise returned null');
    strictEqual(back!.armyId,     list.armyId);
    strictEqual(back!.leaderId,   list.leaderId);
    strictEqual(back!.pointLimit, list.pointLimit);
    strictEqual(back!.entries.length, 0);
});

test('list with entries roundtrips', () => {
    const list = addCard(addCard(makeList(), 'c1653'), 'c1656');
    const back = deserialise(serialise(list));
    ok(back, 'deserialise returned null');
    strictEqual(back!.entries.length, 2);
    strictEqual(back!.entries[0].cardId, 'c1653');
    strictEqual(back!.entries[1].cardId, 'c1656');
});

test('wrong version returns null', () => {
    const raw = JSON.stringify({ version: 'mk3', armyId: 'a14', leaderId: null, entries: [], commandCards: [], pointLimit: 75 });
    strictEqual(deserialise(raw), null);
});

test('invalid JSON returns null', () => {
    strictEqual(deserialise('not json'), null);
});

// ---------------------------------------------------------------------------
// toggleCommandCard
// ---------------------------------------------------------------------------
console.log('\ntoggleCommandCard');

test('toggle adds command card', () => {
    const list = toggleCommandCard(makeList({ commandCards: [] }), 'cmd1');
    ok(list.commandCards.includes('cmd1'));
});

test('toggle removes existing command card', () => {
    const list = toggleCommandCard(makeList({ commandCards: ['cmd1'] }), 'cmd1');
    ok(!list.commandCards.includes('cmd1'));
});

test('toggle respects commandCardLimit', () => {
    // a14 (Fane of Nyrro) default limit is 5; fill to limit then try to add one more
    const cmdIds = ['cmd1', 'cmd2', 'cmd3', 'cmd4', 'cmd5'];
    let list = makeList({ commandCards: cmdIds });
    const after = toggleCommandCard(list, 'cmd6');
    strictEqual(after.commandCards.length, 5, 'Should not exceed command card limit');
});

// ---------------------------------------------------------------------------
// removeEntry
// ---------------------------------------------------------------------------
console.log('\nremoveEntry');

test('removeEntry removes by index', () => {
    let list = addCard(addCard(makeList(), 'c1653'), 'c1656');
    list = removeEntry(list, 0);
    strictEqual(list.entries.length, 1);
    strictEqual(list.entries[0].cardId, 'c1656');
});

test('removeEntry on empty list is safe', () => {
    const list = removeEntry(makeList(), 0);
    strictEqual(list.entries.length, 0);
});

// ---------------------------------------------------------------------------
// setLeader
// ---------------------------------------------------------------------------
console.log('\nsetLeader');

test('setLeader updates leaderId', () => {
    const list = setLeader(makeList({ leaderId: null }), 'c1652');
    strictEqual(list.leaderId, 'c1652');
});

test('setLeader to null clears leader', () => {
    const list = setLeader(makeList(), null);
    strictEqual(list.leaderId, null);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

} // end main

main().catch(err => { console.error(err); process.exit(1); });
