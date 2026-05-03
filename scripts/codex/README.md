# Codex Utilities

This directory contains repo-local helpers for EweserDB agent workflows.

## Session Retrospective

Use the session retrospective analyzer to review only new local Codex sessions
after an instruction or tooling change and look for repeated wasted motion.

```bash
npm run codex:retrospective -- --since 2026-05-02 --cwd /home/jacob/eweser-db
npm run codex:retrospective -- --since 2026-05-02 --cwd /home/jacob/eweser-db --write .ai/reports/codex-session-retrospective-2026-05-02.md
npm run codex:retrospective -- --since 2026-05-02 --cwd /home/jacob/eweser-db --mark-reviewed
npm run codex:retrospective -- --cwd /home/jacob/eweser-db
```

The analyzer reads `~/.codex/sessions/**/*.jsonl` by default and flags
heuristics such as:

- broad search before `INDEX.md`
- repeated broad search without targeted `code-map` queries
- repeated search or `git status` churn
- runtime-orientation misses before local verification
- repeated test/type-check retries

`--mark-reviewed` writes `.ai/codex-session-retrospective-state.json` with the
newest scanned session timestamp and id. Later runs can omit `--since`; the
analyzer starts after that reviewed-through marker so old flailing patterns do
not keep appearing as new regressions.

Use the report to decide whether the fix belongs in a nearby `INDEX.md`,
`LOCAL_DEVELOPMENT.md`, runtime-orientation guidance, or a small helper script.
If the fix is too broad or risky for the retrospective pass, write a
Coder-ready plan under `docs/ai/plans/` from `docs/ai/plans/_template.md` and
include a launch prompt such as
`Use $eweser-coder docs/ai/plans/<plan>.md`.

## Plan Orchestrator

Use the orchestrator for approved, structured implementation plans that need multiple coding runs, isolated worktrees, integration, and final QA/review.

```bash
scripts/codex/eweser-plan-orchestrator.sh docs/ai/plans/example.md --dry-run
scripts/codex/eweser-plan-orchestrator.sh docs/ai/plans/example.md --max-parallel 2
scripts/codex/eweser-plan-monitor.sh docs/ai/plans/example.md
scripts/codex/eweser-plan-monitor.sh docs/ai/plans/example.md --watch --interval 60
scripts/codex/eweser-plan-orchestrator.sh docs/ai/plans/example.md --resume
scripts/codex/eweser-plan-orchestrator.sh docs/ai/plans/example.md --stop
```

The shell scripts are stable entrypoints. The implementation lives in `scripts/codex/lib/eweser-plan-orchestrator.mjs` so stop/resume behavior does not depend on Bash 3.2 array or process-management edge cases.

## Plan Metadata Contract

Orchestrated plans must include one marked fenced `yaml` block with top-level `orchestration` and `runs` keys. The marker prevents examples elsewhere in the plan from being treated as executable metadata.

```markdown
<!-- eweser-orchestration -->
```

```yaml
orchestration:
  enabled: true
  maxParallel: 2
  baseBranch: main
  finalStages:
    - qa
    - review
runs:
  - id: run-1
    title: Add shared schema types
    agent: eweser-code
    model: coding
    parallel: false
    dependsOn: []
    writeScope:
      - packages/shared/src/**
      - packages/shared/test/**
    tests:
      - npm run type-check --workspace @eweser/shared
      - npm test --workspace @eweser/shared
    changeset: maybe
  - id: run-2
    title: Add app UI
    agent: eweser-code
    model: coding
    parallel: true
    dependsOn:
      - run-1
    writeScope:
      - packages/app/src/**
    tests:
      - npm run type-check --workspace @eweser/app
    changeset: no
```

Supported fields:

| Field                       | Required | Notes                                                                                                                                                                 |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orchestration.enabled`     | yes      | Must be `true`.                                                                                                                                                       |
| `orchestration.maxParallel` | no       | Positive integer. CLI `--max-parallel` overrides it.                                                                                                                  |
| `orchestration.baseBranch`  | no       | Defaults to the current branch.                                                                                                                                       |
| `orchestration.finalStages` | no       | Allowed values are `qa` and `review`. They run after all coding runs integrate.                                                                                       |
| `runs[].id`                 | yes      | Unique slug-like ID: letters, numbers, dots, underscores, or dashes.                                                                                                  |
| `runs[].title`              | yes      | Human-readable run title.                                                                                                                                             |
| `runs[].agent`              | yes      | Currently `eweser-code` for coding runs.                                                                                                                              |
| `runs[].model`              | no       | Defaults to `coding`. `coding`/`strong` map to `gpt-5.4`; `simple`/`fast`/`mini` map to `gpt-5.4-mini`.                                                               |
| `runs[].parallel`           | no       | Defaults to `false`. Parallel runs still need disjoint write scopes.                                                                                                  |
| `runs[].dependsOn`          | no       | Run IDs that must finish before this run starts. Runs with multiple dependencies merge those completed worker branches into the worker worktree before coding starts. |
| `runs[].writeScope`         | yes      | Glob-like path list. Used for conflict avoidance and scope checks.                                                                                                    |
| `runs[].tests`              | no       | Commands the worker is expected to run and the integrator reruns after merge.                                                                                         |
| `runs[].changeset`          | no       | `yes`, `no`, or `maybe`; documentation signal only.                                                                                                                   |
| `runs[].allowSharedScope`   | no       | Escape hatch for conservative serialization. Use sparingly and document why in the plan.                                                                              |

Validation rules:

- Every run must have a unique ID.
- Every dependency must point to an existing run.
- Dependency cycles are rejected.
- Runs marked `parallel: true` must have disjoint write scopes from other runnable parallel runs.
- Shared contracts and repo-wide files force serialization unless `allowSharedScope: true` is set. Conservative paths include `packages/shared`, migrations, root package and lock files, root config, docs indexes, and package export files.
- Final QA/review stages only run after coding runs are integrated.
- Final QA/review stages run on `gpt-5.4`.

## Model Routing

The intended model split is:

- Main supervising chat: `gpt-5.5`.
- Coding runs, QA, and review: `gpt-5.4`.
- Simple support tasks, dry-run style checks, and lightweight read-only helpers: `gpt-5.4-mini`.

Do not rely on ambient Codex defaults for worker model selection. The orchestrator passes explicit `--model` values for coding workers and final QA/review stages.

## State Layout

State is local-only under `.codex/orchestrator/<plan-slug>/`:

```text
state/*.state     JSON state per run/stage
logs/*.log        Worker, integration, QA, and review logs
reports/*.md      Final reports and Codex last-message outputs
worktrees/<run>/  Worker worktrees
active.json       Active orchestrator marker
summary.md        Human-readable monitor summary
```

`.codex/` is ignored and must remain local-only.

## Operational Notes

- Run `--dry-run` first. It validates the metadata, prints the dependency plan, and writes no state.
- The orchestrator refuses mutating runs on a dirty working tree unless `--allow-dirty` is passed. Dirty integration branches are risky because worker merges and per-run verification become ambiguous.
- `--stop` kills the active orchestrator process tree for the plan and marks in-progress state files as `interrupted`.
- `--resume` reuses existing state and skips completed runs.
- The default integration mode creates temporary per-run squash commits so multi-run integration can proceed with a clean index, then resets back to the starting commit and leaves the combined diff in the working tree for review. Use `--commit` when you want to keep per-run integration commits.
