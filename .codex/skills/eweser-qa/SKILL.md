---
name: eweser-qa
description: >
  Use this skill for standalone re-QA or audit of completed EweserDB work.
  Also use it when the user invokes $eweser-qa, asks for QA, review, quality
  assurance, regression checks, test coverage review, or pre-PR verification
  for EweserDB. Runs relevant verification, reviews code for correctness and
  security, and verifies Yjs patterns and monorepo consistency. In the
  canonical Codex Planner -> Coder workflow, Coder owns internal QA; this skill
  is optional independent review only.
---

# Role: EweserDB Standalone QA

You independently audit completed implementation work. This is not a required
third phase of the Codex-native workflow; use it only when the user asks for
re-QA, an audit, or independent review after Coder has completed internal QA.

## Before reviewing

1. Check `git status --short --branch` and the branch diff to understand the full scope of changes.
2. Read the plan file the coder worked from in `docs/ai/plans/`, if one exists.
3. Read `AGENTS.md`.
4. Read the nearest `INDEX.md` for changed package boundaries before broad `rg` or `find` exploration.
5. Use targeted `npm run code-map:query -- --symbol <name>`, `--file <path>`, or `--package <name>` for import/export questions before loading broad source context.
6. Read `docs/ai/quality-gates-matrix.md` when verification scope is ambiguous.
7. Read relevant changed files and tests.
8. If the branch has an open PR, inspect unresolved PR review threads and top-level comments before reviewing the local diff.

Keep the review context focused. Use `git diff --name-only`, indexes, PR
comments, and targeted file reads before loading large docs or entire source
files.

## Verification steps

### 1. Tests

Before local tests, services, Cypress, or browser flows, run:

```bash
~/.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status
```

Run `refresh` if endpoints are unknown, stale, or relevant to the verification.

```bash
npm test
npm run test:e2e
```

Run E2E only when applicable and when the required local services are available.

### 2. Types and build

```bash
npm run type-check
npm run build
```

Use the repo's current canonical commands when they differ.

### 3. Code review checklist

- Findings first: lead with bugs, regressions, security issues, weak assumptions, and missing tests. Use precise file/line findings where possible.
- Security: no SQL injection, no hardcoded secrets, JWT and room tokens verified on protected routes.
- Auth: input validation, parameterized Drizzle queries, explicit room grants, and agent scopes.
- Type safety: no unnecessary `any`, proper error types, correct generics.
- Shared package: backward compatibility and no runtime dependencies.
- Yjs patterns: CRDT operations only, no direct mutation of Yjs-observed values.
- Frontend: offline-first behavior, auth-grant UX, and no secrets in client code.
- Missing tests: happy path tests present and critical edge cases covered.
- Changeset: published package API changes have a changeset.
- Monorepo consistency: shared changes reflected downstream.
- Dead code: no unused imports or commented-out blocks.
- Migration safety: no deleted migrations; new migration files added if schema changed.

### 4. Active PR comments

For QA involving an active PR:

1. Identify the active PR and fetch unresolved review threads, not just top-level PR comments.
2. Separate active, outdated, and already-addressed comments.
3. Treat actionable unresolved comments as QA findings unless the user asked for fixes.
4. If fixing comments is explicitly requested, apply the smallest scoped fix and re-review the touched diff before verification.
5. Report which comments are unresolved, addressed, blocked, or intentionally deferred.

### 5. Optional read-only sidecars

Use sidecars only for separable read-only work:

- `scripts/codex/mini-worker.sh code "summarize risky files in this diff"`
- `scripts/codex/mini-worker.sh code "find changeset/package API risks in this diff"`
- `scripts/codex/mini-worker.sh web "check current official docs for this dependency behavior"`

Keep fixes local unless the user explicitly asks for parallel code edits with disjoint ownership.

### 6. QA report

```markdown
## QA Report: <Plan Title>

### Findings

- <issue> (severity: blocking | warning | suggestion)

### Tests

- [ ] Unit tests pass
- [ ] E2E tests pass or were not applicable

### Build

- [ ] Type-check clean
- [ ] Build succeeds

### PR Comments

- <unresolved | addressed | blocked | not applicable>

### Verification Gaps

- <gap or None>

### Verdict

PASS / FAIL / PASS WITH WARNINGS
```

## Handoff

If issues are found, report them clearly and recommend whether Coder follow-up is
needed. Do not silently expand implementation scope. If QA passes, recommend PR
creation or the next release step.
