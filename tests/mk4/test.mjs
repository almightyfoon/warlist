/**
 * Mk4 data layer unit tests.
 *
 * Runs standalone: node tests/mk4/test.mjs
 * Tests the army-filtering and list-validation logic against live JSON data.
 */

import { readFileSync } from 'fs';
import { strictEqual, ok, deepStrictEqual } from 'assert';

const cards    = JSON.parse(readFileSync('cc/data/mkiv_cards.json',      'utf-8'));
const armies   = JSON.parse(readFileSync('cc/data/mkiv_armies.json',     'utf-8'));
const keywords = JSON.parse(readFileSync('cc/data/mkiv_keywords.json',   'utf-8'));
const cmdCards = JSON.parse(readFileSync('cc/data/mkiv_commandcards.json','utf-8'));

// Mirror availableCards() from mk4data.ts
const cardById         = new Map(cards.map(c  => [c.id, c]));
const armyById         = new Map(armies.map(a => [a.id, a]));
const generalFactionId = cards.find(c => c.faction === 'General')?.factionId ?? '';

const LEADER_TYPES   = new Set(['Warcaster', 'Warlock', 'Infernal Master']);
const SCENARIO_TYPES = new Set(['Objective', 'Terrain', 'Defense', 'Structure', 'Marker']);

function availableCards(army) {
    const excluded     = new Set(army.excludedCardIds);
    const explicit     = new Set(army.includedCardIds);
    const armyKeywords = new Set(army.includedKeywordsIds);
    const hasKeywords  = armyKeywords.size > 0;

    return cards.filter(card => {
        if (excluded.has(card.id))                                    return false;
        if (card.companionOf)                                         return false;
        if (SCENARIO_TYPES.has(card.cardType))                        return false;
        if (explicit.has(card.id))                                    return true;
        if (generalFactionId && card.factionId === generalFactionId)  return true;
        if (card.factionId !== army.factionId)                        return false;
        if (hasKeywords) return (card.keywordsIds ?? []).some(k => armyKeywords.has(k));
        return true;
    });
}

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (e) {
        console.log(`  FAIL  ${name}`);
        console.log(`        ${e.message}`);
        failed++;
    }
}

// ---------------------------------------------------------------------------
// Data integrity — counts
// ---------------------------------------------------------------------------
console.log('\nData integrity — counts');

test('1671 live cards total', () => {
    strictEqual(cards.length, 1671);
});

test('40 armies total', () => {
    strictEqual(armies.length, 40);
});

test('generalFactionId resolves', () => {
    ok(generalFactionId !== '', 'Could not find General faction');
});

// ---------------------------------------------------------------------------
// Data integrity — referential
// ---------------------------------------------------------------------------
console.log('\nData integrity — referential');

test('all card keywordsIds exist in mkiv_keywords.json', () => {
    const bad = [];
    for (const c of cards) {
        for (const k of c.keywordsIds ?? []) {
            if (!keywords[k]) bad.push(`${c.name}: ${k}`);
        }
    }
    strictEqual(bad.length, 0, `Unknown keyword IDs: ${bad.slice(0,3).join(', ')}`);
});

test('all army includedKeywordsIds exist in mkiv_keywords.json', () => {
    const bad = [];
    for (const a of armies) {
        for (const k of a.includedKeywordsIds ?? []) {
            if (!keywords[k]) bad.push(`${a.name}: ${k}`);
        }
    }
    strictEqual(bad.length, 0, `Unknown keyword IDs: ${bad.slice(0,3).join(', ')}`);
});

test('all army includedCardIds exist in mkiv_cards.json', () => {
    const bad = [];
    for (const a of armies) {
        for (const id of a.includedCardIds ?? []) {
            if (!cardById.has(id)) bad.push(`${a.name}: ${id}`);
        }
    }
    strictEqual(bad.length, 0, `Unknown card IDs: ${bad.slice(0,3).join(', ')}`);
});

test('all army excludedCardIds exist in mkiv_cards.json', () => {
    const bad = [];
    for (const a of armies) {
        for (const id of a.excludedCardIds ?? []) {
            if (!cardById.has(id)) bad.push(`${a.name}: ${id}`);
        }
    }
    strictEqual(bad.length, 0, `Unknown card IDs: ${bad.slice(0,3).join(', ')}`);
});

test('no duplicate card IDs', () => {
    const ids = cards.map(c => c.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    strictEqual(dupes.length, 0, `Duplicate card IDs: ${dupes.join(', ')}`);
});

test('no duplicate army names', () => {
    const names = armies.map(a => a.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    strictEqual(dupes.length, 0, `Duplicate army names: ${dupes.join(', ')}`);
});

test('companion cards have valid companionOf reference', () => {
    const bad = [];
    for (const c of cards) {
        if (c.companionOf && !cardById.has(c.companionOf)) {
            bad.push(`${c.name}: companionOf=${c.companionOf}`);
        }
    }
    strictEqual(bad.length, 0, `Bad companionOf refs: ${bad.join(', ')}`);
});

test('pairedWith arrays reference valid companion cards', () => {
    const bad = [];
    for (const c of cards) {
        for (const id of c.pairedWith ?? []) {
            if (!cardById.has(id)) bad.push(`${c.name}: pairedWith=${id}`);
        }
    }
    strictEqual(bad.length, 0, `Bad pairedWith refs: ${bad.join(', ')}`);
});

test('all cards have required fields', () => {
    const required = ['id', 'name', 'faction', 'factionId', 'cardType', 'pointCost', 'fieldAllowance'];
    const bad = [];
    for (const c of cards) {
        for (const f of required) {
            if (c[f] === undefined) bad.push(`${c.id}: missing ${f}`);
        }
    }
    strictEqual(bad.length, 0, `Cards missing required fields: ${bad.slice(0,3).join(', ')}`);
});

// ---------------------------------------------------------------------------
// Army filtering — general
// ---------------------------------------------------------------------------
console.log('\nArmy filtering');

test('scenario/terrain cards excluded from all armies', () => {
    const scenarioCards = cards.filter(c => SCENARIO_TYPES.has(c.cardType));
    ok(scenarioCards.length > 0, 'No scenario-type cards in data');
    for (const army of armies) {
        const available = availableCards(army);
        for (const sc of scenarioCards) {
            ok(!available.some(c => c.id === sc.id),
                `Scenario card "${sc.name}" appears in ${army.name}`);
        }
    }
});

test('companion cards excluded from availableCards for all armies', () => {
    const companions = cards.filter(c => c.companionOf);
    ok(companions.length > 0, 'No companion cards in data');
    for (const army of armies) {
        const available = new Set(availableCards(army).map(c => c.id));
        for (const comp of companions) {
            ok(!available.has(comp.id),
                `Companion "${comp.name}" appears in ${army.name}`);
        }
    }
});

test('excludedCardIds not present in availableCards', () => {
    for (const army of armies) {
        const available = new Set(availableCards(army).map(c => c.id));
        for (const id of army.excludedCardIds) {
            ok(!available.has(id), `Excluded ${id} appears in ${army.name}`);
        }
    }
});

test('includedCardIds always present in availableCards', () => {
    for (const army of armies) {
        const available = new Set(availableCards(army).map(c => c.id));
        for (const id of army.includedCardIds) {
            const card = cardById.get(id);
            if (!card || card.companionOf) continue; // companions excluded by design
            ok(available.has(id), `Explicit include ${id} missing from ${army.name}`);
        }
    }
});

test('every army has at least one available leader', () => {
    const bad = [];
    for (const army of armies) {
        const leaders = availableCards(army).filter(c => LEADER_TYPES.has(c.cardType));
        if (leaders.length === 0) bad.push(army.name);
    }
    strictEqual(bad.length, 0, `Armies with no leaders: ${bad.join(', ')}`);
});

// ---------------------------------------------------------------------------
// Army filtering — cross-army isolation
// ---------------------------------------------------------------------------
console.log('\nArmy isolation');

const gravediggers = armies.find(a => a.name === 'Gravediggers');
const stormKnights = armies.find(a => a.name === 'Storm Knights');

test('Gravediggers and Storm Knights have distinct rosters', () => {
    ok(gravediggers, 'Gravediggers not found');
    ok(stormKnights, 'Storm Knights not found');
    const gd = new Set(availableCards(gravediggers).map(c => c.id));
    const sk = new Set(availableCards(stormKnights).map(c => c.id));
    ok([...gd].some(id => !sk.has(id)), 'No cards exclusive to Gravediggers');
    ok([...sk].some(id => !gd.has(id)), 'No cards exclusive to Storm Knights');
});

test('Sir Dreyfus in Storm Knights but not Gravediggers', () => {
    const dreyfus = cards.find(c => c.name.includes('Dreyfus'));
    ok(dreyfus, 'Sir Dreyfus not found');
    ok( availableCards(stormKnights).some(c => c.id === dreyfus.id), 'Dreyfus missing from Storm Knights');
    ok(!availableCards(gravediggers).some(c => c.id === dreyfus.id), 'Dreyfus should not be in Gravediggers');
});

// ---------------------------------------------------------------------------
// Khador army correctness
// ---------------------------------------------------------------------------
console.log('\nKhador armies');

const fifthDiv    = armies.find(a => a.id === 'a1');
const armoredKorps = armies.find(a => a.id === 'a2');
const sks6Ids     = cards.filter(c => (c.keywordsIds ?? []).includes('k81')).map(c => c.id);

test('5th Division uses k7 keyword filter', () => {
    ok(fifthDiv, '5th Division not found');
    deepStrictEqual(fifthDiv.includedKeywordsIds, ['k7']);
});

test('Armored Korps uses k23 keyword filter only (no k81/SKS-6)', () => {
    ok(armoredKorps, 'Armored Korps not found');
    ok(!armoredKorps.includedKeywordsIds.includes('k81'),
        'Armored Korps should not include SKS-6 keyword');
});

test('SKS-6 cadre cards not available in 5th Division', () => {
    ok(sks6Ids.length > 0, 'No SKS-6 cards found');
    const available = new Set(availableCards(fifthDiv).map(c => c.id));
    const found = sks6Ids.filter(id => available.has(id));
    strictEqual(found.length, 0, `SKS-6 cards in 5th Division: ${found.join(', ')}`);
});

test('SKS-6 cadre cards not available in Armored Korps', () => {
    const available = new Set(availableCards(armoredKorps).map(c => c.id));
    const found = sks6Ids.filter(id => available.has(id));
    strictEqual(found.length, 0, `SKS-6 cards in Armored Korps: ${found.join(', ')}`);
});

test('5th Division has expected card count (41 faction + 4 mercs)', () => {
    ok(fifthDiv, '5th Division not found');
    const count = availableCards(fifthDiv).length;
    strictEqual(count, 45, `Expected 45, got ${count}`);
});

// ---------------------------------------------------------------------------
// Infernals
// ---------------------------------------------------------------------------
console.log('\nInfernals');

const infernalsArmy = armies.find(a => a.name === 'Infernals');
const infernalsAll  = armies.filter(a => a.name === 'Infernals');

test('exactly one Infernals army', () => {
    strictEqual(infernalsAll.length, 1, `Found ${infernalsAll.length} Infernals armies`);
});

test('Infernals uses k61 keyword filter', () => {
    ok(infernalsArmy, 'Infernals army not found');
    ok(infernalsArmy.includedKeywordsIds.includes('k61'),
        'Infernals should use k61 keyword');
});

test('all k61 cards available in Infernals', () => {
    const k61Cards = cards.filter(c =>
        (c.keywordsIds ?? []).includes('k61') && !c.companionOf &&
        !SCENARIO_TYPES.has(c.cardType)
    );
    ok(k61Cards.length > 0, 'No k61 cards found');
    const available = new Set(availableCards(infernalsArmy).map(c => c.id));
    const missing = k61Cards.filter(c => !available.has(c.id));
    strictEqual(missing.length, 0, `k61 cards missing from Infernals: ${missing.map(c => c.name).join(', ')}`);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
