import { Mk4Card, Mk4Data, LEADER_TYPES, COHORT_TYPES } from './mk4data';

export interface ListEntry {
    cardId: string;
    companionCardIds?: string[];  // auto-joined companions (e.g. Benkei+Sasha with Lanyssa)
    battleGroupLeader?: string;   // card ID of the jr/unit controlling this cohort; absent = main leader
    slotSelections?: string[];    // chosen option name per hard point slot (parallel to card.hardPoints)
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
            total += entry.slotSelections
                ? Mk4Data.configuredCost(card, entry.slotSelections)
                : Mk4Data.pointCost(card);
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

// Greedy assignment: for each attachment entry (in list order) find the first
// target unit instance that still has a slot. Returns unit entry → attachments.
// Used by both canAdd() and the renderer so they always agree.
export function buildAttachmentAssignments(list: Mk4List): Map<ListEntry, ListEntry[]> {
    const map = new Map<ListEntry, ListEntry[]>();
    for (const attachEntry of list.entries) {
        const attachCard = Mk4Data.cardById.get(attachEntry.cardId);
        if (!attachCard) continue;
        const limit = ATTACH_LIMITS[attachCard.cardType];
        if (limit === undefined) continue;

        const targets = attachCard.canAttachTo ?? [];
        let placed = false;
        outer: for (const targetId of targets) {
            for (const unitEntry of list.entries) {
                if (unitEntry.cardId !== targetId) continue;
                const existing = map.get(unitEntry) ?? [];
                const sameType = existing.filter(
                    e => Mk4Data.cardById.get(e.cardId)?.cardType === attachCard.cardType
                ).length;
                if (sameType < limit) {
                    map.set(unitEntry, [...existing, attachEntry]);
                    placed = true;
                    break outer;
                }
            }
        }
        // CA/WA with no canAttachTo: assign to first unit with room (fallback)
        if (!placed && targets.length === 0) {
            for (const unitEntry of list.entries) {
                const uCard = Mk4Data.cardById.get(unitEntry.cardId);
                if (uCard?.cardType !== 'Unit') continue;
                const existing = map.get(unitEntry) ?? [];
                const sameType = existing.filter(
                    e => Mk4Data.cardById.get(e.cardId)?.cardType === attachCard.cardType
                ).length;
                if (sameType < limit) {
                    map.set(unitEntry, [...existing, attachEntry]);
                    break;
                }
            }
        }
    }
    return map;
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

    const army      = Mk4Data.armyById.get(list.armyId);
    const companions = army ? Mk4Data.companionsFor(card, list.armyId) : [];
    const cardCost  = slotSelections
        ? Mk4Data.configuredCost(card, slotSelections)
        : Mk4Data.minCost(card);
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
    return { ...list, entries: list.entries.filter((_, i) => i !== index) };
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
