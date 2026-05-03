# Plan: AI Memory Strategy Onboarding

## Goal

Ship the Eweser-native foundation for cross-agent AI memory: users can choose a
memory strategy and capture mode, agents can discover the active memory scope,
and memory strategy configuration remains user-owned and interoperable through
EweserDB rather than being locked in auth-server PostgreSQL.

## Scope

- In: Eweser-native memory strategy schema, capture-mode settings, Connect AI
  onboarding updates, strategy-aware MCP defaults, Obsidian-compatible Agent
  Journal Markdown import/export, scenario-based strategy evaluation tests,
  docs, and changesets.
- In: support `manual`, `suggest`, and `auto` as capture-mode settings at the
  schema/API/UI level, with implementation tests for every mode that ships in
  this plan.
- In: define the full product roadmap and create separate draft plans for
  Project Wiki, automatic capture if it cannot fit safely here, Mem0-style
  processing, Graphiti-style temporal graph memory, Cognee-style workspace
  intelligence, strategy recommendation evidence, and launch/legal readiness.
- Out: production integration of Mem0, Graphiti, Cognee, or any external
  processor.
- Out: closed-web-UI capture where an upstream client exposes no hook.
- Out: secret storage in ordinary searchable memory. Secrets remain outside
  ordinary memory and belong in a separate encrypted vault/secure-note path.
- Out: a polished standalone `/memory` app shell unless it is required to make
  the Connect AI settings coherent.

## Assumptions / Open Questions

- Assumption: strategy configuration that other apps should see must be stored
  as EweserDB user-owned data, not only in auth-server PostgreSQL.
- Assumption: auth-server PostgreSQL may store auth-only operational mirrors or
  pointers when needed for token issuance, authorization, audit, or migration
  compatibility, but it must not become the canonical strategy/config database.
- Assumption: because EweserDB is not live with real users yet, Coder can make
  clean breaking schema changes to pre-live memory strategy shapes when the plan
  calls them out and changesets/migrations are handled.
- Assumption: `agent-journal` remains the default strategy because it matches
  the existing `eweser_save_memory` behavior and the user-owned portable memory
  story.
- Assumption: Agent Journal remains canonically stored as EweserDB records, but
  its default portable Markdown representation is Obsidian-compatible Markdown:
  YAML frontmatter, stable `#` tags, `[[wikilinks]]`, deterministic filenames,
  and import/export metadata that can round-trip without losing memory scope or
  provenance.
- Assumption: project scoping starts with `EWESER_WORKTREE_TAG` and
  user-selected project names; automatic repo-root detection can come later.
- Assumption: `manual`, `suggest`, and `auto` should be representable settings.
  If true automatic capture needs background processing or client hooks beyond
  this plan, Coder must stop and move that implementation to the automatic
  capture follow-up draft plan.
- Open question: none for the first implementation pass.

## Product Model

### Memory Strategy Options

| Strategy                 | User-facing label      | Default? | Best for                                                 | Implementation stance                                                             |
| ------------------------ | ---------------------- | -------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `agent-journal`          | Shared Agent Memory    | Yes      | coding agents, daily continuity, decisions, preferences  | Eweser-native over `conversations` plus scope metadata and Markdown import/export |
| `project-wiki`           | Project Wiki           | No       | research, writing, source-heavy projects                 | Follow-up draft plan; Eweser-native artifacts derived from canonical sources      |
| `auto-curated`           | Auto-Curated Memory    | Advanced | automatic fact extraction and preference recall          | Follow-up draft plan; optional Mem0-style processor over Eweser canonical records |
| `knowledge-graph`        | Knowledge Graph        | Advanced | temporal questions, changing requirements, relationships | Follow-up draft plan; optional Graphiti-style derived graph                       |
| `workspace-intelligence` | Workspace Intelligence | Advanced | docs, tables, transcripts, team knowledge                | Follow-up draft plan; optional Cognee-style processor                             |
| `custom`                 | Custom                 | Advanced | power users and self-hosters                             | Same canonical schema and processor contract                                      |

Default onboarding must not mention Karpathy, OpenClaw, Mem0, Graphiti, or
Cognee. Those names belong in docs and advanced settings.

### Strategy Evaluation Scenarios

Automated tests should evaluate memory strategies against realistic scenario
fixtures so product recommendations are evidence-based, not only conceptual.
The first pass does not need to prove external processors are production-ready;
it must create the harness and baseline scenarios that future Project Wiki,
Mem0-style, Graphiti-style, and Cognee-style plans can extend.

Initial scenarios:

| Scenario                     | What it tests                                             | Expected strongest fit                              |
| ---------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| Coding continuity            | preferences, project decisions, recurring repo workflows  | `agent-journal`                                     |
| Research and source tracking | source-backed notes, drafts, citations, synthesis         | `project-wiki` once implemented                     |
| Preference extraction        | durable user preferences from noisy conversation history  | `auto-curated` once implemented                     |
| Requirement changes          | temporal facts, superseded decisions, relationship lookup | `knowledge-graph` once implemented                  |
| Team knowledge retrieval     | docs, tables, meeting notes, cross-workspace search       | `workspace-intelligence` once implemented           |
| Secret/adversarial content   | redaction, ignored credentials, memory poisoning attempts | all strategies must reject or mark unsafe correctly |

Evaluation dimensions:

- Recall quality: retrieves the right durable context for a realistic prompt.
- Precision/noise: avoids irrelevant or outdated memories.
- Temporal correctness: handles superseded facts and effective dates.
- Provenance: can explain where the memory came from when the strategy supports
  it.
- Safety: does not store or recommend secrets, credentials, or unsafe durable
  instructions.
- Portability: exports/imports expected user-owned artifacts where applicable.
- Fit score: produces a stable strategy recommendation for the scenario's
  user/use-case profile.

The harness should use deterministic fixtures and assertions first. Optional
LLM-as-judge scoring can be added later only if outputs are versioned, prompts
are checked in, and CI has a deterministic fallback path.

### Capture Modes

| Mode      | Meaning                                               | MVP behavior                                                                                                                                                                         |
| --------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `manual`  | Memory is saved only by explicit user/agent action.   | Must work end-to-end and remain the safest default.                                                                                                                                  |
| `suggest` | Agent can stage proposed memories for review.         | Must be represented and tested if review UI/API is implemented; otherwise Coder must stop before claiming it is functional.                                                          |
| `auto`    | System captures memory automatically based on policy. | Must be configurable as a future-capable setting; if real auto-capture requires new hooks/background services, defer implementation to `2026-04-29-ai-memory-auto-capture-draft.md`. |

### Scope Levels

| Scope          | Examples                                                 | Default behavior                                           |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| User/global    | personal preferences, response style, common tools       | `agent-journal`, read by all granted agents                |
| Project/repo   | `/path/to/eweser-db`, a client project, a research topic | inherit global strategy, default `agent-journal` for repos |
| Workspace/team | Lark workspace, company knowledge base                   | later `workspace-intelligence` or `knowledge-graph`        |
| Agent/client   | Codex, Claude Code, ChatGPT web, OpenClaw, Copilot       | inherits project/global, may have read/write limits        |

### Connect AI Access UX

The Connect AI UX should treat project-level access as the primary mental model
and a dedicated AI memory room as the safe default write target.

Recommended default:

- Create or recommend a dedicated **AI Memory / Agent Journal** room backed by
  the `conversations` collection.
- Grant connected AI agents read/write access to that AI memory room by default.
- Do not grant access to personal note rooms unless the user explicitly approves
  them.
- Let `eweser_save_memory` default to the dedicated AI memory room when the
  token has exactly one writable memory target.

Project access should be shown as a top-level scope. A project can group one or
more EweserDB rooms, such as memory, notes, bookmarks, repo metadata, and later
project-wiki/source rooms. For each project, the user should be able to choose:

| Choice         | Meaning                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `Off`          | Agent cannot read or write rooms in this project.                       |
| `Read only`    | Agent can use selected project rooms as context but cannot write there. |
| `Read + write` | Agent can read selected project rooms and write to approved targets.    |

The project picker should include an **Allow all current rooms in this project**
shortcut. A later follow-up can add **Include future rooms added to this
project**, but this first plan should avoid implicit future-room access unless
that behavior is stored and surfaced explicitly.

Personal notes should be represented as protected room scopes, defaulting to
`Off`. The user may opt individual personal rooms into `Read only` for context
or `Read + write` for intentional AI editing/capture. Granting AI Memory access
must not imply access to personal notes.

This requires separate read and write room grants. The current Connect AI token
scope already has writable room controls, but implementation must ensure MCP
search/list/read tools only see approved readable rooms while save/edit tools
only affect approved writable rooms. In practice:

- `readableRoomIds` is the context boundary.
- `writableRoomIds` is the mutation boundary.
- `defaultWriteRoomId` must be one of `writableRoomIds`.
- A room may be readable without being writable.
- A room may not be writable without also being readable unless a later plan
  explicitly supports blind-write dropboxes.

## Data Model Decisions

- Add shared exported types for:
  - `MemoryStrategyKind`
  - `MemoryScopeType`
  - `MemoryCaptureMode`
  - `MemoryStrategyConfig`
  - `MemoryStrategyScope`
  - review status/provenance helpers needed by `suggest` and later processors.
- Store canonical strategy configuration as EweserDB documents in a shared
  collection so apps and agents can sync/export it.
- Auth-server PostgreSQL may store only auth-operational fields needed for
  token setup and enforcement, such as default strategy document refs,
  default writable room ids, scope refs, and audit timestamps.
- Keep `conversations` as the canonical MVP memory item collection, but extend
  it with scoped strategy/provenance fields as needed.
- Because `@eweser/shared` is published, add a changeset for exported type or
  collection changes even though the app is pre-live.

Candidate shared shape:

```ts
export type MemoryStrategyKind =
  | 'agent-journal'
  | 'project-wiki'
  | 'auto-curated'
  | 'knowledge-graph'
  | 'workspace-intelligence'
  | 'custom';

export type MemoryScopeType = 'global' | 'project' | 'workspace' | 'agent';
export type MemoryCaptureMode = 'manual' | 'suggest' | 'auto';

export type MemoryStrategyConfigBase = {
  name: string;
  strategy: MemoryStrategyKind;
  scopeType: MemoryScopeType;
  scopeKey: string;
  enabled: boolean;
  captureMode: MemoryCaptureMode;
  defaultWriteRoomId?: string;
  readableRoomIds?: string[];
  writableRoomIds?: string[];
  sourceRoomIds?: string[];
  exportFormats?: Array<'markdown' | 'openclaw' | 'obsidian' | 'json'>;
  processorIds?: string[];
  retentionDays?: number;
  reviewRequired?: boolean;
};
```

Default Agent Journal strategy configs should include `obsidian` in
`exportFormats`, and generated exports should prefer the Obsidian-compatible
layout unless the caller explicitly asks for another supported format. Generic
`markdown` remains a compatibility alias for plain Markdown consumers, not the
primary memory vault contract.

## API And MCP Contract

### Connect AI Overview Additions

The Connect AI overview response should include strategy data shaped like:

```ts
type ConnectAiMemoryStrategyOverview = {
  defaultStrategy: MemoryStrategyKind;
  defaultCaptureMode: MemoryCaptureMode;
  scopes: Array<{
    scopeType: MemoryScopeType;
    scopeKey: string;
    label: string;
    strategy: MemoryStrategyKind;
    captureMode: MemoryCaptureMode;
    defaultWriteRoomId?: string;
    readableRoomIds: string[];
    writableRoomIds: string[];
  }>;
  choices: Array<{
    strategy: MemoryStrategyKind;
    label: string;
    description: string;
    advanced: boolean;
  }>;
  captureModes: Array<{
    mode: MemoryCaptureMode;
    label: string;
    description: string;
    enabled: boolean;
  }>;
};
```

Setup/rotate-token requests should accept optional `memoryScopeKey`,
`memoryStrategy`, `captureMode`, `defaultWriteRoomId`, `readableRoomIds`, and
`writableRoomIds`. Auth routes must validate that requested readable rooms are
owned/granted to the user, requested writable rooms are inside the user's
granted writable rooms, and `defaultWriteRoomId` is included in
`writableRoomIds`.

### MCP Tools

Keep existing tools and add strategy-aware behavior:

| Tool                         | Purpose                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eweser_get_memory_strategy` | Return active strategy, capture mode, scope, and writable targets for the current token/project.                                                                 |
| `eweser_save_memory` update  | Allow optional `scopeType`, `scopeKey`, `strategy`, and `captureMode`; infer writable room when unambiguous.                                                     |
| `eweser_list_memory_scopes`  | Show available global/project/workspace scopes the agent can use.                                                                                                |
| `eweser_export_memory`       | Export Agent Journal memory for a selected scope; default format is Obsidian-compatible Markdown unless the caller explicitly requests another supported format. |
| `eweser_suggest_memory`      | Stage suggested memory when `captureMode: 'suggest'` is active, if implemented in this plan.                                                                     |

Error semantics:

- If the token has exactly one writable memory room and no `roomId` is supplied,
  save to that room.
- If multiple writable memory rooms exist and neither `roomId` nor `scopeKey`
  disambiguates the target, return a typed MCP error explaining the available
  scopes.
- If `captureMode: 'manual'`, `eweser_save_memory` writes accepted memory.
- If `captureMode: 'suggest'`, `eweser_suggest_memory` writes reviewable
  suggestions and `eweser_save_memory` still writes accepted memory.
- If `captureMode: 'auto'` cannot be implemented without new capture hooks,
  API/UI must mark it as planned/disabled and tests must assert the exact
  behavior.
- Secret redaction and transcript caps must remain in force before writes.

## Run Order And Manual Test Handoffs

Run order is sequential unless Coder explicitly records why a non-dependent
documentation-only task can move earlier:

1. `run-1`: shared schema and changeset.
2. `run-2`: Connect AI strategy settings.
3. `run-3`: MCP strategy defaults.
4. `run-4`: Agent Journal Markdown import/export.
5. `run-5`: scenario-based strategy evaluation harness.
6. `run-6`: full verification, manual-test handoff, and follow-up plan updates.

After each run, Coder must update that run's Execution Summary row and add a
short manual-test handoff in the Notes column or an adjacent note. The handoff
must include:

- what was delivered;
- exact local services/commands needed to exercise it;
- test account or seed-data assumptions, without secrets;
- 3-7 manual test steps a separate tester can follow;
- expected results and known gaps;
- screenshots or file paths only when useful.

The user should be able to point a later Codex session at the plan and say
"run the manual test for run N" without requiring the tester to reconstruct the
feature from code.

## Runs

### Run 1: Shared Memory Strategy Schema

- **Id**: `run-1`
- **Title**: `Shared Memory Strategy Schema`
- **Deliverable**: Shared strategy/capture/scope types and memory metadata
  compile, are exported, and preserve old conversation compatibility.
- **Files**:
  - `packages/shared/src/collections/*`: add strategy config/scope types and
    collection exports.
  - `packages/shared/src/collections/conversation.ts`: add scoped strategy and
    review/provenance fields where needed.
  - `packages/shared/src/collections/index.ts`: export new memory strategy
    types.
  - `.changeset/*`: document published shared API changes.
- **Steps**:
  - [ ] Add strict shared types for strategy kinds, scopes, capture modes,
        strategy config docs, and review status.
  - [ ] Keep canonical strategy config user-owned in EweserDB collection docs.
  - [ ] Extend conversation memory records only for MVP scope/provenance fields.
  - [ ] Add tests for defaults, accepted values, and backwards-compatible
        conversation parsing.
  - [ ] Add a changeset for `@eweser/shared`.
- **Tests**:
  - `npm test --workspace @eweser/shared`
  - `npm run type-check --workspace @eweser/shared`
- **Verification**:
  - Confirm new exports compile for downstream workspaces.
  - Confirm old conversation documents without new fields remain valid.
- **Manual test handoff**:
  - Record how a tester can inspect the exported shared types and verify old
    conversation data still parses through existing app/MCP paths.
- **Dependencies**: None.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 2: Connect AI Strategy Settings

- **Id**: `run-2`
- **Title**: `Connect AI Strategy Settings`
- **Deliverable**: Connect AI exposes Shared Agent Memory defaults, advanced
  strategy/capture controls, and valid scoped read/write room payloads.
- **Files**:
  - `packages/auth-server-hono/src/routes/connect-ai.ts`: expose strategy
    overview, validate setup/rotate strategy/read/write scope fields, and store
    auth-only operational refs if needed.
  - `packages/auth-server-hono/src/routes/connect-ai.test.ts`: cover overview,
    invalid strategy/capture mode, invalid readable room, invalid writable room,
    and migration default behavior for existing agents.
  - `packages/app/src/components/connect-ai-page.tsx`: add Shared Agent Memory
    summary, project/personal room access controls, advanced strategy picker,
    capture-mode setting, and scoped read/write room display.
  - `packages/app/src/lib/api.ts`: add typed strategy request/response shapes.
  - `packages/app/src/App.test.tsx` or component tests: cover UI defaults and
    payload preservation.
- **Steps**:
  - [ ] Extend overview response with memory strategy scopes, choices, and
        capture modes.
  - [ ] Add separate readable-room and writable-room controls so MCP context
        access and mutation access have distinct boundaries.
  - [ ] Preserve explicit writable-room controls as the user's mutation safety
        control.
  - [ ] Default to a dedicated AI Memory / Agent Journal writable room and keep
        personal note rooms off until explicitly approved.
  - [ ] Present projects as top-level access scopes with `Off`, `Read only`, and
        `Read + write` choices plus an "allow all current rooms" shortcut.
  - [ ] Add setup/rotate-token payload fields for scope, strategy, capture mode,
        readable rooms, writable rooms, and default write room.
  - [ ] Store only auth-operational pointers or mirrors in PostgreSQL if route
        enforcement needs them.
  - [ ] Display `manual`, `suggest`, and `auto` according to implemented status.
- **Tests**:
  - `npm test --workspace @eweser/auth-server-hono -- connect-ai`
  - `npm test --workspace @eweser/app`
- **Verification**:
  - Manual Connect AI check: default Shared Agent Memory is selected, advanced
    settings preserve writable room selection, and invalid combinations are
    rejected.
- **Manual test handoff**:
  - Record browser URL, required dev services, setup state, and manual steps for
    changing strategy/capture settings and creating/rotating a client token.
- **Dependencies**: `run-1`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 3: Strategy-Aware MCP Defaults

- **Id**: `run-3`
- **Title**: `Strategy-Aware MCP Defaults`
- **Deliverable**: MCP clients can discover memory strategy/scopes and save or
  suggest memory without manually supplying a room id when the target is
  unambiguous.
- **Files**:
  - `packages/mcp-server/src/tools.ts`: add strategy tools and save/suggest
    behavior.
  - `packages/mcp-server/src/data-layer.ts`: load strategy docs/scopes and
    resolve writable targets.
  - `packages/mcp-server/src/auth.ts`: expose token/project context needed for
    strategy defaults.
  - `packages/mcp-server/src/tools.test.ts`: add MCP behavior coverage.
  - `packages/mcp-server/README.md`: document strategy-aware memory usage.
- **Steps**:
  - [ ] Add `eweser_get_memory_strategy`.
  - [ ] Add `eweser_list_memory_scopes`.
  - [ ] Let `eweser_save_memory` infer the writable memory room when
        unambiguous.
  - [ ] Add optional `scopeType`, `scopeKey`, `strategy`, and `captureMode`
        fields to saved memory docs.
  - [ ] Add `eweser_suggest_memory` only if suggestion persistence/review state
        is in scope after Run 2.
  - [ ] Preserve secret redaction, transcript caps, and worktree tagging.
- **Tests**:
  - `npm test --workspace @eweser/mcp`
  - Targeted tests for single writable room inference, multi-room ambiguity,
    strategy lookup shape, redaction-before-write, and capture mode behavior.
- **Verification**:
  - Run a local MCP save with omitted `roomId` for one writable memory room and
    confirm the saved document has expected scope/strategy metadata.
- **Manual test handoff**:
  - Record exact MCP command/tool calls for strategy lookup, scope listing,
    one-room save inference, multi-room ambiguity, and redaction behavior.
- **Dependencies**: `run-1`, `run-2`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 4: Agent Journal Markdown Import And Export

- **Id**: `run-4`
- **Title**: `Agent Journal Markdown Import And Export`
- **Deliverable**: Agent Journal memory exports Obsidian-compatible Markdown by
  default and supported Markdown can be imported back into scoped memory records
  without losing scope, tags, crosslinks, or provenance.
- **Files**:
  - `packages/shared/src/utils/*`: add deterministic Agent Journal Markdown
    import/export helpers.
  - `packages/shared/src/utils/*.test.ts`: snapshot and round-trip tests.
  - `packages/mcp-server/src/tools.ts`: add `eweser_export_memory` if export is
    exposed through MCP in this pass.
  - `packages/app/src/*`: add minimal import/export UI only if it fits the
    Connect AI surface cleanly.
  - `docs/workflows/*` or package READMEs: document supported Markdown layout.
- **Steps**:
  - [ ] Define deterministic Agent Journal export files:
        `MEMORY.md`, `memory/YYYY-MM-DD.md`, `projects/<scope>.md`,
        `decisions.md`, and per-memory detail pages when needed for stable
        wikilink targets.
  - [ ] Make `obsidian` the default Agent Journal export format; keep
        `markdown` as an explicit compatibility format only.
  - [ ] Add YAML frontmatter to every generated Markdown file with stable keys
        such as `title`, `type`, `memoryType`, `scopeType`, `scopeKey`,
        `strategy`, `captureMode`, `createdAt`, `updatedAt`, `sourceMemoryIds`,
        `tags`, `aliases`, and `provenance` where available.
  - [ ] Generate stable Obsidian-style tags from memory metadata, including
        memory type, strategy, scope, project/worktree, and safety status when
        present; preserve user-authored tags without duplicating or rewriting
        them unpredictably.
  - [ ] Generate `[[wikilinks]]` between the root memory index, daily journal
        pages, project/scope indexes, decisions page, source/detail pages, and
        related memory references where source metadata exists.
  - [ ] Import Obsidian-compatible Markdown by parsing frontmatter, inline
        `#tags`, aliases, and `[[wikilinks]]`; map supported metadata back to
        scoped memory records and preserve unsupported frontmatter in provenance
        or import metadata rather than dropping it silently.
  - [ ] Export only redacted ordinary memory fields already allowed for search.
  - [ ] Add import helpers for the supported Markdown subset.
  - [ ] Keep output human-editable and stable for snapshot tests.
- **Tests**:
  - `npm test --workspace @eweser/shared`
  - `npm test --workspace @eweser/mcp` if MCP export is added.
  - Snapshot tests proving the default export contains YAML frontmatter, stable
    tags, deterministic filenames, and expected `[[wikilinks]]`.
  - Round-trip tests proving exported Obsidian-compatible Markdown imports back
    into equivalent scoped memory records for title, summary, memory type,
    scope, strategy, capture mode, tags, aliases, crosslinks, and provenance.
- **Verification**:
  - Export a sample project/global scope and confirm deterministic output across
    repeated runs.
  - Confirm the default MCP/app export path returns Obsidian-compatible
    Markdown unless another format is explicitly requested.
  - Confirm exported files open as a usable Obsidian vault/index: links resolve
    for generated pages, tags are visible, and frontmatter is valid YAML for the
    supported subset.
- **Manual test handoff**:
  - Record how to create seed memories, run export/import, compare generated
    Markdown, inspect the output in Obsidian or an Obsidian-compatible parser,
    verify crosslinks/tags/frontmatter, and confirm no unredacted secrets
    appear.
- **Dependencies**: `run-1`, `run-3`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 5: Scenario-Based Strategy Evaluation Harness

- **Id**: `run-5`
- **Title**: `Scenario-Based Strategy Evaluation Harness`
- **Deliverable**: Automated, deterministic scenario tests compare available
  memory strategies against realistic user/use-case fixtures and produce stable
  evidence for strategy recommendations.
- **Files**:
  - `packages/shared/src/memory-evaluation/*`: add strategy evaluation types,
    scenario fixture helpers, scoring helpers, and recommendation result shapes.
  - `packages/shared/src/memory-evaluation/*.test.ts`: cover deterministic
    scenario scoring, safety failures, and recommendation ranking.
  - `packages/mcp-server/src/tools.test.ts`: add coverage that MCP-visible
    strategy metadata can be evaluated through the same scenario fixtures where
    practical.
  - `docs/ai/memory-strategy-evaluation.md`: document scenario design, scoring
    dimensions, fixture conventions, and how future strategy plans should add
    new cases.
  - Follow-up draft plans listed below: add explicit tasks to extend the
    harness when Project Wiki, Mem0-style, Graphiti-style, or Cognee-style
    processors are implemented.
- **Steps**:
  - [ ] Define a small, typed scenario fixture format with user profile,
        project/workspace context, conversation/source inputs, expected recall
        targets, expected exclusions, temporal facts, and safety traps.
  - [ ] Add deterministic scoring dimensions for recall quality,
        precision/noise, temporal correctness, provenance, safety, portability,
        and use-case fit.
  - [ ] Add baseline fixtures for coding continuity, research/source tracking,
        preference extraction, requirement changes, team knowledge retrieval,
        and secret/adversarial content.
  - [ ] Score `agent-journal` as the only fully implemented strategy in this
        plan, and represent future strategies with skipped or expected-pending
        cases rather than false pass/fail claims.
  - [ ] Add a stable recommendation result shape that can later power product
        copy such as "recommended for coding agents" without hard-coding claims
        directly in UI components.
  - [ ] Ensure the harness can run in CI without network access, hosted APIs, or
        nondeterministic LLM evaluation.
  - [ ] Document how future processor plans must add scenario fixtures before
        claiming a strategy is recommended for a user segment.
- **Tests**:
  - `npm test --workspace @eweser/shared -- memory-evaluation`
  - `npm test --workspace @eweser/mcp` if MCP-facing strategy metadata is
    exercised by the harness.
- **Verification**:
  - Confirm scenario results recommend `agent-journal` for coding-continuity
    fixtures and mark unimplemented strategies as pending evidence.
  - Confirm secret/adversarial fixtures fail if credentials or unsafe durable
    instructions would be stored or recommended.
- **Manual test handoff**:
  - Record how a tester can run the scenario suite, inspect the generated
    recommendation output, and add a new fixture for a future memory strategy.
- **Dependencies**: `run-1`, `run-3`, `run-4`
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 6: Verification, Manual Testing, And Plan Split Handoff

- **Id**: `run-6`
- **Title**: `Verification, Manual Testing, And Plan Split Handoff`
- **Deliverable**: Main feature is ready for user manual testing, with each
  follow-up draft updated from implementation findings.
- **Files**:
  - `docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md`: update
    execution summary and scenario evaluation results.
  - Follow-up draft plans listed below: update based on implementation findings.
- **Steps**:
  - [ ] Run narrow workspace tests first, then root checks if cross-package
        changes require them.
  - [ ] Perform internal QA for auth boundaries, Yjs/CRDT usage, changesets,
        interoperability, and secret redaction.
  - [ ] Review scenario evaluation output and confirm product recommendation
        claims match implemented evidence.
  - [ ] Record manual testing instructions for the user before expanding later
        phases.
  - [ ] Update follow-up draft plans with concrete implementation discoveries.
- **Tests**:
  - `npm test --workspace @eweser/shared`
  - `npm test --workspace @eweser/auth-server-hono -- connect-ai`
  - `npm test --workspace @eweser/app`
  - `npm test --workspace @eweser/mcp`
  - `npm test --workspace @eweser/shared -- memory-evaluation`
  - `npm run check`
- **Verification**:
  - User can manually test Connect AI, MCP memory save, strategy lookup, Agent
    Journal export, and scenario-based strategy evaluation before any processor
    work begins.
- **Manual test handoff**:
  - Add a consolidated "Manual Test Script" note to this plan covering the full
    end-to-end flow and the safest order for a separate manual tester to run it.
- **Dependencies**: `run-1`, `run-2`, `run-3`, `run-4`, `run-5`
- **Model tier**: `strong`
- **Risk level**: `high`

## Follow-Up Draft Plans

- `docs/ai/plans/2026-04-29-ai-memory-auto-capture-draft.md`
- `docs/ai/plans/2026-04-29-ai-memory-project-wiki-draft.md`
- `docs/ai/plans/2026-04-29-ai-memory-mem0-processor-draft.md`
- `docs/ai/plans/2026-04-29-ai-memory-graphiti-processor-draft.md`
- `docs/ai/plans/2026-04-29-ai-memory-cognee-processor-draft.md`
- `docs/ai/plans/2026-04-29-ai-memory-launch-readiness-draft.md`

These drafts are not approved for coding by approval of this main plan. Expand
and approve them separately after the main feature is manually tested.

## Stop Conditions

Stop and ask for user approval if:

- Implementation requires external processor dependencies, containers, hosted
  APIs, or telemetry configuration.
- Real `auto` capture needs background services, client hooks, or capture
  policies that are not already described in this plan.
- Strategy config cannot be stored canonically in EweserDB rooms without
  re-planning the data model.
- Auth-server PostgreSQL would become the canonical store for user-owned memory
  strategy/configuration rather than auth-operational metadata.
- A destructive migration, migration deletion, secret handling, or direct push
  to `main` is needed.
- Verification exposes a blocking issue that cannot be fixed inside this
  approval boundary.

## Approval Boundary

Approval of this plan authorizes Coder to implement Runs 1-6, make focused
supporting edits needed for those runs, update tests and docs, add required
changesets, run relevant verification, perform internal QA, fix issues found
inside this boundary, and update this plan's execution summary.

Approval does not authorize Project Wiki implementation, Mem0/Graphiti/Cognee
integration, background automatic capture services, unrelated app-shell
redesigns, destructive git operations, direct pushes to `main`, secret handling,
or making PostgreSQL the canonical store for user-owned memory strategy data.

## Risks

| Risk                        | Why it matters                                            | Mitigation                                                                                   |
| --------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Strategy config split-brain | Auth setup can disagree with user-owned strategy docs     | EweserDB rooms are canonical; PostgreSQL stores only auth-operational refs/mirrors           |
| Capture modes overpromise   | `suggest` and `auto` imply review/capture workflows       | Test every shipped mode; mark or defer `auto` if real capture needs another plan             |
| Conversation type overload  | Too many optional fields make memory hard to reason about | Add only scope/provenance basics; use follow-up collections for sources/artifacts/processors |
| Secret leakage              | Ordinary memory is searchable/exportable                  | Keep redaction before write and keep secrets out of ordinary memory                          |
| Memory poisoning            | Agents can write misleading durable context               | Use review mode, provenance, audit links, and per-agent write scopes                         |
| Recommendation overclaiming | Strategy labels can imply evidence that tests do not show | Use scenario results as the source of recommendation claims; mark future strategies pending  |
| Cross-package cascade       | Shared schema changes affect SDK, app, MCP, examples      | Use narrow tests first, then root checks; add changeset                                      |

## Execution Summary

| Run     | Status   | Files Changed                                                                                                                                                                                                                                                     | Verification                                                                                                                                                                                               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-1` | Complete | `packages/shared/src/collections/memory-strategy.ts`, `packages/shared/src/collections/conversation.ts`, `packages/shared/src/collections/index.ts`, `packages/db/src/types.ts`, `packages/db/src/examples/dbShape.ts`, `.changeset/ai-memory-strategy-schema.md` | `npm test --workspace @eweser/shared`; `npm run type-check --workspace @eweser/shared`; `npm run type-check --workspace @eweser/db`                                                                        | Shared strategy/scope/capture/review/provenance contracts compile; old conversation docs remain valid because new fields are optional. Manual handoff: inspect exported types from `@eweser/shared`, then run shared tests and verify `conversation.test.ts` covers minimal old docs plus scoped metadata.                                                                                                                                              |
| `run-2` | Complete | `packages/auth-server-hono/src/routes/connect-ai.ts`, `packages/auth-server-hono/src/routes/connect-ai.test.ts`, `packages/app/src/components/connect-ai-page.tsx`, `packages/app/src/lib/api.ts`, `packages/app/src/App.test.tsx`                                | `npm test --workspace @eweser/auth-server-hono -- connect-ai`; `npm test --workspace @eweser/app`; `npm run type-check --workspace @eweser/auth-server-hono`; `npm run type-check --workspace @eweser/app` | Connect AI now returns strategy overview, capture modes, and separate readable/writable/default write room fields. `auto` is visible but disabled. Manual handoff: run the app, open `/account/connect-ai`, verify Shared Agent Memory defaults to a conversations room, toggle read/write independently, create or rotate a token, and confirm invalid readable/writable/default-write combinations are rejected by API tests.                         |
| `run-3` | Complete | `packages/mcp-server/src/data-layer.ts`, `packages/mcp-server/src/tools.ts`, `packages/mcp-server/src/tools.test.ts`, `packages/mcp-server/README.md`, `packages/mcp-server/vitest.config.ts`                                                                     | `npm test --workspace @eweser/mcp`; `npm run type-check --workspace @eweser/mcp`                                                                                                                           | MCP exposes `eweser_get_memory_strategy`, `eweser_list_memory_scopes`, strategy-aware `eweser_save_memory`, and `eweser_suggest_memory`; save infers the memory room when unambiguous and errors on ambiguity. Manual handoff: call strategy lookup, list scopes, save without `roomId` when one writable conversations room exists, then add a second writable memory room or mock one and verify the ambiguity error asks for `roomId` or `scopeKey`. |
| `run-4` | Complete | `packages/shared/src/utils/agent-journal-markdown.ts`, `packages/shared/src/utils/agent-journal-markdown.test.ts`, `packages/shared/src/utils/index.ts`, `packages/mcp-server/src/tools.ts`                                                                       | `npm test --workspace @eweser/shared`; `npm test --workspace @eweser/mcp`; `npm run type-check --workspace @eweser/shared`; `npm run type-check --workspace @eweser/mcp`                                   | Agent Journal exports deterministic Obsidian-compatible Markdown by default and imports supported detail files back into scoped memory records. Manual handoff: create seed memories, call `eweser_export_memory`, verify `MEMORY.md`, `decisions.md`, `memory/YYYY-MM-DD.md`, `projects/<scope>.md`, and `memory/items/*.md` include YAML frontmatter, tags, and `[[wikilinks]]`; run the round-trip shared test.                                      |
| `run-5` | Complete | `packages/shared/src/memory-evaluation/index.ts`, `packages/shared/src/memory-evaluation/index.test.ts`, `docs/ai/memory-strategy-evaluation.md`, `packages/shared/src/index.ts`, `packages/shared/src/INDEX.md`                                                  | `npm test --workspace @eweser/shared -- memory-evaluation`; `npm test --workspace @eweser/shared`                                                                                                          | Deterministic scenario harness recommends implemented `agent-journal` for coding continuity and marks Project Wiki, Auto-Curated, Knowledge Graph, and Workspace Intelligence as pending evidence. Manual handoff: run the memory-evaluation test target and inspect `BASELINE_MEMORY_SCENARIOS` before adding future processor fixtures.                                                                                                               |
| `run-6` | Complete | This plan and follow-up draft plans                                                                                                                                                                                                                               | Package-local tests and type-checks above; root `npm run check`                                                                                                                                            | Main feature is ready for manual testing. Auto capture remains planned/disabled; no external processors or background hooks were added.                                                                                                                                                                                                                                                                                                                 |

## Manual Test Script

Use this script after `npm run dev:docker` and `npm run dev --workspace @eweser/app` are running for this worktree.

1. Open the authenticated app at the local app URL from runtime orientation and navigate to `/account/connect-ai`.
2. Confirm the page shows **Shared Agent Memory**, strategy `Shared Agent Memory`, capture mode `Manual`, and a default write room only when a `conversations` room is selected as writable.
3. Select one `conversations` room as readable and writable. Leave personal note rooms off unless intentionally testing read/write narrowing.
4. Prepare setup for Codex or Claude Desktop. Confirm the token setup payload is generated and the UI keeps bearer tokens out of URLs.
5. In an MCP-capable client or local MCP test harness, call `eweser_get_memory_strategy` and `eweser_list_memory_scopes`; expect `agent-journal`, `manual`, and the selected readable/writable room ids.
6. Call `eweser_save_memory` without `roomId` while exactly one writable conversations room exists. Expect a created memory with `strategy: "agent-journal"`, `captureMode: "manual"`, `scopeType`, `scopeKey`, and `reviewStatus: "accepted"`.
7. Call `eweser_suggest_memory`; expect a conversations document with `captureMode: "suggest"` and `reviewStatus: "suggested"`.
8. Call `eweser_export_memory`; expect an array of Obsidian-compatible Markdown files including `MEMORY.md`, `decisions.md`, a daily page, a project/scope page, and per-memory detail pages with YAML frontmatter, tags, and `[[wikilinks]]`.
9. Save a memory containing token-like text such as `token=example-secret-value`; expect the persisted/exported summary to contain `[REDACTED_SECRET]` and `redactionWarnings`.
10. Run `npm test --workspace @eweser/shared -- memory-evaluation`; expect `agent-journal` to be implemented and future strategies to remain pending evidence.

## Self-Reflection / Instruction Improvements

- Added repo guidance that interoperable user-owned product configuration
  belongs in EweserDB rooms/shared schemas, while auth-server PostgreSQL remains
  auth-operational.
- Added repo guidance that EweserDB is pre-live, so plans may prefer clean
  long-term schema changes over prototype-data compatibility when explicitly
  documented.
- Implementation note: adding a shared collection key must update the SDK
  collection-to-document map and example DB shape in the same run, or downstream
  app/auth type-checks fail even when shared tests pass.
- Implementation note: MCP package tests need a Vitest alias for
  `@eweser/shared` source when new shared runtime helpers are added before
  `@eweser/shared` has been rebuilt.
