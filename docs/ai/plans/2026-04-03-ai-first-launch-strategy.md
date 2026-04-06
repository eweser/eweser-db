# Plan: Own Your AI Brain — Launch Strategy

> **Created:** 2026-04-03
> **Status:** Draft — awaiting approval
> **Prerequisite:** Big Refactor Phases 1-3 (95% complete)

## Goal

Launch EweserDB as the personal database you own that your AI agents connect to. Not "shared memory for AI agents" (utility pitch). Not "local-first database" (abstract ideology). **"Own your AI brain"** — ideology AND utility in one.

## The Insight

Every AI company wants to own your brain.

Anthropic stores your Claude conversations. GitHub stores your Copilot context. OpenAI stores your ChatGPT history. Each holds a slice of your knowledge — in their cloud, under their terms, fragmented across their silos. You can't search across them. You can't make them talk to each other. You can't take your data and leave.

**EweserDB says: no.** Your knowledge lives on your device. Your AI agents connect to YOU, not the other way around. You decide what they see. You can revoke access. You can take your data and leave. Your brain is yours.

The local-first architecture isn't a sacrifice — it's what **enables** multi-agent workflows that vendor-locked alternatives literally cannot do. Owning your data is what lets you use Claude Code, Copilot, and OpenClaw together, sharing the same knowledge base. Something you can't do when each vendor holds your context hostage in their own cloud.

## The Real Use Case (User #1: Jacob)

Three different AI agents that don't share context:

- **Claude Code** knows `CLAUDE.md` and memory files — Copilot can't see them
- **Copilot** knows `.github/copilot-instructions.md` — Claude Code doesn't read those
- **OpenClaw PA** has its own skills/workspace — completely siloed from both

Every agent switch loses context. The same information gets repeated across sessions. EweserDB as an MCP server that all three connect to solves this directly.

The OpenClaw PA angle is especially powerful: it can run crons, which the coding agents can't. So:

- Claude Code writes a note: "deploy the BD bot changes at 2am"
- OpenClaw PA reads that note on a cron, executes the deployment
- Result logged back to EweserDB
- Next morning, Copilot can tell you what happened

That's **inter-agent coordination through shared data** — not just shared memory.

### Collaboration: user-owned, vendor-independent

Jacob and his wife collaborate on her academic research. He helps from his AI agents; she works from Claude Cowork. With EweserDB: she owns a room with her research. She grants his agents read/write access. The data never leaves devices they both control. No vendor mediates the collaboration. If she quits Claude tomorrow, her research is still there.

**"Own your data" applied to collaboration** — the thing no single vendor will ever build, because their business model requires lock-in.

## Positioning

**Not:** "Shared memory for your AI agents" (utility-first, soulless)

**Not:** "Local-first database" (ideology-first, abstract)

**Instead:**

> **Your AI agents work for you. Your data belongs to you. EweserDB makes both true at the same time.**

**Tagline: "Own your AI brain."**

### Why this beats both alternatives

| Pitch style                        | Problem                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Pure utility ("sync your agents!") | Commoditizable. Any vendor could add cross-agent sync. No moat. No soul.                                                |
| Pure ideology ("own your data!")   | Sounds like a sacrifice. People don't switch to worse tools for philosophy.                                             |
| **Own your AI brain**              | Ideology IS the feature. Owning your data is what enables multi-agent workflows. The philosophy creates the capability. |

### The honest comparison

|                              | Vendor silos (status quo)  | EweserDB                         |
| ---------------------------- | -------------------------- | -------------------------------- |
| Claude knows your notes      | Only Claude's notes        | All your notes, from any app     |
| Switch from Claude to Gemini | Lose everything            | Change one config line           |
| Two agents collaborate       | Impossible                 | Shared rooms, shared data        |
| Revoke AI access             | Delete account (lose data) | Revoke token (keep data)         |
| Search across agents         | Open 5 apps                | One search, all conversations    |
| Your data, offline           | Pray the API stays up      | IndexedDB, always on your device |

## Multi-Platform Agent Integration Strategy

EweserDB needs to work with **every** major AI agent surface, not just one. Two distinct audiences:

### Developer-focused agents (sustained daily use)

| Platform                     | Integration                 | Config Format                                  | Distribution                           |
| ---------------------------- | --------------------------- | ---------------------------------------------- | -------------------------------------- |
| **Claude Code**              | MCP server (stdio)          | `~/.claude.json` or `--mcp-config`             | npm package (`npx @eweser/mcp-server`) |
| **GitHub Copilot (VS Code)** | MCP server (stdio or http)  | `.vscode/mcp.json` (workspace) or user profile | VS Code MCP server gallery + npm       |
| **Cursor**                   | MCP server (stdio)          | `~/.cursor/mcp.json`                           | npm package                            |
| **Zed**                      | MCP server (via extensions) | Zed settings                                   | npm package                            |
| **Windsurf**                 | MCP server                  | Config file                                    | npm package                            |

**Key insight:** All of these use the **same MCP protocol**. One `@eweser/mcp-server` npm package covers all of them. The config format varies but the server binary is identical.

**Claude Code also supports plugins** — a deeper integration path:

```
packages/claude-code-plugin/
├── .claude-plugin/
│   └── plugin.json          # name: "eweser-db"
├── skills/
│   └── eweser-knowledge/
│       └── SKILL.md          # "Search the user's EweserDB for relevant context"
├── commands/
│   ├── save-conversation.md  # /eweser-db:save — save this conversation to EweserDB
│   └── search-notes.md       # /eweser-db:search — search your notes
└── .mcp.json                 # Points to @eweser/mcp-server
```

This gives Claude Code users slash commands (`/eweser-db:save`, `/eweser-db:search`) in addition to automatic MCP tool access.

### Consumer/new-entrant agents (hype, broader audience)

| Platform          | Integration              | Config Format                                     | Distribution                      |
| ----------------- | ------------------------ | ------------------------------------------------- | --------------------------------- |
| **OpenClaw**      | Workspace skill          | `~/.openclaw/workspace/skills/eweser-db/SKILL.md` | ClawHub registry + manual install |
| **ChatGPT**       | Future GPT Actions / MCP | TBD                                               | TBD                               |
| **Google Gemini** | MCP (emerging)           | TBD                                               | TBD                               |

**OpenClaw skill format** — compatible with [AgentSkills spec](https://agentskills.io/):

```
skills/eweser-db/
├── SKILL.md
└── (optional helper scripts)
```

`SKILL.md` example:

```yaml
---
name: eweser_db
description: >
  Access the user's personal EweserDB — a self-hosted, offline-first database
  that stores notes, bookmarks, conversations, and more. Use the eweser MCP tools
  to search, read, and write to the user's data.
metadata:
  {
    "openclaw": {
      "emoji": "🗄️",
      "homepage": "https://eweser.com",
      "requires": { "bins": ["npx"] },
      "install": [
        {
          "id": "npm",
          "kind": "node",
          "package": "@eweser/mcp-server",
          "bins": ["eweser-mcp"],
          "label": "Install EweserDB MCP Server (npm)"
        }
      ]
    }
  }
---

# EweserDB Skill

You have access to the user's personal EweserDB instance via MCP tools.
EweserDB is a local-first, user-owned database that syncs across devices.

## Available MCP Tools

- `eweser_search_notes` — full-text search across the user's notes
- `eweser_read_note` — read a specific note's content
- `eweser_create_note` — create a new note
- `eweser_update_note` — update existing note content
- `eweser_list_bookmarks` — list saved bookmarks/web clips
- `eweser_save_bookmark` — save a URL + content
- `eweser_save_conversation` — save this conversation to EweserDB
- `eweser_list_conversations` — list past AI conversations

## When to Use

- When the user asks about their notes, bookmarks, or saved content
- When the user wants to save this conversation for later
- When the user references something they wrote or saved previously
- When the user asks you to remember something (save it as a note)

## Guidelines

- Always search before creating — avoid duplicates
- When saving conversations, use a descriptive title
- Respect that this is the user's personal data — don't modify without asking
```

**OpenClaw also supports `.mcp.json`** in skill directories for auto-configuring the MCP server:

```json
{
  "eweser": {
    "command": "npx",
    "args": ["@eweser/mcp-server", "--sync-url", "ws://localhost:8080"]
  }
}
```

### Why both matter

- **Claude Code / Copilot / Cursor** = developers who code all day, use EweserDB as their personal knowledge base while working. Sticky, high-value, daily use.
- **OpenClaw** = personal AI assistant crowd who want their AI to know everything about their life. Broader appeal, higher virality ("my AI reads my notes!"), strong overlap with self-hosting community.
- **Same MCP server powers both.** The skill/plugin layer is just packaging and docs.

## Scope

### In

- Build the MCP server (the product — this is what people install day one)
- Add collection schemas for conversations, bookmarks, agent configs
- Agent permission system (privacy gate — no MCP without this)
- Polish Ewe Note to daily-driver quality (the companion app, not the product)
- Browser extension for web capture
- AI conversation viewer (proves cross-app interop)
- Production Docker Compose + landing page
- 60-second demo video: "Own your AI brain"

### Out

- Ewe Cards (deferred — less compelling than AI interop for 2026 launch)
- Ewe Social (deferred — requires aggregator maturity + multi-user testing)
- Mobile native apps (PWA is enough for launch)
- App store / ecosystem infrastructure (premature)
- RAG / embeddings / model hosting (we provide data, not intelligence)

## Why "Own Your AI Brain" Beats Everything Else

|                         | Flashcard Demo                 | "Sync your agents" (utility) | **Own Your AI Brain**                                                         |
| ----------------------- | ------------------------------ | ---------------------------- | ----------------------------------------------------------------------------- |
| **Audience**            | Students, language learners    | Multi-agent power users      | Everyone who uses AI and cares about their data                               |
| **Emotional resonance** | None                           | Mild ("that's handy")        | Strong ("hell yes, my data is mine")                                          |
| **Rides current wave**  | No — flashcard apps are solved | Yes, partially               | Yes — AI ownership anxiety is real and growing                                |
| **Shows interop**       | Two apps sharing data          | N agents sharing data        | N agents + N apps + your data, all yours                                      |
| **Self-hosting appeal** | Mild                           | Medium                       | Very strong — "your AI reads YOUR database, not someone else's cloud"         |
| **Moat**                | None (Anki exists)             | Weak (any vendor could add)  | Strong — open source + local-first + multi-vendor = structural moat           |
| **What makes it stick** | Spaced repetition algorithm    | Utility                      | Ideology → capability → data gravity (hard to leave once agents depend on it) |

## Runs

### Run 0: Finish Migration Foundation & Get Docker Stack Running

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Phase 1 runs 1.1-1.2 need completion. Docker Compose needs to work end-to-end with all services healthy.

- [ ] Verify Phase 1 runs 1.1 (Docker Compose skeleton) and 1.2 (Hono auth API init) are complete
- [ ] `docker compose up` → all services healthy, auth flow works, sync works
- [ ] Smoke test: create a note in Ewe Note → it persists → it syncs
- Files: `docker-compose.yml`, `packages/sync-server/`, `packages/auth-server-hono/`
- Tests: Docker Compose health checks pass. E2E: login → create note → refresh → note persists

**Done when:** `docker compose up` runs the full stack and a user can log in, create a note, and see it sync.

---

### Run 1: Polish Ewe Note to Daily-Driver Quality

**Recommended Agent:** `02-coder` (Smart)
**Reason:** UX polish requires judgment and iteration, not boilerplate.

Ewe Note must be a genuinely good notes app, not just a tech demo. Current gaps vs Obsidian:

- [ ] **Sync status indicators** — connected/syncing/offline badges in the app bar
- [ ] **First-run UX** — smooth onboarding for new users (local-first: works immediately, login optional)
- [ ] **Search** — wire the existing search component to full-text search over notes
- [ ] **Room sharing** — wire `generateShareRoomLink` to the UI
- [ ] **Export** — markdown export of individual notes or entire rooms
- [ ] **Import** — markdown/text import (steal Obsidian users by making migration easy)
- [ ] **Keyboard shortcuts** — power-user efficiency (Cmd+K command palette)
- [ ] **Mobile responsiveness** — PWA must feel good on phones
- [ ] **Performance** — fast load, fast switch between rooms/notes
- Files: `packages/ewe-note/src/` (all components)
- Tests: Playwright visual regression tests, Lighthouse audit > 90

**Done when:** You personally use Ewe Note as your daily notes app for a week and don't miss Obsidian.

---

### Run 2: Add New Collection Schemas

**Recommended Agent:** `02-coder` (Fast)
**Reason:** Schema additions are mechanical — follow existing patterns.

- [ ] Add `conversations` schema — for AI conversation storage
  ```typescript
  type Conversation = DocumentBase & {
    title: string;
    model?: string; // e.g. "claude-4-sonnet", "ollama/llama3"
    provider?: string; // e.g. "anthropic", "openai", "ollama"
    messages: Message[];
    metadata?: Record<string, unknown>;
  };
  type Message = {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    toolCalls?: ToolCall[]; // MCP tool use tracking
  };
  ```
- [ ] Add `bookmarks` schema — for browser extension captures
  ```typescript
  type Bookmark = DocumentBase & {
    url: string;
    title: string;
    description?: string;
    content?: string; // extracted page content / highlights
    tags?: string[];
    favicon?: string;
  };
  ```
- [ ] Add `agentConfigs` schema — for agent/MCP connection settings (used by privacy permission system)
  ```typescript
  type AgentConfig = DocumentBase & {
    name: string;
    type: 'mcp' | 'openclaw' | 'custom';
    endpoint?: string;
    allowedCollections: string[]; // which collections this agent can access
    allowedRooms?: string[]; // specific room UUIDs, or [] for all
    permissions: 'read' | 'readwrite';
    tokenExpiresAt?: number; // short-lived tokens only
  };
  type AgentAccessLogEntry = DocumentBase & {
    agentId: string;
    roomId: string;
    action: 'read' | 'write';
    documentCount: number;
    timestamp: number;
  };
  ```
- [ ] Add `agentBackups`, `fileAttachments`, and `syncSettings` schemas — see [File Storage & AI Data Layer plan](./2026-04-03-file-storage.md) Run 1 for full type definitions
- Files: `packages/shared/src/types.ts`, `packages/shared/src/collections.ts`
- Tests: Schema validation tests, type-check compilation
- **Changeset required** — new public types in `@eweser/shared`

**Done when:** Schemas compile, are exported, and can be used to create rooms in the SDK.

---

### Run 2.5: Agent Permission System (Privacy Gate — MUST ship before MCP server)

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Security-critical. No shortcuts. See full spec in [privacy-and-autonomy.md](./2026-04-03-privacy-and-autonomy.md#run-p3-agent-permission-system-ai-privacy-layer).

**The rule:** The MCP server cannot launch publicly until this is complete. An MCP server with no permissions is full data access with no revocation.

- [ ] Agent CRUD API in `packages/auth-server-hono/src/routes/agents.ts` — create, list, revoke agent tokens
- [ ] Per-collection, per-room permission enforcement in MCP server
- [ ] Short-lived agent tokens (configurable expiry, default 30 days)
- [ ] `agentAccessLog` writes on every MCP tool call
- [ ] Agent management UI in `packages/auth-pages/src/pages/agent-settings.tsx`
  - List registered agents
  - Show: last access, collections accessible, rooms accessible
  - Revoke button per agent
- Files: see privacy plan Run P3
- Tests: Permission enforcement (agent token scoped to `notes` cannot access `bookmarks`). Revocation works immediately. Access log entries created.

**Done when:** A user can register an agent, see what it accessed, and revoke it. An agent with a revoked token gets 401 on next call.

---

### Run 3: Build EweserDB MCP Server

**Recommended Agent:** `02-coder` (Smart)
**Reason:** This is the most architecturally significant new component. MCP protocol integration + Yjs CRDT reads/writes.

The MCP server is a standalone process that exposes EweserDB collections as MCP tools. Any MCP-compatible AI agent (Claude Code, Claude Desktop, OpenClaw, Cursor, etc.) can then read/write to the user's personal database.

- [ ] Create `packages/mcp-server/`
  - `package.json` — `@modelcontextprotocol/sdk`, `@eweser/db`, `yjs`
  - `src/index.ts` — MCP server entry point
  - `src/tools/` — tool definitions per collection
  - `src/resources/` — MCP resources for browsing data
- [ ] **MCP Tools to expose:**

  ```
  eweser_list_rooms          — list all rooms for a collection
  eweser_search_notes        — full-text search across notes
  eweser_read_note           — read a specific note's content
  eweser_create_note         — create a new note
  eweser_update_note         — update note content
  eweser_list_bookmarks      — list bookmarks with optional tag filter
  eweser_save_bookmark       — save a URL + content
  eweser_save_conversation   — save an AI conversation
  eweser_list_conversations  — list past AI conversations
  eweser_search_all          — cross-collection search
  eweser_backup_agent_config  — back up agent config files (Claude, OpenClaw, Cursor, etc.)
  eweser_restore_agent_config — restore a backed-up config to local file system
  eweser_list_backups         — list agent backups, filterable by platform
  eweser_diff_backup          — show changes since last backup (Yjs snapshots)
  eweser_search_backups       — full-text search across agent config backups
  eweser_upload_file          — upload a binary file to object storage
  eweser_get_file_url         — get a pre-signed URL for a stored file
  ```

  See [File Storage & AI Data Layer plan](./2026-04-03-file-storage.md) Run 5 for full agent backup MCP tool specs.

- [ ] **MCP Resources:**
  ```
  eweser://notes/{roomId}           — lists notes in a room
  eweser://note/{roomId}/{noteId}   — single note content
  eweser://bookmarks                — all bookmarks
  eweser://conversations            — all AI conversations
  ```
- [ ] **Connection modes:**
  - Local: MCP server connects to local IndexedDB (same-machine agent)
  - Remote: MCP server connects to Hocuspocus sync server (agent on different machine)
  - Both use the same @eweser/db SDK — the DB handles sync transparently
- [ ] **Config for Claude Code** (`~/.claude/claude_code_config.json`):
  ```json
  {
    "mcpServers": {
      "eweser": {
        "command": "npx",
        "args": ["@eweser/mcp-server", "--sync-url", "ws://localhost:8080"]
      }
    }
  }
  ```
- Files: `packages/mcp-server/` (new package)
- Tests: Unit tests for each tool, integration test with mock DB
- **Changeset required** — new published package `@eweser/mcp-server`

**Done when:** Claude Code with the MCP server installed can read your Ewe Note notes, create new notes, and save conversations — and those notes appear in Ewe Note in real-time.

---

### Run 4: Browser Extension (Web Capture)

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Browser extension architecture requires careful manifest/content script design.

A Chrome/Firefox extension that lets you save pages, highlights, and bookmarks to EweserDB.

- [ ] Create `packages/browser-extension/`
  - `manifest.json` — Manifest V3
  - `src/popup/` — quick-save popup (title, tags, room selection)
  - `src/content/` — content script for text selection/highlight capture
  - `src/background/` — service worker, EweserDB connection
  - `src/options/` — settings (sync URL, auth)
- [ ] **Features:**
  - One-click bookmark save (URL + title + description + favicon)
  - Highlight text → right-click → "Save to EweserDB" (captures selection + URL)
  - Full-page clip (readability-extracted content)
  - Tag management
  - Offline queue (saves locally, syncs when connected)
- [ ] Connect to EweserDB via `@eweser/db` — data syncs to Hocuspocus like any other app
- Files: `packages/browser-extension/` (new package)
- Tests: Unit tests for content extraction, popup rendering

**Done when:** Install extension → highlight text on a web page → save → it appears in Ewe Note or the MCP server's `eweser_list_bookmarks`.

---

### Run 5: AI Conversation Viewer (Companion App)

**Recommended Agent:** `02-coder` (Fast)
**Reason:** Simple read-only app — mostly UI over existing data. Can be scaffolded from example-basic.

A minimal web app that displays AI conversations stored in EweserDB. This proves interop: AI agents save conversations via MCP → you browse them in a dedicated app → all offline-first and synced.

- [ ] Create `examples/ewe-conversations/` (or `packages/ewe-conversations/`)
  - Fork from `examples/example-basic/`
  - List conversations by date/model
  - Render messages (user/assistant/system) with markdown
  - Search across conversations
  - Filter by model/provider
- [ ] Add to Caddy config at `/conversations/`
- Files: `examples/ewe-conversations/` (new app)
- Tests: Renders conversation list, renders messages, search works

**Done when:** An AI conversation saved via MCP appears in the conversation viewer within seconds.

---

### Run 6: Production Deploy + Landing Page + Demo Video

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Production Docker, landing page copy, and demo scripting need judgment.

- [ ] Production `docker-compose.prod.yml` (from Phase 4 plan)
- [ ] Landing page at eweser.com:
  - Hero: **"Own your AI brain."**
  - Sub: "Your AI agents work for you. Your data belongs to you. EweserDB makes both true at the same time."
  - Demo GIF: Three agents (Claude, Copilot, OpenClaw) all reading/writing to the same personal database
  - Quick-start: one JSON snippet → all your agents connected
  - Self-host: `docker compose up` — "Your brain, your server, your rules."
  - Honest comparison table: EweserDB vs. vendor silos (not vs. Obsidian — that's the wrong competitor now)
  - The privacy promise: "We don't read, sell, or train on your data. Ever. Open-source verifiable."
- [ ] Record 60-second demo video
- [ ] Show HN post draft
- Files: Landing page files, `docker-compose.prod.yml`, demo script

**Done when:** `docker compose -f docker-compose.prod.yml up` serves eweser.com with landing page, Ewe Note, conversation viewer, and all APIs.

---

## Updated Comparison Table

| Feature                            | EweserDB      | Obsidian          | Notion       | Firebase | Apple Notes |
| ---------------------------------- | ------------- | ----------------- | ------------ | -------- | ----------- |
| User owns data                     | ✅            | ✅ (local files)  | ❌           | ❌       | ❌          |
| Data on your device first          | ✅            | ✅                | ❌           | ❌       | ❌          |
| Offline-first                      | ✅            | ✅                | ❌           | ❌       | Partial     |
| Real-time sync                     | ✅            | Paid plugin       | ✅           | ✅       | ✅          |
| Real-time collab                   | ✅            | ❌                | ✅           | ❌       | ❌          |
| AI agent access (MCP)              | ✅            | Community plugins | ❌           | ❌       | ❌          |
| Permissioned + revocable AI agents | ✅            | ❌                | ❌           | ❌       | ❌          |
| Cross-app interop                  | ✅            | ❌                | ❌           | ❌       | ❌          |
| Self-hostable                      | ✅            | N/A (local)       | ❌           | ❌       | ❌          |
| One-command deploy                 | ✅            | N/A               | N/A          | N/A      | N/A         |
| Browser extension                  | ✅            | ✅ (Clipper)      | ✅ (Clipper) | ❌       | ❌          |
| AI conversation storage            | ✅            | ❌                | ❌           | ❌       | ❌          |
| We don’t read/sell your data       | ✅ Verifiable | Unknown           | Unknown      | ❌       | Unknown     |
| Open source (verifiable)           | ✅            | ❌                | ❌           | ❌       | ❌          |
| CRDT conflict resolution           | ✅            | ❌                | ❌           | ❌       | ❌          |

## Risks

1. **MCP protocol stability** — MCP is evolving fast. Pin to a stable SDK version, abstract the protocol layer so tool definitions survive protocol changes
2. **Browser extension review times** — Chrome Web Store review can take days-weeks. Ship as sideloadable first, submit to store in parallel
3. **Scope creep into "AI platform"** — The MCP server is a thin bridge, not an AI engine. Don't build RAG, embeddings, or model hosting into EweserDB itself. The SDK provides data; the AI agent provides intelligence
4. **Ewe Note polish taking too long** — Cap Run 1 at 2 weeks. Ship "good enough" and iterate. Perfect is the enemy of launched
5. **IndexedDB limits in MCP server** — If the MCP server runs as a Node CLI (not in browser), it can't use IndexedDB. Use Hocuspocus sync instead, or a local SQLite cache. This needs a design decision in Run 3
6. **MCP security** — Agent tokens are high-value targets. Run 2.5 is a non-negotiable launch gate. No deployed MCP server without per-room scoped, short-lived, revocable tokens

## Execution Summary

```text
Run 0: Finish migration foundation (Smart) — 1-2 days
├── Run 1: Polish Ewe Note (Smart) — 1-2 weeks [PARALLEL with Runs 2 & 2.5]
├── Run 2: Add collection schemas (Fast) — 1 day
│   └── Run 2.5: Agent permission system (Smart) — 1 week [⚠️ PRIVACY GATE]
│       └── Run 3: MCP Server (Smart) — 1-2 weeks [gated by 2.5]
│           └── Run 5: Conversation Viewer (Fast) — 2-3 days
├── Run 4: Browser Extension (Smart) — 1 week [depends on Run 2, PARALLEL with Run 3]
└── Run 6: Production + Landing + Demo (Smart) — 1 week [depends on all above]
    └── [Parallel] Run P1: One-click cloud deploys (Fast) — 2-3 days
    └── [Parallel] Run P2: Migration tooling eweser.com → self-hosted (Fast) — 2-3 days
```

Critical path: Run 0 → Run 2 → Run 2.5 → Run 3 → Run 6

No public MCP server without Run 2.5. No launch without Run P1 (self-host as featured option).

## The 60-Second Demo Script

**Open with the problem:**
"I use three AI agents daily — Claude Code, GitHub Copilot, and OpenClaw. They don't talk to each other. Each one holds a piece of my knowledge in someone else's cloud. I can't search across them. If I quit any of them, I lose that context forever."

**Show the solution:**

1. **Terminal:** "One line to connect Claude Code to my EweserDB." (show the MCP config)
2. **Write a note in Ewe Note** — "Deploy BD bot changes tonight"
3. **Switch to Claude Code:** "What's on my todo list?" → Claude reads the note from EweserDB
4. **Switch to Copilot Chat:** "What did I discuss with Claude about the BD bot?" → Same data, different agent
5. **Show OpenClaw PA:** It picked up the deployment note on a cron and executed it. Result logged back.
6. **Next morning, ask any agent:** "What happened with last night's deployment?" → The answer is there, in YOUR database.
7. **Show the agent permissions page:** "I can see exactly what each agent accessed, and revoke any of them with one click."
8. **End card:** "Your AI agents work for you. Your data belongs to you. Own your AI brain. eweser.com"

## Status

- [ ] Approved by user
