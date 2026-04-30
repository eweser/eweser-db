# Plan: Dogfood EweserDB as Personal Brain

> **Created:** 2026-04-05
> **Status:** In progress — Run 1 complete; Run 4 (cross-tool docs) complete via memory-mcp-wrap-up; Runs 2–3 remaining
> **Supersedes:** [2026-04-04-cross-agent-memory-search.md](./2026-04-04-cross-agent-memory-search.md) (infrastructure already built; this plan is about actually using it)

## Goal

Get EweserDB running as Jacob's personal cross-tool knowledge store — replacing broken Obsidian sync for agent-accessible notes, solving cross-repo context loss, and reducing Copilot credit burn by enabling research in flat-subscription tools (Claude web, ChatGPT) with results flowing back through EweserDB.

## The Real Pain Points

| #   | Pain Point                           | Current State                                                       | EweserDB Solution                                                                                      |
| --- | ------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | **Obsidian sync broken in WSL**      | Notes not syncing, work-os vault stale                              | EweserDB runs natively in WSL (local IndexedDB + Hocuspocus). No Obsidian needed.                      |
| 2   | **Sensitive/personal data**          | Nowhere safe + agent-accessible (logins, people notes, VPN configs) | Notes collection, local-first, never in git. Agents access via MCP with scoped permissions.            |
| 3   | **Cross-repo context loss**          | Each repo has its own plan files, agents can't see other repos      | One MCP server, all agents connect. VPN docs, tunneling setup, etc. accessible from any repo.          |
| 4   | **Lost worktree conversations**      | Gone when worktree deleted                                          | `eweser_save_memory` saves session summaries to EweserDB. Survives worktree deletion.                  |
| 5   | **Copilot session search is bad**    | Manual rename + scroll through sessions                             | `eweser_search` — full-text search across all saved sessions/decisions.                                |
| 6   | **Can't move context between tools** | Copy-paste between Claude web ↔ Copilot                             | Save research in Claude web → EweserDB → Copilot reads it via MCP.                                     |
| 7   | **$250+/mo Copilot credits**         | All research + planning + coding in Copilot                         | Research/planning in Claude/ChatGPT web (flat sub), save to EweserDB, Copilot only for implementation. |

## What's Already Built & Connected

The infrastructure is live and connected to Copilot:

- ✅ MCP server connected — 8 tools visible in Copilot (`eweser_list_rooms`, `eweser_search`, etc.)
- ✅ Notes rooms populated with real data (Obsidian notes already synced)
- ✅ `eweser_search` works — returns VPN docs, Outlandish notes, test conventions across rooms
- ✅ Docker stack running (Postgres, 2× sync servers, aggregator, auth API)
- ✅ Agent token created, `.mcp.json` configured

**What's missing:** Conversations room for session saving, session-save workflow, cross-tool documentation.

## Scope

- **In:**
  - Create agent token and wire MCP server into Copilot (`.mcp.json`)
  - Create rooms for personal ops data (cross-repo reference, credentials, session logs)
  - Migrate key notes from Obsidian work-os vault into EweserDB
  - Add session-save instructions to `copilot-instructions.md` / `CLAUDE.md`
  - Test the full loop: save → search → recall
  - Document the cross-tool workflow (Claude web → EweserDB → Copilot)

- **Out:**
  - Browser extension (future milestone)
  - Claude Desktop MCP config (Jacob uses Claude web, not Desktop — revisit when needed)
  - E2E encryption for sensitive notes (important but separate plan)
  - Ewe Note UI for browsing saved data (separate milestone)
  - OpenClaw PA integration (separate — depends on PA being in daily use)

## Runs

### ~~Run 1: Connect MCP Server to Copilot~~ — DONE

Already complete. MCP tools visible in Copilot. `eweser_list_rooms` returns 2 profile rooms. `eweser_search` returns real data from synced Obsidian notes.

---

### Run 2: Create Conversations Room and Seed Session Data

- **Recommended Agent:** `02-coder` (Smart)
- **Reason:** Needs to understand room creation flow, interact with auth API to create rooms, and structure data well. First real usage — getting the data model right matters.

- [ ] Create rooms via auth API or directly via MCP tools:
  - `personal-ops` (notes collection) — cross-repo reference material: VPN setup, tunneling config, domain setup, dev environment notes
  - `credentials` (notes collection) — account logins, API keys, service configs (NOTE: plaintext for now; E2E encryption planned separately)
  - `session-log` (conversations collection) — where `eweser_save_memory` writes session summaries
  - `decisions` (conversations collection) — architectural decisions, framework choices, etc.
- [ ] Migrate key content from Obsidian work-os:
  - `Now.md` → note in `personal-ops` (or keep in Obsidian — this is debatable since Now.md changes constantly)
  - VPN/tunneling setup docs → notes in `personal-ops`
  - Any cross-repo architecture decisions → conversations in `decisions` room
- [ ] Verify: `eweser_search` finds the seeded content

**Files:** No code changes — purely data creation via API/MCP tools.

**Verification:** `eweser_search({ query: "VPN" })` returns the VPN setup note.

---

### Run 3: Session Save Workflow

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Copy-edit to instruction files + testing the save→search loop. Straightforward.

- [ ] Add to `.github/copilot-instructions.md`:
  ```
  ## Session Memory
  At the end of every coding session, save a summary using `eweser_save_memory`:
  - memoryType: "session" for general session notes
  - memoryType: "decision" for architectural or framework decisions
  - Include tags for searchability
  ```
- [ ] Add same instruction to `CLAUDE.md`
- [ ] Test the loop manually:
  1. Do some work in Copilot
  2. Say "save session" → agent calls `eweser_save_memory`
  3. Start new session → say "what did I work on yesterday?" → agent calls `eweser_search`
  4. Verify recall works

**Files:**

- Modify: `.github/copilot-instructions.md`
- Modify: `CLAUDE.md`

**Verification:** End-to-end save → new session → search → recall works.

---

### Run 4: Cross-Tool Workflow Documentation

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Documentation only. Captures the workflow for moving context between tools to reduce credit burn.

- [ ] Create `docs/workflows/cross-tool-research.md` documenting:
  - **The credit-saving workflow:**
    1. Open Claude web (or ChatGPT) for research/planning — flat subscription, no per-token cost
    2. When research yields useful findings, copy the summary
    3. In Copilot, call `eweser_save_memory` with the summary (memoryType: "memory", tags: ["research", "topic"])
    4. Later, when implementing, ask Copilot to recall: `eweser_search({ query: "topic" })`
    5. Copilot gets the research context without re-doing the research — saves tokens
  - **The worktree-safe workflow:**
    1. Before deleting a worktree, save session in that worktree's Copilot
    2. Key decisions and context survive in EweserDB
    3. New worktree's Copilot can search and recall
  - **Sensitive data workflow:**
    1. Store credentials/configs in EweserDB `credentials` room
    2. Agent can read when needed (e.g., "what's the staging API key?")
    3. Never in git, never in plan files

**Files:**

- Create: `docs/workflows/cross-tool-research.md`

---

## What This Does NOT Solve (Yet)

| Gap                                | Why Not Now                                   | Future Solution                                                       |
| ---------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| **Auto-save from Claude web**      | No browser extension yet                      | Browser extension MVP (saves conversation to EweserDB with one click) |
| **E2E encryption for credentials** | Needs crypto key management                   | Separate plan — critical before storing real secrets                  |
| **ChatGPT MCP support**            | OpenAI hasn't shipped MCP yet                 | When they do, add ChatGPT as another MCP client                       |
| **Mobile access**                  | No mobile app                                 | Ewe Note PWA (future)                                                 |
| **Real-time Now.md replacement**   | Now.md changes too frequently for manual sync | Could auto-sync via cron or file watcher — explore later              |

## Risks

| Risk                                     | Mitigation                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Credentials in plaintext**             | DO NOT store real secrets until E2E encryption is implemented. Use for non-critical data only. Flag prominently in docs.              |
| **Docker stack goes down**               | MCP server falls back to in-memory Y.Doc. Data persists in IndexedDB locally — no data loss, just no search until aggregator is back. |
| **Token in `.env.local` gets committed** | Add `.env.local` to `.gitignore`. Token is scoped — can be revoked via API if leaked.                                                 |
| **Workflow adoption**                    | Start with just session save + search. Don't try to migrate everything from Obsidian at once.                                         |
| **MCP server startup slow**              | Needs to verify token + connect to Hocuspocus on every Copilot restart. Monitor and optimize if painful.                              |

## Execution Summary

```text
Run 1: Connect MCP to Copilot (Fast)       ← DONE ✅
├── Run 2: Create Conversations Room (Smart)  ← next, depends on Run 1
│   └── Run 3: Session Save Workflow (Fast)   ← depends on Run 2 (needs conversations room)
└── Run 4: Cross-Tool Docs (Fast)             ← DONE ✅ (completed via 2026-04-06-memory-mcp-wrap-up)
```

**Total effort:** Small. The hard engineering is done. This is mostly configuration, data seeding, and workflow documentation.

**Immediate credit savings estimate:** If research/planning moves to Claude web (flat $20/mo) and Copilot is used only for implementation, usage could drop 30-50%. The `eweser_search` recall means Copilot doesn't need to re-derive context that was already figured out elsewhere.

## Status

- [ ] Approved by user
