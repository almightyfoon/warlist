/**
 * Tests for mk4list.ts: canAdd, addCard, pointsSpent, serialise/deserialise,
 * toggleCommandCard, removeEntry.
 *
 * Runs standalone: npx tsx tests/mk4/test-list.ts
 */

import { readFileSync } from 'fs';
import { strictEqual, ok, deepStrictEqual } from 'assert';
import { Mk4Data, LEADER_TYPES } from '../../cc/ccapi/mk4data';
import {
    canAdd, addCard, pointsSpent, pointsRemaining,
    serialise, deserialise, toggleCommandCard, removeEntry, setLeader,
    buildAttachmentAssignments, attachHostOptions, attachmentHost, moveAttachment,
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
//   Army: Dark Operations (a10)
//   c1151  Exulon Thexus            Warcaster
//   c1076  Drudge Conduits          Unit
//   c1077  Drudge Slayers           Unit
//   c923   Mind Bender              CA→[c1076,c1077]
//   c924   Mind Slaver              CA→[c1076,c1077]
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
// canAdd — defenses
//   c527  Barrier      Defense  General  cost:2
//   c529  Fire Pit     Defense  General  cost:1
//   c530  Powder Keg   Defense  General  cost:1
//   c531  Spike Trap   Defense  General  cost:1
// ---------------------------------------------------------------------------
console.log('\ncanAdd — defenses');

test('third defense allowed', () => {
    const list = addCard(addCard(makeList(), 'c527'), 'c527');
    ok(canAdd(list, 'c527').ok, 'Should allow 3rd defense');
});

test('fourth defense blocked', () => {
    let list = makeList();
    for (let i = 0; i < 3; i++) list = addCard(list, 'c527');
    ok(!canAdd(list, 'c527').ok, 'Should block 4th defense');
    strictEqual(list.entries.length, 3);
});

test('defense cap is shared across different defense cards', () => {
    const list = addCard(addCard(addCard(makeList(), 'c527'), 'c529'), 'c530');
    ok(!canAdd(list, 'c531').ok, 'Different Defense cards should share the same cap');
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
    // c1656 Strygon Rider costs 8
    const list = addCard(makeList(), 'c1656');
    strictEqual(pointsSpent(list), 8);
});

test('multiple entries summed', () => {
    let list = addCard(makeList(), 'c1656'); // 8
    list     = addCard(list, 'c1657');       // 6
    strictEqual(pointsSpent(list), 14);
});

test('command card cost included', () => {
    // cmd7 Heavy Airdrop 1 costs 5
    const list = makeList({ commandCards: ['cmd7'] });
    strictEqual(pointsSpent(list), 5);
});

test('pointsRemaining = limit - spent', () => {
    const list = addCard(makeList({ pointLimit: 75 }), 'c1656'); // spent 8
    strictEqual(pointsRemaining(list), 67);
});

test('what canAdd charges is what the list tallies', () => {
    // A card whose slots each hold one option is not modular, so the picker adds
    // it with no slotSelections. The gate and the tally must still agree, or the
    // model is silently discounted (c800 Skylla did exactly this).
    for (const card of Mk4Data.cards) {
        if (!card.hardPoints || LEADER_TYPES.has(card.cardType)) continue;
        const army = Mk4Data.armies.find(a => Mk4Data.availableCards(a).some(c => c.id === card.id));
        if (!army) continue;

        const empty: Mk4List = { armyId: army.id, leaderId: null, entries: [],
                                 commandCards: [], pointLimit: 500 };
        const after = addCard(empty, card.id);
        if (after.entries.length === 0) continue;   // couldn't be added bare

        strictEqual(pointsSpent(after), Mk4Data.minCost(card),
            `${card.id} ${card.name}: gated at ${Mk4Data.minCost(card)} but tallied ${pointsSpent(after)}`);
    }
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
// Attachment assignment and reassignment
// ---------------------------------------------------------------------------
console.log('\nattachment assignment');

// Host entry index an attachment ended up on, by attachment entry index.
function hostOf(list: Mk4List, attachIdx: number): number | null {
    return attachmentHost(list, attachIdx);
}

function cephalyxList(): Mk4List {
    // Conduits(0), Slayers(1), Bender(2), Slaver(3)
    let list = makeList({ armyId: 'a10', leaderId: 'c1151', pointLimit: 100 });
    for (const id of ['c1076', 'c1077', 'c923', 'c924']) list = addCard(list, id);
    return list;
}

test('unpinned attachments fill eligible units in canAttachTo order', () => {
    // Both CAs target Conduits first, so the second one spills to Slayers
    const list = cephalyxList();
    strictEqual(hostOf(list, 2), 0, 'Mind Bender should sit on Drudge Conduits');
    strictEqual(hostOf(list, 3), 1, 'Mind Slaver should spill to Drudge Slayers');
});

test('attachHostOptions lists every eligible unit including the current host', () => {
    deepStrictEqual(attachHostOptions(cephalyxList(), 3), [0, 1]);
});

test('attachHostOptions is empty for a non-attachment entry', () => {
    deepStrictEqual(attachHostOptions(cephalyxList(), 0), []);
});

test('moveAttachment pins an attachment to the chosen unit', () => {
    // The reported bug: Mind Slaver stuck on Conduits with no way to reach Slayers
    let list = cephalyxList();
    list = removeEntry(list, 3);            // drop Slaver
    list = addCard(list, 'c1076');          // second Conduits at index 3
    list = addCard(list, 'c924');           // Slaver at index 4 → greedy picks Conduits #2
    strictEqual(hostOf(list, 4), 3);

    list = moveAttachment(list, 4, 1);      // move it onto Drudge Slayers
    strictEqual(hostOf(list, 4), 1);
    strictEqual(list.entries[4].attachTo, 1);
});

test('pinned attachment keeps its host when an earlier entry is removed', () => {
    let list = cephalyxList();
    list = moveAttachment(list, 2, 1);      // pin Bender to Slayers
    list = removeEntry(list, 0);            // remove Conduits — indices shift down
    strictEqual(list.entries[1].attachTo, 0, 'pin should be renumbered');
    strictEqual(hostOf(list, 1), 0, 'Bender should still be on Slayers');
});

test('removing the pinned host drops the pin and falls back to greedy', () => {
    let list = cephalyxList();
    list = moveAttachment(list, 2, 1);      // pin Bender to Slayers
    list = removeEntry(list, 1);            // remove Slayers
    strictEqual(list.entries[1].attachTo, undefined, 'stale pin should be cleared');
    strictEqual(hostOf(list, 1), 0, 'Bender falls back to Conduits');
});

test('pinning does not orphan the other attachment', () => {
    let list = cephalyxList();
    list = moveAttachment(list, 3, 0);      // pin Slaver to Conduits, bumping Bender
    strictEqual(hostOf(list, 3), 0);
    strictEqual(hostOf(list, 2), 1, 'Mind Bender should move to Slayers, not be orphaned');
    const seated = [...buildAttachmentAssignments(list).values()].flat().length;
    strictEqual(seated, 2);
});

test('a full unit is not offered as a move target', () => {
    let list = cephalyxList();
    list = removeEntry(list, 1);            // only Conduits left; Slaver has nowhere to go
    // entries: Conduits(0), Bender(1), Slaver(2)
    strictEqual(hostOf(list, 1), 0);
    strictEqual(hostOf(list, 2), null, 'Slaver has no seat');
    deepStrictEqual(attachHostOptions(list, 1), [0], 'Bender has only its own host');
});

test('serialise/deserialise preserves a pinned attachment', () => {
    const list = moveAttachment(cephalyxList(), 3, 0);
    const back = deserialise(serialise(list))!;
    strictEqual(back.entries[3].attachTo, 0);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

} // end main

main().catch(err => { console.error(err); process.exit(1); });
