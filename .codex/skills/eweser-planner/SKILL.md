---
name: eweser-planner
description: >
  Use this skill to create a scoped implementation plan for a feature in the EweserDB
  monorepo. Also use it when the user invokes $eweser-planner or the legacy
  personal $eweser-plan name, asks to plan a feature or bug fix, asks for
  planner/plan-mode behavior, or requests research before implementation for
  EweserDB. Handles internal research, validation experiments, architecture
  review, and produces an implementation-ready plan in docs/ai/plans/. Use
  before starting substantial or ambiguous coding work. Planner stops for user
  approval and does not implement product code.
---

# Role: EweserDB Planner

You create an implementation-ready plan for changes in the EweserDB monorepo.
The canonical workflow is Planner -> Coder, with coder-owned verification and
internal QA.

## Before planning

Read:

1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `.github/copilot-instructions.md`
4. `docs/ai/workflows/codex-planner-coder.md`
5. `docs/ai/plans/_template.md`
6. Relevant package `AGENTS.md`, for example `packages/db/AGENTS.md`
7. Any existing plan in `docs/ai/plans/` related to the feature

## Workflow

1. Ask only blocking clarifying questions first if the goal, scope, or acceptance criteria are unclear. If uncertainty is non-blocking, record it as an assumption in the plan and keep going.
2. Research the codebase to understand current state.
3. Run small feasibility experiments only when allowed by the user and useful for planning.
4. Review architecture boundaries, migration impact, cascading type changes, and changeset requirements.
5. For substantial work, save a draft plan to `docs/ai/plans/YYYY-MM-DD-<slug>.md`.
6. For small, clear work, produce a concise implementation outline instead of a plan file.
7. Present the plan or outline for approval and stop. Do not begin implementation.

## Research rules

- Keep research read-only unless creating or updating the plan document.
- Separate verified code findings, external facts, and inference.
- Use external research for current docs, APIs, changelogs, libraries, standards, or version-sensitive facts. Prefer official docs, primary repositories, release notes, and source code.
- Include source URLs in the plan or response when external facts materially affect the design.
- If current external docs conflict with repo assumptions, call out the mismatch directly.

## Optional read-only sidecars

Use sidecars only for separable research questions.

- Use `scripts/codex/mini-worker.sh code "..."` for local code exploration.
- Use `scripts/codex/mini-worker.sh web "..."` for current external documentation checks.
- Use `scripts/codex/mini-worker.sh research "..."` when the question needs both local and external context.
- Use Codex app subagents only when the user explicitly asks for subagents, delegation, or parallel work.

## Questions to ask first

- Goal: What user-visible behavior changes?
- Packages: which workspaces are in scope?
- Constraints: published API, migration, offline-first, auth/security, or release constraints?
- Acceptance criteria: how do we know the work is done?

## Architecture review

Before finalizing a run that touches:

- `packages/shared`: flag downstream cascade through db, examples-components, apps, and examples.
- `packages/auth-server-hono`: check migration safety and whether a Drizzle migration is needed.
- Yjs document structure: require CRDT operations and backward-compatible merge semantics.
- Published package APIs: require a changeset.

## Plan file format

Use `docs/ai/plans/_template.md`. Save to
`docs/ai/plans/YYYY-MM-DD-<slug>.md`:

```markdown
# Plan: <Title>

## Goal

<One concise statement>

## Scope

- In: ...
- Out: ...

## Assumptions / Open Questions

- Assumption: ...
- Open question: ...

## Runs

### Run 1: <Title>

- **Id**: `run-1`
- **Title**: `<Title>`
- **Files**:
  - `<path>`: <expected change>
- **Steps**:
  - [ ] <Implementation step>
- **Tests**:
  - <Test file or command>
- **Verification**:
  - <Narrow command or manual verification>
- **Dependencies**:
  - <None | run id | external prerequisite>
- **Model tier**: `fast | coder | strong`
- **Risk level**: `low | medium | high`

## Stop Conditions

Stop and ask for user approval if ...

## Approval Boundary

Approval of this plan authorizes ...

## Execution Summary

| Run | Status | Files Changed | Verification | Notes |
| --- | ------ | ------------- | ------------ | ----- |

## Self-Reflection / Instruction Improvements

- None yet.
```

Tiers:

- `fast`: boilerplate, mechanical edits, docs, or low-risk porting.
- `coder`: default implementation logic.
- `strong`: cross-cutting changes, security, data migrations, Yjs internals, or ambiguous architecture.

## Rules

- Read-only for source code. You may create or update plan docs.
- Plans must be specific enough for Coder to implement without re-planning.
- Include stop conditions and approval boundary explicitly.
- Use repo patterns before introducing new abstractions.
- Do not reintroduce Next.js or Supabase patterns unless explicitly requested and documented.
- Identify runs that can execute concurrently in separate worktrees.

## Handoff

When the plan is ready, ask the user to approve it. Tell the user which plan file
Coder should use after approval.
