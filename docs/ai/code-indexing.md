# Code Indexing

This repository uses hand-maintained `INDEX.md` files as a trunk-to-leaf
navigation layer for humans and AI agents. Indexes explain where code lives,
what each folder owns, and which files are the safest starting points before
editing.

`INDEX.md` is navigational. It does not replace `README.md`, `AGENTS.md`,
`ARCHITECTURE.md`, ADRs, package docs, or current implementation plans.

## Goals

- Make broad codebase exploration cheaper and more deterministic.
- Keep package and source ownership visible near the code.
- Give agents a small set of candidate files before using `rg` or reading many
  source files.
- Let CI catch broken navigation links and malformed index structure.

## Non-Goals

- No generated semantic embeddings or vector search.
- No repository-wide source-header sweep.
- No runtime behavior changes.
- No public package API changes.
- No replacement for architecture decisions or user-facing package docs.

## Index Contract

Every `INDEX.md` must use these headings in this order:

```markdown
# <Folder or Package Name>

## Plain English

<One to three simple sentences explaining what this folder is for.>

## Owns

- <Responsibility this folder owns.>

## Start Here

- [`path`](./path): <why this is a good first file or child folder.>

## Children

- [`child/`](./child/): <what this child owns.>

## Key Contracts

- <Important API, data model, route, schema, runtime boundary, or invariant.>

## Update Triggers

- <When a coder must update this index.>

## Testing

- `<command>`: <what it verifies.>
```

Optional headings after `Testing`:

```markdown
## Runtime Flow

## Known Sharp Edges

## Links
```

## Example Root Index

```markdown
# EweserDB

## Plain English

This repository contains the local-first EweserDB SDK, auth services, sync
relay, apps, examples, docs, and scripts.

## Owns

- Monorepo-level package relationships and developer workflows.

## Start Here

- [`ARCHITECTURE.md`](./ARCHITECTURE.md): Current runtime topology.
- [`packages/`](./packages/): Workspace package map.

## Children

- [`packages/`](./packages/): SDK, services, apps, and shared packages.

## Key Contracts

- Follow `AGENTS.md` and package-local `AGENTS.md` before editing.

## Update Triggers

- Update when top-level package layout or workflow commands change.

## Testing

- `npm run code-index:check`: Validates index structure and links.
```

## Example Package Index

```markdown
# @eweser/db

## Plain English

This package is the browser SDK for local-first rooms, documents, IndexedDB
persistence, and optional remote sync.

## Owns

- The `Database` and `Room` APIs used by examples and apps.

## Start Here

- [`src/index.ts`](./src/index.ts): Public SDK entry point.
- [`src/INDEX.md`](./src/): Source navigation map.

## Children

- [`src/`](./src/): SDK implementation.

## Key Contracts

- Yjs writes must go through CRDT operations and document helpers.

## Update Triggers

- Update when public SDK entry points, room behavior, sync behavior, or tests
  change.

## Testing

- `npm test --workspace @eweser/db`: Runs SDK unit tests.
```

## Source Header Contract

Selected source files may use this header format:

```typescript
/**
 * Purpose: <plain-English reason this file exists.>
 * Exports: <main exports or "side-effect entry point".>
 * Touches: <systems/data/routes this file affects.>
 * Read before editing: <nearby index, ADR, AGENTS.md, or key file.>
 */
```

Example:

```typescript
/**
 * Purpose: Public SDK entry point for local-first database clients.
 * Exports: Database, SDK types, and utility re-exports.
 * Touches: Room loading, auth-server calls, local persistence, and sync setup.
 * Read before editing: packages/db/INDEX.md and packages/db/AGENTS.md.
 */
```

Header rules:

- Keep each header under 8 lines.
- Add headers only to entry points, cross-package contracts, services, routes,
  complex workflow roots, security-sensitive modules, and Yjs/auth/sync
  boundaries.
- Do not add headers to tiny files, generated files, tests, fixtures,
  mechanical re-export-only files, CSS, JSON, configs, or files whose folder
  index is enough.
- Present source headers must use the fixed labels `Purpose`, `Exports`,
  `Touches`, and `Read before editing` in that order.

## Checker

Run:

```bash
npm run code-index:check
```

The checker:

- Requires trunk indexes for the repo root, `docs`, `scripts`, `e2e`,
  `packages`, `examples`, active workspace roots, and active workspace `src`
  folders when present.
- Validates required headings and heading order for every discovered
  `INDEX.md`.
- Validates local Markdown links in `INDEX.md` files.
- Validates any present source headers that use the `Purpose:` label.
- Prints advisory source-header coverage by workspace.

Failures are blocking for missing required indexes, malformed index headings,
broken local links, and malformed present source headers. Source-header coverage
is advisory only.

## Update Triggers

Before broad exploration, read the nearest `INDEX.md`. When changing a folder's
responsibilities, contracts, entry points, auth/security behavior, Yjs behavior,
public package API, or test command, update the nearest index or high-value
source header in the same change.

Product changes touching indexed folders must keep nearby indexes accurate in
the same PR.

## Ratchet Policy

Use [`docs/workflows/code-index-maintenance.md`](../workflows/code-index-maintenance.md)
for incremental coverage work. Header coverage must not regress as a human
review rule; CI reports coverage but does not fail on low coverage.

## Future Generated Layer

Generated symbol maps or graph-backed code memory may complement this
hand-written index later. They should be planned separately and must not replace
the human-readable `INDEX.md` tree.

Use `npm run code-map` to write the ignored local `.ai/code-map.json` and
`npm run code-map:query -- --symbol <name>` for compact import/export answers.
Do not paste the full generated map into model context.
