export interface HardPointOption {
    name: string;
    pointCost: number;
}

export interface HardPoint {
    label: string;
    options: HardPointOption[];
}

export interface Mk4Card {
    id: string;
    name: string;
    faction: string;
    factionId: string;
    cardType: string;
    pointCost: number;
    fieldAllowance: string;  // '1','2','C','' etc.
    armyIds: string[];       // empty = faction-wide; populated = specific armies only
    keywordsIds: string[];   // keyword IDs matching army includedKeywordsIds
    isUnlimited: boolean;
    pairedWith?: string[];           // ids of companion models (auto-join when primary is added)
    companionOf?: string;            // id of primary model this accompanies
    pairSeparateInArmies?: string[]; // army ids where companions are NOT auto-joined
    canAttachTo?: string[];          // for Command Attachments: unit card IDs this can attach to
    battleGroupSize?: 'unlimited' | 'single'; // solo/unit that controls its own battle group
    battleGroupRequired?: boolean;   // must have ≥1 model in battle group for a valid list
    battleGroupCardIds?: string[];   // restrict pool to specific cards (Beast Mistress, Regna)
    battleGroupCardTypes?: string[]; // restrict pool to card types (e.g. ['Warjack'])
    splitProfile?: boolean;
    hardPoints?: HardPoint[];        // modular cohorts and units with weapon options
}

export interface Mk4Army {
    id: string;
    name: string;
    factionId: string;
    isUnlimited: boolean;
    includedCardIds: string[];
    excludedCardIds: string[];
    includedKeywordsIds: string[];
    includedKeywords: string[];     // resolved keyword names
    commandCardLimit?: number;      // defaults to 5 if absent
}

export interface CommandCard {
    id: string;
    name: string;
    pointCost: number;
    universal?: boolean;   // available to all armies
    armyIds?: string[];    // armies with access beyond universal set
}

export const LEADER_TYPES    = new Set(['Warcaster', 'Warlock', 'Infernal Master']);
export const COHORT_TYPES    = new Set(['Warjack', 'Warbeast', 'Horror', 'Monstrosity']);
export const SCENARIO_TYPES  = new Set(['Terrain', 'Objective']);

const TRUE_MERC_NAMES = new Set(['Magnus the Unstoppable', 'Carver Ultimus', 'Exulon Nostilla', 'Constance Blaize, Radiance of Morrow']);

export class Mk4Data {
    static cards: Mk4Card[]                         = [];
    static armies: Mk4Army[]                        = [];
    static keywords: Record<string, string>         = {};
    static commandCards: CommandCard[]              = [];

    static cardById           = new Map<string, Mk4Card>();
    static armyById           = new Map<string, Mk4Army>();
    static armiesByFactionId  = new Map<string, Mk4Army[]>();
    static commandCardById    = new Map<string, CommandCard>();
    static trueMercIds        = new Set<string>();
    static generalFactionId   = '';

    static async load(): Promise<void> {
        const [cardsData, armiesData, keywordsData, cmdData] = await Promise.all([
            fetch('/data/mkiv_cards.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} loading cards`); return r.json(); }),
            fetch('/data/mkiv_armies.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} loading armies`); return r.json(); }),
            fetch('/data/mkiv_keywords.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} loading keywords`); return r.json(); }),
            fetch('/data/mkiv_commandcards.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} loading command cards`); return r.json(); }),
        ]);

        this.cards        = cardsData;
        this.armies       = armiesData;
        this.keywords     = keywordsData;
        this.commandCards = cmdData;

        this.cardById       = new Map(this.cards.map(c  => [c.id,  c]));
        this.armyById       = new Map(this.armies.map(a => [a.id,  a]));
        this.commandCardById = new Map(this.commandCards.map(c => [c.id, c]));

        for (const army of this.armies) {
            const list = this.armiesByFactionId.get(army.factionId) ?? [];
            list.push(army);
            this.armiesByFactionId.set(army.factionId, list);
        }

        // Identify general/universal cards (defenses, objectives, etc.)
        const generalCard = this.cards.find(c => c.faction === 'General');
        this.generalFactionId = generalCard?.factionId ?? '';

        // Identify true merc solo IDs
        this.trueMercIds.clear();
        for (const card of this.cards) {
            if (TRUE_MERC_NAMES.has(card.name) && card.cardType === 'Solo') {
                this.trueMercIds.add(card.id);
            }
        }
    }

    // Unique factions that have at least one army, sorted by name.
    static factions(): { id: string; name: string }[] {
        const names = new Map<string, string>();
        for (const card of this.cards) {
            if (card.factionId && !names.has(card.factionId)) {
                names.set(card.factionId, card.faction);
            }
        }
        const withArmies = new Set(this.armies.map(a => a.factionId));
        return Array.from(names.entries())
            .filter(([id]) => withArmies.has(id))
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    // All cards available to an army. Companions are excluded here — they
    // auto-join when their paired primary model is added.
    static availableCards(army: Mk4Army): Mk4Card[] {
        const excluded     = new Set(army.excludedCardIds);
        const explicit     = new Set(army.includedCardIds);
        const armyKeywords = new Set(army.includedKeywordsIds);
        const hasKeywords  = armyKeywords.size > 0;

        return this.cards.filter(card => {
            if (excluded.has(card.id))            return false;
            if (card.companionOf)                 return false;
            if (SCENARIO_TYPES.has(card.cardType)) return false;

            if (explicit.has(card.id)) return true;  // cross-faction cadres/mercs
            if (this.generalFactionId && card.factionId === this.generalFactionId) return true;

            if (card.factionId !== army.factionId) return false;

            // Keyword filter: army specifies which keyword groups are included
            if (hasKeywords) {
                return (card.keywordsIds ?? []).some(kId => armyKeywords.has(kId));
            }
            return true;  // army with no keyword filter (e.g., Infernals)
        });
    }

    static availableLeaders(army: Mk4Army): Mk4Card[] {
        return this.availableCards(army).filter(c => LEADER_TYPES.has(c.cardType));
    }

    static availableNonLeaders(army: Mk4Army): Mk4Card[] {
        return this.availableCards(army).filter(c => !LEADER_TYPES.has(c.cardType));
    }

    // Returns all companion cards for a model in the given army.
    // Returns empty array if the pair is split in that army (e.g. Carver/Boar in Thornfall).
    static companionsFor(card: Mk4Card, armyId: string): Mk4Card[] {
        if (!card.pairedWith?.length) return [];
        if ((card.pairSeparateInArmies ?? []).indexOf(armyId) !== -1) return [];
        return card.pairedWith
            .map(id => this.cardById.get(id))
            .filter((c): c is Mk4Card => c !== undefined);
    }

    // Cards that can be added to a specific battle group leader's battle group.
    static availableBattleGroupCards(bgLeader: Mk4Card, army: Mk4Army): Mk4Card[] {
        if (bgLeader.battleGroupCardIds?.length) {
            return bgLeader.battleGroupCardIds
                .map(id => this.cardById.get(id))
                .filter((c): c is Mk4Card => c !== undefined);
        }
        const pool = this.availableCards(army).filter(c => COHORT_TYPES.has(c.cardType));
        if (bgLeader.battleGroupCardTypes?.length) {
            return pool.filter(c => bgLeader.battleGroupCardTypes!.includes(c.cardType));
        }
        return pool;
    }

    static availableCommandCards(army: Mk4Army): CommandCard[] {
        return this.commandCards.filter(c =>
            c.universal || (c.armyIds ?? []).includes(army.id)
        );
    }

    static commandCardLimit(army: Mk4Army): number {
        return army.commandCardLimit ?? 5;
    }

    static isTrueMerc(cardId: string): boolean {
        return this.trueMercIds.has(cardId);
    }

    // Parsed field allowance: 'C' = character, 'U' = unlimited/N/A, number otherwise.
    static fieldAllowance(card: Mk4Card): number | 'C' | 'U' {
        if (card.fieldAllowance === 'C') return 'C';
        if (!card.fieldAllowance)        return 'U';
        const n = parseInt(card.fieldAllowance, 10);
        return isNaN(n) ? 'U' : n;
    }

    static pointCost(card: Mk4Card): number {
        return card.pointCost;
    }

    // True if the card has at least one slot with 2+ options (real player choice required).
    static isModular(card: Mk4Card): boolean {
        return (card.hardPoints?.some(hp => hp.options.length > 1)) ?? false;
    }

    // Cheapest possible cost (sum of min option per slot). Used for picker availability check.
    static minCost(card: Mk4Card): number {
        if (!card.hardPoints) return card.pointCost;
        return card.hardPoints.reduce(
            (sum, hp) => sum + Math.min(...hp.options.map(o => o.pointCost)),
            card.pointCost
        );
    }

    // Highest possible cost (sum of max option per slot).
    static maxCost(card: Mk4Card): number {
        if (!card.hardPoints) return card.pointCost;
        return card.hardPoints.reduce(
            (sum, hp) => sum + Math.max(...hp.options.map(o => o.pointCost)),
            card.pointCost
        );
    }

    // Cost with specific slot selections (parallel array to card.hardPoints).
    static configuredCost(card: Mk4Card, selections: string[]): number {
        if (!card.hardPoints) return card.pointCost;
        let cost = card.pointCost;
        for (let i = 0; i < card.hardPoints.length; i++) {
            const opt = card.hardPoints[i].options.find(o => o.name === selections[i]);
            if (opt) cost += opt.pointCost;
        }
        return cost;
    }
}
