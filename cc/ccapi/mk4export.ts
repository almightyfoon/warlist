import { Mk4List, ListEntry, pointsSpent, buildAttachmentAssignments, groupedEntries, sortedTypeKeys } from './mk4list';
import { Mk4Card, Mk4Data, COHORT_TYPES } from './mk4data';

// ---------------------------------------------------------------------------
// Plain-text export (Wartable-compatible format)
// ---------------------------------------------------------------------------

function hpLines(card: Mk4Card, slots: string[] | undefined): string[] {
    if (!slots || !card.hardPoints) return [];
    const out: string[] = [];
    for (let i = 0; i < card.hardPoints.length; i++) {
        const hp  = card.hardPoints[i];
        const sel = slots[i];
        if (!sel) continue;
        const opt = hp.options.find(o => o.name === sel);
        if (!opt) continue;
        const costStr = opt.pointCost > 0 ? String(opt.pointCost) : '';
        out.push('  ' + costStr.padEnd(14) + hp.label.toUpperCase() + ' - ' + opt.name);
    }
    return out;
}

export function listToText(list: Mk4List, listName?: string): string {
    const army       = Mk4Data.armyById.get(list.armyId);
    const leaderCard = list.leaderId ? Mk4Data.cardById.get(list.leaderId) : null;
    const faction    = Mk4Data.cards.find(c => c.factionId === army?.factionId)?.faction ?? '';
    const name       = listName || leaderCard?.name || army?.name || list.armyId;
    const spent      = pointsSpent(list);
    const lines: string[] = [];

    const gameMode =
        list.pointLimit >= 100 ? 'Grand Melee' :
        list.pointLimit >= 75  ? 'Pitched Battle' :
        list.pointLimit >= 50  ? 'Skirmish' : 'Command';

    lines.push(name);
    lines.push(`${faction} - ${army?.name ?? list.armyId}`);
    lines.push(`${gameMode} - ${list.pointLimit} pts`);
    lines.push('');
    lines.push('PC      CARD');
    lines.push('');

    // Leader + main battle group cohorts
    if (leaderCard) {
        lines.push('        ' + leaderCard.name);
        for (const entry of list.entries) {
            if (entry.battleGroupLeader !== undefined) continue;
            const c = Mk4Data.cardById.get(entry.cardId);
            if (!c || !COHORT_TYPES.has(c.cardType)) continue;
            const cost = entry.slotSelections
                ? Mk4Data.configuredCost(c, entry.slotSelections)
                : Mk4Data.pointCost(c);
            lines.push(String(cost).padEnd(12) + c.name);
            lines.push(...hpLines(c, entry.slotSelections));
        }
    }

    // Standalone entries grouped by type
    const attachMap    = buildAttachmentAssignments(list);
    const inlineAttach = new Set<ListEntry>(
        ([] as ListEntry[]).concat(...Array.from(attachMap.values()))
    );
    const mainBgSet = new Set(list.entries.filter(e => {
        if (e.battleGroupLeader !== undefined) return false;
        const c = Mk4Data.cardById.get(e.cardId);
        return c && COHORT_TYPES.has(c.cardType);
    }));
    const jrBgSet = new Set(list.entries.filter(e => e.battleGroupLeader !== undefined));

    const groups = groupedEntries(list);
    for (const type of sortedTypeKeys(groups)) {
        const isAttachType = type === 'Command Attachment' || type === 'Weapon Attachment';
        const standalone   = (groups.get(type) ?? []).filter(e =>
            !(isAttachType && inlineAttach.has(e)) && !jrBgSet.has(e) && !mainBgSet.has(e)
        );
        if (standalone.length === 0) continue;

        for (const entry of standalone) {
            const c        = Mk4Data.cardById.get(entry.cardId);
            const cardCost = c
                ? (entry.slotSelections
                    ? Mk4Data.configuredCost(c, entry.slotSelections)
                    : Mk4Data.pointCost(c))
                : 0;
            const compCost = (entry.companionCardIds ?? []).reduce((s, id) => {
                const cc = Mk4Data.cardById.get(id);
                return s + (cc ? Mk4Data.pointCost(cc) : 0);
            }, 0);
            const total    = cardCost + compCost;
            const pcStr    = total > 0 ? String(total) : '';
            lines.push(pcStr.padEnd(8) + (c?.name ?? entry.cardId));
            if (c) lines.push(...hpLines(c, entry.slotSelections));

            if (type === 'Unit') {
                for (const att of attachMap.get(entry) ?? []) {
                    const ac     = Mk4Data.cardById.get(att.cardId);
                    const attPc  = ac ? Mk4Data.pointCost(ac) : 0;
                    const attStr = attPc > 0 ? String(attPc) : '';
                    lines.push(attStr.padEnd(12) + (ac?.name ?? att.cardId));
                }
            }
            if (c?.battleGroupSize) {
                for (const e of list.entries.filter(x => x.battleGroupLeader === entry.cardId)) {
                    const bc   = Mk4Data.cardById.get(e.cardId);
                    const bcPc = bc
                        ? (e.slotSelections
                            ? Mk4Data.configuredCost(bc, e.slotSelections)
                            : Mk4Data.pointCost(bc))
                        : 0;
                    lines.push(String(bcPc).padEnd(12) + (bc?.name ?? e.cardId));
                    if (bc) lines.push(...hpLines(bc, e.slotSelections));
                }
            }
        }
    }

    // Command cards
    if (list.commandCards.length > 0) {
        lines.push('');
        lines.push('PC      COMMAND CARD');
        lines.push('');
        for (const cmdId of list.commandCards) {
            const cmd = Mk4Data.commandCardById.get(cmdId);
            lines.push('        ' + (cmd?.name ?? cmdId));
        }
    }

    lines.push('');
    lines.push(`TOTAL POINTS  ${spent}/${list.pointLimit}`);

    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// URL encoding — compact binary packed into base64url
//
// Format (version 1):
//   [0]   version = 1
//   [1]   army number  (army "a14" → 14)
//   [2-3] point limit  (uint16 big-endian)
//   [4-5] leader card  (uint16 big-endian, 0 = none)
//   [6]   command card count (N)
//   [7..7+N-1] command card numbers (1 byte each; "cmd3" → 3)
//   then per model entry until end of buffer:
//     [0-1] card number  (uint16 big-endian)
//     [2]   flags: bit0 = hasBGLeader, bit1 = hasSlots
//     [3-4] BG leader card (if hasBGLeader)
//     [n]   slot count, then N bytes of option indices (if hasSlots)
//           0xFF = no selection for that slot
// ---------------------------------------------------------------------------

export function encodeList(list: Mk4List): string {
    const b: number[] = [];
    const push2 = (n: number) => { b.push((n >> 8) & 0xFF, n & 0xFF); };

    b.push(2);                                            // version (2 = uint16 army/cmd IDs)
    push2(parseInt(list.armyId.slice(1)));                // army (uint16)
    push2(list.pointLimit);
    push2(list.leaderId ? parseInt(list.leaderId.slice(1)) : 0);

    b.push(list.commandCards.length);
    for (const cmdId of list.commandCards) {
        push2(parseInt(cmdId.slice(3)));                  // cmd (uint16, was single byte in v1)
    }

    for (const entry of list.entries) {
        push2(parseInt(entry.cardId.slice(1)));

        const hasBGLeader = !!entry.battleGroupLeader;
        const hasSlots    = !!(entry.slotSelections?.some(s => s !== ''));
        b.push((hasBGLeader ? 1 : 0) | (hasSlots ? 2 : 0));

        if (hasBGLeader) push2(parseInt(entry.battleGroupLeader!.slice(1)));

        if (hasSlots && entry.slotSelections) {
            const card  = Mk4Data.cardById.get(entry.cardId);
            const slots = entry.slotSelections;
            b.push(slots.length);
            for (let i = 0; i < slots.length; i++) {
                const hp  = card?.hardPoints?.[i];
                const idx = hp ? hp.options.findIndex(o => o.name === slots[i]) : -1;
                b.push(idx >= 0 ? idx : 0xFF);
            }
        }
    }

    let bin = '';
    for (const byte of b) bin += String.fromCharCode(byte);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeList(encoded: string): Mk4List | null {
    try {
        const raw  = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

        let pos = 0;
        const rd1 = () => bytes[pos++];
        const rd2 = () => { const n = (bytes[pos] << 8) | bytes[pos + 1]; pos += 2; return n; };

        const version = rd1();
        if (version !== 1 && version !== 2) return null;
        const armyId     = 'a' + (version === 1 ? rd1() : rd2());
        const pointLimit = rd2();
        const leaderNum  = rd2();
        const leaderId   = leaderNum ? ('c' + leaderNum) : null;

        const cmdCount    = rd1();
        const commandCards: string[] = [];
        for (let i = 0; i < cmdCount; i++) {
            commandCards.push('cmd' + (version === 1 ? rd1() : rd2()));
        }

        const entries: ListEntry[] = [];
        while (pos < bytes.length) {
            const cardNum     = rd2();
            const flags       = rd1();
            const hasBGLeader = !!(flags & 1);
            const hasSlots    = !!(flags & 2);

            const battleGroupLeader = hasBGLeader ? ('c' + rd2()) : undefined;

            let slotSelections: string[] | undefined;
            if (hasSlots) {
                const count = rd1();
                const card  = Mk4Data.cardById.get('c' + cardNum);
                slotSelections = [];
                for (let i = 0; i < count; i++) {
                    const idx = rd1();
                    const hp  = card?.hardPoints?.[i];
                    slotSelections.push(idx === 0xFF ? '' : (hp?.options[idx]?.name ?? ''));
                }
            }

            entries.push({
                cardId: 'c' + cardNum,
                ...(battleGroupLeader !== undefined && { battleGroupLeader }),
                ...(slotSelections    !== undefined && { slotSelections }),
            });
        }

        return { armyId, leaderId, entries, commandCards, pointLimit };
    } catch {
        return null;
    }
}
