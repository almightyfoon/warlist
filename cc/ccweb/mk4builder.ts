import { Flow } from './widgets';
import { Mk4Data, Mk4Army, Mk4Card, LEADER_TYPES, COHORT_TYPES } from '../ccapi/mk4data';
import {
    Mk4List, ListEntry, createList, addCard, removeEntry, setLeader,
    pointsSpent, pointsRemaining, canAdd,
    groupedEntries, sortedTypeKeys, TYPE_ORDER, serialise, deserialise,
    buildAttachmentAssignments, missingRequiredBattleGroups,
    toggleCommandCard,
} from '../ccapi/mk4list';
import { HardPoint } from '../ccapi/mk4data';
import { listToText, encodeList } from '../ccapi/mk4export';

// ---------------------------------------------------------------------------
// Tiny DOM helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K, cls?: string, text?: string
): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (text) e.textContent = text;
    return e;
}

function sel(options: { value: string; label: string }[], cls: string): HTMLSelectElement {
    const s = el('select', cls);
    const placeholder = el('option');
    placeholder.value = '';
    placeholder.textContent = '— select —';
    s.appendChild(placeholder);
    for (const opt of options) {
        const o = el('option');
        o.value       = opt.value;
        o.textContent = opt.label;
        s.appendChild(o);
    }
    return s;
}

// Picker display order matches list TYPE_ORDER, leaders first
function pickerTypeOrder(cardType: string): number {
    if (LEADER_TYPES.has(cardType)) return 0;
    return TYPE_ORDER[cardType] ?? 98;
}

// ---------------------------------------------------------------------------
// BuilderFlow
// ---------------------------------------------------------------------------

type SavedListEntry = { offset: number; description: string; listdata: string };

export class BuilderFlow extends Flow {

    private list: Mk4List | null = null;
    private saveCallback: ((desc: string, data: string, onResult?: (msg: string) => void) => void) | null = null;
    private getSavedListsCallback: (() => SavedListEntry[]) | null = null;
    private deleteListCallback:    ((offset: number, onSuccess?: () => void) => void) | null = null;
    private savedListsContainer:   HTMLDivElement | null = null;

    // Panels (LEFT = picker, RIGHT = setup + list)
    private pickerPanel:  HTMLDivElement;
    private listPanel:    HTMLDivElement;

    // Setup widgets (shown before a list is created)
    private setupDiv:     HTMLDivElement;
    private factionSel:   HTMLSelectElement;
    private armySel:      HTMLSelectElement;

    // List view (shown once army is chosen)
    private listDiv:      HTMLDivElement;

    // Picker internals
    private pickerDiv:    HTMLDivElement;
    private searchInput:  HTMLInputElement;
    private pickerList:   HTMLDivElement;
    private currentArmy:  Mk4Army | null = null;
    private pickerCards:  Mk4Card[] = [];

    // Collapsed section state (persist across re-renders)
    private collapsedPickerTypes = new Set<string>();
    private collapsedListTypes   = new Set<string>();

    // When non-null, picker is scoped to this card ID's battle group.
    private bgLeaderCardId: string | null = null;
    private bgLeaderBanner: HTMLDivElement | null = null;
    private bgBannerText:   HTMLSpanElement | null = null;

    // When non-null, picker shows slot-selection config for this card.
    private configCard:       Mk4Card | null = null;
    private configSelections: string[]       = [];   // parallel to configCard.hardPoints
    private configBgLeader:   string | undefined = undefined; // forwarded to addCard
    private configEntryIdx:   number | null  = null; // index of entry being reconfigured

    private onBack: (() => void) | null = null;

    constructor(saveCallback?: (desc: string, data: string, onResult?: (msg: string) => void) => void,
                onBack?: () => void,
                getSavedListsCallback?: () => SavedListEntry[],
                deleteListCallback?: (offset: number, onSuccess?: () => void) => void) {
        super('mk4builder');
        this.saveCallback          = saveCallback          ?? null;
        this.onBack                = onBack                ?? null;
        this.getSavedListsCallback = getSavedListsCallback ?? null;
        this.deleteListCallback    = deleteListCallback    ?? null;
        this.buildSkeleton();
    }

    // Load a previously-serialised list, bypassing the setup screen.
    public loadList(listdata: string): void {
        const list = deserialise(listdata);
        if (!list) return;
        const army = Mk4Data.armyById.get(list.armyId);
        if (!army) return;
        this.currentArmy = army;
        this.list        = list;
        this.showListView();
    }

    private buildSkeleton(): void {
        // Don't touch this.content.className — Flow set it to
        // 'conflictchamber uiflow mk4builder'. Create an inner wrapper instead
        // so that '.mk4builder .mk4builder-inner { display:flex }' applies.
        const inner = el('div', 'mk4builder-inner');
        this.content.appendChild(inner);

        // ---- Left panel (picker) -------------------------------------------
        this.pickerPanel = el('div', 'mk4-left');
        this.pickerDiv   = el('div', 'mk4-picker');
        this.pickerPanel.appendChild(this.pickerDiv);

        // ---- Right panel (back btn + setup + list) -------------------------
        this.listPanel = el('div', 'mk4-right');

        const backBtn = el('button', 'mk4-back-btn', '← Back');
        backBtn.onclick = () => {
            // Call callback first (immediate UI update), then fix the URL.
            if (this.onBack) this.onBack();
            window.history.back();
        };
        this.listPanel.appendChild(backBtn);

        this.setupDiv = el('div', 'mk4-setup');
        this.listPanel.appendChild(this.setupDiv);

        this.listDiv = el('div', 'mk4-list');
        this.listDiv.style.display = 'none';
        this.listPanel.appendChild(this.listDiv);

        this.pickerPanel.style.display = 'none';

        inner.appendChild(this.pickerPanel);
        inner.appendChild(this.listPanel);

        this.buildSetup();
        this.buildPickerShell();
    }

    // -----------------------------------------------------------------------
    // Setup panel — faction → army → point limit → start
    // -----------------------------------------------------------------------

    private buildSetup(): void {
        this.setupDiv.innerHTML = '';

        const title = el('div', 'mk4-section-title', 'New Mk4 List');
        this.setupDiv.appendChild(title);

        const factions = Mk4Data.factions();
        this.factionSel = sel(
            factions.map(f => ({ value: f.id, label: f.name })),
            'mk4-select'
        );
        this.setupDiv.appendChild(el('div', 'mk4-label', 'Faction'));
        this.setupDiv.appendChild(this.factionSel);

        this.armySel = sel([], 'mk4-select');
        this.armySel.disabled = true;
        this.setupDiv.appendChild(el('div', 'mk4-label', 'Army'));
        this.setupDiv.appendChild(this.armySel);

        const limitsDiv = el('div', 'mk4-limits');
        this.setupDiv.appendChild(el('div', 'mk4-label', 'Point limit'));
        this.setupDiv.appendChild(limitsDiv);

        let chosenLimit = 100;
        for (const pts of [30, 50, 75, 100]) {
            const btn = el('button', 'mk4-limit-btn' + (pts === 100 ? ' active' : ''), `${pts} pts`);
            btn.onclick = () => {
                chosenLimit = pts;
                limitsDiv.querySelectorAll('.mk4-limit-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            limitsDiv.appendChild(btn);
        }

        const startBtn = el('button', 'mk4-start-btn', 'Start Building');
        startBtn.disabled = true;
        this.setupDiv.appendChild(startBtn);

        this.factionSel.onchange = () => {
            const fid = this.factionSel.value;
            const armies = (Mk4Data.armiesByFactionId.get(fid) ?? [])
                .sort((a, b) => a.name.localeCompare(b.name));

            while (this.armySel.options.length > 1) this.armySel.remove(1);
            for (const army of armies) {
                const o = el('option');
                o.value       = army.id;
                o.textContent = army.name;
                this.armySel.appendChild(o);
            }

            // Auto-select if only one army
            if (armies.length === 1) {
                this.armySel.value    = armies[0].id;
                this.armySel.disabled = false;
                startBtn.disabled     = false;
            } else {
                this.armySel.disabled = armies.length === 0;
                this.armySel.value    = '';
                startBtn.disabled     = true;
            }
        };

        this.armySel.onchange = () => {
            startBtn.disabled = !this.armySel.value;
        };

        startBtn.onclick = () => {
            const army = Mk4Data.armyById.get(this.armySel.value);
            if (!army) return;
            this.currentArmy = army;
            this.list = createList(army.id, chosenLimit);
            this.showListView();
        };

        // Saved lists section
        if (this.getSavedListsCallback) {
            this.setupDiv.appendChild(el('div', 'mk4-setup-sep'));
            this.setupDiv.appendChild(el('div', 'mk4-section-title', 'My Saved Lists'));
            this.savedListsContainer = el('div', '');
            this.setupDiv.appendChild(this.savedListsContainer);
            this.renderSavedLists();

            // Refresh after sign-in if not currently signed in
            if (!(<any>window)._idToken) {
                if (!(<any>window)._loginCallback) (<any>window)._loginCallback = [];
                (<any>window)._loginCallback.push(() => this.renderSavedLists());
            }
        }
    }

    private renderSavedLists(): void {
        if (!this.savedListsContainer || !this.getSavedListsCallback) return;
        this.savedListsContainer.innerHTML = '';

        if (!(<any>window)._idToken) {
            this.savedListsContainer.appendChild(
                el('div', 'mk4-empty-slot', 'Sign in (☰ menu) to load your saved lists')
            );
            return;
        }

        const lists = this.getSavedListsCallback();
        if (lists.length === 0) {
            this.savedListsContainer.appendChild(
                el('div', 'mk4-empty-slot', 'No saved lists yet')
            );
            return;
        }

        for (const meta of lists) {
            const row = el('div', 'mk4-saved-list-row');
            row.appendChild(el('span', 'mk4-saved-list-name', meta.description));
            const loadBtn = el('button', 'mk4-list-load-btn', 'Load');
            loadBtn.onclick = () => this.loadList(meta.listdata);
            const delBtn = el('button', 'mk4-entry-remove', '✕');
            delBtn.onclick = () => {
                this.deleteListCallback?.(meta.offset, () => this.renderSavedLists());
            };
            row.appendChild(loadBtn);
            row.appendChild(delBtn);
            this.savedListsContainer!.appendChild(row);
        }
    }

    // -----------------------------------------------------------------------
    // List view
    // -----------------------------------------------------------------------

    private showListView(): void {
        this.setupDiv.style.display      = 'none';
        this.listDiv.style.display       = '';
        this.pickerPanel.style.display   = '';
        try { this.buildPicker(); } catch (e) { console.error('buildPicker failed:', e); }
        this.renderList();
    }

    private renderList(): void {
        this.listDiv.innerHTML = '';
        if (!this.list || !this.currentArmy) return;

        const army = this.currentArmy;
        const list = this.list;
        let listNameInput: HTMLInputElement | null = null;

        // Header
        const header = el('div', 'mk4-list-header');
        header.appendChild(el('span', 'mk4-list-army', army.name));
        this.listDiv.appendChild(header);

        // Point bar
        const spent     = pointsSpent(list);
        const remaining = pointsRemaining(list);
        const bar       = el('div', 'mk4-pointbar');
        const fill      = el('div', 'mk4-pointbar-fill');
        fill.style.width = `${Math.min(100, (spent / list.pointLimit) * 100)}%`;
        if (spent > list.pointLimit) fill.classList.add('over');
        bar.appendChild(fill);
        this.listDiv.appendChild(bar);
        this.listDiv.appendChild(el('div', 'mk4-pointbar-label',
            `${spent} / ${list.pointLimit} pts  (${remaining >= 0 ? remaining + ' remaining' : Math.abs(remaining) + ' over'})`));

        // Build jr battle group map (jr card ID → cohort entries)
        const jrBgMap  = new Map<string, ListEntry[]>();
        const jrBgSet  = new Set<ListEntry>();
        for (const entry of list.entries) {
            if (!entry.battleGroupLeader) continue;
            const existing = jrBgMap.get(entry.battleGroupLeader) ?? [];
            jrBgMap.set(entry.battleGroupLeader, [...existing, entry]);
            jrBgSet.add(entry);
        }

        // Main leader's BG cohorts (battleGroupLeader absent = main leader)
        const mainBgEntries: ListEntry[] = [];
        const mainBgSet     = new Set<ListEntry>();
        if (list.leaderId) {
            for (const entry of list.entries) {
                if (entry.battleGroupLeader !== undefined) continue;
                const c = Mk4Data.cardById.get(entry.cardId);
                if (c && COHORT_TYPES.has(c.cardType)) {
                    mainBgEntries.push(entry);
                    mainBgSet.add(entry);
                }
            }
        }

        // Leader section
        const leaderSection = this.makeListSection('Leader');
        if (list.leaderId) {
            const leaderCard = Mk4Data.cardById.get(list.leaderId);
            const row = el('div', 'mk4-entry-row');
            row.appendChild(el('span', 'mk4-entry-name', leaderCard ? leaderCard.name : list.leaderId));
            row.appendChild(el('span', 'mk4-entry-type', leaderCard ? leaderCard.cardType : ''));
            row.appendChild(el('span', 'mk4-entry-cost', 'Free'));
            const changeBtn = el('button', 'mk4-entry-remove', '✕');
            changeBtn.title = 'Remove leader';
            changeBtn.onclick = () => {
                this.list = setLeader(this.list!, null);
                this.renderList();
                this.filterPicker();
            };
            row.appendChild(changeBtn);
            leaderSection.body.appendChild(row);
            if (leaderCard?.splitProfile) {
                leaderSection.body.appendChild(
                    el('div', 'mk4-note', 'Split-profile — two playable forms on one card')
                );
            }
            for (const cohortEntry of mainBgEntries) {
                this.appendEntryRow(leaderSection.body, cohortEntry, list, true);
            }
            const addBgBtn = el('button', 'mk4-bg-btn mk4-bg-btn-add', '📎 Battle Group');
            addBgBtn.onclick = () => this.enterBgMode(list.leaderId!);
            leaderSection.body.appendChild(addBgBtn);
        } else {
            leaderSection.body.appendChild(
                el('div', 'mk4-empty-slot', 'No leader — choose from the picker ←')
            );
        }
        this.listDiv.appendChild(leaderSection.section);

        // Build unit → attachment map using the same greedy algorithm as canAdd
        const attachMap  = buildAttachmentAssignments(list);
        const inlineAttach = new Set<ListEntry>(
            [...attachMap.values()].flat()
        );

        // Non-leader entries grouped by type
        const groups = groupedEntries(list);
        for (const type of sortedTypeKeys(groups)) {
            const entries = groups.get(type)!;

            // Attachments inline under unit; jr-BG and main-BG cohorts under their leader
            const isAttachType = type === 'Command Attachment' || type === 'Weapon Attachment';
            const standalone = entries.filter(e =>
                !(isAttachType && inlineAttach.has(e)) && !jrBgSet.has(e) && !mainBgSet.has(e)
            );
            if (standalone.length === 0) continue;

            const sec = this.makeListSection(type);
            for (const entry of standalone) {
                const entryCard = Mk4Data.cardById.get(entry.cardId);
                this.appendEntryRow(sec.body, entry, list);

                // Attachments indented under units
                if (type === 'Unit') {
                    for (const attachEntry of attachMap.get(entry) ?? []) {
                        this.appendEntryRow(sec.body, attachEntry, list, true);
                    }
                }

                // BG-capable solos/units: BG button + assigned cohorts
                if (entryCard?.battleGroupSize) {
                    const bgCohorts = jrBgMap.get(entry.cardId) ?? [];
                    for (const cohortEntry of bgCohorts) {
                        this.appendEntryRow(sec.body, cohortEntry, list, true);
                    }
                    const addBgBtn = el('button', 'mk4-bg-btn mk4-bg-btn-add', '📎 Battle Group');
                    addBgBtn.onclick = () => this.enterBgMode(entry.cardId);
                    sec.body.appendChild(addBgBtn);
                }
            }
            this.listDiv.appendChild(sec.section);
        }

        // Command Cards section
        const cmdLimit = Mk4Data.commandCardLimit(army);
        const cmdSection = this.makeListSection('Command Cards');
        cmdSection.body.appendChild(el('div', 'mk4-note',
            `${list.commandCards.length} / ${cmdLimit} selected`));
        for (const cmdId of list.commandCards) {
            const cmd = Mk4Data.commandCardById.get(cmdId);
            const cmdRow = el('div', 'mk4-entry-row');
            cmdRow.appendChild(el('span', 'mk4-entry-name', cmd?.name ?? cmdId));
            const cmdCost = cmd?.pointCost ?? 0;
            cmdRow.appendChild(el('span', 'mk4-entry-cost', cmdCost > 0 ? `${cmdCost} pts` : 'Free'));
            const rmBtn = el('button', 'mk4-entry-remove', '✕');
            rmBtn.onclick = () => {
                this.list = toggleCommandCard(this.list!, cmdId);
                this.renderList();
                this.filterPicker();
            };
            cmdRow.appendChild(rmBtn);
            cmdSection.body.appendChild(cmdRow);
        }
        this.listDiv.appendChild(cmdSection.section);

        // Validation warnings
        const missingBg = missingRequiredBattleGroups(list);
        const overLimit  = spent > list.pointLimit;
        const warnings: string[] = [];
        if (overLimit)        warnings.push(`List is ${spent - list.pointLimit} pts over the limit`);
        for (const cardId of missingBg) {
            const card = Mk4Data.cardById.get(cardId);
            warnings.push(`${card?.name ?? cardId} has no battle group`);
        }
        if (warnings.length > 0) {
            const warnDiv = el('div', 'mk4-list-warnings');
            for (const w of warnings) {
                warnDiv.appendChild(el('div', 'mk4-list-warning', '⚠ ' + w));
            }
            this.listDiv.appendChild(warnDiv);
        }

        // Save button
        if (this.saveCallback) {
            const saveRow = el('div', 'mk4-save-row');
            const nameInput = el('input', 'mk4-list-name') as HTMLInputElement;
            nameInput.placeholder = 'List name…';
            nameInput.type = 'text';
            listNameInput = nameInput;
            const saveBtn = el('button', 'mk4-save-btn', 'Save List');
            const statusDiv = el('div', 'mk4-save-status');
            saveBtn.onclick = () => {
                const desc = nameInput.value.trim() || `${army.name} list`;
                statusDiv.textContent = '';
                statusDiv.className = 'mk4-save-status';
                const warnMsg = warnings.length > 0
                    ? `⚠ Saved with warnings: ${warnings.join('; ')} — `
                    : '';
                this.saveCallback!(desc, serialise(this.list!), (msg) => {
                    statusDiv.textContent = warnMsg + msg;
                    if (warnMsg) statusDiv.className = 'mk4-save-status mk4-save-warning';
                });
            };
            saveRow.appendChild(nameInput);
            saveRow.appendChild(saveBtn);
            saveRow.appendChild(statusDiv);
            this.listDiv.appendChild(saveRow);
        }

        // Export buttons
        const exportRow = el('div', 'mk4-export-row');

        const copyTextBtn = el('button', 'mk4-export-btn', '📋 Copy Text');
        copyTextBtn.onclick = () => {
            const exportName = listNameInput?.value.trim()
                || (list.leaderId ? Mk4Data.cardById.get(list.leaderId)?.name : undefined)
                || army.name;
            navigator.clipboard.writeText(listToText(this.list!, exportName)).then(() => {
                copyTextBtn.textContent = 'Copied!';
                setTimeout(() => { copyTextBtn.textContent = '📋 Copy Text'; }, 2000);
            });
        };

        const copyLinkBtn = el('button', 'mk4-export-btn', '🔗 Copy Link');
        copyLinkBtn.onclick = () => {
            const url = window.location.origin + window.location.pathname
                + '?list=' + encodeList(this.list!);
            navigator.clipboard.writeText(url).then(() => {
                copyLinkBtn.textContent = 'Copied!';
                setTimeout(() => { copyLinkBtn.textContent = '🔗 Copy Link'; }, 2000);
            });
        };

        exportRow.appendChild(copyTextBtn);
        exportRow.appendChild(copyLinkBtn);
        this.listDiv.appendChild(exportRow);
    }

    private appendEntryRow(parent: HTMLElement, entry: ListEntry, list: Mk4List,
                           indent = false): void {
        const card       = Mk4Data.cardById.get(entry.cardId);
        const companions = (entry.companionCardIds ?? [])
            .map(id => Mk4Data.cardById.get(id))
            .filter((c): c is NonNullable<typeof c> => c !== undefined);

        const companionCost = companions.reduce((s, c) => s + Mk4Data.pointCost(c), 0);
        const cardCost = card
            ? (entry.slotSelections
                ? Mk4Data.configuredCost(card, entry.slotSelections)
                : Mk4Data.pointCost(card))
            : 0;
        const cost = cardCost + companionCost;

        const rowCls = 'mk4-entry-row' + (indent ? ' mk4-entry-indented' : '');
        const row = el('div', rowCls);
        const nameWrap = el('span', 'mk4-entry-name');
        nameWrap.textContent = card?.name ?? entry.cardId;
        row.appendChild(nameWrap);
        row.appendChild(el('span', 'mk4-entry-cost', cost > 0 ? `${cost} pts` : 'Free'));

        // ⚙️ reconfigure button for modular cards
        if (card && Mk4Data.isModular(card)) {
            const gearBtn = el('button', 'mk4-bg-btn', '⚙️');
            gearBtn.title = 'Reconfigure options';
            gearBtn.onclick = () => {
                this.enterConfigMode(card, entry.battleGroupLeader,
                    entry.slotSelections, list.entries.indexOf(entry));
            };
            row.appendChild(gearBtn);
        }

        const realIdx = list.entries.indexOf(entry);
        const removeBtn = el('button', 'mk4-entry-remove', '✕');
        removeBtn.onclick = () => {
            this.list = removeEntry(this.list!, realIdx);
            this.renderList();
            this.filterPicker();
        };
        row.appendChild(removeBtn);
        parent.appendChild(row);

        // Slot selections shown as indented sub-rows
        if (card && entry.slotSelections) {
            const slots = card.hardPoints ?? [];
            for (let i = 0; i < slots.length; i++) {
                const chosen = entry.slotSelections[i];
                if (!chosen) continue;
                const opt = slots[i].options.find(o => o.name === chosen);
                const subRow = el('div', 'mk4-entry-row mk4-entry-indented mk4-entry-companion');
                subRow.appendChild(el('span', 'mk4-entry-name', `${slots[i].label}: ${chosen}`));
                const optCost = opt?.pointCost ?? 0;
                subRow.appendChild(el('span', 'mk4-entry-cost', optCost > 0 ? `${optCost} pts` : ''));
                parent.appendChild(subRow);
            }
        }

        // Companions as indented sub-rows
        for (const comp of companions) {
            const subRow = el('div', 'mk4-entry-row mk4-entry-indented mk4-entry-companion');
            subRow.appendChild(el('span', 'mk4-entry-name', comp.name));
            subRow.appendChild(el('span', 'mk4-entry-cost', 'Free'));
            parent.appendChild(subRow);
        }
    }

    // Creates a collapsible list section. Returns {section, body}.
    private makeListSection(type: string): { section: HTMLDivElement; body: HTMLDivElement } {
        const section = el('div', 'mk4-list-section');
        const header  = el('div', 'mk4-type-header mk4-collapsible-header');
        const toggle  = el('span', 'mk4-collapse-toggle',
            this.collapsedListTypes.has(type) ? '▸ ' : '▾ ');
        header.appendChild(toggle);
        header.appendChild(el('span', '', type));
        section.appendChild(header);

        const body = el('div', 'mk4-section-body');
        if (this.collapsedListTypes.has(type)) body.style.display = 'none';
        section.appendChild(body);

        header.onclick = () => {
            if (this.collapsedListTypes.has(type)) {
                this.collapsedListTypes.delete(type);
                body.style.display = '';
                toggle.textContent = '▾ ';
            } else {
                this.collapsedListTypes.add(type);
                body.style.display = 'none';
                toggle.textContent = '▸ ';
            }
        };

        return { section, body };
    }

    // -----------------------------------------------------------------------
    // Picker — left panel
    // -----------------------------------------------------------------------

    // Build the picker shell (search box + list container). Called once.
    private buildPickerShell(): void {
        this.pickerDiv.innerHTML = '';

        // BG mode banner (hidden by default)
        this.bgLeaderBanner = el('div', 'mk4-bg-banner');
        this.bgLeaderBanner.style.display = 'none';
        const exitBtn = el('button', 'mk4-bg-exit', '✕ Back to full list');
        exitBtn.onclick = () => this.exitBgMode();
        this.bgBannerText = el('span', 'mk4-bg-banner-text', '');
        this.bgLeaderBanner.appendChild(exitBtn);
        this.bgLeaderBanner.appendChild(this.bgBannerText);
        this.pickerDiv.appendChild(this.bgLeaderBanner);

        const searchRow = el('div', 'mk4-search-row');
        this.searchInput = el('input', 'mk4-search') as HTMLInputElement;
        this.searchInput.placeholder = 'Search models…';
        this.searchInput.type = 'search';
        this.searchInput.oninput = () => this.filterPicker();
        searchRow.appendChild(this.searchInput);
        this.pickerDiv.appendChild(searchRow);

        this.pickerList = el('div', 'mk4-picker-list');
        this.pickerDiv.appendChild(this.pickerList);
    }

    private enterBgMode(cardId: string): void {
        this.bgLeaderCardId = cardId;
        for (const type of COHORT_TYPES) this.collapsedPickerTypes.delete(type);
        const name = Mk4Data.cardById.get(cardId)?.name ?? cardId;
        if (this.bgBannerText)   this.bgBannerText.textContent = `Battle group: ${name}`;
        if (this.bgLeaderBanner) this.bgLeaderBanner.style.display = '';
        if (this.searchInput)    this.searchInput.value = '';
        this.filterPicker();
    }

    private exitBgMode(): void {
        this.bgLeaderCardId = null;
        if (this.bgLeaderBanner) this.bgLeaderBanner.style.display = 'none';
        if (this.searchInput) this.searchInput.value = '';
        this.filterPicker();
    }

    private enterConfigMode(card: Mk4Card, bgLeader?: string,
                            initial?: string[], entryIdx?: number): void {
        this.configCard       = card;
        this.configSelections = initial
            ? [...initial]
            : new Array(card.hardPoints?.length ?? 0).fill('');
        this.configBgLeader   = bgLeader;
        this.configEntryIdx   = entryIdx ?? null;
        this.renderConfigPanel();
    }

    private exitConfigMode(): void {
        this.configCard       = null;
        this.configSelections = [];
        this.configBgLeader   = undefined;
        this.configEntryIdx   = null;
        this.filterPicker();
    }

    private renderConfigPanel(): void {
        if (!this.pickerList || !this.configCard) return;
        const card = this.configCard;
        this.pickerList.innerHTML = '';

        const header = el('div', 'mk4-config-header');
        header.appendChild(el('span', 'mk4-config-title', `Configure: ${card.name}`));
        const cancelBtn = el('button', 'mk4-bg-exit', '✕ Cancel');
        cancelBtn.onclick = () => this.exitConfigMode();
        header.appendChild(cancelBtn);
        this.pickerList.appendChild(header);

        const slots = card.hardPoints ?? [];
        slots.forEach((slot, i) => {
            const group = el('div', 'mk4-config-group');
            group.appendChild(el('div', 'mk4-config-slot-label', slot.label));
            for (const opt of slot.options) {
                const row = el('div', 'mk4-config-option');
                const selected = this.configSelections[i] === opt.name;
                if (selected) row.classList.add('mk4-config-selected');
                const nameSpan = el('span', 'mk4-config-opt-name', opt.name);
                row.appendChild(nameSpan);
                if (opt.pointCost > 0) {
                    row.appendChild(el('span', 'mk4-config-opt-cost', `${opt.pointCost} pts`));
                }
                row.onclick = () => {
                    this.configSelections[i] = opt.name;
                    this.renderConfigPanel();
                };
                group.appendChild(row);
            }
            this.pickerList!.appendChild(group);
        });

        // Show Add button only when all slots are filled
        const allFilled = this.configSelections.every(s => s !== '');
        if (allFilled && this.list) {
            const cost = Mk4Data.configuredCost(card, this.configSelections);
            const addBtn = el('button', 'mk4-config-add',
                `Add to List (${cost > 0 ? cost + ' pts' : 'Free'})`);
            addBtn.onclick = () => {
                const base = this.configEntryIdx !== null
                    ? removeEntry(this.list!, this.configEntryIdx)
                    : this.list!;
                const next = addCard(base, card.id, this.configBgLeader, [...this.configSelections]);
                if (next === base) return; // canAdd failed — don't touch the list
                this.list = next;
                this.exitConfigMode();
                this.renderList();
            };
            this.pickerList.appendChild(addBtn);
        }
    }

    // Build picker cards list for the current army. Called when army is chosen.
    private buildPicker(): void {
        if (!this.currentArmy) return;

        const all = Mk4Data.availableCards(this.currentArmy);
        this.pickerCards = all.sort((a, b) =>
            (pickerTypeOrder(a.cardType) - pickerTypeOrder(b.cardType)) ||
            a.name.localeCompare(b.name)
        );

        if (!this.pickerList) this.buildPickerShell();
        this.filterPicker();
    }

    filterPicker(): void {
        if (!this.pickerList) return;
        if (this.configCard) { this.renderConfigPanel(); return; }
        this.pickerList.innerHTML = '';
        if (!this.list || !this.currentArmy) return;

        const query = (this.searchInput?.value ?? '').toLowerCase();

        // In BG mode, scope to that leader's valid cohort pool
        let sourceCards: Mk4Card[];
        if (this.bgLeaderCardId !== null) {
            const bgLeaderCard = Mk4Data.cardById.get(this.bgLeaderCardId);
            sourceCards = bgLeaderCard
                ? Mk4Data.availableBattleGroupCards(bgLeaderCard, this.currentArmy)
                    .sort((a, b) => a.name.localeCompare(b.name))
                : [];
        } else {
            sourceCards = this.pickerCards;
        }

        const shown = sourceCards.filter(c =>
            !query || c.name.toLowerCase().indexOf(query) !== -1 ||
                      c.cardType.toLowerCase().indexOf(query) !== -1
        );

        const cmdAvail = this.bgLeaderCardId === null
            ? Mk4Data.availableCommandCards(this.currentArmy!)
                  .filter(c => !query || c.name.toLowerCase().indexOf(query) !== -1)
            : [];

        if (shown.length === 0 && cmdAvail.length === 0) {
            this.pickerList.appendChild(el('div', 'mk4-picker-empty', 'No models found'));
            return;
        }

        let lastType = '';
        let sectionBody: HTMLDivElement | null = null;

        for (const card of shown) {
            // New type section
            if (card.cardType !== lastType) {
                const sec = this.makePickerSection(card.cardType);
                this.pickerList.appendChild(sec.section);
                sectionBody = sec.body;
                lastType = card.cardType;
            }

            if (!sectionBody) continue;

            const isLeader     = LEADER_TYPES.has(card.cardType);
            const alreadySelected = isLeader
                ? this.list!.leaderId === card.id
                : false;
            // When BG mode is for the main leader, cohorts go into the normal pool (no leader tag)
            const bgLeader = (this.bgLeaderCardId && this.bgLeaderCardId !== this.list!.leaderId)
                ? this.bgLeaderCardId : undefined;
            const check    = isLeader ? { ok: true } as const
                           : canAdd(this.list!, card.id, bgLeader);

            const rowCls = 'mk4-picker-row' +
                (check.ok && !alreadySelected ? ' mk4-picker-available' : ' mk4-picker-unavailable');
            const row = el('div', rowCls);

            row.appendChild(el('span', 'mk4-picker-name', card.name));

            const costText = isLeader ? 'Free' :
                Mk4Data.isModular(card)
                    ? (() => {
                        const lo = Mk4Data.minCost(card), hi = Mk4Data.maxCost(card);
                        return lo === hi ? `${lo} pts` : `${lo}–${hi} pts`;
                      })()
                : card.pointCost === 0 ? '—'
                : `${card.pointCost} pts`;
            row.appendChild(el('span', 'mk4-picker-cost', costText));
            row.appendChild(el('span', 'mk4-picker-fa',
                `FA ${card.fieldAllowance || '—'}`));

            if (alreadySelected) {
                row.appendChild(el('span', 'mk4-picker-reason', 'selected'));
            } else if (!check.ok) {
                row.appendChild(el('span', 'mk4-picker-reason', (check as any).reason));
            }

            // Companion hints
            if (card.pairedWith?.length && (card.pairSeparateInArmies ?? []).indexOf(this.currentArmy!.id) === -1) {
                for (const cid of card.pairedWith) {
                    const comp = Mk4Data.cardById.get(cid);
                    if (comp) row.appendChild(el('div', 'mk4-picker-companion', `Includes: ${comp.name}`));
                }
            }

            // True merc badge
            if (Mk4Data.isTrueMerc(card.id)) {
                row.appendChild(el('div', 'mk4-picker-companion', 'True Merc — one per list'));
            }

            if (check.ok && !alreadySelected) {
                row.onclick = () => {
                    if (isLeader) {
                        this.list = setLeader(this.list!, card.id);
                        this.renderList();
                        this.filterPicker();
                    } else {
                        const bgLeader = (this.bgLeaderCardId && this.bgLeaderCardId !== this.list!.leaderId)
                            ? this.bgLeaderCardId : undefined;
                        if (Mk4Data.isModular(card)) {
                            this.enterConfigMode(card, bgLeader);
                        } else {
                            this.list = addCard(this.list!, card.id, bgLeader);
                            this.renderList();
                            this.filterPicker();
                        }
                    }
                };
            }

            sectionBody.appendChild(row);
        }

        if (cmdAvail.length > 0) {
            const cmdSec = this.makePickerSection('Command Cards');
            this.pickerList.appendChild(cmdSec.section);
            const selectedIds = new Set(this.list!.commandCards);
            const cmdLimit    = Mk4Data.commandCardLimit(this.currentArmy!);
            const atLimit     = selectedIds.size >= cmdLimit;
            for (const cmd of cmdAvail) {
                const isSelected = selectedIds.has(cmd.id);
                const canToggle  = isSelected || !atLimit;
                const rowCls = 'mk4-picker-row' +
                    (canToggle ? ' mk4-picker-available' : ' mk4-picker-unavailable');
                const cmdRow = el('div', rowCls);
                cmdRow.appendChild(el('span', 'mk4-picker-name', cmd.name));
                const costTxt = cmd.pointCost > 0 ? `${cmd.pointCost} pts` : 'Free';
                cmdRow.appendChild(el('span', 'mk4-picker-cost', costTxt));
                if (isSelected) {
                    cmdRow.appendChild(el('span', 'mk4-picker-fa', '✓'));
                } else if (!canToggle) {
                    cmdRow.appendChild(el('span', 'mk4-picker-reason', 'Limit reached'));
                }
                if (canToggle) {
                    cmdRow.onclick = () => {
                        this.list = toggleCommandCard(this.list!, cmd.id);
                        this.renderList();
                        this.filterPicker();
                    };
                }
                cmdSec.body.appendChild(cmdRow);
            }
        }
    }

    // Creates a collapsible picker section. Returns {section, body}.
    private makePickerSection(type: string): { section: HTMLDivElement; body: HTMLDivElement } {
        const section = el('div', 'mk4-picker-section');
        const header  = el('div', 'mk4-picker-type-header mk4-collapsible-header');
        const toggle  = el('span', 'mk4-collapse-toggle',
            this.collapsedPickerTypes.has(type) ? '▸ ' : '▾ ');
        header.appendChild(toggle);
        header.appendChild(el('span', '', type));
        section.appendChild(header);

        const body = el('div', 'mk4-picker-section-body');
        if (this.collapsedPickerTypes.has(type)) body.style.display = 'none';
        section.appendChild(body);

        header.onclick = () => {
            if (this.collapsedPickerTypes.has(type)) {
                this.collapsedPickerTypes.delete(type);
                body.style.display = '';
                toggle.textContent = '▾ ';
            } else {
                this.collapsedPickerTypes.add(type);
                body.style.display = 'none';
                toggle.textContent = '▸ ';
            }
            // Don't re-render rows — just toggle visibility of already-rendered body
        };

        return { section, body };
    }
}
