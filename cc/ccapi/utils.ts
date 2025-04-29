import { Entry } from './entry';

const warnedEntries = new Set<number>();

export function safeGetCostArray(e: Entry, context: string = "unknown"): number[] | null {
    if (!e || !Array.isArray(e.C) || e.C.length !== 1) {
        if (e && typeof e.id === 'number' && !warnedEntries.has(e.id)) {
            console.warn(`Warning [${context}]: Entry id=${e.id} missing or invalid "C" array.`);
            warnedEntries.add(e.id);
        } else if (!e || typeof e.id !== 'number') {
            console.warn(`Warning [${context}]: Bad or unidentified Entry:`, e);
        }
        return null;
    }
    return e.C;
}
