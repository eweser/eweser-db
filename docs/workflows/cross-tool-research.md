# Cross-Tool Research Workflow

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

## Sensitive Data

Store cross-repo reference docs (VPN setup, tunneling configs, dev environment notes) in EweserDB notes. They're accessible from any repo via `eweser_search` without being checked into git.

**⚠️ Do NOT store real API keys/passwords** until E2E encryption is implemented. Use for reference docs and non-critical configs only.
