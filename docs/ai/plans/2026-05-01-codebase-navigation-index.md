# Plan: Codebase Navigation Index

## Goal

Create a maintained trunk-to-leaf code navigation system so humans and AI agents
can quickly understand where code lives, what each folder owns, and which files
are the safest starting points before editing.

## Scope

- In: a repo-local indexing spec, `INDEX.md` files at root/package/source
  trunks, selected high-value source headers, a deterministic checker, CI
  wiring, and a repeatable ratchet workflow for later leaf coverage.
- Out: generated semantic embeddings, vector search, broad source rewrites,
  public package API changes, runtime behavior changes, database migrations,
  and replacing `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, or ADRs.

## Research Summary

- Verified codebase facts:
  - The repo has about 970 TypeScript/JavaScript files under `packages` and
    `examples`, so requiring headers everywhere in the first pass is too noisy.
  - Highest code density is in `packages/ewe-note`, `packages/auth-server-hono`,
    `packages/shared`, and `packages/db`.
  - Package docs already exist in several `README.md` files, and `AGENTS.md`
    files already carry policy for root, `db/shared`, `auth-server-hono`, and
    `ewe-note/examples`.
- External facts used for design:
  - Karpathy's LLM Wiki pattern argues for persistent Markdown synthesis rather
    than rediscovering context from raw files on every query:
    https://gist.github.com/karpathy
  - Architecture-as-code guidance recommends plain-text architecture docs in
    version control, reviewed with code, and updated during development:
    https://docs.spryker.com/docs/dg/dev/architecture/architecture-as-code.html
  - C4 uses named hierarchical abstraction levels, which supports this plan's
    trunk-to-leaf navigation shape: https://c4model.com/
  - ADR guidance confirms ADRs should record decisions and consequences, not
    replace code navigation maps:
    https://doc.wikimedia.org/codex/1.13.1/using-codex/adrs/overview.html and
    https://mitlibraries.github.io/guides/misc/adr.html
  - Source comments can drift. Research on comment links found decay and rare
    updates, and comment-consistency research calls outdated comments harmful:
    https://arxiv.org/abs/1901.07440 and
    https://arxiv.org/abs/2403.00251
  - GitHub Copilot custom-instruction docs recommend scoping repository,
    path-specific, and agent instructions to avoid overloading global context;
    GitHub also notes AI may not follow instructions deterministically:
    https://docs.github.com/en/copilot/concepts/prompting/response-customization
  - Claude Code memory docs recommend concise, well-structured project memory,
    path-scoped rules for large projects, and moving detailed procedures out of
    always-loaded root context:
    https://code.claude.com/docs/en/memory
  - Aider's repo map shows the complementary value of generated symbol maps:
    concise file/class/function signatures help an LLM choose which files to
    inspect, and graph ranking keeps context within a token budget:
    https://aider.chat/docs/repomap.html
  - Sourcegraph Cody docs similarly emphasize that high-quality coding answers
    depend on relevant codebase context from keyword search, repository search,
    and code graph retrieval:
    https://sourcegraph.com/docs/cody/core-concepts/context
  - A 2026 AGENTS.md study is a caution against bloated context files:
    repository context files can encourage broader exploration and instruction
    following, but unnecessary requirements may reduce task success and increase
    inference cost. Keep root instructions minimal and navigational docs
    on-demand: https://arxiv.org/abs/2602.11988
  - Recent Codebase-Memory research suggests Tree-sitter knowledge graphs can
    reduce token and tool-call costs for codebase exploration, but that is a
    heavier future layer than this first implementation:
    https://arxiv.org/abs/2603.27277

## Decisions

- Use `INDEX.md` for code navigation maps. Keep `README.md` for package/user
  documentation and `AGENTS.md` for agent policy.
- Use selective source headers, not file headers everywhere.
- CI fails only on trunk index coverage, malformed index files, broken local
  index links, and malformed existing source headers.
- File-header coverage is advisory at first and can be ratcheted later.
- Do not add a new dependency for the checker. Use Node standard library.
- Do not use LLM-only auto-maintenance. Index changes must be plain Markdown in
  Git and reviewed in normal PRs.
- Treat the hand-written `INDEX.md` tree as the human-readable navigation layer.
  A generated symbol map can be added later as a separate machine-readable layer
  if the lightweight system proves useful.
- Keep always-loaded instructions short. Put navigation in on-demand index
  files, not in a giant root `AGENTS.md`/Copilot instruction block.

## Assumptions / Open Questions

- Assumption: the first coder pass should deliver practical navigation value
  without attempting complete leaf coverage.
- Assumption: comments-only source header changes do not require changesets
  because they do not alter published package APIs or behavior.
- Assumption: CI should include `code-index:check` in the existing quality
  workflow but not in `npm run check` until the team confirms it is not noisy.
- Assumption: generated symbol maps, Tree-sitter knowledge graphs, or MCP
  code-memory services are promising but should not block the first docs-as-code
  implementation.
- Open question: after the first pass, should `code-index:check` become part of
  root `npm run check`? Defer until Run 3 has proven low noise.

## Index Contract

Every `INDEX.md` created by this plan must use these headings in this order:

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

Selected source files may use this header format:

```typescript
/**
 * Purpose: <plain-English reason this file exists.>
 * Exports: <main exports or "side-effect entry point".>
 * Touches: <systems/data/routes this file affects.>
 * Read before editing: <nearby index, ADR, AGENTS.md, or key file.>
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

## Runs

## Run Order And Manual Test Handoffs

Run order: sequential. Run 5 is repeatable and can continue later during daily
maintenance. Do not parallelize Runs 1-4 because each builds on the prior
format and checker behavior.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with delivered behavior, commands needed, manual steps,
expected results, known gaps, and residual risk.

### Run 1: Index Spec And Agent Rules

- **Id**: `run-1`
- **Title**: `Index Spec And Agent Rules`
- **Deliverable**:
  - The code-indexing contract is documented and agent instructions point to it.
- **Files**:
  - `docs/ai/code-indexing.md`: create with the Index Contract above, examples,
    non-goals, source-header rules, checker expectations, and update triggers.
  - `AGENTS.md`: add a short "Code Navigation Index" section under Codex
    Workflow or Documentation Expectations.
  - `.github/copilot-instructions.md`: add the same short rule for Copilot.
  - `docs/ai/plans/2026-05-01-codebase-navigation-index.md`: update execution
    summary after completion.
- **Steps**:
  - [ ] Create `docs/ai/code-indexing.md` with the exact required headings and
        source header format from this plan.
  - [ ] Include an example root/package index and an example source header.
  - [ ] State that `INDEX.md` is navigational and does not replace `README.md`,
        `AGENTS.md`, `ARCHITECTURE.md`, or ADRs.
  - [ ] Add root agent instructions: before broad exploration, read nearest
        `INDEX.md`; when changing a folder's responsibilities, contracts,
        entry points, auth/security behavior, Yjs behavior, public package API,
        or test command, update the nearest index/header.
  - [ ] Add equivalent Copilot instruction.
- **Tests**:
  - Documentation-only review.
- **Verification**:
  - `npx prettier --check docs/ai/code-indexing.md AGENTS.md .github/copilot-instructions.md`
- **Manual test handoff**:
  - Not needed: this run establishes docs and agent conventions only.
- **Done when**:
  - A coder can open `docs/ai/code-indexing.md` and implement an `INDEX.md` or
    source header without re-deciding the format.
- **Dependencies**: None.
- **Model tier**: `coder`
- **Risk level**: `low`

### Run 2: Seed Trunk And Package Indexes

- **Id**: `run-2`
- **Title**: `Seed Trunk And Package Indexes`
- **Deliverable**:
  - A useful initial navigation tree covering repository root, package trunks,
    example trunks, and active source roots.
- **Files**:
  - `INDEX.md`: create root navigation index.
  - `packages/INDEX.md`: create package map.
  - `examples/INDEX.md`: create examples map.
  - `docs/INDEX.md`: create docs map for architecture, workflows, plans, ADRs,
    deployment docs, and personal docs.
  - `scripts/INDEX.md`: create scripts map.
  - `e2e/INDEX.md`: create E2E map.
  - `cypress/INDEX.md`: create Cypress support/downloads map if useful after
    inspection; otherwise mention Cypress from `e2e/INDEX.md` only.
  - `packages/aggregator/INDEX.md`
  - `packages/aggregator/src/INDEX.md`
  - `packages/app/INDEX.md`
  - `packages/app/src/INDEX.md`
  - `packages/auth-server-hono/INDEX.md`
  - `packages/auth-server-hono/src/INDEX.md`
  - `packages/db/INDEX.md`
  - `packages/db/src/INDEX.md`
  - `packages/ewe-note/INDEX.md`
  - `packages/ewe-note/src/INDEX.md`
  - `packages/examples-components/INDEX.md`
  - `packages/examples-components/src/INDEX.md`
  - `packages/landing/INDEX.md`
  - `packages/landing/src/INDEX.md`
  - `packages/logger/INDEX.md`
  - `packages/logger/src/INDEX.md`
  - `packages/mcp-server/INDEX.md`
  - `packages/mcp-server/src/INDEX.md`
  - `packages/shared/INDEX.md`
  - `packages/shared/src/INDEX.md`
  - `packages/sync-server/INDEX.md`
  - `packages/sync-server/src/INDEX.md`
  - `examples/example-aggregator/INDEX.md`
  - `examples/example-basic/INDEX.md`
  - `examples/example-interop-flashcards/INDEX.md`
  - `examples/example-interop-notes/INDEX.md`
  - `examples/example-multi-room/INDEX.md`
  - `examples/react-native/INDEX.md`
  - `docs/ai/plans/README.md`: keep current plan row accurate if status wording
    changes.
  - `docs/ai/plans/2026-05-01-codebase-navigation-index.md`: update execution
    summary after completion.
- **Steps**:
  - [ ] For each index, read the nearest `README.md`, `package.json`,
        `AGENTS.md`, and top-level `src` files before writing.
  - [ ] Keep each index concise: target 40-90 lines for package/source indexes,
        shorter for small examples.
  - [ ] Root `INDEX.md` must link to `ARCHITECTURE.md`, `README.md`,
        `LOCAL_DEVELOPMENT.md`, `AGENTS.md`, package/example/docs/script indexes,
        and current high-level workflows.
  - [ ] `packages/INDEX.md` must show package relationships:
        `shared -> db -> examples-components -> examples/ewe-note`, plus auth
        API, app, sync server, aggregator, MCP server, landing, logger.
  - [ ] Each package index must include its package name, purpose, public entry
        points, key scripts, local AGENTS policy if present, and source index.
  - [ ] Each source index must summarize child folders and entry files without
        duplicating implementation detail.
  - [ ] Do not create indexes under `node_modules`, build outputs, downloads,
        generated artifacts, or hidden tool caches.
- **Tests**:
  - Documentation-only review.
- **Verification**:
  - `find . -path '*/node_modules' -prune -o -name INDEX.md -print | sort`
  - `npx prettier --check INDEX.md docs/INDEX.md scripts/INDEX.md e2e/INDEX.md packages/INDEX.md examples/INDEX.md "packages/**/INDEX.md" "examples/**/INDEX.md"`
  - Manual link spot-check from root to:
    - `packages/db/src/INDEX.md`
    - `packages/shared/src/INDEX.md`
    - `packages/auth-server-hono/src/INDEX.md`
    - `packages/ewe-note/src/INDEX.md`
    - `packages/mcp-server/src/INDEX.md`
- **Manual test handoff**:
  - Ask a separate tester or agent to answer these using `INDEX.md` traversal
    before using `rg`:
    - Where do I edit sync token issuance?
    - Where do I edit shared document schemas?
    - Where do I edit note import/export?
    - Where do I edit MCP memory tools?
    - Where do I edit public indexing/search?
  - Expected result: each answer reaches a package/source index and then a small
    set of candidate files.
- **Done when**:
  - A new agent can navigate from root `INDEX.md` to the relevant package/source
    index for the five handoff questions above.
- **Dependencies**: `run-1`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 3: Checker And CI

- **Id**: `run-3`
- **Title**: `Checker And CI`
- **Deliverable**:
  - `npm run code-index:check` validates the initial index system and runs in
    GitHub Actions quality checks.
- **Files**:
  - `scripts/code-index/check-code-index.mjs`: create checker.
  - `scripts/code-index/fixtures/valid/INDEX.md`: create minimal fixture if
    fixture tests are implemented.
  - `scripts/code-index/fixtures/invalid/INDEX.md`: create malformed fixture if
    fixture tests are implemented.
  - `scripts/code-index/check-code-index.test.mjs` or
    `scripts/code-index/check-code-index.test.ts`: optional only if the checker
    logic becomes complex enough to merit tests.
  - `package.json`: add `code-index:check`.
  - `.github/workflows/quality.yaml`: add `npm run code-index:check` as a
    separate step after install/build setup and before expensive checks if
    practical.
  - `docs/ai/code-indexing.md`: document command, failure modes, and advisory
    coverage output.
  - `docs/ai/plans/2026-05-01-codebase-navigation-index.md`: update execution
    summary after completion.
- **Checker behavior**:
  - Must ignore `node_modules`, `.git`, build outputs, `dist`, `coverage`,
    Cypress downloads, hidden tool caches, and package manager caches.
  - Must require `INDEX.md` for these trunks:
    - `.`
    - `docs`
    - `scripts`
    - `e2e`
    - `packages`
    - `examples`
    - each active workspace in `package.json` under `packages/*` and
      `examples/*`, excluding missing/deprecated workspaces only if documented
      in script config.
    - each active workspace `src` folder that exists.
  - Must validate every discovered `INDEX.md` has the required headings in the
    required order.
  - Must validate local Markdown links in `INDEX.md` point to existing files or
    directories, ignoring URL links and anchors.
  - Must validate present source headers match the fixed labels:
    `Purpose`, `Exports`, `Touches`, `Read before editing`.
  - Must not require source headers on all files.
  - Must print advisory source-header coverage by package/workspace.
  - Must exit nonzero for missing required indexes, malformed index headings,
    broken local links, and malformed existing source headers.
- **Steps**:
  - [ ] Implement checker with Node standard library only.
  - [ ] Keep required trunk paths in a clearly named constant.
  - [ ] Derive active workspace package/example folders from root
        `package.json` globs where practical.
  - [ ] Add actionable error messages with file paths and missing/broken item.
  - [ ] Add `code-index:check` script.
  - [ ] Add GitHub Actions quality workflow step.
  - [ ] Document how to run and how to interpret advisory coverage.
- **Tests**:
  - If fixture tests are added: run them with Node's built-in test runner or
    Vitest, matching repo patterns.
  - At minimum, manually verify checker failure and success paths.
- **Verification**:
  - `npm run code-index:check`
  - Temporarily break one local copy of an index heading, run checker, confirm a
    precise error, then restore before finalizing.
  - Temporarily break one local Markdown link, run checker, confirm a precise
    error, then restore before finalizing.
  - `npx prettier --check scripts/code-index/check-code-index.mjs package.json .github/workflows/quality.yaml docs/ai/code-indexing.md`
- **Manual test handoff**:
  - Tester runs `npm run code-index:check`, sees success, then reviews the
    printed coverage report for sanity.
- **Done when**:
  - CI can catch stale/malformed index structure without requiring full
    source-header coverage.
- **Dependencies**: `run-2`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: Pilot High-Value Source Headers

- **Id**: `run-4`
- **Title**: `Pilot High-Value Source Headers`
- **Deliverable**:
  - A small source-header pilot on files where headers materially improve agent
    navigation.
- **Files**:
  - `packages/db/src/index.ts`
  - `packages/db/src/room.ts`
  - `packages/db/src/types.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/collections/index.ts`
  - `packages/auth-server-hono/src/index.ts`
  - `packages/auth-server-hono/src/routes/access-grant.ts`
  - `packages/auth-server-hono/src/routes/agents.ts`
  - `packages/auth-server-hono/src/routes/auth.ts`
  - `packages/auth-server-hono/src/routes/connect-ai.ts`
  - `packages/auth-server-hono/src/routes/mcp.ts`
  - `packages/auth-server-hono/src/routes/oauth.ts`
  - `packages/sync-server/src/index.ts`
  - `packages/aggregator/src/index.ts`
  - `packages/mcp-server/src/index.ts`
  - `packages/mcp-server/src/tools.ts`
  - `packages/ewe-note/src/App.tsx`
  - `packages/ewe-note/src/app/notes-room.tsx` if present after inspection.
  - `packages/ewe-note/src/imports/*` entry files if present after inspection.
  - `docs/ai/plans/2026-05-01-codebase-navigation-index.md`: update execution
    summary after completion.
- **Steps**:
  - [ ] Confirm each listed file exists before editing. If a file moved, update
        the nearest package/source `INDEX.md` instead of guessing.
  - [ ] Add the exact source header format from the Index Contract.
  - [ ] Keep each header factual, plain English, and under 8 lines.
  - [ ] Prefer references to nearby `INDEX.md`/`AGENTS.md` over long prose.
  - [ ] Do not alter imports, exports, runtime logic, formatting beyond comments,
        or public APIs.
  - [ ] If a listed file turns out to be a mechanical re-export only, skip it
        and record why in the plan execution summary.
- **Tests**:
  - No product tests required for comments-only changes.
- **Verification**:
  - `npm run code-index:check`
  - `npm run lint -- --quiet` if supported. If unsupported, run `npm run lint`
    or document why lint was skipped.
  - `npx prettier --check` on touched source files.
- **Manual test handoff**:
  - Tester starts from root `INDEX.md`, finds each pilot file category, opens the
    file header, and confirms the header answers:
    - why this file exists;
    - what it exports or starts;
    - what system it touches;
    - what to read before editing.
- **Done when**:
  - The checker accepts all pilot headers and no source runtime diff exists
    beyond comments.
- **Dependencies**: `run-3`.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 5: Daily Ratchet Workflow

- **Id**: `run-5`
- **Title**: `Daily Ratchet Workflow`
- **Deliverable**:
  - A repeatable maintenance workflow for gradually improving leaf indexes and
    selected headers without blocking normal product work.
- **Files**:
  - `docs/workflows/code-index-maintenance.md`: create a human/agent workflow.
  - `docs/ai/code-indexing.md`: link to the workflow and define ratchet policy.
  - `scripts/code-index/check-code-index.mjs`: add optional coverage baseline
    support only if simple and useful.
  - `scripts/code-index/baseline.json`: create only if baseline support is
    implemented in this run.
  - `.github/pull_request_template.md`: add a checkbox only if a PR template
    already exists or the user explicitly wants one; otherwise leave out.
  - `docs/ai/plans/2026-05-01-codebase-navigation-index.md`: update execution
    summary after completion.
- **Steps**:
  - [ ] Define the daily unit:
        pick one folder, read its parent/child indexes and relevant code, update
        the nearest `INDEX.md`, add or refine up to five high-value source
        headers, run `npm run code-index:check`, and record gaps.
  - [ ] Define "coverage must not regress" as a human review rule first.
  - [ ] Implement `baseline.json` only if the checker can compare current
        advisory source-header counts without creating noisy failures.
  - [ ] Add examples for good daily targets:
        `packages/logger/src`, `packages/sync-server/src`,
        `packages/mcp-server/src`, then deeper `ewe-note` folders.
  - [ ] Document that product changes touching indexed folders must update
        nearby indexes in the same PR.
- **Tests**:
  - Checker fixture tests only if baseline comparison is implemented.
- **Verification**:
  - `npm run code-index:check`
  - `npx prettier --check docs/workflows/code-index-maintenance.md docs/ai/code-indexing.md scripts/code-index/check-code-index.mjs`
- **Manual test handoff**:
  - Run a dry ratchet pass on `packages/logger/src` or
    `packages/sync-server/src`, limited to documentation/header edits, and
    confirm it can be completed in under 30 minutes.
- **Done when**:
  - A future coder can run a small daily index improvement without re-planning.
- **Dependencies**: `run-4`.
- **Model tier**: `fast`
- **Risk level**: `low`

### Run 6: Evaluate Generated Symbol Map

- **Id**: `run-6`
- **Title**: `Evaluate Generated Symbol Map`
- **Deliverable**:
  - A short research spike deciding whether EweserDB should add a generated
    machine-readable repo map alongside the human-maintained `INDEX.md` tree.
- **Files**:
  - `docs/ai/research/YYYY-MM-DD-generated-symbol-map.md`: create research note
    with findings, options, recommendation, and next-plan outline if warranted.
  - `docs/ai/code-indexing.md`: add a brief "Future generated layer" note only
    if the spike produces a clear recommendation.
  - `docs/ai/plans/2026-05-01-codebase-navigation-index.md`: update execution
    summary after completion.
- **Steps**:
  - [ ] Review whether existing TypeScript tooling in the repo can produce a
        concise file/export/symbol map without new runtime dependencies.
  - [ ] Compare three options:
        no generated map yet; simple TypeScript AST/export map; Tree-sitter or
        language-server-backed graph in a future plan.
  - [ ] Define what the generated map would be used for:
        agent orientation, impact analysis, search hints, or CI drift checks.
  - [ ] Estimate maintenance cost and token/runtime cost.
  - [ ] Recommend either "defer", "add a simple generated map", or "write a new
        plan for graph-backed code memory".
- **Tests**:
  - Research-only; no product tests.
- **Verification**:
  - If a small local experiment is run, keep it read-only or write only to a
    temporary ignored path, then document command/output summary in the research
    note.
- **Manual test handoff**:
  - Not needed unless the spike recommends implementation.
- **Done when**:
  - The team has a clear yes/no/later recommendation for generated repo maps,
    separate from the human-authored `INDEX.md` rollout.
- **Dependencies**: `run-5`.
- **Model tier**: `strong`
- **Risk level**: `low`

## Stop Conditions

Stop and ask for user approval if:

- The coder wants to rename the convention away from `INDEX.md`.
- The coder wants to add a third-party parser or documentation generator.
- The checker becomes noisy enough that unrelated product work would be blocked.
- Implementing the plan appears to require editing hundreds of source files.
- The coder wants to implement generated symbol maps, Tree-sitter graphs, or MCP
  code-memory services before Runs 1-5 are complete.
- Existing package structure has moved enough that the file list in this plan is
  materially wrong.
- Any product behavior change, public package API change, migration,
  auth/security behavior change, secret handling, destructive git operation, or
  direct push to `main` appears necessary.

## Approval Boundary

Approval of this plan authorizes Coder to create and update navigation docs,
`INDEX.md` files, selected source comments, a Node-based validation script,
optional checker fixtures/tests, npm script wiring, GitHub Actions quality
workflow wiring, formatting, internal QA, and this plan's execution summary.

Approval does not authorize product behavior changes, broad refactors, new
runtime dependencies, generated semantic index services, published package API
changes, database migrations, secret handling, destructive git operations,
direct pushes to `main`, or a repository-wide source-header sweep.

## Execution Summary

| Run     | Status   | Files Changed                                                                                                           | Verification                                                                                                                                                                                                                                            | Notes                                                                                                                                                                                                                                               |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-1` | Complete | `docs/ai/code-indexing.md`, `AGENTS.md`, `.github/copilot-instructions.md`                                              | `npx prettier --check docs/ai/code-indexing.md AGENTS.md .github/copilot-instructions.md`                                                                                                                                                               | Added index contract, examples, checker expectations, source-header rules, and agent/Copilot update triggers.                                                                                                                                       |
| `run-2` | Complete | Root/trunk/workspace `INDEX.md` files under `.`, `docs`, `scripts`, `e2e`, `cypress`, `packages`, and `examples`        | `find . -path '*/node_modules' -prune -o -name INDEX.md -print \| sort`; `npx prettier --check INDEX.md docs/INDEX.md scripts/INDEX.md e2e/INDEX.md packages/INDEX.md examples/INDEX.md "packages/**/INDEX.md" "examples/**/INDEX.md"`                  | Seeded root, package, source, example, and example source navigation indexes. Included active eslint config workspaces and example `src` indexes so checker coverage matches active workspaces.                                                     |
| `run-3` | Complete | `scripts/code-index/check-code-index.mjs`, `package.json`, `.github/workflows/quality.yaml`, `docs/ai/code-indexing.md` | `npm run code-index:check`; temporary malformed heading failure confirmed; temporary broken link failure confirmed; `npx prettier --check scripts/code-index/check-code-index.mjs package.json .github/workflows/quality.yaml docs/ai/code-indexing.md` | Added Node standard-library checker, root npm script, and quality workflow step. Coverage is advisory only.                                                                                                                                         |
| `run-4` | Complete | Pilot headers in SDK/shared/auth/sync/aggregator/MCP/Ewe Note entry points and route files                              | `npm run code-index:check`; `npm run lint -- --quiet`; `npx prettier --check` on touched source files                                                                                                                                                   | Added comments only. `packages/ewe-note/src/app/notes-room.tsx` did not exist; used existing `packages/ewe-note/src/notes-room.tsx`. No `packages/ewe-note/src/imports/*` TS entry files existed, only SVG assets, so imports headers were skipped. |
| `run-5` | Complete | `docs/workflows/code-index-maintenance.md`, `docs/ai/code-indexing.md`                                                  | `npm run code-index:check`; `npx prettier --check docs/workflows/code-index-maintenance.md docs/ai/code-indexing.md scripts/code-index/check-code-index.mjs`                                                                                            | Documented daily unit, good targets, non-regression review rule, and product-change update requirement. Baseline JSON was not added because advisory coverage is simple and nonblocking.                                                            |
| `run-6` | Complete | `docs/ai/research/2026-05-01-generated-symbol-map.md`, `docs/ai/code-indexing.md`                                       | Research-only; no local experiment run                                                                                                                                                                                                                  | Recommendation: defer generated maps; consider a future TypeScript export-map plan after the manual index layer proves useful.                                                                                                                      |

### Manual Test Handoffs

- `run-1`: Not needed; documentation convention only.
- `run-2`: A tester should answer these by starting at root `INDEX.md` before
  using `rg`: sync token issuance, shared document schemas, note import/export,
  MCP memory tools, and public indexing/search. Expected result: traversal
  reaches package/source indexes and a small candidate file set.
- `run-3`: Run `npm run code-index:check`; expected result is success plus an
  advisory source-header coverage report.
- `run-4`: Start from root `INDEX.md`, navigate to each pilot file category, and
  confirm the file header states purpose, exports, touched systems, and what to
  read before editing.
- `run-5`: Dry-run one daily ratchet pass on `packages/logger/src` or
  `packages/sync-server/src`; expected result is a small docs/header change that
  can be checked with `npm run code-index:check` in under 30 minutes.
- `run-6`: Not needed; research recommendation only.

### Internal QA

- Reviewed scope against the approval boundary: changes are navigation docs,
  comments, checker tooling, npm script wiring, CI wiring, and plan updates
  only.
- No product runtime behavior, public package API, database migration, secret
  handling, generated symbol-map implementation, or dependency addition was
  introduced.
- Source headers are selective and comments-only. The checker reports coverage
  but does not fail on low coverage.
- Existing user changes were preserved: `docs/ai/plans/README.md` was already
  modified before this run and was not edited.

### Remaining Risk

- Some package/source indexes are intentionally concise first-pass maps and will
  need normal maintenance as product work touches deeper folders.
- The GitHub Actions workflow still ignores docs-only PRs at the workflow
  trigger level, so code-index CI runs for code/script/package changes and
  manual dispatch, not for Markdown-only pull requests.

## Self-Reflection / Instruction Improvements

- For future code-index plans, explicitly list active workspace `src/INDEX.md`
  files for examples and small config packages if the checker will derive
  required coverage from workspace globs. That avoids a mismatch between a
  representative file list and the stricter checker contract.
