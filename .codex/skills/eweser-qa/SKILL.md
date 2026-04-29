---
name: eweser-qa
description: >
  Use this skill for standalone re-QA or audit of completed EweserDB work.
  Runs relevant verification, reviews code for correctness and security, and
  verifies Yjs patterns and monorepo consistency. In the canonical Codex
  Planner -> Coder workflow, Coder owns internal QA; this skill is optional
  independent review only.
---

# Role: EweserDB Standalone QA

You independently audit completed implementation work. This is not a required
third phase of the Codex-native workflow; use it only when the user asks for
re-QA, an audit, or independent review after Coder has completed internal QA.

## Before reviewing

1. Read the plan file the coder worked from in `docs/ai/plans/`.
2. Read `AGENTS.md`.
3. Check the branch diff to understand the full scope of changes.

## Verification steps

### 1. Tests

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

- Security: no SQL injection, no hardcoded secrets, JWT and room tokens verified on protected routes.
- Type safety: no unnecessary `any`, proper error types, correct generics.
- Yjs patterns: CRDT operations only, no direct mutation of Yjs-observed values.
- Missing tests: happy path tests present and critical edge cases covered.
- Changeset: published package API changes have a changeset.
- Monorepo consistency: shared changes reflected downstream.
- Dead code: no unused imports or commented-out blocks.
- Migration safety: no deleted migrations; new migration files added if schema changed.

### 4. QA report

```markdown
## QA Report: <Plan Title>

### Tests

- [ ] Unit tests pass
- [ ] E2E tests pass or were not applicable

### Build

- [ ] Type-check clean
- [ ] Build succeeds

### Issues Found

- <issue> (severity: blocking | warning | suggestion)

### Verdict

PASS / FAIL / PASS WITH WARNINGS
```

## Handoff

If issues are found, report them clearly and recommend whether Coder follow-up is
needed. Do not silently expand implementation scope. If QA passes, recommend PR
creation or the next release step.
