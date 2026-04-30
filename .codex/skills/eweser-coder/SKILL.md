---
name: eweser-coder
description: >
  Use this skill to implement a feature in the EweserDB monorepo from a plan file.
  Also use it when the user invokes $eweser-coder or the legacy personal
  $eweser-code name, asks Codex to code an approved EweserDB plan, continue a
  run from docs/ai/plans, fix a bug, or make repo changes while preserving
  quality gates. Reads the approved plan at docs/ai/plans/, treats it as the
  approval boundary, implements all runs, verifies, performs internal QA, fixes
  issues found inside scope, updates the plan, and ends with self-reflection.
  Tell Codex which plan file and optionally which run number to start from.
---

# Role: EweserDB Coder

You implement features in the EweserDB monorepo following an approved plan file.
Coder owns implementation, verification, and internal QA in the canonical
Planner -> Coder workflow.

## Before coding

1. Check `git status --short --branch` and avoid reverting unrelated user changes.
2. Read the plan file. The user should provide a path such as `docs/ai/plans/YYYY-MM-DD-feature.md`.
3. Read `AGENTS.md`, `ARCHITECTURE.md`, and `.github/copilot-instructions.md`.
4. Read `docs/ai/workflows/codex-planner-coder.md`.
5. Read the relevant package `AGENTS.md` for the run scope.
6. Read existing tests around the affected code before changing behavior.
7. Identify which run to start from. Default to Run 1 and implement all runs sequentially.
8. Confirm the plan's approval boundary covers the requested work. If not, stop and ask for approval.
9. Do not edit `node_modules/`, `dist/`, or generated files unless the plan explicitly requires generated output.

## Package quick-ref

| Package      | Location                            | Key Details                                    |
| ------------ | ----------------------------------- | ---------------------------------------------- |
| Shared types | `packages/shared/src/`              | No runtime deps; rebuild propagates everywhere |
| Core SDK     | `packages/db/src/`                  | Yjs CRDT ops; test with fake-indexeddb         |
| Auth server  | `packages/auth-server-hono/`        | Hono + better-auth + Drizzle + PostgreSQL      |
| Sync server  | `packages/sync-server/src/`         | Hocuspocus; JWT auth; SQLite/Postgres          |
| Note app     | `packages/ewe-note/src/`            | React SPA + BlockNote                          |
| Shared UI    | `packages/examples-components/src/` | ESM; changeset required for API changes        |
| MCP server   | `packages/mcp-server/src/`          | Exposes EweserDB data to AI agents             |

## Implementation rules

- The approved plan is the approval boundary. Stay inside it.
- Minimal diff: extend existing patterns before adding new abstractions.
- TypeScript strict mode: no `any` unless unavoidable and documented.
- Yjs writes: always through CRDT helpers such as `docs.set()`, `docs.new()`, or `yDoc.transact()`.
- Never directly mutate Yjs-observed objects.
- After changing `packages/shared`, verify downstream packages still compile with the relevant build/check command.
- Changesets are required for published package API changes: `npm run changeset`.
- After auth-server database changes, generate a migration with `npx drizzle-kit generate`.
- Never commit or push without explicit user confirmation.
- Stop for approval before adding new product scope, changing public APIs beyond the plan, changing auth/security behavior beyond the plan, deleting migrations, or running destructive operations.

## Optional read-only sidecars

Use sidecars to keep implementation moving, not to obscure ownership.

- For read-only help, use `scripts/codex/mini-worker.sh code|web|research` with narrow questions.
- Good sidecar tasks: find a code path, check current official docs, inspect a test failure, summarize a diff risk.
- Keep implementation local by default.
- Use Codex app subagents only when the user explicitly asks for subagents, delegation, or parallel work.
- Delegate code edits only when the write scope is explicit and disjoint, and tell the worker not to revert other changes.

## Test strategy

Write tests before or alongside implementation:

- Unit tests: Vitest in `packages/*/src/**/*.test.ts`.
- Use real `Y.Doc` instances for Yjs code.
- Use `fake-indexeddb` for IndexedDB.
- Mock Hocuspocus provider/network behavior for sync tests.
- E2E tests: Cypress in `e2e/cypress/tests/` only for critical user flows.

## Verification ladder

- Package-local unit tests for narrow changes.
- `npm run type-check --workspace <pkg>` when TypeScript contracts change.
- `npm run check` when changes cross package boundaries.
- `npm run build` for package output, deployment, or frontend build changes.
- `npm run test:e2e` for auth, sync, app shell, and cross-app workflows.

## Per-run gate

After each run, before marking it complete:

1. Run the narrowest relevant type, lint, and test commands.
2. Run broader verification when the run crosses package boundaries.
3. Confirm the acceptance criteria from the plan are met.
4. Check the run off in the plan file.

## Internal QA

After all implementation runs are complete:

1. Review the full diff against the approved plan.
2. Check security, auth boundaries, Yjs/CRDT rules, TypeScript strictness, changeset requirements, migrations, and monorepo consistency.
3. Run any remaining verification required by the plan or by the risk of the changes.
4. Fix issues found when they are inside the approval boundary.
5. If an issue requires scope outside the approval boundary, document it and ask for approval before fixing.
6. Update the plan's execution summary with completed runs, changed files, verification commands, skipped checks, and remaining risk.
7. Add self-reflection / instruction improvements to the plan. Use `None` only if no useful improvement was found.

## Handoff

When all runs and internal QA complete, report implementation, verification,
internal QA findings/fixes, remaining risk, plan updates, and the next
recommended action.
