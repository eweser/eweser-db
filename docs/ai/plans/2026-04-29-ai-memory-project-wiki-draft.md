# Plan: AI Memory Project Wiki

## Goal

Implement a safe, Eweser-native Project Wiki strategy that turns approved
project memory into reviewable wiki drafts and user-owned canonical wiki pages
with strong provenance, deterministic behavior, and end-to-end manual test
coverage.

## Scope

- In: a canonical Project Wiki data model, dedicated shared collections,
  strategy/runtime plumbing for `project-wiki`, deterministic page generation,
  review/promotion flow, Markdown/Obsidian export, deterministic evaluation
  fixtures, docs, and manual test handoffs.
- In: project-scoped wiki behavior grounded in current Eweser memory sources,
  especially `conversations` records plus explicitly readable source rooms.
- Out: hosted processors, external summarization APIs, background auto-capture,
  vague freeform AI synthesis, team-wide workspace intelligence, and any design
  that makes PostgreSQL the canonical Project Wiki store.
- Out: writing generated wiki output back into personal `notes` rooms as the
  canonical storage model.

## Assumptions / Open Questions

- Assumption: the current AI memory MVP on this branch is the implementation
  base. `agent-journal` is implemented; `project-wiki` is still hard-rejected in
  Connect AI token setup and still marked pending in deterministic evaluation.
- Assumption: canonical product data that must interoperate across agents must
  live in EweserDB rooms and shared collection contracts, not only in
  auth-server PostgreSQL.
- Assumption: Project Wiki must preserve source provenance at the document level
  from source memory ids on first implementation. Block-level provenance is a
  possible later enhancement, not a prerequisite for this pass.
- Assumption: safe first-pass page generation must be deterministic and source
  bounded. If a proposed page cannot be built without inventing unsupported
  claims, that page must be deferred or reduced to an explicit source-backed
  index.
- Assumption: end-to-end manual testing may seed `memoryStrategyConfigs` and
  source memories directly in Eweser rooms or fixtures if the full settings
  authoring UX is not yet implemented.
- Open question: none for planning. The canonical model decision is resolved
  below and should not be reopened during implementation without explicit user
  approval.

## Canonical Model Decision

Project Wiki should use **both** ordinary Eweser documents and derived memory
artifacts, with an explicit promotion/review flow.

Why this is the correct model in this repo:

1. Source memories and source documents remain the canonical evidence.
   `conversations` records and any explicitly-linked source docs are the
   canonical record of what happened, what was decided, and where the fact came
   from.
2. Accepted wiki pages must also be ordinary Eweser documents.
   A wiki that users can edit, export, sync, and keep across agents cannot live
   only as ephemeral derived output. Accepted pages need stable document ids,
   room storage, exportable Markdown, and normal Eweser ownership semantics.
3. Generated output must not overwrite canonical pages directly.
   If generation writes straight into canonical pages, the system loses a clean
   review boundary, user edits become fragile, and provenance/audit history gets
   muddied. Separate draft artifacts keep generation safe.

Therefore the model is:

- `conversations` and other approved source docs are canonical evidence inputs.
- `projectWikiDrafts` are derived artifacts. They are non-canonical proposals
  created from approved source inputs and must keep `sourceMemoryIds`,
  `sourceRefs`, generation metadata, and review status.
- `projectWikiPages` are canonical user-owned wiki pages. They are ordinary
  Eweser documents promoted from accepted drafts or manually edited later.
- Promotion is explicit:
  build draft -> review diff/provenance -> accept or reject -> only accept
  writes/updates the canonical page.

This rejects the two weaker alternatives:

- `ordinary Eweser documents only` is insufficient because generation would
  either overwrite user pages or hide whether a page is human-approved versus
  machine-derived.
- `derived artifacts only` is insufficient because the wiki would not have a
  stable canonical, user-owned page layer for editing, syncing, and export.

## Proposed Shared Shapes

These names are the planning target and may be adjusted slightly only if an
existing repo naming convention requires it.

- `projectWikiPages` collection:
  accepted canonical pages.
- `projectWikiDrafts` collection:
  derived reviewable proposals.

Expected page-level fields:

- `scopeType: 'project'`
- `scopeKey`
- `slug`
- `title`
- `pageKind`
  `overview | decisions | active-questions | source-index | custom`
- `format`
  `markdown`
- `content`
  canonical Markdown body
- `sourceMemoryIds`
  required durable provenance anchor
- `sourceRefs`
  optional refs to non-conversation source docs
- `reviewStatus`
  accepted pages should persist `accepted`
- `provenance`
  generation/import metadata
- `lastAcceptedDraftId`
  for page lineage

Expected draft-level fields:

- `scopeType: 'project'`
- `scopeKey`
- `pageSlug`
- `title`
- `pageKind`
- `format`
  `markdown`
- `proposedContent`
- `sourceMemoryIds`
- `sourceRefs`
- `reviewStatus`
  `pending | accepted | rejected`
- `provenance`
  including generator identity and timestamps
- `targetPageId`
  optional existing canonical page being updated

Generation rules for the first implementation:

- Draft generation must be deterministic and must not call external models.
- The first pass should build only pages that can be justified from existing
  structured source data:
  `overview`, `decisions`, `active-questions`, and `source-index`.
- `people/apps/tools` should not ship as a freeform synthesized page unless the
  implementation can produce it deterministically from explicit tags, aliases,
  or linked refs. If not, it stays out of scope for this pass.

## Runs

## Run Order And Manual Test Handoffs

Run order: Sequential. Run 1 defines the collection boundary. Run 2 makes the
runtime aware of real Project Wiki scopes. Run 3 adds deterministic draft/page
generation and export. Run 4 adds review/promotion tools. Run 5 adds the final
manual-test and evaluation evidence needed to move Project Wiki out of
`pending`.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: Project Wiki Shared Collections And Contracts

- **Id**: `run-1`
- **Title**: `Project Wiki Shared Collections And Contracts`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - Shared collection contracts for canonical Project Wiki pages and reviewable
    Project Wiki drafts, exported through `@eweser/shared` and `@eweser/db`.
- **Files**:
  - `packages/shared/src/collections/project-wiki-page.ts`: add canonical page
    document type and enums.
  - `packages/shared/src/collections/project-wiki-draft.ts`: add derived draft
    document type and enums.
  - `packages/shared/src/collections/index.ts`: register new collection keys and
    export new types.
  - `packages/shared/src/index.ts`: export new public contracts.
  - `packages/db/src/types.ts`: map new collection keys to document types.
  - `packages/db/src/examples/dbShape.ts`: extend example registry shape.
  - `packages/shared/src/INDEX.md`: document new collection ownership.
  - `.changeset/*`: add or update a changeset because `@eweser/shared` public
    exports change.
- **Steps**:
  - [ ] Define `ProjectWikiPage` as the canonical accepted-page document shape.
  - [ ] Define `ProjectWikiDraft` as the derived proposal shape.
  - [ ] Reuse existing review/provenance concepts where possible instead of
        inventing parallel semantics.
  - [ ] Make `sourceMemoryIds` first-class on both pages and drafts.
  - [ ] Add any minimal helper enums needed for `pageKind`, `format`, and draft
        review status.
- **Tests**:
  - `npm test --workspace @eweser/shared`
  - `npm run type-check --workspace @eweser/shared`
  - `npm run type-check --workspace @eweser/db`
- **Verification**:
  - Shared tests prove the new collections are registered, exported, and
    compatible with existing document unions.
- **Manual test handoff**:
  - Not needed: this run only defines shared contracts.
- **Dependencies**:
  - None
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 2: Strategy Scope Resolution And Safe Room Boundaries

- **Id**: `run-2`
- **Title**: `Strategy Scope Resolution And Safe Room Boundaries`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - MCP/runtime support for resolving `project-wiki` from real
    `memoryStrategyConfigs` documents or seeded fixtures, while keeping source
    rooms separate from wiki write targets.
- **Files**:
  - `packages/mcp-server/src/data-layer.ts`: replace the hardcoded single global
    journal scope with strategy-config-backed resolution and add page/draft room
    inference.
  - `packages/mcp-server/src/data-layer.test.ts`: add scope-resolution and
    writable-target tests for Project Wiki.
  - `packages/mcp-server/src/tools.test.ts`: extend strategy/scope tests where
    tool behavior depends on the new resolution logic.
  - `packages/auth-server-hono/src/routes/connect-ai.ts`: stop blanket
    rejection of `project-wiki` once explicit readable/writable room validation
    for the strategy exists.
  - `packages/auth-server-hono/src/routes/connect-ai.test.ts`: verify valid and
    invalid Project Wiki setup combinations.
  - `packages/app/src/lib/api.ts`: extend API types if the strategy overview or
    setup payload needs source-room or page-room distinctions.
- **Steps**:
  - [ ] Make runtime strategy lookup read actual `memoryStrategyConfigs`
        documents when available, with the current `agent-journal` global
        fallback preserved for older setups.
  - [ ] Ensure Project Wiki readable source rooms and writable page/draft rooms
        are distinct concepts.
  - [ ] Ensure Project Wiki never writes back into source memory rooms.
  - [ ] Define the minimal operational mirror needed for auth/token issuance
        without making auth-server PostgreSQL the canonical strategy store.
  - [ ] Keep `auto` capture disabled.
- **Tests**:
  - `npm test --workspace @eweser/mcp`
  - `npm run type-check --workspace @eweser/mcp`
  - `npm test --workspace @eweser/auth-server-hono -- connect-ai`
  - `npm run type-check --workspace @eweser/auth-server-hono`
- **Verification**:
  - A seeded `memoryStrategyConfigs` record for `scopeType: 'project'` and
    `strategy: 'project-wiki'` causes `eweser_get_memory_strategy` to return the
    Project Wiki scope and approved writable targets.
- **Manual test handoff**:
  - Seed one project-scoped `memoryStrategyConfigs` doc plus readable source
    room ids and writable wiki room ids. Then call `eweser_get_memory_strategy`
    and `eweser_list_memory_scopes` and confirm:
    1. the strategy resolves to `project-wiki`;
    2. the scope is `project/<scopeKey>`;
    3. source rooms are readable;
    4. page/draft rooms are writable;
    5. source rooms are not used as write targets.
- **Dependencies**:
  - `run-1`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 3: Deterministic Project Wiki Draft Builder And Markdown Export

- **Id**: `run-3`
- **Title**: `Deterministic Project Wiki Draft Builder And Markdown Export`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - Pure shared utilities that build deterministic Project Wiki drafts from
    approved source memory/docs and export accepted pages to Markdown /
    Obsidian-compatible files.
- **Files**:
  - `packages/shared/src/utils/project-wiki-builder.ts`: add deterministic draft
    construction helpers.
  - `packages/shared/src/utils/project-wiki-builder.test.ts`: cover deterministic
    page assembly and provenance.
  - `packages/shared/src/utils/project-wiki-markdown.ts`: add Project Wiki
    export helpers.
  - `packages/shared/src/utils/project-wiki-markdown.test.ts`: cover export
    paths, frontmatter, and provenance metadata.
  - `packages/shared/src/utils/index.ts`: export new helpers.
  - `packages/shared/src/INDEX.md`: document new utility ownership if new files
    are added there.
- **Steps**:
  - [ ] Build deterministic draft generation for `overview`, `decisions`,
        `active-questions`, and `source-index`.
  - [ ] Keep output source-bounded: pages may quote or list approved summaries,
        links, dates, tags, and refs, but must not invent unsupported claims.
  - [ ] Preserve `sourceMemoryIds` and optional `sourceRefs` on every draft.
  - [ ] Export accepted pages to stable Markdown filenames and Obsidian-friendly
        frontmatter and wikilinks where supported.
  - [ ] If a proposed page kind cannot be built deterministically, omit it from
        the first shipped set rather than adding opaque summarization.
- **Tests**:
  - `npm test --workspace @eweser/shared`
  - `npm run type-check --workspace @eweser/shared`
- **Verification**:
  - Given seeded source memories, the builder emits stable draft content and the
    same export file paths/content across repeated runs.
- **Manual test handoff**:
  - Seed at least:
    1. one decision memory;
    2. one general project memory;
    3. one open-question memory or explicit tagged source.
       Then run the builder and verify draft pages exist for `overview`,
       `decisions`, `active-questions`, and `source-index`, each carrying the
       expected `sourceMemoryIds`.
- **Dependencies**:
  - `run-1`, `run-2`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 4: MCP Review, Promotion, And Export Workflow

- **Id**: `run-4`
- **Title**: `MCP Review, Promotion, And Export Workflow`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - MCP tools that let an agent build Project Wiki drafts, inspect provenance,
    accept or reject drafts, read canonical pages, and export the accepted wiki
    without mutating source memory.
- **Files**:
  - `packages/mcp-server/src/tools.ts`: add Project Wiki build/review/export
    tool handlers.
  - `packages/mcp-server/src/tools.test.ts`: cover build, accept, reject, and
    export flows plus room-boundary enforcement.
  - `packages/mcp-server/src/data-layer.ts`: add any room/document helpers
    required by the new tools.
  - `packages/mcp-server/README.md`: document the new tool workflow and safety
    expectations.
- **Steps**:
  - [ ] Add a build tool that materializes `projectWikiDrafts` from approved
        source inputs.
  - [ ] Add read/list tooling for drafts and accepted pages.
  - [ ] Add explicit accept/reject tooling. Accept must write/update only
        `projectWikiPages`; reject must leave canonical pages untouched.
  - [ ] Add export tooling for accepted pages only.
  - [ ] Enforce that source memory rooms are never mutated by Project Wiki
        generation or promotion.
- **Tests**:
  - `npm test --workspace @eweser/mcp`
  - `npm run type-check --workspace @eweser/mcp`
- **Verification**:
  - Build a draft, reject it, confirm no canonical page changes.
  - Build a draft, accept it, confirm the canonical page updates and stores
    `lastAcceptedDraftId`, `sourceMemoryIds`, and stable Markdown export output.
- **Manual test handoff**:
  - From a seeded project scope:
    1. call `eweser_get_memory_strategy`;
    2. build wiki drafts;
    3. inspect one draft's provenance;
    4. reject one draft and confirm canonical pages stay unchanged;
    5. accept one draft and confirm the canonical page appears or updates;
    6. export the accepted wiki and inspect the Markdown files.
- **Dependencies**:
  - `run-2`, `run-3`
- **Model tier**: `coder`
- **Risk level**: `high`

### Run 5: Connect AI Surface, Evaluation Evidence, And Full Manual Test

- **Id**: `run-5`
- **Title**: `Connect AI Surface, Evaluation Evidence, And Full Manual Test`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - User-facing Connect AI copy/settings updates for Project Wiki where needed,
    deterministic evaluation evidence that moves Project Wiki from `pending` to
    concretely testable, and a written end-to-end manual test stage.
- **Files**:
  - `packages/app/src/components/connect-ai-page.tsx`: update Project Wiki copy
    and any advanced controls needed to expose the seeded/runtime-supported
    strategy safely.
  - `packages/app/src/App.test.tsx`: verify the Connect AI page reflects the
    Project Wiki availability state accurately.
  - `packages/shared/src/memory-evaluation/index.ts`: add implemented Project
    Wiki evaluation logic and fixture coverage once the runtime/export path
    exists.
  - `packages/shared/src/memory-evaluation/index.test.ts`: add passing Project
    Wiki scenario assertions and provenance-focused failure cases.
  - `docs/ai/memory-strategy-evaluation.md`: update the support doc so Project
    Wiki is no longer described as pending once tests exist.
  - `docs/ai/memory-diagnostics-audit.md`: add Project Wiki manual diagnostic
    instructions if new auditable commands or fixtures are added.
  - `docs/ai/plans/2026-04-29-ai-memory-project-wiki-draft.md`: update
    execution summary and add final manual test evidence after implementation.
- **Steps**:
  - [ ] Make the Connect AI surface truthful about Project Wiki availability,
        prerequisites, and safety boundaries.
  - [ ] Add deterministic Project Wiki evaluation fixtures that assert recall,
        provenance, portability, and safety from source-backed project memory.
  - [ ] Update docs so Project Wiki is only called implemented after those
        fixtures pass.
  - [ ] Add the final manual test stage below as the required human verification
        checkpoint.
- **Tests**:
  - `npm test --workspace @eweser/app`
  - `npm run type-check --workspace @eweser/app`
  - `npm test --workspace @eweser/shared -- memory-evaluation`
  - `npm run check`
- **Verification**:
  - The deterministic evaluation harness reports Project Wiki as implemented for
    its source-tracking scenario, and the Connect AI UI no longer implies the
    strategy is merely planned.
- **Manual test handoff**:
  - Manual test run `run-5`:
    1. Start the local stack needed for auth app and MCP.
    2. Seed:
       - one `memoryStrategyConfigs` doc for `strategy: 'project-wiki'`,
         `scopeType: 'project'`, and a concrete `scopeKey`;
       - at least three source memories in `conversations`;
       - writable rooms for `projectWikiDrafts` and `projectWikiPages`.
    3. Open `/account/connect-ai` in the browser and confirm the UI describes
       Project Wiki truthfully, including any advanced/prerequisite wording.
    4. Set up or rotate a token for the seeded project scope.
    5. In the MCP client:
       - call `eweser_get_memory_strategy`;
       - call the Project Wiki draft-build tool;
       - inspect draft provenance and `sourceMemoryIds`;
       - reject one draft and verify canonical pages are unchanged;
       - accept one draft and verify the canonical page updates;
       - export the accepted wiki.
    6. Verify exported Markdown contains stable filenames, page titles,
       provenance frontmatter, and links or references back to the seeded source
       memories.
    7. Run the deterministic Project Wiki evaluation tests and confirm the
       strategy is no longer reported as pending.
- **Dependencies**:
  - `run-2`, `run-3`, `run-4`
- **Model tier**: `strong`
- **Risk level**: `high`

## Risks And Weak Assumptions

- Canonical-overwrite risk:
  if draft generation writes directly into accepted pages, user edits and
  provenance boundaries become unreliable. The promotion boundary is mandatory.
- Scope-plumbing risk:
  the current MVP hardcodes one global journal scope. If runtime resolution
  cannot read seeded `memoryStrategyConfigs` safely, Project Wiki cannot be
  claimed end-to-end ready.
- Provenance-granularity risk:
  page-level `sourceMemoryIds` may be enough for v1, but if testing shows pages
  are too coarse to audit, implementation must stop and add section-level
  anchors before claiming strong provenance.
- Determinism risk:
  a page kind that needs opaque synthesis will violate the no-vague-summary
  constraint. The safe response is to narrow the shipped page set, not sneak in
  an external or hidden summarizer.
- Storage-boundary risk:
  reusing personal `notes` as the canonical Project Wiki store would mix AI
  memory outputs with user note rooms and weaken permission boundaries. Use
  dedicated wiki collections instead.

## Stop Conditions

Stop and ask for user approval if:

- implementation pressure pushes toward using only generated artifacts or only
  canonical pages, because that would reopen the core model decision;
- Project Wiki requires a hosted processor, external API, background capture, or
  non-deterministic summarization path to function;
- a dedicated page/draft collection model proves impossible and implementation
  would need to repurpose `notes` as the canonical wiki store;
- runtime scope resolution requires an auth-server migration or operational
  mirror broader than this plan currently names;
- provenance cannot be preserved from source memory ids through draft creation,
  promotion, and export;
- the final manual flow cannot be executed against seeded local data and real
  MCP tools.

## Approval Boundary

Approval of this plan authorizes Coder to implement the runs above, make focused
supporting edits needed for those runs, write or update tests, run relevant
verification, perform internal QA, fix issues found inside this boundary, and
update this plan's execution summary.

Approval does not authorize unrelated refactors, hosted processors, automatic
background capture, personal-note canonical storage, destructive git
operations, direct pushes to `main`, secret handling, migration deletion, or
new memory-product scope beyond the Project Wiki model defined here.

## Execution Summary

| Run     | Status                                | Files Changed                                                                                                                                                                                                                                                                                                                                                                                                                                                | Verification                                                                                                                                                                                                                                                                                                                     | Notes                                                                                                                                                                                |
| ------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `run-1` | Completed                             | `packages/shared/src/collections/project-wiki-page.ts`, `packages/shared/src/collections/project-wiki-draft.ts`, `packages/shared/src/collections/project-wiki.test.ts`, `packages/shared/src/collections/index.ts`, `packages/shared/src/collections/memory-strategy.ts`, `packages/shared/src/INDEX.md`, `packages/db/src/types.ts`, `packages/db/src/examples/dbShape.ts`, `packages/db/src/index.test.ts`, `.changeset/project-wiki-shared-contracts.md` | `npm test --workspace @eweser/shared -- project-wiki memory-evaluation`; `npm run type-check --workspace @eweser/shared`; `npm run type-check --workspace @eweser/db`                                                                                                                                                            | Added dedicated canonical/draft collections plus SDK type mapping and tests.                                                                                                         |
| `run-2` | Completed                             | `packages/mcp-server/src/data-layer.ts`, `packages/mcp-server/src/data-layer.test.ts`, `packages/auth-server-hono/src/routes/connect-ai.ts`, `packages/auth-server-hono/src/routes/connect-ai.test.ts`, `packages/app/src/lib/api.ts`, `packages/app/src/components/connect-ai-page.tsx`, `packages/app/src/App.test.tsx`                                                                                                                                    | `npm test --workspace @eweser/mcp -- data-layer tools`; `npm test --workspace @eweser/auth-server-hono -- connect-ai`; `npm test --workspace @eweser/app -- App.test.tsx`; `npm run type-check --workspace @eweser/mcp`; `npm run type-check --workspace @eweser/auth-server-hono`; `npm run type-check --workspace @eweser/app` | Runtime now resolves seeded `memoryStrategyConfigs`; Connect AI no longer blanket-rejects Project Wiki and no longer preselects personal writable rooms as readable by default.      |
| `run-3` | Completed                             | `packages/shared/src/utils/project-wiki-builder.ts`, `packages/shared/src/utils/project-wiki-builder.test.ts`, `packages/shared/src/utils/project-wiki-markdown.ts`, `packages/shared/src/utils/project-wiki-markdown.test.ts`, `packages/shared/src/utils/index.ts`                                                                                                                                                                                         | `npm test --workspace @eweser/shared -- project-wiki memory-evaluation`; `npm run type-check --workspace @eweser/shared`                                                                                                                                                                                                         | Added deterministic draft/page assembly for `overview`, `decisions`, `active-questions`, and `source-index`, plus stable Markdown export with provenance frontmatter.                |
| `run-4` | Completed                             | `packages/mcp-server/src/tools.ts`, `packages/mcp-server/src/tools.test.ts`, `packages/mcp-server/README.md`                                                                                                                                                                                                                                                                                                                                                 | `npm test --workspace @eweser/mcp -- data-layer tools`; `npm run type-check --workspace @eweser/mcp`                                                                                                                                                                                                                             | Added explicit build/list/review/export Project Wiki MCP tools with source-room read-only boundaries.                                                                                |
| `run-5` | Completed with manual handoff pending | `packages/app/src/components/connect-ai-page.tsx`, `packages/app/src/App.test.tsx`, `packages/shared/src/memory-evaluation/index.ts`, `packages/shared/src/memory-evaluation/index.test.ts`, `docs/ai/memory-strategy-evaluation.md`, `docs/ai/memory-diagnostics-audit.md`, `docs/ai/plans/2026-04-29-ai-memory-project-wiki-draft.md`                                                                                                                      | `npm test --workspace @eweser/app -- App.test.tsx`; `npm test --workspace @eweser/shared -- project-wiki memory-evaluation`; `npm run check`                                                                                                                                                                                     | Automated verification passed and the deterministic harness now marks Project Wiki implemented. The human browser/MCP handoff below still needs to be run against seeded local data. |

## Self-Reflection / Instruction Improvements

- The original draft left the central data-model question open too long. Future
  follow-up drafts in this repo should resolve canonical-vs-derived ownership
  before describing generation UI or tooling, because that single decision
  determines the safe room boundary, provenance model, and manual test shape.
- The runtime-orientation command path in the current repo instructions points
  at a skill location that was not present on this machine. Future workflow
  docs should either ship the script at that exact path or document the current
  installation path so coder runs do not start with a dead preflight command.
