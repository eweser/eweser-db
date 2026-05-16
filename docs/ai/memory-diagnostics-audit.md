# Memory Diagnostics And Audit

Status: current support doc for the first local memory audit system.

The diagnostics layer proves the memory MVP is useful enough to test. It does
not claim hosted Codex, Claude, ChatGPT, or Copilot behavior; it uses
deterministic client-style fixtures and optional local MCP audit JSONL.

## What It Checks

- Strategy lookup happened before memory-dependent work.
- Useful memory writes or suggestions happened when expected.
- Required memories were recalled later.
- Irrelevant memories were excluded.
- Recall stayed under a deterministic token budget.
- Secret-like values and unsafe durable instructions were not persisted or
  recalled raw.

## Commands

Passing fixture:

```bash
npm run memory:diagnose -- --fixture scripts/memory/fixtures/passing-agent-journal.json
```

Failing fixture:

```bash
npm run memory:diagnose -- --fixture scripts/memory/fixtures/failing-no-recall.json
```

JSON output:

```bash
npm run memory:diagnose -- --fixture scripts/memory/fixtures/passing-agent-journal.json --json
```

Audit JSONL from MCP:

```bash
EWESER_MCP_AUDIT_JSONL=/tmp/eweser-mcp-audit.jsonl npm run dev --workspace @eweser/mcp
npm run memory:diagnose -- --fixture scripts/memory/fixtures/passing-agent-journal.json --audit-jsonl /tmp/eweser-mcp-audit.jsonl
```

## Audit JSONL Privacy Rules

MCP audit events are intentionally small. They may include action, room ids,
memory ids, query/reason summaries, result counts, estimated tokens, and safety
warnings. They must not include bearer tokens, sync tokens, cookies, `.env`
contents, or full unredacted transcripts.

Audit output is opt-in through `EWESER_MCP_AUDIT_JSONL`. It writes to a file,
not stdout, because stdio MCP uses stdout for JSON-RPC.

## Fixture Shape

Fixtures live in `scripts/memory/fixtures/` and mirror the shared contracts in
`packages/shared/src/memory-evaluation/`.

Each fixture records:

- client and session identity;
- compact transcript events;
- seed memories;
- audit events;
- expected required recalls, exclusions, phrase checks, and token budget.

## Single-Session Manual Test

1. Start the normal local stack and Connect AI flow.
2. Set `EWESER_MCP_AUDIT_JSONL=/tmp/eweser-mcp-audit.jsonl` for the MCP server.
3. In the AI client, call `eweser_get_memory_strategy`.
4. Save one concise memory with `eweser_save_memory` without `roomId` when only
   one writable memory target exists.
5. Search for it with `eweser_search` using a focused query.
6. Export memory with `eweser_export_memory`.
7. Run:

```bash
npm run memory:diagnose -- --fixture scripts/memory/fixtures/passing-agent-journal.json --audit-jsonl /tmp/eweser-mcp-audit.jsonl
```

Expected result: the report passes strategy lookup, required recall, excluded
phrases, token budget, and safety checks. If it fails, the suggested actions
should name the missed recall, noisy recall, token-budget breach, or safety
leak.

## Project Wiki Manual Audit

Use this when validating the deterministic Project Wiki flow rather than the
Agent Journal save/search path:

1. Seed one `memoryStrategyConfigs` doc for `strategy: "project-wiki"` with a
   project `scopeKey`, readable source room ids, and writable
   `projectWikiDrafts` / `projectWikiPages` room ids.
2. Seed at least one source-backed project memory and one decision memory in
   the readable source rooms.
3. Call `eweser_get_memory_strategy` and confirm it resolves to `project-wiki`
   for the seeded project scope.
4. Call `eweser_build_project_wiki`, inspect the returned draft ids, then read a
   draft document and confirm `sourceMemoryIds` and any `sourceRefs`.
5. Reject one draft with `eweser_review_project_wiki_draft` and confirm the
   canonical pages stay unchanged.
6. Accept one draft and confirm the canonical page updates with
   `lastAcceptedDraftId`.
7. Export the accepted wiki with `eweser_export_project_wiki` and inspect the
   stable filenames plus provenance frontmatter.

## Known Limits

- Token counts are deterministic estimates, not model tokenizer counts.
- Real hosted client behavior still needs client-specific manual verification.
- Persistent user-owned audit records are not implemented; this version uses
  local JSONL and deterministic fixture reports.
