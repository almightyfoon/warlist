# Warlist

Mk4 Warmachine army list builder. Go backend, TypeScript/Vite frontend, MySQL.

## Prerequisites

- Docker + Docker Compose
- Node 22+ (frontend dev only)
- Go 1.22+ (backend dev only)

## Local development

### 1. Environment

```sh
cp .env.example .env
# Fill in DB_PASSWORD, DB_ROOT_PASSWORD, GOOGLE_CLIENT_ID
# Leave DOMAIN/CADDY_EMAIL blank for local — caddy is not used locally
```

### 2. Frontend (hot-reload)

```sh
cd cc
npm install
npx vite dev
# Serves on http://localhost:5173
```

### 3. Backend

```sh
# Start MySQL only
docker compose up -d db

# Run the Go server directly
cd backend
DB_HOST=localhost DB_PASSWORD=yourpass GOOGLE_CLIENT_ID=yourkey go run ./cmd/server
# Serves on http://localhost:8080
```

### 4. Full stack via Docker Compose (no Caddy)

```sh
docker compose up --build db backend
# Backend available at http://localhost:8080
```

Caddy is only needed in production (handles TLS). For local work omit it or
comment out the `ports` on the backend service and hit it directly on 8080.

## Production deploy (EC2)

```sh
# First deploy
docker compose up -d

# After card data changes only (no rebuild needed)
docker compose restart backend

# After code changes
docker compose up -d --build
```

Set these in `.env` on the server:

| Variable | Description |
|---|---|
| `DB_PASSWORD` | MySQL warlist user password |
| `DB_ROOT_PASSWORD` | MySQL root password |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `DOMAIN` | Public hostname (e.g. `warlist.example.com`) |
| `CADDY_EMAIL` | Email for Let's Encrypt |
| `APP_VERSION` | Build version string shown in UI |

## Running tests

```sh
# Mk4 export / encode / decode tests
npx tsx tests/mk4/test-export.ts
```

## Project structure

```
backend/          Go server (chi, MySQL)
  cmd/server/     main.go — routes, static handler
  internal/
    auth/         Google token verification
    config/       env-based config
    db/           SQL queries
    handlers/     HTTP handlers
cc/               Frontend (TypeScript + Vite)
  cc/             App shell (ccmain.ts, ccstorage.ts, g.ts)
  ccapi/          Mk4 data layer (mk4data.ts, mk4list.ts, mk4export.ts)
  ccweb/          UI components (mk4builder.ts, widgets.ts, dialog.ts)
  data/           Static JSON card/army/keyword data
db/               schema.sql (MySQL DDL)
tests/            Test suite
```

## Card data

Model and army data lives in `cc/data/` and is baked into the Docker image at
build time. A backend restart picks up any changes without a full rebuild.

See [CONTRIBUTING.md](CONTRIBUTING.md) for a full description of every field
and instructions for adding or editing cards, armies, keywords, and command
cards.

| File | Contents |
|---|---|
| `mkiv_cards.json` | 1,667 cards (all factions) |
| `mkiv_armies.json` | 40 armies with keyword and explicit card lists |
| `mkiv_keywords.json` | 186 keyword ID → name mappings |
| `mkiv_commandcards.json` | 18 command cards |
