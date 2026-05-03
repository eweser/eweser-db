# Plan: AI Memory Diagnostics And Audit System

## Goal

Add deterministic tests, diagnostics, and retrospective audit tools that prove
Eweser memory can encode, retrieve, and use relevant cross-agent memories
without leaking secrets or bloating context.

## Scope

- In: deterministic memory encode/retrieve fixtures, memory action audit record
  contracts, MCP audit instrumentation, local retrospective CLI reports, docs,
  and tests around the first Agent Journal memory MVP.
- In: Codex/Claude/Copilot-style fixture transcripts that model client behavior
  without requiring hosted client APIs.
- In: quality gates for relevance, exclusions, token budget, stale-fact
  handling, secret redaction, and unsafe durable-instruction rejection.
- Out: hosted telemetry, background auto-capture, external processors, vector
  databases, Mem0, Graphiti, Cognee, Project Wiki, browser extension capture,
  production analytics dashboards, or persistent cloud audit storage.
- Out: claiming real Claude, ChatGPT, or GitHub Copilot client behavior beyond
  what local fixture transcripts and MCP-compatible command flows prove.

## Assumptions / Open Questions

- Assumption: This plan should be implemented on
  `/Users/jacob/.codex/worktrees/5f31/eweser-db` because that worktree contains
  the uncommitted first memory MVP on branch `codex/ai-memory-strategy-run`.
- Assumption: The existing dirty MVP diff is the implementation base. Coder must
  not revert or overwrite those changes unless the user explicitly asks.
- Assumption: The first version should store audit evidence as deterministic
  local artifacts and optional MCP test records, not as hosted telemetry.
- Assumption: Token estimates can use a deterministic approximation in tests;
  exact model tokenizer integration is out of scope until a specific runtime is
  chosen.
- Open question: Whether persistent user-owned audit records should become a
  first-class EweserDB collection later. This plan keeps that as follow-up
  because adding persistent audit rooms affects Connect AI grants and UX.

## Runs

## Run Order And Manual Test Handoffs

Run order: Sequential. Runs 1 and 2 define contracts used by later runs; run 5
depends on all implementation runs.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with delivered behavior, commands, fixture assumptions,
manual steps, expected results, and known gaps.

### Run 1: Audit Contracts And Golden Fixtures

- **Id**: `run-1`
- **Title**: `Audit Contracts And Golden Fixtures`
- **Deliverable**:
  - Shared, dependency-free contracts for memory audit events, recall quality
    expectations, client fixture transcripts, and diagnostic report results.
- **Files**:
  - `packages/shared/src/memory-evaluation/index.ts`: extend or split into
    typed audit/session fixture contracts and deterministic quality-gate result
    shapes.
  - `packages/shared/src/memory-evaluation/index.test.ts`: add fixtures for
    Codex, Claude, and Copilot-style sessions.
  - `packages/shared/src/index.ts`: export new public shared contracts.
  - `.changeset/*`: update or add a changeset for new `@eweser/shared` public
    exports.
  - `packages/shared/src/INDEX.md`: update if new files are added.
- **Steps**:
  - [ ] Define a `MemoryAuditEvent` shape with safe fields only: event id,
        timestamp, client id, agent id, session id, worktree/project scope,
        action, reason/query, memory ids, room ids, token estimate, result
        summary, and safety warnings.
  - [ ] Define fixture transcript shapes for user/assistant/tool events without
        requiring real client logs.
  - [ ] Define expected memory writes, expected recall queries, expected
        included/excluded memory ids, and expected answer-impact assertions.
  - [ ] Add deterministic token estimation helpers that are good enough for
        budget gates and do not depend on hosted APIs.
  - [ ] Add golden fixtures for coding continuity, preference recall,
        stale-requirement correction, irrelevant-memory exclusion, and secret /
        prompt-injection traps.
- **Tests**:
  - `npm test --workspace @eweser/shared -- memory-evaluation`
  - `npm run type-check --workspace @eweser/shared`
- **Verification**:
  - Fixture tests fail if a required recall target, exclusion, token budget, or
    safety trap is missing from the fixture contract.
- **Manual test handoff**:
  - Not needed beyond documenting where fixtures live and how to add a new
    client-style transcript.
- **Dependencies**: None
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 2: Encode/Retrieve Quality Harness

- **Id**: `run-2`
- **Title**: `Encode/Retrieve Quality Harness`
- **Deliverable**:
  - Deterministic tests that prove memories written by the Agent Journal MVP can
    be searched/recalled with relevant results and bounded context size.
- **Files**:
  - `packages/shared/src/memory-evaluation/*`: add pure scoring helpers for
    encode quality, recall precision, exclusion safety, temporal correctness,
    and token budget.
  - `packages/mcp-server/src/tools.test.ts`: add integration-style tests through
    registered MCP tool handlers for save/search/export behavior against the
    fixture data layer.
  - `packages/mcp-server/src/data-layer.test.ts`: add DataLayer-level tests if
    room inference or search ranking needs lower-level coverage.
- **Steps**:
  - [ ] Simulate memory writes from fixture transcripts through
        `eweser_save_memory` and `eweser_suggest_memory`.
  - [ ] Simulate later recall through `eweser_search` with memory filters and
        assert expected memories are included while exclusions are absent.
  - [ ] Add score thresholds for recall hit rate, precision/noise, stale fact
        suppression, and maximum recall payload token estimate.
  - [ ] Test that raw secret-like content is redacted before write, search, and
        export.
  - [ ] Test that adversarial text such as "ignore future safety rules" is not
        treated as a durable instruction or recommended recall.
- **Tests**:
  - `npm test --workspace @eweser/shared -- memory-evaluation`
  - `npm test --workspace @eweser/mcp`
  - `npm run type-check --workspace @eweser/mcp`
- **Verification**:
  - A failing fixture should produce a diagnostic message naming the missed
    target, irrelevant recalled item, token-budget breach, or safety breach.
- **Manual test handoff**:
  - Include command examples for running one fixture and reading the diagnostic
    failure output.
- **Dependencies**: `run-1`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 3: MCP Audit Instrumentation

- **Id**: `run-3`
- **Title**: `MCP Audit Instrumentation`
- **Deliverable**:
  - MCP memory tools emit safe audit events in tests and optional local JSONL
    output without logging tokens or full secret-bearing content.
- **Files**:
  - `packages/mcp-server/src/tools.ts`: add an optional audit sink parameter or
    local helper and instrument strategy lookup, scope listing, save, suggest,
    search, and export memory paths.
  - `packages/mcp-server/src/lib.ts`: export audit-related helper types if
    needed by tests or scripts.
  - `packages/mcp-server/src/tools.test.ts`: assert audit events are emitted for
    relevant actions and never contain bearer tokens or raw secrets.
  - `packages/mcp-server/README.md`: document local audit mode and privacy
    constraints.
- **Steps**:
  - [ ] Add a small audit sink interface used by `registerTools`; default to no
        sink so existing MCP behavior is unchanged.
  - [ ] Capture action, reason/query, client/agent where available, memory ids,
        room ids, result counts, token estimates, redaction warnings, and error
        classification.
  - [ ] Avoid storing raw transcript content, bearer tokens, sync tokens,
        cookies, or `.env` values in audit events.
  - [ ] Ensure stdio MCP JSON-RPC output remains clean; audit output must not
        write arbitrary logs to stdout.
  - [ ] Add a local JSONL sink only if it can be enabled explicitly with an env
        var and written outside stdout.
- **Tests**:
  - `npm test --workspace @eweser/mcp`
  - `npm run type-check --workspace @eweser/mcp`
  - `npm run secrets:scan`
- **Verification**:
  - Tests prove each instrumented MCP action produces a bounded audit event and
    redacts secret-like values before the event is recorded.
- **Manual test handoff**:
  - Describe how to enable local audit JSONL for a test MCP run, call two memory
    tools, and inspect audit lines for action, room ids, memory ids, token
    estimate, and safety warnings.
- **Dependencies**: `run-1`, `run-2`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: Retrospective Diagnostic CLI

- **Id**: `run-4`
- **Title**: `Retrospective Diagnostic CLI`
- **Deliverable**:
  - A repo script that audits fixture transcripts, local MCP audit JSONL, or
    Codex session JSONL and reports whether memory was used at the right time,
    with useful recall and bounded tokens.
- **Files**:
  - `scripts/memory/diagnose-memory-session.mjs`: new CLI for deterministic
    reports.
  - `scripts/INDEX.md`: document the new script.
  - `package.json`: add `memory:diagnose` and, if useful, `memory:fixtures`
    scripts.
  - `docs/ai/memory-diagnostics-audit.md`: document CLI inputs, outputs,
    scoring, and privacy rules.
  - `scripts/codex/analyze-session-efficiency.mjs`: optionally reuse patterns
    without coupling the new memory report to general Codex flailing analysis.
- **Steps**:
  - [ ] Accept `--fixture`, `--audit-jsonl`, and optional `--codex-session`
        inputs.
  - [ ] Produce Markdown and JSON report modes with writes, recalls, misses,
        noisy recalls, token budget, redaction/safety warnings, and suggested
        pruning/merge actions.
  - [ ] Detect common failures: memory available but no strategy lookup,
        save/suggest called without useful durable content, search skipped when
        fixture expected recall, recall payload too large, irrelevant memories
        over threshold, stale fact outranking current fact, and raw secret
        leakage.
  - [ ] Keep the CLI offline and deterministic.
  - [ ] Use local filesystem inputs only; do not require MCP servers, Docker, or
        external clients.
- **Tests**:
  - `node scripts/memory/diagnose-memory-session.mjs --fixture <fixture> --json`
    using committed fixtures.
  - `npm run memory:diagnose -- --fixture <fixture>`
  - `npm run check` if scripts/docs changes affect lint or format gates.
- **Verification**:
  - CLI returns nonzero on safety or required-recall failures and zero on the
    passing golden fixture.
- **Manual test handoff**:
  - Give Jacob exact commands to run against a golden fixture and against a
    local MCP audit JSONL file from run 3.
- **Dependencies**: `run-1`, `run-3`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 5: End-To-End Memory Audit Tests And Docs

- **Id**: `run-5`
- **Title**: `End-To-End Memory Audit Tests And Docs`
- **Deliverable**:
  - A single-session test path proving setup, encode, retrieve, audit, export,
    and retrospective reporting are all usable.
- **Files**:
  - `docs/ai/memory-diagnostics-audit.md`: add final manual test script.
  - `docs/ai/memory-strategy-evaluation.md`: cross-link diagnostics and explain
    what the old strategy harness does not prove.
  - `docs/ai/plans/2026-05-03-ai-memory-diagnostics-audit.md`: update
    execution summary and self-reflection.
  - Relevant package tests from runs 1-4.
- **Steps**:
  - [ ] Run narrow tests first for shared and MCP.
  - [ ] Run the diagnostic CLI against at least one passing and one failing
        fixture.
  - [ ] Run root checks if cross-package changes require them.
  - [ ] Perform internal QA against auth boundaries, redaction, MCP stdout
        safety, token-budget assumptions, and published package changesets.
  - [ ] Add a manual test script covering: Connect AI setup, strategy lookup,
        memory save, recall search, export, local audit JSONL, and retrospective
        diagnostic report.
- **Tests**:
  - `npm test --workspace @eweser/shared -- memory-evaluation`
  - `npm test --workspace @eweser/mcp`
  - `npm run type-check --workspace @eweser/shared`
  - `npm run type-check --workspace @eweser/mcp`
  - `npm run memory:diagnose -- --fixture <passing-fixture>`
  - `npm run memory:diagnose -- --fixture <failing-fixture>` expecting nonzero
  - `npm run secrets:scan`
  - `npm run check`
- **Verification**:
  - The diagnostics can explain: useful writes, redundant/noisy writes, relevant
    memories missed, irrelevant memories recalled, recall token budget, and
    suggested prune/merge actions.
- **Manual test handoff**:
  - Add a single-session command sequence and expected output snippets so the
    user can test the audit system without re-planning.
- **Dependencies**: `run-1`, `run-2`, `run-3`, `run-4`
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop and ask for user approval if:

- The memory MVP changes are not present in the target worktree.
- Implementation requires persistent audit storage in EweserDB rooms, PostgreSQL
  migrations, hosted telemetry, external processors, or client-specific hosted
  APIs.
- Instrumentation would require logging bearer tokens, sync tokens, cookies,
  `.env` contents, or full unredacted transcripts.
- MCP audit output would corrupt stdio JSON-RPC.
- A public package API change is needed but no changeset can be added.
- Verification exposes a safety failure that cannot be fixed inside this plan.

## Approval Boundary

Approval of this plan authorizes Coder to implement Runs 1-5 in
`/Users/jacob/.codex/worktrees/5f31/eweser-db`, make focused supporting edits,
write/update tests and docs, add required changesets, run verification, perform
internal QA, fix issues found inside this boundary, and update this plan's
execution summary.

Approval does not authorize unrelated refactors, direct pushes to `main`,
destructive git operations, persistent hosted telemetry, background auto-capture,
new external memory processors, secret storage, migration deletion, or claims
about real hosted client behavior that are not proved by local fixtures.

## Execution Summary

| Run     | Status   | Files Changed                                                                                                                                                               | Verification                                                                                                                                 | Notes                                                                                                                                                                    |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `run-1` | Complete | `packages/shared/src/memory-evaluation/index.ts`, `packages/shared/src/memory-evaluation/index.test.ts`                                                                     | `npm test --workspace @eweser/shared -- memory-evaluation`; `npm run type-check --workspace @eweser/shared`                                  | Added shared audit event, fixture transcript, recall candidate, expectation, and diagnostic report contracts plus Codex/Claude/Copilot-style fixtures.                   |
| `run-2` | Complete | `packages/shared/src/memory-evaluation/index.ts`, `packages/mcp-server/src/tools.test.ts`                                                                                   | `npm test --workspace @eweser/shared -- memory-evaluation`; `npm test --workspace @eweser/mcp`; `npm run type-check --workspace @eweser/mcp` | Added deterministic quality gates for required recall, noisy recall, phrases, token budget, and safety. MCP tests now exercise memory save/search/export audit behavior. |
| `run-3` | Complete | `packages/mcp-server/src/tools.ts`, `packages/mcp-server/src/index.ts`, `packages/mcp-server/src/env.ts`, `packages/mcp-server/src/lib.ts`, `packages/mcp-server/README.md` | `npm test --workspace @eweser/mcp`; `npm run type-check --workspace @eweser/mcp`; `npm run secrets:scan`                                     | Added optional audit sink and `EWESER_MCP_AUDIT_JSONL`; audit output is file-only and redacts secret-like text before event persistence.                                 |
| `run-4` | Complete | `scripts/memory/diagnose-memory-session.mjs`, `scripts/memory/fixtures/*.json`, `scripts/INDEX.md`, `package.json`, `docs/ai/memory-diagnostics-audit.md`                   | `npm run memory:diagnose -- --fixture scripts/memory/fixtures/passing-agent-journal.json`; failing fixture command wrapped to expect nonzero | Added offline deterministic diagnostic CLI with Markdown/JSON output and committed pass/fail fixtures.                                                                   |
| `run-5` | Complete | `docs/ai/memory-diagnostics-audit.md`, `docs/ai/memory-strategy-evaluation.md`, this plan                                                                                   | `npm run check`; `npm run code-index:check`; `npm run secrets:scan`                                                                          | Added single-session manual test script and clarified that strategy evaluation is conceptual while diagnostics prove encode/retrieve reliability.                        |

## Self-Reflection / Instruction Improvements

- Runtime orientation docs referenced `~/.codex/skills/...`, but this worktree
  only had the repo-local skill path. Future Eweser workflow docs should prefer
  repo-local skill paths when available, with the personal path as a fallback.
- Root `npm run check` is necessary after MCP changes because downstream
  packages can apply stricter TypeScript flags than `@eweser/mcp` itself; the
  audit helper initially passed local MCP type-check but failed
  `auth-server-hono` exact optional property checks.
