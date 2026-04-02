# Phase 3: Aggregator & Search

> **Plan:** [Big Refactor Index](./2026-04-02-big-refactor.md)
> **Prerequisite:** Run 1.2 complete (Hono auth API running with Postgres)
> **Goal:** Revive the aggregator pattern with Hocuspocus webhooks + PostgreSQL for searchable public document indexing.

Hard-cutover assumption: index only the new Hocuspocus-authenticated document flow; no legacy compatibility ingestion path.

## Progress

- [ ] Run 3.1 — Create new aggregator package
- [ ] Run 3.2 — Search API

## Agent Scratchpad

> Use this section to track decisions, blockers, and notes during implementation.

---

## Run 3.1: Create new aggregator package

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Complex logic for indexing CRDT documents into PostgreSQL.

**What:** Create a new aggregator service that indexes public Yjs documents in PostgreSQL for search. Uses Hocuspocus's webhook extension to receive change notifications.

**Reuse from `old-code/aggregator/`:**

- Architecture pattern: listen to room docs → observe changes → upsert to DB
- Room tracking logic (`rooms.ts` pattern)
- Express/Hono API structure

**Replace:**

- MatrixProvider → Hocuspocus webhook extension (`@hocuspocus/extension-webhook`) fires on `onChange`
- MongoDB → PostgreSQL (Drizzle ORM, same DB as auth)
- Alternatively: Hocuspocus `openDirectConnection()` for server-side doc reading

**Files:**

- Create `packages/aggregator/`
  - `package.json` — hono, drizzle-orm, postgres, yjs
  - `src/index.ts` — Hono server entry
  - `src/webhook-handler.ts` — receive Hocuspocus webhook events on doc change
  - `src/listener.ts` — alternative: connect to Hocuspocus directly and observe docs (port from `old-code/aggregator/src/rooms.ts`)
  - `src/db/schema.ts` — Drizzle schema for indexed documents
  - `src/db/upsert.ts` — port from `old-code/aggregator/src/mongo-helpers.ts`
  - `src/routes/search.ts` — search/query API
  - `Dockerfile`

**Drizzle schema for indexed documents:**

```typescript
export const indexedDocuments = pgTable('indexed_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull(),
  collectionKey: text('collection_key').notNull(),
  userId: text('user_id'),
  documentData: jsonb('document_data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Add to docker-compose.yml:**

```yaml
aggregator:
  build: packages/aggregator
  depends_on: [postgres, sync-server]
  environment: [DATABASE_URL, SYNC_SERVER_URL, SYNC_AUTH_SECRET]
```

**Tests:**

- Aggregator receives webhook events from Hocuspocus on document changes
- Document changes trigger upsert to Postgres
- Search API returns matching documents

**Done when:** Create a doc via SDK → aggregator indexes it → search API finds it.

**Risks:** Webhook payload size for large documents. Mitigate by sending only doc ID + metadata in webhook, then fetching full content via `openDirectConnection()` if needed.

---

## Run 3.2: Search API

**What:** Add a search endpoint to the aggregator for querying indexed documents.

**Endpoints:**

```
GET /api/search?q=<query>&collection=<key>  → full-text search over indexed docs
GET /api/documents/:roomId                  → all docs in a room
```

**Files:**

- `packages/aggregator/src/routes/search.ts` — PostgreSQL full-text search
- Add GIN index on `document_data` for JSONB search performance

**Done when:** Search returns relevant results from indexed documents.

## Execution Summary

```text
Run 3.1: Create aggregator package (Smart)
└── Run 3.2: Search API (Fast)
```

## Status

- [ ] Approved by user
