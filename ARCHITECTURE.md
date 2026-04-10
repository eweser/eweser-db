# Architecture — EweserDB

> **Status:** Active — Core migration complete. Hono + better-auth auth server is production-ready.

## Philosophy

EweserDB flips data ownership: **users own their data**, not apps. Apps interoperate over shared, strongly-typed Yjs CRDT documents. Local-first, offline-first, real-time sync.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │ Any App  │  │ Ewe Note │  │ Example / 3rd-party   │ │
│  │ using    │  │ (full    │  │ apps using @eweser/db  │ │
│  │ @eweser/db│ │  app)    │  │                       │ │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────────┘ │
│       │              │                 │                │
│       └──────────────┼─────────────────┘                │
│                      │                                  │
│              ┌───────▼────────┐                         │
│              │  @eweser/db    │  ← Yjs CRDT, IndexedDB  │
│              │  (core SDK)   │    local persistence     │
│              └───────┬────────┘                         │
└──────────────────────┼──────────────────────────────────┘
                       │ WebSocket (Hocuspocus)
              ┌────────▼─────────┐
              │ Hocuspocus Server│  ← CRDT sync relay
              └────────┬─────────┘
                       │
         ┌─────────────┼──────────────┐
         │             │              │
  ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────────┐
  │ Auth Server │ │ Auth     │ │ Aggregator     │
  │ (API)       │ │ Pages    │ │                │
  │ Hono +      │ │ Login/   │ │ Server-side    │
  │ better-auth │ │ Signup   │ │ data indexing  │
  └─────────────┘ └──────────┘ └────────────────┘
```

## Monorepo Structure

```
packages/
  db/                  ← @eweser/db — core SDK (Yjs, IndexedDB, Hocuspocus provider)
  shared/              ← @eweser/shared — shared types, utilities, and document CRUD helpers
  auth-server-hono/    ← @eweser/auth-server — new Hono + better-auth implementation
  auth-pages/          ← React SPA for login/signup/account
  sync-server/         ← @eweser/sync-server — Hocuspocus sync relay
  aggregator/          ← @eweser/aggregator — Server-side data indexing
  mcp-server/          ← @eweser/mcp — stdio MCP server for AI agent access
  ewe-note/            ← Full note-taking app (BlockNote editor, Yjs sync)
  examples-components/ ← Reusable UI components for examples
  eslint-config-*/     ← Shared lint configs

examples/
  example-basic/       ← Minimal demo app (React + Vite)
  react-native/        ← React Native example (Expo)

e2e/                   ← Cypress integration tests
```

## Core Tech Stack

| Layer            | Current                                    | Migration Target |
| ---------------- | ------------------------------------------ | ---------------- |
| **Core SDK**     | Yjs, y-indexeddb, @hocuspocus/provider     | No change        |
| **Auth Backend** | Hono + better-auth + Drizzle               | No change        |
| **Auth UI**      | React SPA (Vite)                           | No change        |
| **Sync Server**  | Hocuspocus (self-hosted in Docker Compose) | No change        |
| **Database**     | Self-hosted PostgreSQL in Docker Compose   | No change        |
| **Auth**         | better-auth (email/password + OAuth)       | No change        |
| **Frontend**     | React 18-19, Vite, Tailwind, Radix UI      | No change        |
| **Testing**      | Vitest (unit), Cypress (E2E)               | No change        |
| **Build**        | Vite, tsc                                  | No change        |
| **Monorepo**     | npm workspaces                             | No change        |
| **CI/CD**        | GitHub Actions                             | No change        |

## Development Workflow

The project uses a hybrid approach: **backend services** run in Docker, while **frontend apps** run on the host for hot reloading.

### 1. Start Backend Services

```bash
npm run dev:docker
```

This starts PostgreSQL, Hocuspocus (sync-server), the Aggregator, and the Auth API.

### 2. Start Frontend Apps

In separate terminals, run the apps you want to work on:

```bash
npm run dev:shared        # Watch shared types
npm run dev:db            # Watch core SDK
npm run dev:example-basic # Start the basic demo
```

### 3. Useful Commands

- `npm run dev:docker:stop` — Stop backend services
- `npm run dev:docker:clean` — Stop and remove volumes (reset DB)
- `npm run dev:docker:logs` — View backend logs

## Planned Migration: Docker Compose Consolidation

**Goal:** One Docker Compose file to run the entire stack locally and in production. Eventually a one-click deploy on DigitalOcean / other cloud providers.

Services in the compose:

1. **Auth API** — Hono server + better-auth replacing Next.js backend
2. **Auth Pages** — React SPA served statically (login, signup, account management)
3. **Ewe Note** — React SPA + PWA (the polished note-taking app, installable)
4. **Example App** — React SPA (basic demo, no PWA needed)
5. **Hocuspocus** — CRDT sync server (TypeScript, SQLite/Postgres persistence)
6. **PostgreSQL** — Self-hosted (no Supabase dependency)
7. **Aggregator** — Server-side data indexing via Hocuspocus webhooks (revived from old-code)
8. **Caddy** — Reverse proxy with auto-HTTPS

**SEO Strategy (TBD):** Static landing pages served by the Node server or nginx, with the app itself as a SPA/PWA.

## Key Concepts

### Rooms

A "room" is like a folder — a Yjs document with access control. Each room has a collection type (notes, flashcards, etc.) and an access list of authorized users.

### Collections & Schemas

Strongly-typed schemas define document shapes. Apps that share a schema can interoperate on the same data.

### Sync Flow

1. App creates/opens a room via `@eweser/db`
2. SDK loads from IndexedDB (offline-first)
3. SDK connects to Hocuspocus for real-time sync
4. Auth server issues JWT tokens for room access
5. Changes propagate via Yjs CRDT (conflict-free)

## Data Flow

```
User action → @eweser/db SDK
  → Local: IndexedDB (immediate)
  → Remote: Hocuspocus WebSocket (background sync)
  → Auth: JWT token validated by Hocuspocus onAuthenticate hook
  → Other clients: receive Yjs updates via Hocuspocus
```

## Key Files

- `packages/db/src/` — Core SDK implementation
- `packages/db/src/examples/dbShape.ts` — Data structure reference
- `packages/shared/src/` — Shared types
- `packages/auth-server-hono/` — Auth server (Hono + better-auth)
- `packages/ewe-note/` — Note app
- `LOCAL_DEVELOPMENT.md` — Dev setup guide
