# Contributing to Warlist

This guide covers how to add and edit card data. All model data is stored in
`cc/data/` as plain JSON files. After editing, rebuild the frontend and restart
the backend to see changes:

```sh
cd cc && npx vite build
docker compose restart backend
```

---

## Data files

| File | What it controls |
|---|---|
| `mkiv_cards.json` | Every model card (stats, point cost, type, keywords, hardpoints) |
| `mkiv_armies.json` | Army definitions — which cards are available in each army |
| `mkiv_keywords.json` | Keyword ID → name mapping used by armies and cards |
| `mkiv_commandcards.json` | Command cards (universal or army-specific) |

IDs are stable references between files. Cards use `c<number>`, armies use
`a<number>`, keywords use `k<number>`, command cards use `cmd<number>`. Pick the
next unused number in the sequence when adding a new entry.

---

## Adding or editing a card (`mkiv_cards.json`)

Each card is an object in the top-level array. Required fields:

```json
{
  "id": "c1100",
  "name": "Example Warjack",
  "faction": "Khador",
  "factionId": "f10",
  "cardType": "Warjack",
  "pointCost": 12,
  "fieldAllowance": "4",
  "isUnlimited": false,
  "armyIds": ["a1"],
  "keywordsIds": ["k7"]
}
```

### Required fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique, format `c<number>` |
| `name` | string | Display name, must match the official card |
| `faction` | string | Faction display name (e.g. `"Khador"`) |
| `factionId` | string | Faction ID (e.g. `"f10"`) — see faction IDs below |
| `cardType` | string | See card types below |
| `pointCost` | number | Base point cost; 0 for companions and free solos |
| `fieldAllowance` | string | `"1"`, `"2"`, `"3"`, `"4"`, `"C"` (Colossal/unique), or `"U"` (unlimited) |
| `isUnlimited` | bool | Whether FA is truly unlimited (some scenarios) |
| `armyIds` | string[] | Informational — which armies this card belongs to (used for reference, not filtering) |
| `keywordsIds` | string[] | Keyword IDs from `mkiv_keywords.json`; drives army availability |

### Card types

| Type | Used for |
|---|---|
| `Warcaster` | Warcaster leaders |
| `Warlock` | Warlock leaders |
| `Infernal Master` | Infernals leaders |
| `Warjack` | Warjacks in a warcaster's battle group |
| `Warbeast` | Warbeasts in a warlock's battle group |
| `Horror` | Infernals battle group models |
| `Monstrosity` | Grymkin battle group models |
| `Solo` | Solo models |
| `Unit` | Units |
| `Battle Engine` | Battle engines |
| `Command Attachment` | Command attachments (attach to units) |
| `Weapon Attachment` | Weapon attachments (attach to units) |
| `Objective` / `Terrain` / `Defense` / `Structure` / `Marker` | Scenario pieces — excluded from army builder |

### Optional fields

**`hardPoints`** — configurable weapon/equipment slots. Each slot has a label
and a list of options with names and point costs:

```json
"hardPoints": [
  {
    "label": "Head",
    "options": [
      { "name": "Death Swarm", "pointCost": 8 },
      { "name": "Heavy Venom Blaster", "pointCost": 7 }
    ]
  },
  {
    "label": "Right Arm",
    "options": [
      { "name": "Void Plate (Right)", "pointCost": 9 }
    ]
  }
]
```

The slot order matches `ListEntry.slotSelections` at runtime. A 0-cost option
is valid (free upgrade).

**`companionOf`** — set to the ID of the primary card this model auto-joins.
Companion cards have `pointCost: 0` and `fieldAllowance: "C"`. They are hidden
from the card browser and added automatically when the primary is selected.
The primary card must list this card's ID in its `pairedWith` array.

**`pairedWith`** — array of companion card IDs that join this model. Example:

```json
// Primary card
{ "id": "c493", "pairedWith": ["c510", "c512"], ... }

// Companion card
{ "id": "c510", "companionOf": "c493", "pointCost": 0, ... }
```

**`pairSeparateInArmies`** — array of army IDs where the pairing is broken and
the companion is not auto-added. Use when a model is split into separate
standalone cards in certain army contexts.

**`battleGroupSize`** — for junior warcasters/warlocks. Value is `"unlimited"`
or a number string. Enables the battle group sub-section in the builder.

**`battleGroupRequired`** — if `true`, the battle group slot must contain at
least one model.

**`battleGroupCardIds`** — explicit list of card IDs allowed in this model's
battle group. Overrides the default (all cohort-type cards available to the army).

**`battleGroupCardTypes`** — filter the default battle group pool to these card
types (e.g. `["Warjack"]`). Only used when `battleGroupCardIds` is not set.

**`canAttachTo`** — for attachments. Array of unit card IDs this attachment can
join. Leave absent to allow attaching to any valid unit.

**`splitProfile`** — `true` if the card has split stat lines (display hint only,
no logic impact).

---

## Faction IDs

| ID | Faction |
|---|---|
| `f1` | Circle Orboros |
| `f2` | Convergence of Cyriss |
| `f3` | Crucible Guard |
| `f4` | Cryx |
| `f5` | Cygnar |
| `f6` | Dusk |
| `f7` | General (scenario pieces — excluded from builder) |
| `f8` | Grymkin |
| `f9` | Infernals |
| `f10` | Khador |
| `f11` | Khymaera |
| `f12` | Legion of Everblight |
| `f13` | Mercenaries |
| `f15` | Protectorate of Menoth |
| `f16` | Retribution of Scyrah |
| `f17` | Skorne |
| `f18` | Southern Kriels |
| `f19` | Trollbloods |

---

## Adding a keyword (`mkiv_keywords.json`)

The file is a flat object. Add a new entry with the next unused `k<number>` key:

```json
{
  "k1": "Existing Keyword",
  "k200": "New Keyword Name"
}
```

After adding the keyword, add its ID to the relevant cards' `keywordsIds` and
to any army's `includedKeywordsIds` that should include it.

---

## Adding or editing an army (`mkiv_armies.json`)

```json
{
  "id": "a42",
  "name": "New Army",
  "factionId": "f10",
  "isUnlimited": false,
  "includedCardIds": [],
  "excludedCardIds": [],
  "includedKeywordsIds": ["k7"],
  "includedKeywords": ["5th Division"],
  "commandCardLimit": 5
}
```

### Fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique, format `a<number>` |
| `name` | string | Display name |
| `factionId` | string | Must match a faction ID |
| `isUnlimited` | bool | Unused currently, set `false` |
| `includedCardIds` | string[] | Cards always available regardless of faction/keywords (cross-faction mercs, shared cadres from other factions) |
| `excludedCardIds` | string[] | Cards explicitly blocked even if they would otherwise pass the keyword filter |
| `includedKeywordsIds` | string[] | Keyword IDs that determine which faction cards are available |
| `includedKeywords` | string[] | Human-readable mirror of `includedKeywordsIds` — keep in sync |
| `commandCardLimit` | number | Max command cards allowed (default 5) |

### How the availability filter works

For each card in the army's faction:

1. If the card is in `excludedCardIds` → blocked.
2. If the card is in `includedCardIds` → always included (regardless of keywords).
3. If the army has keywords (`includedKeywordsIds` is non-empty): include the card
   only if its `keywordsIds` overlaps with the army's `includedKeywordsIds`.
   Cards with no keywords are **excluded** under a keyword filter.
4. If the army has no keywords: include all same-faction cards.

### Common patterns

**Themed army** — the army keyword is applied to each card that belongs to it.
Add the keyword ID to both the army's `includedKeywordsIds` and each card's
`keywordsIds`. This is the standard pattern for all Khador sub-armies, Dusk
armies, Cygnar armies, etc.

**Shared cadre** — a set of models (e.g. SKS-6 Cadre) available across multiple
armies. Add the cadre keyword to the armies that include it. To exclude the
cadre from a specific army that would otherwise include it, add the cadre's card
IDs to that army's `excludedCardIds`.

**Cross-faction includes** — mercs and allies that come from a different faction.
Add their card IDs directly to `includedCardIds`. These always appear regardless
of keyword filters.

---

## Adding a command card (`mkiv_commandcards.json`)

```json
{ "id": "cmd19", "name": "New Command Card", "pointCost": 1, "universal": true }
```

For army-specific command cards, replace `"universal": true` with an `armyIds`
array listing which armies can take it.

---

## Workflow for adding new cards

### 1. Find the next available ID

```sh
python3 -c "
import json
cards = json.load(open('cc/data/mkiv_cards.json'))
ids = [int(c['id'][1:]) for c in cards]
print('Next ID: c' + str(max(ids) + 1), '  Total:', len(cards))
"
```

### 2. Look up existing cards / armies / keywords you'll cross-reference

```sh
# Find a card or army by name fragment
grep -n "Lanyssa" cc/data/mkiv_cards.json
grep -n "Fane"   cc/data/mkiv_armies.json

# Full JSON for specific cards
python3 -c "
import json
cards = json.load(open('cc/data/mkiv_cards.json'))
for c in cards:
    if 'Sythyss' in c.get('name', ''):
        print(json.dumps(c, indent=2))
"

# All cards in a faction
python3 -c "
import json
cards = json.load(open('cc/data/mkiv_cards.json'))
for c in [x for x in cards if x.get('factionId') == 'f6']:
    print(c['id'], c['name'], f\"({c['cardType']}) {c['pointCost']}pts FA:{c['fieldAllowance']}\")
"
```

### 3. Assign IDs up front, then write a Python script

Assign all new IDs before writing so companion `companionOf`/`pairedWith`
cross-references are consistent.

```python
import json

with open('cc/data/mkiv_cards.json') as f:
    cards = json.load(f)

new_cards = [
    {
        "id": "c1100",
        "name": "Example Unit",
        "faction": "Khador",
        "factionId": "f10",
        "cardType": "Unit",
        "pointCost": 8,
        "fieldAllowance": "2",
        "isUnlimited": False,
        "armyIds": ["a1"],
        "keywordsIds": ["k7"]
    },
]

# If updating existing cards (e.g. expanding canAttachTo):
for c in cards:
    if c['id'] == 'c1658':
        c['canAttachTo'] = ["c1664", "c1657", "c1665"]

cards.extend(new_cards)

with open('cc/data/mkiv_cards.json', 'w') as f:
    json.dump(cards, f, indent=2)
```

### 4. Update the hardcoded card count in the test

```sh
grep -n "live cards total" tests/mk4/test.mjs
# Edit that line to the new total, then:
node tests/mk4/test.mjs
npx tsx tests/mk4/test-export.ts
```

### 5. Deploy

```sh
# Data-only changes — no rebuild needed
docker compose restart backend

# After frontend code changes
cd cc && npx vite build
docker compose restart backend
```

---

## Validation checklist

Before committing data changes:

- Every keyword ID in a card's `keywordsIds` exists in `mkiv_keywords.json`.
- Every keyword ID in an army's `includedKeywordsIds` exists in `mkiv_keywords.json`.
- `includedKeywords` (names) matches the IDs in `includedKeywordsIds`.
- Companion cards have `pointCost: 0`, `fieldAllowance: "C"`, and `companionOf` set.
- The primary card lists all its companions in `pairedWith`.
- No two cards share the same `id`.
- No two armies share the same `id` and name combination.
- Cards that should appear in an army share at least one keyword with that army's
  `includedKeywordsIds`, or are listed in `includedCardIds`.

A quick sanity check:

```sh
python3 -c "
import json
cards = json.load(open('cc/data/mkiv_cards.json'))
armies = json.load(open('cc/data/mkiv_armies.json'))
kws = json.load(open('cc/data/mkiv_keywords.json'))

card_ids = {c['id'] for c in cards}
ids = [c['id'] for c in cards]
assert len(ids) == len(set(ids)), 'Duplicate card IDs'

for a in armies:
    for kid in a.get('includedKeywordsIds', []):
        assert kid in kws, f'Army {a[\"name\"]}: unknown keyword {kid}'
    for cid in a.get('includedCardIds', []) + a.get('excludedCardIds', []):
        assert cid in card_ids, f'Army {a[\"name\"]}: unknown card {cid}'

for c in cards:
    for kid in c.get('keywordsIds', []):
        assert kid in kws, f'Card {c[\"name\"]}: unknown keyword {kid}'

print('OK')
"
```
