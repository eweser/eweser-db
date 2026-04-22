# Plan: Artifact-Free Workspace Libraries

## Goal

Remove the monorepo's dependence on committed generated library artifacts for `@eweser/mcp`, `@eweser/shared`, and `@eweser/db`, while preserving clean-checkout runtime/build/test behavior and published package compatibility.

## Scope

- In:
  - `packages/mcp-server`, `packages/shared`, and `packages/db` package metadata, build scripts, and TypeScript/package export strategy
  - Root workspace scripts and CI-facing verification flow needed to make clean checkouts succeed without committed generated artifacts
  - Downstream consumer validation across apps/packages that import `@eweser/shared`, `@eweser/db`, and `@eweser/mcp`
  - Removal of committed generated type artifacts once source-based type resolution is proven
- Out:
  - User-facing feature changes
  - Runtime API redesign beyond what is necessary to change type/runtime resolution
  - Auth/data model changes, Yjs schema changes, or database migrations
  - E2E/product behavior work unrelated to workspace package consumption

## Current Findings

- `@eweser/mcp` was depending on a tracked generated declaration file at `packages/mcp-server/dist/lib.d.ts`, even though `dist/` is ignored.
- `@eweser/shared` exports runtime from `dist` and types from committed generated files under `types/`.
- `@eweser/db` exports runtime from `dist` and types from committed generated files under `types/`.
- Clean-checkout experiments confirmed that removing `shared/types` or `db/types` breaks downstream `type-check` and Vitest consumers today.
- Clean-checkout CI failures were caused by downstream packages/tests resolving workspace packages before their runtime/type artifacts existed.

## Architecture Review

- `packages/shared` is a core published package. Any export-path or type-surface change cascades into `packages/db`, `packages/auth-pages`, `packages/auth-server-hono`, `packages/ewe-note`, examples, and `packages/mcp-server`.
- `packages/db` is a published package consumed by apps and examples; package export changes must preserve public import paths.
- `packages/mcp-server` is also published-facing and currently used by `auth-server-hono`; export/type resolution changes must preserve that consumption path.
- No DB migrations are expected.
- No Yjs/CRDT structure changes are expected.
- Changes to published package APIs/packaging require changesets. At minimum, plan for `@eweser/shared` and `@eweser/db`; if `@eweser/mcp` export surface or packaging contract changes materially, include it as well.

## Acceptance Criteria

- From a clean checkout with generated artifacts removed, the workspace can pass:
  - `npm run type-check`
  - `npm run test:unit`
- `@eweser/mcp`, `@eweser/shared`, and `@eweser/db` no longer require committed generated type artifacts in git for local workspace consumers to type-check.
- Published package runtime entrypoints remain build-artifact-based for distribution, but workspace type resolution uses source or an equivalent artifact-free local strategy.
- Any already-completed `@eweser/mcp` work is re-validated under the final unified approach.
- Required changesets are added for published package contract changes.

## Runs

### Run 1: Normalize Workspace Resolution Strategy

- **Recommended tier**: strong
- **Reason**: Cross-cutting packaging decision affecting three libraries and all downstream consumers. This run sets the contract the rest of the implementation follows.
- [x] Decide and document one consistent local-consumption rule for all three packages:
  - Runtime JS for published packages remains built from `dist`
  - Local workspace types resolve from source files rather than committed generated declarations
  - Root scripts/CI prebuild only the runtime artifacts actually needed by tests/apps
- [ ] Audit `package.json` fields for all three packages:
  - `exports`
  - `types`
  - `typesVersions`
  - `files`
  - `main` / `module` / `bin`
- [ ] Identify whether any consumer requires subpath exports or generated declaration-only packaging that would block source-based types
- [ ] Define the cleanup target for committed artifacts:
  - `packages/mcp-server/dist/lib.d.ts`
  - `packages/shared/types/**`
  - `packages/db/types/**`
- [ ] Files to change:
  - `package.json`
  - `packages/mcp-server/package.json`
  - `packages/shared/package.json`
  - `packages/db/package.json`
  - possibly package-local tsconfig/build configs
- [ ] Tests to write:
  - None in this run; this is packaging strategy and script alignment

### Run 2: Convert `@eweser/mcp` to Artifact-Free Local Types

- **Recommended tier**: coder
- **Reason**: A narrower package-level packaging refactor, but already partially implemented and needs to be reconciled with the final strategy.
- [x] Reconcile the in-progress `@eweser/mcp` work with the chosen strategy from Run 1
- [ ] Ensure `@eweser/mcp` local type resolution points at source, not committed generated declarations
- [ ] Keep CLI/runtime packaging working from built JS in `dist`
- [ ] Remove dependency on tracked `dist/lib.d.ts`
- [ ] Confirm `auth-server-hono` can type-check and test against `@eweser/mcp` in a clean workspace
- [ ] Files to change:
  - `packages/mcp-server/package.json`
  - `packages/mcp-server/tsconfig.json`
  - `packages/mcp-server/src/lib.ts`
  - any auxiliary mcp tsconfig/build files if still needed
  - remove `packages/mcp-server/dist/lib.d.ts`
- [ ] Tests to write:
  - No new tests required unless package-level packaging tests are introduced
  - Verification via `npm run build --workspace @eweser/mcp`, `npm --workspace @eweser/mcp run type-check`, and downstream consumer checks

### Run 3: Convert `@eweser/shared` to Artifact-Free Local Types

- **Recommended tier**: strong
- **Reason**: This package sits at the bottom of the dependency graph and changes here cascade everywhere.
- [x] Change `@eweser/shared` to expose local workspace types from source instead of committed `types/**`
- [ ] Preserve publish-time runtime packaging and publishable type availability
- [ ] Remove reliance on committed `packages/shared/types/**` for local consumers
- [ ] Verify direct consumers:
  - `@eweser/db`
  - `auth-pages`
  - `auth-server-hono`
  - `ewe-note`
  - `mcp-server`
- [ ] Remove generated tracked type files if no longer needed
- [ ] Add changeset for `@eweser/shared`
- [ ] Files to change:
  - `packages/shared/package.json`
  - `packages/shared/tsconfig.json`
  - package-local build scripts if needed
  - remove/update `packages/shared/types/**`
- [ ] Tests to write:
  - No new unit tests expected
  - Verification through downstream `type-check` and test runs

### Run 4: Convert `@eweser/db` to Artifact-Free Local Types

- **Recommended tier**: strong
- **Reason**: This package is widely consumed by apps/examples and has both build and generated type trees.
- [x] Change `@eweser/db` to expose local workspace types from source instead of committed `types/**`
- [ ] Preserve publish-time JS bundle outputs in `dist`
- [ ] Remove reliance on committed `packages/db/types/**` for local consumers
- [ ] Verify direct consumers:
  - `auth-pages`
  - `ewe-note`
  - `examples-components`
  - example apps
- [ ] Add changeset for `@eweser/db`
- [ ] Files to change:
  - `packages/db/package.json`
  - `packages/db/tsconfig.json`
  - `packages/db/tsconfig.build.json`
  - `packages/db/vite.config.js` if resolution changes require dedupe/aliasing updates
  - remove/update `packages/db/types/**`
- [ ] Tests to write:
  - No new unit tests expected
  - Verification through downstream `type-check` and test runs

### Run 5: Root Script and CI Hardening

- **Recommended tier**: coder
- **Reason**: After package-level changes, the root workflow must reflect the new dependency model so clean checkouts behave deterministically.
- [x] Update root scripts so local CI paths build only the required runtime artifacts ahead of workspace `type-check` / `test:unit`
- [ ] Remove now-unnecessary artifact assumptions from root scripts
- [ ] Confirm the workflow works when all generated package artifacts are deleted before execution
- [ ] Files to change:
  - root `package.json`
  - possibly `.github/workflows/quality.yaml`
  - possibly `.github/workflows/pre-deploy.yaml`
- [ ] Tests to write:
  - None; verification is command-level

### Run 6: Clean-Checkout Verification and Artifact Removal Sweep

- **Recommended tier**: coder
- **Reason**: Final guardrail run to prove the repo no longer depends on committed generated package artifacts.
- [x] Delete generated package artifacts locally before validation:
  - `packages/mcp-server/dist/*`
  - `packages/shared/dist/*`
  - `packages/shared/types/*`
  - `packages/db/dist/*`
  - `packages/db/types/*`
- [ ] Run verification suite:
  - `npm run type-check`
  - `npm run test:unit`
  - any package-specific build commands required by distribution packages
- [ ] Confirm git diff only contains intentional source/package/script changes and removal of committed generated artifacts
- [ ] Confirm the already-done `@eweser/mcp` work still holds under the unified strategy
- [ ] Files to change:
  - cleanup/removal of committed generated artifacts
  - changesets directory if required
- [ ] Tests to write:
  - None; this is verification and cleanup

## Execution Summary

| Run | Title                                                  | Tier   | Depends on | Can parallelise with |
| --- | ------------------------------------------------------ | ------ | ---------- | -------------------- |
| 1   | Normalize Workspace Resolution Strategy                | strong | None       | None                 |
| 2   | Convert `@eweser/mcp` to Artifact-Free Local Types     | coder  | 1          | None                 |
| 3   | Convert `@eweser/shared` to Artifact-Free Local Types  | strong | 1          | None                 |
| 4   | Convert `@eweser/db` to Artifact-Free Local Types      | strong | 1, 3       | None                 |
| 5   | Root Script and CI Hardening                           | coder  | 2, 3, 4    | None                 |
| 6   | Clean-Checkout Verification and Artifact Removal Sweep | coder  | 2, 3, 4, 5 | None                 |

## Notes

- There is a strong dependency chain here: `shared` feeds `db`, and both feed multiple apps. In practice this is mostly sequential work, not a good parallel split.
- The safest order is: decide contract once, finish `mcp`, then `shared`, then `db`, then root workflow hardening, then final cleanup.
- Because `shared` and `db` are published packages, do not remove generated publish-time artifacts for npm distribution unless publish packaging is explicitly replaced with an equivalent supported output.
