# Cross-Tool Research Workflow

> **Memory MCP boundary:** The shipped target is structured cross-agent memory recall — not universal automatic context sync. Keep `eweser_save_memory` and `eweser_search`; do not invest in broader sync infrastructure for now.

Save money on AI credits by doing research in flat-subscription tools and bridging context to Copilot via EweserDB.

## The Problem

- Copilot charges per-token. Research and planning burn tokens fast.
- Claude web / ChatGPT have flat monthly subscriptions with generous limits.
- Context doesn't transfer between tools — you re-explain everything.

## The Workflow

### 1. Research in Claude Web / ChatGPT

Open Claude web (or ChatGPT) for exploratory research, brainstorming, or planning. These have flat-rate subscriptions — no per-token cost.

### 2. Save Findings to EweserDB

When you have useful findings, copy the key summary and save it in Copilot:

```
Save this to eweser memory:
- Title: "Research: best approach for X"
- Summary: <paste the key findings>
- Tags: ["research", "topic-name"]
- memoryType: "memory"
```

Copilot calls `eweser_save_memory` → data stored in EweserDB.

### 3. Recall in Any Agent

Next time any agent needs that context:

```
Search eweser for what we found about X
```

Agent calls `eweser_search` → gets the summary → continues without re-researching.

## Worktree-Safe Sessions

Before deleting a worktree, save the session:

```
save session: implemented the aggregator search endpoint, added GIN index on search_vector
```

The session summary survives in EweserDB even after the worktree is gone. Next time you're in a different worktree or a new session, search for it.

Each worktree now persists sessions with an automatic `worktree:*` tag, so you can scope recalls:

```json
{
  "tool": "eweser_search",
  "args": {
    "query": "session framework decision",
    "filters": {
      "memoryType": ["session"],
      "tags": ["worktree:eweser-db-worktree-name"]
    }
  }
}
```

## Sensitive Data

Store cross-repo reference docs (VPN setup, tunneling configs, dev environment notes) in EweserDB notes. They're accessible from any repo via `eweser_search` without being checked into git.

**⚠️ Do NOT store real API keys/passwords** until E2E encryption is implemented. Use for reference docs and non-critical configs only.

## Helper Intent Reference

These are prompt-layer conventions on top of the existing `eweser_save_memory` / `eweser_search` tools — not new storage subsystems.

| Intent                      | Maps to              | Defaults                                                          | Notes                                          |
| --------------------------- | -------------------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| `remember <fact>`           | `eweser_save_memory` | `memoryType: "memory"`, `roomId: conversations`                   | Captures a specific fact to recall later       |
| `decision <description>`    | `eweser_save_memory` | `memoryType: "decision"`, `roomId: conversations`                 | Architectural/strategic choices with rationale |
| `bookmark <url>`            | `eweser_save_memory` | `memoryType: "bookmark"`, `roomId: conversations`                 | URL or reference worth keeping                 |
| `save session: <summary>`   | `eweser_save_memory` | `memoryType: "session"`, `roomId: conversations`                  | End-of-session summary                         |
| `next: <action>`            | `eweser_save_memory` | `memoryType: "memory"`, `roomId: conversations`, `tags: ["next"]` | Captures a planned action                      |
| `search eweser for <query>` | `eweser_search`      | no filters                                                        | Recall from any agent                          |
| `scratch <note>`            | `eweser_save_memory` | `memoryType: "memory"`, short summary                             | Quick capture; not persistent long-term        |

All helpers default to `roomId: ec8a7adb-45ca-4480-8de9-b4d74173f73f` (conversations room). Pure prompt-layer aliases — no new MCP tool required.
