# Plan: Folder-Scoped AI Access for MCP and Connect AI

Status: implemented through room-scoped Connect AI fallback and MCP enforcement on 2026-04-27

## Implementation Status

- Runs 1-2: split read/write agent scope fields, migration, and auth API normalization are implemented.
- Run 3: MCP read/write enforcement is implemented, including note `folderIds` and `sourcePath` write restrictions.
- Runs 4-5: Connect AI exposes a writable-room selector, recommends a dedicated `AI Notes` room, and issues explicit writable-room scope for token clients.
- Run 6: full root `npm test` and `npm run build` passed. The first sandboxed root test hit localhost bind `EPERM`; the escalated rerun passed, including Cypress smoke specs.
- Remaining product follow-up: expose true folder-level writable choices in the UI once folder selection UX is ready.

## Goal

Ship a safe, understandable AI access model for Eweser MCP where users can connect clients like Codex with a writable token, while restricting writes to a dedicated AI area such as an `AI` folder and keeping the rest of their notes read-only by default.

## Scope

- In:
  - `packages/auth-server-hono` token and scope model for agent-based MCP access
  - `packages/auth-pages` Connect AI and approval UX for choosing readable vs writable scope
  - `packages/mcp-server` enforcement of note-level read/write restrictions
  - room and folder-aware policy design for notes
  - short-term production-safe fallback using a dedicated writable AI room
  - docs for how users should create and manage Codex/AI access safely
- Out:
  - broad redesign of notes/folder UX outside the AI access flow
  - non-note collections beyond what is needed for a consistent permission model
  - replacing room-level sharing across the whole product
  - unrelated auth migration work

## Current State

- Production Connect AI is live enough to issue MCP tokens and connect Codex.
- The current token model supports:
  - `permissions: "read" | "readwrite"`
  - `allowedCollections`
  - `allowedRooms`
- The current MCP enforcement is room-level, not folder-level.
- Notes already carry metadata that could support finer scoping:
  - `sourcePath`
  - `folderIds`
- Current practical behavior:
  - a token can be made read-only or readwrite
  - a token can be restricted to specific rooms
  - a token cannot yet do "read all notes, but write only in `/AI` folder"

## Product Direction

Target user experience:

- Users can connect an AI client from Connect AI.
- Users can choose where the AI may read.
- Users can choose where the AI may write.
- For notes, users can optionally restrict writes to:
  - one or more rooms
  - one or more folders inside a notes room
- The default recommended setup is conservative:
  - broad read only if explicitly granted
  - writes only to a dedicated `AI` folder or dedicated `AI Notes` room

## Proposed Permission Model

Introduce separate read and write scopes instead of one global permission toggle.

Suggested direction:

- top-level capability:
  - `read`
  - `write`
- read scope:
  - `readAllowedCollections`
  - `readAllowedRooms`
- write scope:
  - `writeAllowedCollections`
  - `writeAllowedRooms`
  - `writeAllowedFolderIds`
  - optional `writeAllowedPathPrefixes`

Notes:

- `writeAllowedFolderIds` is likely the best canonical product-level control if folders are first-class documents.
- `writeAllowedPathPrefixes` is a useful compatibility bridge for imported vault structures where `sourcePath` is already present.
- Empty write scope should mean no writes, even if read scope is broad.

## Run 1 Decisions

This section locks the first implementation slice so Runs 2-5 can proceed without re-deciding the model midstream.

### Canonical policy shape

Use separate read and write scope fields on agent configs.

- Keep existing fields for backward compatibility:
  - `allowedCollections`
  - `allowedRooms`
  - `permissions`
- Add new fields for the forward model:
  - `readAllowedCollections`
  - `readAllowedRooms`
  - `writeAllowedCollections`
  - `writeAllowedRooms`
  - `writeAllowedFolderIds`
  - `writeAllowedPathPrefixes`

Interpretation rules:

- New tokens should use the new read/write scope fields.
- Existing tokens should continue to work through compatibility mapping.
- `permissions: "read"` maps to:
  - read allowed according to legacy `allowedCollections` and `allowedRooms`
  - no write scope
- `permissions: "readwrite"` maps to:
  - read allowed according to legacy `allowedCollections` and `allowedRooms`
  - write allowed according to legacy `allowedCollections` and `allowedRooms`
- Once a token has any explicit new write-scope fields, MCP enforcement should prefer the new fields over the legacy `permissions` shortcut.

### Folder scoping strategy

Use both folder IDs and path prefixes in the first full model, with different roles:

- `writeAllowedFolderIds` is the canonical product-level scope for notes
- `writeAllowedPathPrefixes` is a pragmatic bridge for imported vaults and existing `sourcePath` data

Why both:

- folder IDs are more durable and product-native
- path prefixes are easier to bootstrap immediately and work with existing note metadata

Enforcement rule for notes:

- a write is allowed only if the note is inside an allowed writable room, and
- either:
  - the note references at least one allowed folder ID, or
  - the note `sourcePath` matches an allowed path prefix

For note creation:

- if the write scope includes path prefixes, created notes must provide a `sourcePath` under one of those prefixes
- if the write scope includes folder IDs, created notes must provide at least one matching `folderId`
- if both are configured, satisfying either one is sufficient inside an allowed writable room

### Short-term production-safe fallback

Before folder-aware UI and enforcement are complete, the recommended writable setup is:

- create a dedicated `AI Notes` room
- issue a `readwrite` token scoped only to that room
- keep all other note rooms read-only or excluded

This fallback is not a temporary hack. It remains a valid simple setup even after folder-level controls ship.

### Connect AI defaults

Default Connect AI behavior for token-based clients should become:

- default read scope:
  - no implicit "all collections" write access
  - conservative read defaults, ideally notes plus conversations only when explicitly chosen
- default write scope:
  - none unless the user opts into a writable target
- recommended preset:
  - "Safe AI workspace"
  - read selected rooms
  - write only to `AI Notes` room now
  - write only to `AI` folder later when available

For the very next implementation slice, Connect AI should keep the current room-based control surface but change its recommendation copy and token defaults to favor a dedicated writable AI room.

### Non-note collections

The first scoped-write release should optimize for notes.

- For non-note collections:
  - room-level write scope is sufficient in the first pass
  - no folder/path semantics are needed
- Folder/path restrictions apply only when `collectionKey === "notes"`

### Approval page behavior

The access approval page should converge toward the same mental model as Connect AI:

- readable rooms are selected independently
- writable rooms are selected independently
- folder-level writable note scope is additive and only relevant to notes

The first UI pass does not need to expose the full folder selector if backend support lands first. Room-only writable selection is acceptable for the first shipped step as long as the backend model supports the future extension cleanly.

## Acceptance Criteria

- A user can create a writable Codex token from production Connect AI without granting write access to all notes.
- A user can configure a token with:
  - read access to chosen rooms
  - write access limited to a dedicated AI room today
  - write access limited to chosen note folders after the folder-scoped feature ships
- MCP rejects create/update/delete operations outside the token's write scope.
- Connect AI and approval UI clearly explain what the AI can read and where it can write.
- The default setup path recommends a safe AI-specific writable area.
- Documentation explains the short-term room-based setup and the long-term folder-based model without ambiguity.

## Architecture Notes

- This work likely requires a schema change for agent config storage in `auth-server-hono`, so add a new Drizzle migration and never modify existing migrations.
- If shared types in `packages/shared` change, this affects downstream packages and should be treated as a monorepo-wide contract update.
- If any published package API changes in `packages/mcp-server` or `packages/shared`, add a changeset if required by release policy.
- Enforcement must happen server-side or MCP-side, not only in the UI.
- The room-only fallback should remain supported even after folder-level controls ship.

## Runs

### Run 1: Lock the Scope Model and Safe Defaults

- Recommended Agent: coder (strong)
- Goal: choose the canonical permission model before implementation begins
- Tasks:
  - decide whether folder-scoped writes are represented by `folderIds`, path prefixes, or both
  - decide whether read and write scopes are fully separate fields or one structure with per-action rules
  - define the default safe recommendation for Connect AI:
    - current fallback: dedicated `AI Notes` room
    - target model: dedicated `AI` folder within notes
  - define behavior for tokens that have read scope but no write scope
  - define migration behavior for existing `read` and `readwrite` tokens
- Files:
  - `docs/ai/plans/2026-04-27-mcp-folder-scoped-ai-access.md`
  - optional ADR or research note if decisions need long-term recording
- Verification:
  - documented final scope model
  - documented backward compatibility behavior

### Run 2: Data Model and Auth API Changes

- Recommended Agent: coder (strong)
- Goal: extend stored agent/token configuration to support separate read/write scopes
- Tasks:
  - add new schema fields for write-scoped restrictions
  - preserve compatibility for existing agent tokens
  - update token creation, token rotation, and token verification responses
  - update any validation schemas for agent creation and mutation
  - add a new migration only
- Files:
  - `packages/auth-server-hono/src/db/schema/agents.ts`
  - `packages/auth-server-hono/src/model/agents.ts`
  - `packages/auth-server-hono/src/routes/agents.ts`
  - `packages/auth-server-hono/src/routes/connect-ai.ts`
  - `packages/shared/src/collections/agent-config.ts`
  - `packages/auth-server-hono/drizzle/*` (new migration)
- Tests:
  - `npm run build --workspace @eweser/auth-server-hono`
  - `npm test --workspace @eweser/auth-server-hono`

### Run 3: MCP Enforcement for Read vs Write Scope

- Recommended Agent: coder (strong)
- Goal: enforce the new scope model inside MCP operations
- Tasks:
  - keep room listing and read behavior aligned with read scope
  - require explicit write scope for create/update/delete tools
  - for notes, reject writes outside allowed room and folder/path scope
  - decide how non-note collections behave under the new model
  - ensure errors are understandable and auditable
- Files:
  - `packages/mcp-server/src/auth.ts`
  - `packages/mcp-server/src/data-layer.ts`
  - `packages/mcp-server/src/tools.ts`
  - `packages/mcp-server/src/tools.test.ts`
  - `packages/mcp-server/src/auth.test.ts`
- Tests:
  - `npm run build --workspace @eweser/mcp-server`
  - `npm test --workspace @eweser/mcp-server`

### Run 4: Connect AI and Approval UX

- Recommended Agent: coder (strong)
- Goal: expose the new model in a way normal users can configure safely
- Tasks:
  - update Connect AI so users can choose a safe writable target
  - add a recommended "AI-only write area" setup path
  - expose readable scope separately from writable scope
  - update approval/grant UI so third-party app permissions can request narrower access
  - decide how much folder-level selection ships in the first pass:
    - option A: room-only UI first, folder-aware backend hidden
    - option B: basic folder selector for notes in the same launch
- Files:
  - `packages/auth-pages/src/components/connect-ai-page.tsx`
  - `packages/auth-pages/src/pages.tsx`
  - `packages/auth-pages/src/lib/api.ts`
  - `packages/auth-pages/src/App.test.tsx`
- Tests:
  - `npm run build --workspace @eweser/auth-pages`
  - `npm test --workspace @eweser/auth-pages`

### Run 5: Short-Term Production Fallback with AI Room

- Recommended Agent: coder (fast)
- Goal: improve safety immediately, even before folder-scoped writes are complete
- Tasks:
  - add clear product guidance to create or use a dedicated `AI Notes` room
  - make Connect AI recommend a room-scoped `readwrite` token for that room only
  - ensure docs explain that room-level isolation is the current safe writable path
  - optionally add a one-click helper to create the AI room if product boundaries allow it
- Files:
  - `packages/auth-server-hono/src/routes/connect-ai.ts`
  - `packages/auth-pages/src/components/connect-ai-page.tsx`
  - `packages/mcp-server/README.md`
- Verification:
  - production token setup can be safely recommended before folder-scoped enforcement ships

### Run 6: Migration, Testing, and Launch Readiness

- Recommended Agent: coder (strong)
- Goal: ship without breaking existing tokens or silently widening access
- Tasks:
  - verify legacy tokens still behave correctly
  - ensure no legacy `readwrite` token silently gains broader write scope than intended
  - add negative tests for unauthorized writes outside room/folder scope
  - verify production Connect AI copy matches actual backend behavior
  - update support docs and troubleshooting
- Files:
  - touched files from Runs 2-5
  - docs as needed
- Tests:
  - `npm run build`
  - `npm test`
  - targeted MCP smoke tests against production-like env

## Risks

- Folder scoping may be ambiguous if folder identity is not fully canonical across imported/local note structures.
- Path-prefix-based rules are easy to understand but can become brittle if paths are renamed.
- Folder-ID-based rules are cleaner long-term but may require more product/UI work before users can configure them comfortably.
- Migrating from one global `permissions` field to separate read/write scopes must not accidentally widen access for old tokens.
- If approval UI and Connect AI drift from backend semantics, users may think they are protected when they are not.

## Recommended Rollout

1. Ship the short-term safe fallback first: dedicated writable `AI Notes` room with room-scoped `readwrite` token.
2. Implement backend support for separate read and write scopes.
3. Add MCP enforcement for folder-scoped note writes.
4. Expose folder-aware controls in Connect AI once backend semantics are stable.
5. After launch, consider whether the same scope model should also power non-MCP third-party app permissions.

## Execution Summary

| Run | Title                                       | Recommended Agent | Depends On | Parallelization |
| --- | ------------------------------------------- | ----------------- | ---------- | --------------- |
| 1   | Lock the Scope Model and Safe Defaults      | coder (strong)    | None       | None            |
| 2   | Data Model and Auth API Changes             | coder (strong)    | 1          | None            |
| 3   | MCP Enforcement for Read vs Write Scope     | coder (strong)    | 1, 2       | None            |
| 4   | Connect AI and Approval UX                  | coder (strong)    | 1, 2       | After Run 2     |
| 5   | Short-Term Production Fallback with AI Room | coder (fast)      | 1          | Parallel with 2 |
| 6   | Migration, Testing, and Launch Readiness    | coder (strong)    | 2, 3, 4, 5 | None            |

## Recommended First Implementation Slice

If we want to move fast without overcommitting the UI, start with:

1. Run 1 decision pass
2. Run 5 AI-room fallback
3. Run 2 schema/API changes
4. Run 3 MCP enforcement
5. Run 4 folder-aware UI

That sequence gets a safe writable path into users' hands quickly while leaving the richer folder-scoped UX for the second pass.
