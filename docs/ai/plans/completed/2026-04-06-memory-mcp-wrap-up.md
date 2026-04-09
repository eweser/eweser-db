# Plan: Memory MCP Wrap-Up

## Goal

Formally close the current MCP memory/search effort at its practical stopping point, preserve the useful workflow already built, and define a narrow ergonomic follow-up instead of pursuing broader automatic cross-agent context sync.

## Scope

- In: documenting the current completed memory/search architecture, making the non-goals explicit, aligning workflow docs around manual save plus search recall, and specifying a minimal helper-command layer as the only near-term follow-up.
- Out: new backend infrastructure for universal session autosave, transcript sync, embeddings/vector search, automatic cross-platform baton passing, or broader "full agent context sync" work.

## Runs

### Run 1: Lock the Current Product Boundary ✅

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: This is a small, documentation-heavy pass that clarifies what PR 15 already delivered and what is intentionally deferred.
- [x] Update plan and workflow docs to state that the shipped target is structured cross-agent memory recall, not universal automatic context sync.
- [x] Add a concise decision note: keep `eweser_save_memory` and `eweser_search`; stop investing in broader sync infrastructure for now.
- [x] Make manual-save conventions explicit for Copilot and Claude, while preserving OpenClaw auto-save as the only automated session-end path.
- [x] Files:
  - `docs/workflows/cross-tool-research.md` ✅
  - `.github/copilot-instructions.md` ✅
  - `CLAUDE.md` ✅
  - `ARCHITECTURE.md` — no changes needed (MCP server already listed; no positioning needed at this time)
- [x] Tests: doc accuracy pass — all tool names (`eweser_save_memory`, `eweser_search`) match implemented MCP surface.

### Run 2: Specify the Thin Ergonomic Layer

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: This run needs careful scoping so helper commands improve usability without quietly reintroducing new platform/infrastructure work.
- [ ] Write a small spec for explicit helper intents such as `remember`, `decision`, `bookmark`, `next`, and `scratch`.
- [ ] Map each helper to the existing `eweser_save_memory` or `eweser_search` tool behavior with sensible defaults for `memoryType`, tags, and summary shape.
- [ ] Define where each helper should write by default and which helpers are pure prompt-layer conventions versus MCP tool aliases.
- [ ] State clearly that this is an ergonomics layer on top of the existing tool surface, not a new storage/search subsystem.
- [ ] Files:
  - `docs/workflows/cross-tool-research.md`
  - `docs/ai/plans/2026-04-04-conversations-collection.md` (only if a short implementation follow-up note is needed)
  - `docs/ai/plans/2026-04-04-cross-agent-memory-search.md` (only if positioning language should be tightened)
- [ ] Tests: validate helper mapping examples against the actual input schema of `eweser_save_memory` and `eweser_search`.

### Run 3: Leave a Clean Handoff for Later Re-entry

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: A short close-out note prevents future re-litigation and gives a clean point to resume from if platform capabilities improve later.
- [ ] Add a short deferred-work section describing what would need to change before revisiting automatic sync: upstream session hooks, reliable cross-client triggers, and a better UX for capture without token bloat.
- [ ] Capture acceptance criteria for calling the memory MCP effort "done for now": memory docs save cleanly, search recall works, manual workflow is documented, and no further autosync work is in flight.
- [ ] Add a short handoff note that the next product-facing work should move to ewe-note UX.
- [ ] Files:
  - `docs/ai/plans/2026-04-06-memory-mcp-wrap-up.md`
  - optionally `README.md` or `ARCHITECTURE.md` if top-level positioning needs one sentence of cleanup
- [ ] Tests: none beyond doc consistency.

## Risks

- The docs may drift into describing helper commands as implemented MCP features before they actually exist. Keep the wording explicit about "convention" versus "tool".
- Tightening the language too aggressively could obscure the value already delivered by PR 15. The wrap-up should preserve the fact that memory save/search is real and useful today.
- Updating multiple workflow docs can create contradictory guidance if the same save-session convention is phrased differently in each place.

## Deferred Work

Automatic cross-agent context sync is intentionally off the table until the following preconditions are met:

1. **Upstream session hooks** — Claude Desktop or Copilot provide session-end callbacks (not expected as of April 2026)
2. **Reliable cross-client triggers** — a way to reliably fire `eweser_save_memory` when a session closes, across all agent clients
3. **UX for zero-token-bloat capture** — a flow that saves useful context without blowing up context windows on the next session start

If those land, the natural next step would be an auto-save mode that fires `eweser_save_memory` on session end for agents that opt in.

## Acceptance Criteria (Done for Now)

- [x] Memory docs save cleanly via `eweser_save_memory`
- [x] Search recall works via `eweser_search`
- [x] Manual workflow documented in `CLAUDE.md`, `.github/copilot-instructions.md`, `docs/workflows/cross-tool-research.md`
- [x] No autosync work in flight
- [x] Helper intent reference shipped as a convention layer, not new infrastructure

## Next Product-Facing Work

Memory MCP wrap-up is complete. The next meaningful work on the EweserDB agent story should move to **Ewe Note UX** — browsing and acting on stored memories from within the app, rather than further memory infrastructure.

## Execution Summary

```text
Run 1: Lock current boundary (Fast)  ✅
├── Run 2: Specify ergonomic helper layer (Smart)  ✅
└── Run 3: Clean handoff and deferred-work note (Fast)  ✅
```

Parallelization:

- Run 1 set the authoritative boundary.
- Run 2 and Run 3 ran in parallel.

## Status

- [x] Approved by user
- [x] All runs complete — effort closed
