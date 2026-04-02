# Architecture — EweserDB

> **Status:** Draft — undergoing major migration (Next.js removal, Docker Compose consolidation)

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
  │ (API)       │ │ Pages    │ │ (planned)      │
  │ Supabase +  │ │ Login/   │ │ Server-side    │
  │ Drizzle ORM │ │ Signup   │ │ data indexing  │
  └─────────────┘ └──────────┘ └────────────────┘
```

## Monorepo Structure

```
packages/
  db/                  ← @eweser/db — core SDK (Yjs, IndexedDB, Hocuspocus provider)
  shared/              ← @eweser/shared — shared types & utilities
  auth-server/         ← Authentication server + pages (MIGRATING from Next.js)
  ewe-note/            ← Full note-taking app (BlockNote editor, Yjs sync)
  examples-components/ ← Reusable UI components for examples
  eslint-config-*/     ← Shared lint configs

examples/
  example-basic/       ← Minimal demo app (React + Vite)
  react-native/        ← React Native example (Expo)

e2e/                   ← Cypress integration tests
```

## Core Tech Stack

| Layer            | Current                                     | Migration Target                                            |
| ---------------- | ------------------------------------------- | ----------------------------------------------------------- |
| **Core SDK**     | Yjs, y-indexeddb, y-webrtc, @y-sweet/client | Yjs, y-indexeddb, @hocuspocus/provider                      |
| **Auth Backend** | Next.js 16 + Supabase + Drizzle             | Hono + better-auth + Drizzle                                |
| **Auth UI**      | Next.js pages                               | React SPA (Vite)                                            |
| **Sync Server**  | Y-Sweet (JamSocket hosted or self-host)     | Hocuspocus (self-hosted in Docker Compose, SQLite/Postgres) |
| **Database**     | Supabase (PostgreSQL)                       | Self-hosted PostgreSQL in Docker Compose                    |
| **Auth**         | Supabase Auth                               | better-auth (email/password + OAuth, Drizzle adapter)       |
| **Frontend**     | React 18-19, Vite, Tailwind, Radix UI       | No change                                                   |
| **Testing**      | Vitest (unit), Cypress (E2E)                | No change                                                   |
| **Build**        | Vite, tsc                                   | No change                                                   |
| **Monorepo**     | npm workspaces                              | No change                                                   |
| **CI/CD**        | GitHub Actions                              | No change                                                   |

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
- `packages/db/examples/dbShape.ts` — Data structure reference
- `packages/shared/src/` — Shared types
- `packages/auth-server/` — Auth server (migrating)
- `packages/ewe-note/` — Note app
- `LOCAL_DEVELOPMENT.md` — Dev setup guide
