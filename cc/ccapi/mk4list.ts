import { Mk4Card, Mk4Data, LEADER_TYPES, COHORT_TYPES } from './mk4data';

export interface ListEntry {
    cardId: string;
    companionCardIds?: string[];  // auto-joined companions (e.g. Benkei+Sasha with Lanyssa)
    battleGroupLeader?: string;   // card ID of the jr/unit controlling this cohort; absent = main leader
    slotSelections?: string[];    // chosen option name per hard point slot (parallel to card.hardPoints)
    attachTo?: number;            // index into list.entries of the host unit, when the user
                                  // has explicitly assigned this attachment; absent = greedy
}

export interface Mk4List {
    armyId: string;
    leaderId: string | null;    // free; exactly one per list
    entries: ListEntry[];       // non-leader models
    commandCards: string[];     // selected command card IDs
    pointLimit: number;
}

// Serialised form stored in the database listdata column.
export interface Mk4ListStored {
    version: 'mk4';
    armyId: string;
    leaderId: string | null;
    entries: ListEntry[];
    commandCards: string[];
    pointLimit: number;
}

export function createList(armyId: string, pointLimit = 100): Mk4List {
    const army = Mk4Data.armyById.get(armyId);
    const commandCards = army
        ? Mk4Data.availableCommandCards(army)
              .slice(0, Mk4Data.commandCardLimit(army))
              .map(c => c.id)
        : [];
    return { armyId, leaderId: null, entries: [], commandCards, pointLimit };
}

export function serialise(list: Mk4List): string {
    const stored: Mk4ListStored = { version: 'mk4', ...list };
    return JSON.stringify(stored);
}

export function deserialise(json: string): Mk4List | null {
    try {
        const stored: Mk4ListStored = JSON.parse(json);
        if (stored.version !== 'mk4') return null;
        return { armyId: stored.armyId, leaderId: stored.leaderId,
                 entries: stored.entries, commandCards: stored.commandCards ?? [],
                 pointLimit: stored.pointLimit };
    } catch {
        return null;
    }
}

export function pointsSpent(list: Mk4List): number {
    let total = 0;
    for (const entry of list.entries) {
        const card = Mk4Data.cardById.get(entry.cardId);
        if (card) {
            total += Mk4Data.entryCost(card, entry.slotSelections);
        }
        for (const cid of entry.companionCardIds ?? []) {
            const comp = Mk4Data.cardById.get(cid);
            if (comp) total += Mk4Data.pointCost(comp);
        }
    }
    for (const cmdId of list.commandCards) {
        const cmd = Mk4Data.commandCardById.get(cmdId);
        if (cmd) total += cmd.pointCost;
    }
    return total;
}

export function toggleCommandCard(list: Mk4List, cmdId: string): Mk4List {
    if (list.commandCards.includes(cmdId))
        return { ...list, commandCards: list.commandCards.filter(id => id !== cmdId) };
    const army  = Mk4Data.armyById.get(list.armyId);
    const limit = army ? Mk4Data.commandCardLimit(army) : 5;
    if (list.commandCards.length >= limit) return list;
    return { ...list, commandCards: [...list.commandCards, cmdId] };
}

export function pointsRemaining(list: Mk4List): number {
    return list.pointLimit - pointsSpent(list);
}

function countInList(list: Mk4List, cardId: string): number {
    let n = 0;
    for (const e of list.entries) {
        if (e.cardId === cardId) n++;
        if ((e.companionCardIds ?? []).includes(cardId)) n++;
    }
    return n;
}

function hasTrueMercInList(list: Mk4List): boolean {
    for (const e of list.entries) {
        if (Mk4Data.isTrueMerc(e.cardId)) return true;
    }
    return false;
}

function unitCountInList(list: Mk4List): number {
    let n = 0;
    for (const e of list.entries) {
        const card = Mk4Data.cardById.get(e.cardId);
        if (card?.cardType === 'Unit') n++;
    }
    return n;
}

const ATTACH_LIMITS: Partial<Record<string, number>> = {
    'Command Attachment': 1,
    'Weapon Attachment':  3,
};

const MAX_DEFENSES = 3;

function defenseCountInList(list: Mk4List): number {
    let n = 0;
    for (const e of list.entries) {
        if (Mk4Data.cardById.get(e.cardId)?.cardType === 'Defense') n++;
    }
    return n;
}

// True when unitEntry is a legal host for attachCard, ignoring capacity.
function isEligibleHost(unitEntry: ListEntry, attachCard: Mk4Card): boolean {
    const targets = attachCard.canAttachTo ?? [];
    if (targets.length > 0) return targets.indexOf(unitEntry.cardId) !== -1;
    // CA/WA with no canAttachTo attaches to any unit
    return Mk4Data.cardById.get(unitEntry.cardId)?.cardType === 'Unit';
}

// Assignment: explicit user assignments (entry.attachTo) are honoured first, then
// the remaining attachments are placed greedily — for each attachment entry (in
// list order) the first target unit instance that still has a slot.
// Returns unit entry → attachments. Used by both canAdd() and the renderer so
// they always agree.
export function buildAttachmentAssignments(list: Mk4List): Map<ListEntry, ListEntry[]> {
    const map = new Map<ListEntry, ListEntry[]>();

    // Try to seat attachEntry on unitEntry; false when that unit is full.
    const seat = (unitEntry: ListEntry, attachEntry: ListEntry,
                  attachCard: Mk4Card, limit: number): boolean => {
        const existing = map.get(unitEntry) ?? [];
        const sameType = existing.filter(
            e => Mk4Data.cardById.get(e.cardId)?.cardType === attachCard.cardType
        ).length;
        if (sameType >= limit) return false;
        map.set(unitEntry, [...existing, attachEntry]);
        return true;
    };

    // Pass 1 — pinned attachments claim their host before anything else.
    const unpinned: { entry: ListEntry; card: Mk4Card; limit: number }[] = [];
    for (const attachEntry of list.entries) {
        const attachCard = Mk4Data.cardById.get(attachEntry.cardId);
        if (!attachCard) continue;
        const limit = ATTACH_LIMITS[attachCard.cardType];
        if (limit === undefined) continue;

        const host = attachEntry.attachTo !== undefined
            ? list.entries[attachEntry.attachTo]
            : undefined;
        if (host && host !== attachEntry && isEligibleHost(host, attachCard)
            && seat(host, attachEntry, attachCard, limit)) continue;

        unpinned.push({ entry: attachEntry, card: attachCard, limit });
    }

    // Pass 2 — everything else, greedily.
    for (const { entry: attachEntry, card: attachCard, limit } of unpinned) {
        const targets = attachCard.canAttachTo ?? [];
        let placed = false;
        outer: for (const targetId of targets) {
            for (const unitEntry of list.entries) {
                if (unitEntry.cardId !== targetId) continue;
                if (seat(unitEntry, attachEntry, attachCard, limit)) {
                    placed = true;
                    break outer;
                }
            }
        }
        // CA/WA with no canAttachTo: assign to first unit with room (fallback)
        if (!placed && targets.length === 0) {
            for (const unitEntry of list.entries) {
                if (Mk4Data.cardById.get(unitEntry.cardId)?.cardType !== 'Unit') continue;
                if (seat(unitEntry, attachEntry, attachCard, limit)) break;
            }
        }
    }
    return map;
}

// True when the entry at this index is a command/weapon attachment.
export function isAttachmentEntry(list: Mk4List, index: number): boolean {
    const card = Mk4Data.cardById.get(list.entries[index]?.cardId ?? '');
    return !!card && ATTACH_LIMITS[card.cardType] !== undefined;
}

// Index of the unit entry this attachment is currently seated on, or null.
export function attachmentHost(list: Mk4List, attachIdx: number): number | null {
    const attachEntry = list.entries[attachIdx];
    if (!attachEntry) return null;
    for (const [unitEntry, attachments] of buildAttachmentAssignments(list)) {
        if (attachments.indexOf(attachEntry) !== -1) return list.entries.indexOf(unitEntry);
    }
    return null;
}

// Pin an attachment to a specific host unit. No validation — callers pick the
// target from attachHostOptions().
export function moveAttachment(list: Mk4List, attachIdx: number, hostIdx: number): Mk4List {
    if (!isAttachmentEntry(list, attachIdx)) return list;
    if (!list.entries[hostIdx] || hostIdx === attachIdx) return list;
    return {
        ...list,
        entries: list.entries.map((e, i) => i === attachIdx ? { ...e, attachTo: hostIdx } : e),
    };
}

function seatedAttachmentCount(list: Mk4List): number {
    let n = 0;
    for (const attachments of buildAttachmentAssignments(list).values()) n += attachments.length;
    return n;
}

// Entry indices of the units this attachment may sit on, in list order, always
// including its current host. A candidate is offered only if moving there seats
// the attachment on it without knocking another attachment out of the list.
export function attachHostOptions(list: Mk4List, attachIdx: number): number[] {
    if (!isAttachmentEntry(list, attachIdx)) return [];
    const attachCard = Mk4Data.cardById.get(list.entries[attachIdx].cardId)!;
    const current    = attachmentHost(list, attachIdx);
    const seatedNow  = seatedAttachmentCount(list);

    const options: number[] = [];
    list.entries.forEach((unitEntry, unitIdx) => {
        if (unitIdx === attachIdx) return;
        if (!isEligibleHost(unitEntry, attachCard)) return;
        if (unitIdx === current) { options.push(unitIdx); return; }

        const moved = moveAttachment(list, attachIdx, unitIdx);
        if (attachmentHost(moved, attachIdx) !== unitIdx) return;   // no room there
        if (seatedAttachmentCount(moved) < seatedNow) return;       // would orphan another
        options.push(unitIdx);
    });
    return options;
}

export type AddResult = { ok: true } | { ok: false; reason: string };

export function canAdd(list: Mk4List, cardId: string,
                       battleGroupLeader?: string,
                       slotSelections?: string[]): AddResult {
    const card = Mk4Data.cardById.get(cardId);
    if (!card) return { ok: false, reason: 'Unknown card' };

    if (LEADER_TYPES.has(card.cardType))
        return { ok: false, reason: 'Leaders are selected separately' };

    // True merc solo limit: only one of Magnus/Carver/Nostilla per list
    if (Mk4Data.isTrueMerc(cardId) && hasTrueMercInList(list))
        return { ok: false, reason: 'Already have a True Merc solo' };


    // Battle group cohort validation when a specific leader is targeted
    if (battleGroupLeader !== undefined && COHORT_TYPES.has(card.cardType)) {
        const bgLeaderCard = Mk4Data.cardById.get(battleGroupLeader);
        if (bgLeaderCard?.battleGroupSize === 'single') {
            const existing = list.entries.filter(e =>
                e.battleGroupLeader === battleGroupLeader &&
                COHORT_TYPES.has(Mk4Data.cardById.get(e.cardId)?.cardType ?? '')
            );
            if (existing.length >= 1)
                return { ok: false, reason: 'Battle group already has a model' };
        }
    }

    // Attachments require a unit slot — enforce per-unit limits
    if (card.cardType === 'Command Attachment' || card.cardType === 'Weapon Attachment') {
        const limit   = ATTACH_LIMITS[card.cardType]!;
        const targets = card.canAttachTo ?? [];
        const current = buildAttachmentAssignments(list);

        const hasSlot = targets.length > 0
            ? targets.some(targetId =>
                list.entries
                    .filter(e => e.cardId === targetId)
                    .some(unitEntry => {
                        const existing = current.get(unitEntry) ?? [];
                        return existing.filter(
                            e => Mk4Data.cardById.get(e.cardId)?.cardType === card.cardType
                        ).length < limit;
                    })
              )
            : list.entries.some(unitEntry => {
                const uCard = Mk4Data.cardById.get(unitEntry.cardId);
                if (uCard?.cardType !== 'Unit') return false;
                const existing = current.get(unitEntry) ?? [];
                return existing.filter(
                    e => Mk4Data.cardById.get(e.cardId)?.cardType === card.cardType
                ).length < limit;
              });

        if (!hasSlot) return {
            ok: false,
            reason: card.cardType === 'Command Attachment'
                ? 'All eligible units already have a command attachment'
                : 'All eligible units are at max weapon attachments',
        };
    }

    if (card.cardType === 'Defense' && defenseCountInList(list) >= MAX_DEFENSES)
        return { ok: false, reason: `Max ${MAX_DEFENSES} defenses per list` };

    const army      = Mk4Data.armyById.get(list.armyId);
    const companions = army ? Mk4Data.companionsFor(card, list.armyId) : [];
    const cardCost  = Mk4Data.entryCost(card, slotSelections);
    const totalCost = cardCost + companions.reduce((s, c) => s + Mk4Data.pointCost(c), 0);

    if (pointsSpent(list) + totalCost > list.pointLimit)
        return { ok: false, reason: 'Not enough points' };

    const fa = Mk4Data.fieldAllowance(card);
    if (fa === 'C') {
        if (countInList(list, cardId) > 0)
            return { ok: false, reason: 'Character — only one allowed' };
    } else if (typeof fa === 'number') {
        if (countInList(list, cardId) >= fa)
            return { ok: false, reason: `FA ${fa} limit reached` };
    }

    return { ok: true };
}

export function addCard(list: Mk4List, cardId: string,
                        battleGroupLeader?: string,
                        slotSelections?: string[]): Mk4List {
    if (!canAdd(list, cardId, battleGroupLeader, slotSelections).ok) return list;

    const card       = Mk4Data.cardById.get(cardId)!;
    const army       = Mk4Data.armyById.get(list.armyId);
    const companions = army ? Mk4Data.companionsFor(card, list.armyId) : [];

    const entry: ListEntry = {
        cardId,
        ...(companions.length > 0 && { companionCardIds: companions.map(c => c.id) }),
        ...(battleGroupLeader !== undefined && { battleGroupLeader }),
        ...(slotSelections !== undefined && { slotSelections }),
    };
    return { ...list, entries: [...list.entries, entry] };
}

// Map of jr/unit card ID → cohort entries in their battle group.
// Key undefined entries (absent battleGroupLeader) represent the main leader's BG.
export function buildBattleGroupMap(list: Mk4List): Map<string | undefined, ListEntry[]> {
    const map = new Map<string | undefined, ListEntry[]>();
    for (const entry of list.entries) {
        const card = Mk4Data.cardById.get(entry.cardId);
        if (!card || !COHORT_TYPES.has(card.cardType)) continue;
        const key = entry.battleGroupLeader;
        map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return map;
}

// Returns jr/unit card IDs whose battleGroupRequired is true but have no BG cohorts.
export function missingRequiredBattleGroups(list: Mk4List): string[] {
    const bgMap = buildBattleGroupMap(list);
    const missing: string[] = [];
    for (const entry of list.entries) {
        const card = Mk4Data.cardById.get(entry.cardId);
        if (!card?.battleGroupRequired) continue;
        if (!bgMap.get(entry.cardId)?.length) missing.push(entry.cardId);
    }
    return missing;
}

export function removeEntry(list: Mk4List, index: number): Mk4List {
    // attachTo holds entry indices, so surviving pins have to be renumbered and
    // pins onto the removed entry dropped (that attachment falls back to greedy).
    const entries = list.entries
        .filter((_, i) => i !== index)
        .map(e => {
            if (e.attachTo === undefined || e.attachTo < index) return e;
            if (e.attachTo === index) {
                const { attachTo, ...rest } = e;
                return rest;
            }
            return { ...e, attachTo: e.attachTo - 1 };
        });
    return { ...list, entries };
}

export function setLeader(list: Mk4List, leaderId: string | null): Mk4List {
    return { ...list, leaderId };
}

// Display ordering: Leader (handled separately) → Cohort → Solo → Unit →
// Command Attachment → Weapon Attachment → Battle Engine → Structure → Defense → other
export const TYPE_ORDER: Record<string, number> = {
    'Warjack': 1, 'Warbeast': 2, 'Horror': 3, 'Monstrosity': 4,
    'Solo': 5,
    'Unit': 6, 'Command Attachment': 7, 'Weapon Attachment': 8,
    'Battle Engine': 9, 'Structure': 10,
    'Defense': 11, 'Objective': 12, 'Terrain': 13,
};

export function groupedEntries(list: Mk4List): Map<string, ListEntry[]> {
    const groups = new Map<string, ListEntry[]>();
    for (const entry of list.entries) {
        const type = Mk4Data.cardById.get(entry.cardId)?.cardType ?? 'Unknown';
        const group = groups.get(type) ?? [];
        group.push(entry);
        groups.set(type, group);
    }
    return groups;
}

export function sortedTypeKeys(groups: Map<string, ListEntry[]>): string[] {
    return Array.from(groups.keys()).sort((a, b) =>
        (TYPE_ORDER[a] ?? 99) - (TYPE_ORDER[b] ?? 99)
    );
}
