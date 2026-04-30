# EweserDB - AI Agent Instructions

> Required reading before work in this repository.

## Scope

These instructions apply to this repository and its subdirectories. They are for EweserDB only: the local-first, user-owned database project in this repo.

Do not mix instructions for unrelated projects into this file. If another project, such as an "outlandish web project", lives in a different repository, give it its own `AGENTS.md`. If it becomes part of this monorepo, add a narrower `AGENTS.md` in that project directory.

## Project Overview

EweserDB is a local-first, user-owned database SDK built on Yjs CRDTs. Users own their data. Apps interoperate over shared schemas and room-scoped access grants.

- Read `README.md` for product philosophy and API overview.
- Read `ARCHITECTURE.md` for current system design.
- Read `LOCAL_DEVELOPMENT.md` for setup and local service details.
- Treat `docs/ai/` and `docs/ai/adr/` as historical context unless a file explicitly says it is current guidance.

## Current Architecture

The Next.js/Supabase migration is complete. The current stack is:

| Layer          | Current stack                                                       |
| -------------- | ------------------------------------------------------------------- |
| Core SDK       | TypeScript, Yjs, `y-indexeddb`, `@hocuspocus/provider`              |
| Shared package | TypeScript types, schemas, and helpers with no runtime dependencies |
| Auth API       | Hono, better-auth, Drizzle ORM, PostgreSQL                          |
| Auth UI        | React SPA built with Vite                                           |
| Sync server    | Hocuspocus relay with persistence                                   |
| Aggregator     | Server-side public indexing and search                              |
| Apps           | React 18-19, Vite, Tailwind CSS, Radix UI                           |
| Editor         | BlockNote in `packages/ewe-note`                                    |
| Testing        | Vitest and Cypress                                                  |
| Build          | npm workspaces, Vite, `tsc`                                         |

Prefer changes that fit this architecture. Do not reintroduce Next.js or Supabase patterns unless the user explicitly asks and the tradeoff is documented.

## Hard Stops

- Never commit secrets, API keys, cookies, tokens, provider dashboard screenshots, or `.env` files.
- Never push directly to `main`. Use a branch and PR.
- Never delete database migrations. Only add new migrations.
- Never modify a published package API without a changeset.

## Monorepo Rules

- This is an npm workspaces monorepo. Check the root `package.json` before adding scripts or dependencies.
- Changes in `packages/shared` affect all consumers.
- Keep dependency versions unified across workspaces when practical.
- Use the repo's existing patterns before introducing new abstractions.
- Keep edits scoped. Avoid unrelated refactors.
- Use TypeScript strictly. Avoid `any`; if unavoidable, explain why in code or the final summary.
- For frontend work, preserve offline-first behavior and auth-grant flows.
- For backend work, validate inputs and keep auth boundaries explicit.

## Published Packages and Changesets

Run `npm run changeset` for behavior or API changes to published packages, including:

- `@eweser/db`
- `@eweser/shared`
- `@eweser/examples-components`

Docs-only, tests-only, internal app-only, and unpublished package changes usually do not need a changeset.

## Package Relationships

```text
@eweser/shared
    -> @eweser/db
        -> @eweser/examples-components
            -> examples / packages/ewe-note

packages/auth-server-hono is the Hono + better-auth auth API.
packages/app is the auth/account/access-grant React SPA.
packages/sync-server is the Hocuspocus sync relay.
packages/aggregator indexes public room data.
```

## Key Locations

| Location                            | Purpose                                             |
| ----------------------------------- | --------------------------------------------------- |
| `packages/shared/src/`              | Shared types, schemas, and helpers                  |
| `packages/db/src/`                  | Core SDK: rooms, documents, sync, local persistence |
| `packages/auth-server-hono/src/`    | Auth API                                            |
| `packages/app/src/`                 | Auth/account/access-grant SPA                       |
| `packages/sync-server/src/`         | Hocuspocus sync relay                               |
| `packages/aggregator/src/`          | Public indexing/search                              |
| `packages/ewe-note/src/`            | BlockNote note-taking app                           |
| `packages/examples-components/src/` | Shared example UI components                        |
| `examples/`                         | Demo and interop apps                               |
| `packages/mcp-server/src/`          | MCP server for agent access                         |
| `e2e/cypress/`                      | E2E tests                                           |
| `docs/ai/plans/`                    | Implementation plans                                |

## Common Commands

```bash
npm install
npm run dev:docker
npm run dev
npm run build
npm run check
npm test
npm run test:e2e
npm run changeset
```

Use narrower workspace commands when appropriate:

```bash
npm run dev --workspace @eweser/db
npm run dev --workspace @eweser/app
npm run dev --workspace @eweser/ewe-note
npm test --workspace @eweser/db
```

## Codex Workflow

`AGENTS.md` is the top-level repository policy. The canonical human-readable
Codex workflow is `docs/ai/workflows/codex-planner-coder.md`.

For substantial or ambiguous work, use the Planner -> Coder workflow:

1. Planner: research the request, ask necessary questions, and save an
   implementation-ready plan in `docs/ai/plans/`.
2. User approval: implementation begins only after the user approves the plan.
3. Coder: treat the approved plan as the approval boundary, implement all runs,
   verify the work, perform internal QA, fix issues found during QA, update the
   plan, and report remaining risk.

Standalone QA/re-QA is optional and separate. It is for independent audits of
completed work, not a required third phase of every Codex build.

Plan files should use `docs/ai/plans/_template.md` and include:

```markdown
## Goal

## Scope

## Assumptions / Open Questions

## Runs

### Run N: <Title>

- Id / Title / Files / Steps / Tests / Verification
- Dependencies / Model tier / Risk level

## Stop Conditions

## Approval Boundary

## Execution Summary

## Self-Reflection / Instruction Improvements
```

For small, clear fixes, do the work directly and summarize the reasoning.

## Yjs and CRDT Rules

- Use CRDT operations such as `Y.Map.set`, `Y.Array.push`, and `Y.Text.insert`.
- Do not directly mutate Yjs-observed objects.
- Wrap multi-step writes in `yDoc.transact(() => { ... })`.
- Test with real `Y.Doc` instances. Do not mock Yjs unless there is a specific reason.
- Preserve local-first behavior: the app should remain useful offline and sync when connectivity/auth allows.

```typescript
const docs = room.getDocuments();
docs.get(id);
docs.getUndeleted();

docs.new({ text: 'hello' });
docs.set(doc);
docs.delete(id, ttlMs);

yDoc.transact(() => {
  yMap.set('a', 1);
  yMap.set('b', 2);
});
```

## Cross-Document References

`_ref` values use this format:

```text
${authServer}|${collectionKey}|${roomId}|${documentId}
```

Use `buildRef()` from `@eweser/shared` to construct refs.

## Auth and Security

- Auth is Hono + better-auth + Drizzle + PostgreSQL.
- Use Drizzle query APIs or parameterized SQL. Do not interpolate user input into raw SQL.
- Validate route inputs with Zod or the local validation pattern.
- Verify JWTs and room access tokens on protected routes.
- Keep room access grants explicit and auditable.
- Read `packages/auth-server-hono/AGENTS.md` before auth-server changes.

## Testing Expectations

- Run the narrowest relevant tests first.
- Run `npm run check` or `npm run build` from the root when changes affect shared code, package boundaries, or build config.
- Run `npm test` before committing when practical.
- Run Cypress tests for auth flows, sync flows, or cross-app user workflows.
- If tests cannot be run, state exactly why and what risk remains.

## Documentation Expectations

- Keep `README.md`, `ARCHITECTURE.md`, and package READMEs aligned with current code.
- Update docs when commands, ports, package names, auth behavior, or user-facing flows change.
- Do not preserve stale migration notes in current-state docs. Move historical notes under `docs/ai/` or ADRs when needed.

## Session Memory

At the end of each session, save a concise summary using the Eweser MCP memory tool:

```text
eweser_save_memory({ title: "Session: ...", summary: "...", memoryType: "session" })
```

Never save secrets, `.env` contents, tokens, cookies, JWTs, or credential-bearing terminal output to ordinary memory. If credentials were involved, summarize the integration and safety action only, not the secret value.
