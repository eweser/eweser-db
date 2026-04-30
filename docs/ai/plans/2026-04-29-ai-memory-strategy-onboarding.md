# Plan: AI Memory Strategy Onboarding

## Goal

Turn the cross-agent memory direction into a shippable product path:

- Give users one default path: **cross-platform AI memory in one click**.
- Let power users choose a memory strategy per user, project, repo, or workspace.
- Keep EweserDB as the canonical user-owned database, sync, permission, audit, and portability layer.
- Treat external memory systems such as Mem0, Graphiti, and Cognee as optional derived processors, not as the source of truth.

The core product claim should stay narrow and defensible:

> Your AI memory lives in your Eweser database, follows you across agents and apps, and stays portable if you leave.

<!-- eweser-orchestration -->

```yaml
orchestration:
  enabled: true
  maxParallel: 2
  baseBranch: main
  finalStages: []
runs:
  - id: run-1
    title: Product Spec And Strategy Schema
    agent: eweser-code
    model: strong
    parallel: false
    dependsOn: []
    writeScope:
      - docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md
      - packages/shared/src/collections/*
      - packages/auth-server-hono/src/db/schema/agents.ts
      - packages/auth-server-hono/drizzle/*
      - .changeset/memory-strategy-types.md
    tests:
      - shared type tests if collection changes are added
      - auth-server migration/schema tests if DB fields are added
    changeset: maybe
  - id: run-2
    title: Connect AI Strategy Onboarding
    agent: eweser-code
    model: strong
    parallel: true
    dependsOn:
      - run-1
    writeScope:
      - packages/auth-server-hono/src/routes/connect-ai.ts
      - packages/auth-server-hono/src/routes/connect-ai.test.ts
      - packages/app/src/components/connect-ai-page.tsx
      - packages/app/src/lib/api.ts
      - packages/app/src/App.test.tsx
    tests:
      - auth-server route tests for strategy defaults, invalid strategy, invalid writable room
      - app tests for default card, advanced selection, token setup payload preservation
    changeset: no
  - id: run-3
    title: Strategy-Aware MCP Defaults
    agent: eweser-code
    model: strong
    parallel: true
    dependsOn:
      - run-1
    writeScope:
      - packages/mcp-server/src/tools.ts
      - packages/mcp-server/src/data-layer.ts
      - packages/mcp-server/src/auth.ts
      - packages/mcp-server/src/tools.test.ts
      - packages/mcp-server/README.md
    tests:
      - save without roomId when one writable memory room exists
      - error when multiple writable rooms and no scope/room disambiguation
      - strategy lookup response shape
      - redaction still happens before write
    changeset: no
```

## Scope (In / Out)

### In

- Product model for memory strategies:
  - `agent-journal` as the default.
  - `project-wiki` for Karpathy-style/Obsidian-style project memory.
  - `auto-curated` for Mem0-style extraction and retrieval.
  - `knowledge-graph` for Graphiti/Zep-style temporal graph memory.
  - `workspace-intelligence` for Cognee-style workspace/document intelligence.
- Per-scope strategy settings:
  - global user memory
  - project/repo memory
  - workspace/team memory
  - agent-specific overrides
- Eweser-native canonical schema for memory settings, source records, derived artifacts, and access/audit records.
- Connect AI onboarding UX that starts with the default strategy and exposes advanced configuration without making ordinary users choose infrastructure.
- MCP behavior updates so agents can discover the active memory strategy and write to the correct room with fewer manual choices.
- Import/export plan for Markdown/OpenClaw/Obsidian-compatible memory.
- Legal/open-source boundary for using Apache-2.0 memory engines commercially.

### Out

- Product-code implementation in this planning run.
- Committing to a single external processor as a hard dependency.
- Building a benchmark suite against Mem0/Zep/Cognee in this pass.
- Automatic capture from closed web UIs when an upstream client does not expose hooks.
- Secret storage inside ordinary memory. Secrets remain out of normal searchable memory and belong in a separate encrypted vault/secure-note path.

## Current Repo Context

- `README.md` and `ARCHITECTURE.md` define EweserDB as a local-first, user-owned database SDK built on Yjs rooms and shared schemas.
- `packages/mcp-server` already exposes the agent-facing surface: list/read/write/search and `eweser_save_memory`.
- `packages/mcp-server/src/tools.ts` currently saves memory into `conversations` rooms with `memoryType: 'session' | 'memory' | 'decision' | 'bookmark'`, redacts secret-like content, caps transcript turns, and adds a worktree tag.
- `packages/app/src/components/connect-ai-page.tsx` already has the Connect AI setup UI and writable room selector.
- `packages/auth-server-hono/src/routes/connect-ai.ts` already owns client catalog, token/OAuth setup, recommended writable rooms, token rotation, and Connect AI overview data.
- `packages/auth-server-hono/src/db/schema/agents.ts` already stores read/write scopes and per-agent token state, but not memory strategy metadata.
- `docs/ai/plans/completed/2026-04-04-cross-agent-memory-search.md` and `docs/ai/plans/completed/2026-04-06-memory-mcp-wrap-up.md` document the shipped memory/search baseline.
- `docs/ai/plans/2026-04-05-auto-knowledge-graph.md` is a useful deferred concept, but this plan should start with user-facing strategy selection before graph infrastructure.

## Product Model

### Memory Strategy Options

| Strategy                 | User-facing label      | Default? | Best for                                                                    | Behavior                                                                                                  | Implementation stance                                        |
| ------------------------ | ---------------------- | -------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `agent-journal`          | Agent Journal          | Yes      | coding agents, daily assistant continuity, "remember what we did yesterday" | Daily/session notes, decisions, preferences, bookmarks, searchable summaries, Markdown export             | Eweser-native over `conversations` plus notes/export helpers |
| `project-wiki`           | Project Wiki           | No       | research, writing, product planning, source-heavy topics                    | LLM-maintained wiki pages, project index, concept/person/project/decision pages, Obsidian/OpenClaw export | Eweser-native first; compatible with Karpathy-style Markdown |
| `auto-curated`           | Auto-Curated Memory    | Advanced | users who want automatic fact extraction and preference recall              | Extracted facts, dedupe, semantic retrieval, user review/edit                                             | Optional Mem0-style processor over Eweser canonical records  |
| `knowledge-graph`        | Knowledge Graph        | Advanced | changing requirements, Lark/workspace memory, temporal questions            | Source episodes, entities, relationships, validity windows, provenance                                    | Optional Graphiti/Zep-style derived graph                    |
| `workspace-intelligence` | Workspace Intelligence | Advanced | docs, tables, transcripts, Lark workspace, team knowledge                   | Multi-source ingestion, graph/vector reasoning, workspace search                                          | Optional Cognee-style processor                              |
| `custom`                 | Custom                 | Advanced | power users and self-hosters                                                | User chooses storage, processor, export, capture rules                                                    | Use same canonical schema and processor contract             |

Default onboarding should not mention Karpathy, OpenClaw, Mem0, Graphiti, or Cognee. Those names belong in docs and advanced settings.

### Scope Levels

Every memory strategy setting should be scoped. Do not make one global strategy carry every use case.

| Scope          | Examples                                                 | Default behavior                                           |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| User/global    | personal preferences, response style, common tools       | `agent-journal`, read by all granted agents                |
| Project/repo   | `/path/to/eweser-db`, a client project, a research topic | inherit global strategy, default `agent-journal` for repos |
| Workspace/team | Lark workspace, company knowledge base                   | `workspace-intelligence` or `knowledge-graph` when enabled |
| Agent/client   | Codex, Claude Code, ChatGPT web, OpenClaw, Copilot       | inherits project/global, may have read/write limits        |

Project detection should be pragmatic:

- token clients can pass `EWESER_WORKTREE_TAG` today; keep using it as the first repo/project namespace.
- Connect AI should let users select or create a project during setup.
- Web/OAuth clients should default to global memory unless they provide a project hint or the user chooses one in Eweser.
- A future local helper can detect git repo root and propose a project automatically.

## UX Plan

### First-Run Onboarding

Primary path:

1. User signs in at `eweser.com`.
2. App shows: "Get cross-platform AI memory in one click."
3. Default selected: **Shared Agent Memory** / `agent-journal`.
4. User chooses first agent to connect: Codex, Claude Desktop, Claude web, ChatGPT web, Copilot, OpenClaw.
5. Eweser creates or selects:
   - a global memory room,
   - a project memory room if project context is known,
   - write scope limited to the selected memory room(s).
6. Setup page shows the existing MCP/OAuth/token instructions.
7. User lands on a Memory page showing recent saves, connected agents, strategy, and export options.

Suggested user-facing copy:

> Shared memory for your AI tools. Codex, Claude, ChatGPT, Copilot, OpenClaw, and other MCP clients can remember the same decisions, preferences, and project context. You can review, edit, revoke, and export everything.

Advanced link:

> Choose a memory style

Advanced choices:

- **Agent Journal**: best for coding assistants and day-to-day continuity.
- **Project Wiki**: best for research, writing, and source-heavy projects.
- **Auto-Curated Memory**: best when you want Eweser to extract stable facts automatically.
- **Knowledge Graph**: best for teams, changing requirements, and relationship-heavy work.
- **Workspace Intelligence**: best for Lark/docs/tables/transcripts.

### Connect AI Page Changes

`packages/app/src/components/connect-ai-page.tsx` should evolve from "choose writable room, then connect client" to:

1. Memory strategy summary card:
   - active default strategy
   - global/project scope
   - "change strategy" advanced action
2. Writable AI area:
   - still visible, but subordinate to memory strategy
   - default room selection should come from strategy config
3. Client cards:
   - include which memory scope this client can write to
   - include "project memory" when available
4. Audit/access link:
   - show last used, write scope, and memory saves.

Do not remove the explicit writable room selector. It is the user's safety control.

### Memory Settings Page

Add a dedicated settings surface in the app shell:

- `/memory`
  - recent memory items
  - active scopes
  - connected agents
  - import/export
- `/memory/settings`
  - strategy selection
  - per-project overrides
  - auto-save policy
  - processor settings
  - retention/delete controls
- `/memory/projects/:projectId`
  - project memory strategy
  - connected rooms and agents
  - Markdown export/import
  - review queue for suggested memories

This can be a later app-shell run if the first implementation keeps controls inside Connect AI.

## Data Model Plan

### Add Shared Types

Add shared types in `packages/shared/src/collections/`:

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
  defaultWriteRoomId?: string;
  sourceRoomIds?: string[];
  exportFormats?: Array<'markdown' | 'openclaw' | 'obsidian' | 'json'>;
  captureMode: MemoryCaptureMode;
  processorIds?: string[];
  retentionDays?: number;
  reviewRequired?: boolean;
};
```

Add `MemoryStrategyConfig` as a collection only if user apps and agents need to sync it as user-owned data. Otherwise keep initial strategy rows in auth-server Postgres and expose them through authenticated API. The likely better long-term shape is both:

- auth-server stores operational setup metadata for onboarding and token defaults.
- Eweser rooms store user-owned strategy documents that self-hosters and apps can sync/export.

### Extend Agent Config Metadata

Add strategy linkage to agent configs, likely in auth-server DB:

- `memoryStrategyId`
- `defaultMemoryScopeKey`
- `defaultWriteRoomId`
- optional `projectScopeKey`

This needs a Drizzle migration. Never delete existing migrations.

### Canonical Memory Records

Do not replace `Conversation`; extend it or add companion collections carefully.

Minimum change:

- Keep `conversations` as the canonical memory item collection for MVP.
- Add optional fields to `ConversationBase` only if needed:
  - `scopeType?: 'global' | 'project' | 'workspace' | 'agent'`
  - `scopeKey?: string`
  - `strategy?: MemoryStrategyKind`
  - `sourceRefs?: string[]`
  - `derivedFromIds?: string[]`
  - `confidence?: number`
  - `reviewStatus?: 'accepted' | 'suggested' | 'rejected'`

Because `@eweser/shared` is published, behavior/API changes need a changeset.

For richer future work, add separate derived collections:

- `memorySources`: raw imported/captured episodes and source metadata.
- `memoryArtifacts`: generated wiki pages, extracted facts, graph summaries.
- `memoryProcessorRuns`: processor run metadata, errors, and provenance.

Do not put this all into `Conversation` if it starts turning into an untyped dumping ground.

## MCP Plan

### New/Updated Tools

Keep existing tools. Add a thin strategy-aware layer:

| Tool                         | Purpose                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `eweser_get_memory_strategy` | Return active memory strategy and writable targets for the current token/project.       |
| `eweser_save_memory` update  | Allow optional `scopeType`, `scopeKey`, and `strategy`; default them from token config. |
| `eweser_list_memory_scopes`  | Show available global/project/workspace scopes the agent can use.                       |
| `eweser_export_memory`       | Later: generate Markdown/OpenClaw/Obsidian export for a scope.                          |
| `eweser_suggest_memory`      | Later: stage a suggested memory for user review instead of saving directly.             |

Important: strategy-aware defaults should reduce the need for agents to know room IDs. The user should not have to paste a room UUID into every agent instruction.

### Tool Behavior

- If the agent has one writable memory room, `eweser_save_memory` should default to it when `roomId` is omitted.
- If multiple writable memory rooms exist, require either `roomId` or `scopeKey`.
- If the active strategy is `project-wiki`, saves should prefer project-scoped tags and artifact generation.
- If the active strategy is `agent-journal`, saves should behave like current `conversations` memory.
- External processors must write derived outputs with provenance back to source memory IDs.

## Processor Integration Plan

### Processor Contract

Define an internal processor interface before integrating any external engine:

```ts
type MemoryProcessorKind = 'mem0' | 'graphiti' | 'cognee' | 'local-markdown';

interface MemoryProcessor {
  id: string;
  kind: MemoryProcessorKind;
  displayName: string;
  ingest(input: MemorySourceRecord): Promise<MemoryArtifact[]>;
  search(query: MemoryQuery): Promise<MemorySearchResult[]>;
  rebuild(scope: MemoryScope): Promise<MemoryProcessorRun>;
}
```

Eweser responsibilities:

- canonical storage
- auth/grants
- sync
- audit logs
- export/delete
- source provenance

Processor responsibilities:

- extraction
- ranking
- graph construction
- semantic retrieval
- summarization

### External Engine Notes

- Mem0/OpenMemory:
  - Apache-2.0, commercially friendly with notices.
  - Best first optional processor for auto-curated memory.
  - Do not require users to sign up for Mem0 Cloud.
  - Prefer self-hosted/library mode inside Eweser hosted/self-hosted environments.
- Graphiti/Zep:
  - Graphiti is Apache-2.0.
  - Best for temporal graph memory and Lark/workspace facts.
  - Treat Graphiti graph as derived; Eweser episodes remain canonical.
  - Disable telemetry by default in self-host/privacy-sensitive profile.
- Cognee:
  - Apache-2.0.
  - Best for workspace intelligence over docs/tables/transcripts.
  - Heavier storage model; keep as advanced/later.

Legal detail to verify before implementation:

- current licenses in the exact package versions used;
- attribution/NOTICE requirements;
- trademarks and product naming;
- hosted-service terms if any cloud API is used;
- whether optional containers/images include non-Apache transitive dependencies that affect distribution.

## Runs

### Run 1: Product Spec And Strategy Schema

- Recommended Agent: planner/coder (strong)
- Steps:
  - Write a product spec for memory strategy UX, default behavior, and advanced settings.
  - Decide whether strategy config first lives in auth-server Postgres, Eweser rooms, or both.
  - Add shared TypeScript types for strategy kinds and memory scopes.
  - Draft migration shape for agent strategy metadata if DB-backed.
  - Define exact default: `agent-journal`, `captureMode: manual` or `suggest`, global scope plus optional project scope.
- Files:
  - `docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md`
  - `packages/shared/src/collections/*`
  - `packages/auth-server-hono/src/db/schema/agents.ts`
  - `packages/auth-server-hono/drizzle/*`
- Tests:
  - shared type tests if collection changes are added
  - auth-server migration/schema tests if DB fields are added
- Changeset:
  - required if published `@eweser/shared` API changes.

### Run 2: Connect AI Strategy Onboarding

- Recommended Agent: coder (strong)
- Steps:
  - Extend Connect AI overview API to return memory strategy defaults and available strategy choices.
  - Add strategy selection state to setup/rotate token requests.
  - Ensure token creation links the agent to a strategy/scope and default write room.
  - Update Connect AI page with default "Shared Agent Memory" card and advanced strategy picker.
  - Preserve explicit writable-room controls.
  - Make default copy concrete and non-technical.
- Files:
  - `packages/auth-server-hono/src/routes/connect-ai.ts`
  - `packages/auth-server-hono/src/routes/connect-ai.test.ts` or route tests where present
  - `packages/app/src/components/connect-ai-page.tsx`
  - `packages/app/src/lib/api.ts`
  - `packages/app/src/App.test.tsx` or component tests
- Tests:
  - auth-server route tests for strategy defaults, invalid strategy, invalid writable room
  - app tests for default card, advanced selection, token setup payload preservation

### Run 3: Strategy-Aware MCP Defaults

- Recommended Agent: coder (strong)
- Steps:
  - Add `eweser_get_memory_strategy`.
  - Allow `eweser_save_memory` to infer writable memory room from token/strategy when unambiguous.
  - Add optional `scopeType`, `scopeKey`, and `strategy` fields to saved memory docs if approved in Run 1.
  - Keep secret redaction and 100-turn cap.
  - Add strategy-aware tags such as `scope:<key>` and `strategy:<kind>` only if they do not clutter user-facing notes.
- Files:
  - `packages/mcp-server/src/tools.ts`
  - `packages/mcp-server/src/data-layer.ts`
  - `packages/mcp-server/src/auth.ts`
  - `packages/mcp-server/src/tools.test.ts`
  - `packages/mcp-server/README.md`
- Tests:
  - save without `roomId` when one writable memory room exists
  - error when multiple writable rooms and no scope/room disambiguation
  - strategy lookup response shape
  - redaction still happens before write

### Run 4: Agent Journal Default And Markdown Export

- Recommended Agent: coder (fast/strong)
- Steps:
  - Formalize default Agent Journal document shapes.
  - Add export helpers for OpenClaw-style and Obsidian-style Markdown:
    - `MEMORY.md`
    - `memory/YYYY-MM-DD.md`
    - project index
    - decisions page
  - Add import helpers for existing Markdown memory where feasible.
  - Keep export deterministic and human-editable.
- Files:
  - `packages/shared/src/utils/*`
  - `packages/mcp-server/src/tools.ts` if export is an MCP tool
  - `packages/app/src/*` if export is app UI
  - docs under `docs/workflows/`
- Tests:
  - Markdown export snapshots
  - import/parser round trip for supported subset
  - no secrets included beyond already-redacted ordinary memory

### Run 5: Project Wiki Strategy

- Recommended Agent: coder (strong)
- Steps:
  - Add project-scoped wiki artifact model.
  - Generate or update pages for:
    - project overview
    - decisions
    - people/apps/tools
    - active questions
    - source index
  - Keep raw sources immutable and generated wiki pages clearly marked as derived.
  - Add review/edit flow before generated pages become canonical if needed.
- Files:
  - likely `packages/shared/src/collections/*`
  - `packages/app/src/*`
  - optional background worker package if generation is server-side
- Tests:
  - generated artifact provenance
  - project scoping
  - export compatibility

### Run 6: Processor Adapter Spike - Mem0

- Recommended Agent: coder (strong)
- Steps:
  - Prototype a Mem0-style processor behind an internal adapter.
  - Use Eweser memory records as input and write derived extracted facts back with provenance.
  - Do not expose Mem0 branding in default UX.
  - Verify license files and attribution.
  - Keep hosted and self-host deployment modes clear.
- Files:
  - new processor package or service, exact path TBD
  - `docker-compose.dev.yml` only if local service is needed
  - docs under `docs/deployment/` and `docs/workflows/`
- Tests:
  - adapter unit tests with fake processor client
  - provenance tests
  - processor disabled fallback

### Run 7: Processor Adapter Spike - Graphiti / Cognee

- Recommended Agent: coder (strong)
- Steps:
  - Choose one second advanced processor based on immediate product need:
    - Graphiti for temporal project/workspace memory.
    - Cognee for Lark/docs/workspace intelligence.
  - Build a narrow adapter spike, not a full product integration.
  - Confirm infra footprint for hosted and self-host.
  - Confirm telemetry/offline/privacy defaults.
- Files:
  - new processor package or service, exact path TBD
  - deployment docs
  - optional worker config
- Tests:
  - can ingest source episode
  - can query derived results
  - Eweser source deletion/revocation removes or invalidates derived index

### Run 8: QA, Legal, And Launch Readiness

- Recommended Agent: qa (strong)
- Steps:
  - Review permissions and audit logs for every memory write/read path.
  - Verify no ordinary memory path stores secrets intentionally.
  - Verify hosted/self-host copy is accurate.
  - Verify attribution/NOTICE obligations for bundled processors.
  - Run app, auth-server, MCP, shared, and root checks appropriate to touched files.
  - Update launch/compliance plans if paid hosted memory changes privacy/terms scope.
- Files:
  - `docs/ai/plans/2026-04-28-compliance-and-legal.md`
  - `docs/security/*`
  - package READMEs
- Tests:
  - `npm test --workspace @eweser/mcp`
  - `npm test --workspace @eweser/shared`
  - auth-server tests
  - app tests
  - `npm run check`

## Risks

| Risk                                                    | Why it matters                                                                    | Mitigation                                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| UX exposes infrastructure choices too early             | Users should not need to understand Mem0/Graphiti/Cognee during onboarding        | Default to "Shared Agent Memory"; hide engines under advanced settings                                |
| Strategy config splits between auth DB and Eweser rooms | Drift can make agent setup disagree with user-owned data                          | Define operational vs user-owned fields explicitly; keep Eweser docs canonical long term              |
| Existing `Conversation` type becomes overloaded         | Too many optional fields will make memory data hard to reason about               | Extend only for scope/provenance basics; add separate collections for sources/artifacts/processors    |
| External processor becomes source of truth              | Violates Eweser user-owned thesis and makes export/delete unreliable              | Store sources in Eweser; processors only write derived artifacts with provenance                      |
| Hosted service legal ambiguity                          | Apache-2.0 is permissive, but cloud terms/trademarks/transitive deps still matter | Verify exact versions and NOTICE/trademark obligations before shipping adapters                       |
| Memory poisoning                                        | Agents can write misleading durable context                                       | Add review mode, source/provenance, audit logs, and per-agent write scopes                            |
| Secret leakage into memory                              | Ordinary memory is searchable and may be exported                                 | Keep redaction, add explicit vault boundary, do not allow "remember this password" in ordinary memory |
| Per-project scoping fails for web clients               | Web clients may not know repo/worktree context                                    | Default to global memory; let user set scope in Eweser or use explicit MCP tool arguments             |

## Assumptions / Questions

- Assumption: the MVP should ship without requiring Mem0, Graphiti, or Cognee.
- Assumption: `agent-journal` should be the default because it best matches existing `eweser_save_memory` and the user-owned/portable philosophy.
- Assumption: project scoping can start with `EWESER_WORKTREE_TAG` and user-selected project names before adding automatic repo detection.
- Assumption: ordinary memory remains searchable/redacted; intentional secrets stay out of scope for this plan.
- Question for implementation approval: should memory strategy documents be a new published `@eweser/shared` collection immediately, or should Run 1 start with auth-server operational config plus docs until the shape hardens?
- Question for implementation approval: should default capture mode be `manual` or `suggest`? `manual` is safer; `suggest` is more magical but needs a review queue.

## Open-Source / Commercial Boundary

Apache-2.0 projects such as Mem0, Graphiti, and Cognee are plausible for a paid hosted Eweser service and self-host distribution, subject to normal obligations:

- preserve copyright/license notices;
- include NOTICE files where required;
- do not imply endorsement;
- review trademarks/product naming;
- review transitive dependencies;
- avoid depending on third-party hosted APIs unless their terms permit the intended use.

Product copy should say "powered by Eweser memory" by default. Advanced settings can say "Mem0-compatible processor" or "Graphiti processor" only after legal/product naming is reviewed.

## Execution Summary

```text
Run 1: Product spec and strategy schema
└── Run 2: Connect AI strategy onboarding
    └── Run 3: Strategy-aware MCP defaults
        ├── Run 4: Agent Journal + Markdown export
        ├── Run 5: Project Wiki strategy
        └── Run 6/7: Optional processor adapter spikes
Run 8: QA, legal, and launch readiness
```

The near-term implementation should stop after Runs 1-4 unless there is a concrete user need for automatic extraction or temporal graph behavior. Runs 6-7 are advanced processor spikes, not launch blockers for the core "same memory everywhere" promise.
