# Warlist — Claude context

Mk4 Warmachine army list builder. Go backend, TypeScript/Vite frontend, MySQL database, Docker deployment.

## Build commands

```sh
# Frontend build (run from cc/)
cd cc && npx vite build

# Frontend dev server with hot reload
cd cc && npx vite dev

# TypeScript type-check only (no emit)
cd cc && npx tsc --noEmit

# Run tests
npx tsx tests/mk4/test-export.ts

# Restart backend (picks up data file changes without rebuild)
docker compose restart backend

# Full rebuild
docker compose up --build db backend
```

## Architecture

### Frontend (`cc/`)

Three TypeScript bundles compiled by Vite, each with its own `tsconfig.json`:

- **`cc/ccapi/`** — pure data layer, no DOM. `Mk4Data` loads the JSON files via
  `fetch`, exposes `availableCards`, `availableLeaders`, etc. `mk4list.ts` defines
  the `Mk4List` type and point-cost helpers. `mk4export.ts` handles plain-text
  export (Wartable format) and URL encode/decode (binary base64url).

- **`cc/ccweb/`** — UI components. `mk4builder.ts` is the main list-building flow.
  `widgets.ts` has reusable elements (Button, UIElement). `dialog.ts`, `ajax.ts`.

- **`cc/cc/`** — app shell. `ccmain.ts` boots the page, handles routing/history,
  and renders the main auth area. `g.ts` wraps Google Identity Services auth
  (sign-in, sign-out, session restore from localStorage). `ccstorage.ts` manages
  saved lists via the backend API.

### Backend (`backend/`)

Go server using the `chi` router. Serves the Vite-built static files and handles:
- `POST /x` — verify Google JWT, load saved lists for the user
- `POST /save` — save a list (requires valid JWT)
- `POST /delete` — delete a list (requires valid JWT)
- `GET /blog` — news/update posts
- `GET /data/*` — serves `cc/data/*.json` files

### Database

MySQL. Schema in `db/schema.sql`. One main table for saved lists, keyed by user email.

## Data model

Card data lives in `cc/data/`. The backend serves these files statically; the
frontend loads them at startup via `Mk4Data.load()`.

### `mkiv_cards.json`

Array of card objects. Required fields on every card:

```json
{
  "id": "c760",
  "name": "Juggernaut",
  "faction": "Khador",
  "factionId": "f10",
  "cardType": "Warjack",
  "pointCost": 10,
  "fieldAllowance": "4",
  "isUnlimited": false,
  "armyIds": ["a1", "a2", "a25", "a41"],
  "keywordsIds": ["k23"]
}
```

`armyIds` is informational metadata (which armies this card belongs to). It is
**not** used by the availability filter — `keywordsIds` and the army's
`includedCardIds` / `includedKeywordsIds` control what appears in the builder.

Optional card fields:

| Field | Type | Meaning |
|---|---|---|
| `hardPoints` | array | Configurable slot options (see below) |
| `companionOf` | string | This card is a companion; auto-joins when `companionOf` is added |
| `pairedWith` | string[] | IDs of companion cards that join this model |
| `pairSeparateInArmies` | string[] | Army IDs where the pair is split (companions not auto-joined) |
| `battleGroupSize` | string | How many models this leader's battle group can hold |
| `battleGroupRequired` | bool | Whether the battle group slot must be filled |
| `battleGroupCardIds` | string[] | Explicit list of cards allowed in this leader's battle group |
| `battleGroupCardTypes` | string[] | Card types allowed in this leader's battle group |
| `canAttachTo` | string[] | Unit IDs this attachment can join |
| `splitProfile` | bool | Card has split stat profiles (display only) |

`hardPoints` structure:

```json
"hardPoints": [
  {
    "label": "Head",
    "options": [
      { "name": "Death Swarm", "pointCost": 8 },
      { "name": "Heavy Venom Blaster", "pointCost": 7 }
    ]
  }
]
```

### `mkiv_armies.json`

Array of army objects:

```json
{
  "id": "a1",
  "name": "5th Division",
  "factionId": "f10",
  "isUnlimited": false,
  "includedCardIds": ["c1004", "c959", "c975"],
  "excludedCardIds": [],
  "includedKeywordsIds": ["k7"],
  "includedKeywords": ["5th Division"],
  "commandCardLimit": 5
}
```

`includedKeywords` is a human-readable mirror of `includedKeywordsIds` — keep
them in sync. `commandCardLimit` is optional (defaults to 5).

**How army card availability works** (`Mk4Data.availableCards`):

1. Exclude anything in `excludedCardIds`.
2. Exclude companion cards (they auto-join).
3. Exclude scenario/terrain/objective card types.
4. Always include cards in `includedCardIds` (cross-faction mercs, cadres).
5. Exclude cards from a different faction.
6. If army has `includedKeywordsIds`: only include cards that share at least one
   of those keywords. Cards with no keywords are excluded under a keyword filter.
7. If army has no `includedKeywordsIds`: include all same-faction cards.

### `mkiv_keywords.json`

Object mapping keyword ID → name:

```json
{ "k7": "5th Division", "k23": "Armored Korps" }
```

### `mkiv_commandcards.json`

Array of command card objects:

```json
{ "id": "cmd1", "name": "Blessing of the Gods", "pointCost": 0, "universal": true }
```

`universal: true` means available to all armies. Non-universal cards have an
`armyIds` array (same semantics as on model cards).

## Key types (`cc/ccapi/mk4list.ts`)

```typescript
interface Mk4List {
    armyId:       string;
    leaderId:     string | null;
    entries:      ListEntry[];
    commandCards: string[];    // cmd IDs
    pointLimit:   number;
}

interface ListEntry {
    cardId:             string;
    battleGroupLeader?: string;  // cardId of the junior warcaster leading this entry's BG
    slotSelections?:    string[]; // selected hardPoint option names, parallel to card.hardPoints
    companionCardIds?:  string[]; // auto-populated companion card IDs
}
```

## URL encoding

Lists are serialised to a compact binary format packed into base64url for
sharing. See `mk4export.ts` `encodeList` / `decodeList`. The format is versioned
(byte 0 = version). Current version: 1.

## Auth flow

Google Identity Services (GIS). On sign-in the frontend receives a JWT, sends
it to `POST /x`, and the backend verifies it and returns saved lists.
`g.ts:restoreSession()` checks localStorage for a cached (non-expired) token
and restores the session without a GIS round-trip.

## Card type constants

From `mk4data.ts`:

```typescript
const LEADER_TYPES  = new Set(['Warcaster','Warlock','Infernal Master','Warcaster Unit']);
const COHORT_TYPES  = new Set(['Warjack','Warbeast','Horror','Monstrosity']);
const SCENARIO_TYPES = new Set(['Objective','Terrain','Defense','Structure','Marker']);
```

Companions, attachments, solos, units, and battle engines are none of the above
and are treated as "standalone" entries in the list builder.
