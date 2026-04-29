## Goal

Build a supervised EweserDB coding-run orchestrator so a single command can execute an approved multi-run plan from `docs/ai/plans/`, coordinate independent coding runs, then hand the completed branch to Eweser QA and Eweser Review.

The target workflow is:

1. Planner writes one explicit plan with run boundaries and dependency metadata.
2. Orchestrator validates the plan, repo state, tools, and branch/worktree setup.
3. Orchestrator runs independent coding runs in parallel where safe and sequentially where required.
4. Orchestrator records state, logs, blockers, changed files, verification commands, and merge/integration status.
5. Orchestrator runs final QA and review agents after coding integration completes.
6. Human gets one high-signal report with blockers, verification, changed files, residual risks, and next decisions.

## Scope (In / Out)

In:

- A repo-local CLI command, likely under `scripts/codex/`, for orchestrating plan runs.
- A plan metadata format that lets the orchestrator understand run IDs, dependencies, write scopes, agent strength, tests, and whether a run can parallelize.
- Isolated worker execution using separate git worktrees or branches for mutating coding runs.
- A state directory with machine-readable run status plus plain-text monitor output.
- Stop/resume behavior that handles child Codex processes and stale state markers.
- Final QA and Review stages that call the existing `$eweser-qa` and `$eweser-review` skill prompts after all coding runs are integrated.

Out:

- Unsupervised direct pushes to `main`.
- Automatically resolving semantic merge conflicts without reporting them.
- Parallel edits to overlapping files or package boundaries.
- Replacing the planner, coder, QA, or review skills. The orchestrator should coordinate those roles, not blur them.
- Running production-affecting commands or secret-bearing setup without explicit approval.

## Assumptions / Questions

- Assumption: plans remain Markdown because the current planner workflow writes Markdown and the plans directory is already the source of truth.
- Assumption: the orchestrator can require a small structured YAML block inside each plan. Pure free-form Markdown is too ambiguous for safe parallel execution.
- Assumption: mutating runs should execute in separate git worktrees and integrate back into the main feature branch one run at a time.
- Assumption: QA and Review should run after integration, not independently against each worker branch, unless a run explicitly requests a local verification sidecar.
- Question: should the orchestrator use `codex exec` only, or should it support multiple runtimes later? Start with Codex only unless there is a real second runtime need.

## Recommendation

Yes, build it, but do not make it a "run everything in parallel" tool.

The useful abstraction is a supervised plan executor:

- Parallelize only runs with disjoint write scopes and no dependency edge.
- Serialize runs that touch shared contracts, migrations, auth boundaries, package exports, plan docs, or the same files.
- Treat integration as a first-class stage, not a shell afterthought.
- Make stop/resume and monitor output mandatory from the first version.

The main risk is false confidence. A multi-agent run can create a bigger mess than one agent if it edits overlapping modules, runs stale tests in worker branches, or hides failed assumptions under a large final diff. The orchestrator needs conservative defaults and explicit run metadata.

## Plan Metadata Shape

Add an optional structured block to large implementation plans:

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
```

The Markdown run sections remain readable for humans. The YAML block gives the orchestrator enough structure to be strict.

## Model Routing

Use this split:

- Main supervising chat: `gpt-5.5`.
- Coding runs, QA, and review: `gpt-5.4`.
- Simple support tasks, dry-run style checks, and lightweight read-only helpers: `gpt-5.4-mini`.

The orchestrator should pass explicit `--model` values. It should not let coding workers inherit the main chat's `gpt-5.5` model by accident.

## Runs

### Run 1: Define the Orchestration Contract

- Recommended Agent: planner/coder
- Steps:
  - Add a documented plan metadata schema for orchestrated runs.
  - Define allowed `agent`, `model`, `parallel`, `dependsOn`, `writeScope`, `tests`, and `changeset` fields.
  - Define model aliases: `coding` and `strong` map to `gpt-5.4`; `simple`, `fast`, and `mini` map to `gpt-5.4-mini`.
  - Add validation rules:
    - every run has a unique ID
    - dependency IDs exist
    - parallel runs must have disjoint write scopes
    - writes to `packages/shared`, migrations, root config, package exports, lockfiles, and docs indexes force conservative serialization unless explicitly overridden
    - final QA/review stages require all coding runs to be integrated
- Files:
  - `docs/ai/plans/README.md`
  - new docs under `docs/ai/` or `scripts/codex/README.md`
- Tests:
  - Documentation review only for this run.

### Run 2: Build the Orchestrator CLI Skeleton

- Recommended Agent: coder
- Steps:
  - Add `scripts/codex/eweser-plan-orchestrator.sh` as the user-facing command.
  - Add `scripts/codex/eweser-plan-monitor.sh` for status snapshots and watch mode.
  - Add a state layout:
    - `.codex/orchestrator/<plan-slug>/state/*.state`
    - `.codex/orchestrator/<plan-slug>/logs/*.log`
    - `.codex/orchestrator/<plan-slug>/reports/*.md`
  - Keep `.codex/` local-only and untracked.
  - Preflight:
    - confirm repo root
    - check `git status --short`
    - verify `codex`, `git`, `jq`, and Node runtime
    - parse and validate the plan
    - refuse to start if another orchestrator is active for the same plan
- Files:
  - `scripts/codex/eweser-plan-orchestrator.sh`
  - `scripts/codex/eweser-plan-monitor.sh`
  - optional helper under `scripts/codex/lib/`
- Tests:
  - Run the parser/validator against one fixture plan.
  - Run monitor on empty state.

### Run 3: Add Worker Execution and Isolation

- Recommended Agent: coder
- Steps:
  - Create one worktree per coding run from the chosen base branch or integration branch.
  - Run `codex exec` with the `$eweser-code` prompt, the exact plan path, run ID, write scope, tests, and "do not revert unrelated changes" instruction.
  - Log stdout/stderr per run.
  - Record started/finished/blocked status.
  - Mark runs blocked on non-zero exit, dirty conflict state, scope violations, or missing test evidence.
  - Implement `--max-parallel`, `--run <id>`, `--sequential`, `--dry-run`, and `--resume`.
- Files:
  - `scripts/codex/eweser-plan-orchestrator.sh`
  - `scripts/codex/lib/*`
- Tests:
  - Dry-run a fixture plan.
  - Run one read-only/no-op fixture worker if practical.

### Run 4: Add Integration Stage

- Recommended Agent: coder
- Steps:
  - Integrate completed worker branches into the main feature branch in dependency order.
  - Detect conflicts and stop with exact paths and worker branch names.
  - Run per-run tests after merge when listed.
  - Update the plan Execution Summary with completed run status, commands, and blockers.
  - Keep commit creation optional. Default to leaving a working tree diff for review unless a `--commit` flag is passed.
- Files:
  - `scripts/codex/eweser-plan-orchestrator.sh`
  - `docs/ai/plans/<active-plan>.md` during actual feature runs
- Tests:
  - Fixture branches with non-overlapping changes.
  - Fixture conflict case.

### Run 5: Add QA and Review Final Stages

- Recommended Agent: coder
- Steps:
  - After all coding runs integrate, call Codex QA with `$eweser-qa` context.
  - Then call Codex Review with `$eweser-review` context.
  - Run QA and Review with `gpt-5.4`.
  - Store reports under the orchestrator report directory.
  - Fail the orchestrator if QA returns FAIL or review reports P1/P2 findings.
  - Print the exact follow-up command to resume from failed QA/review after fixes.
- Files:
  - `scripts/codex/eweser-plan-orchestrator.sh`
  - report templates under `scripts/codex/` if useful
- Tests:
  - Dry-run QA/review prompt generation.
  - Manual smoke against a small docs-only fixture branch.

### Run 6: Add Operational Hardening

- Recommended Agent: coder/qa
- Steps:
  - Add process scanning for active orchestrator and child Codex processes.
  - Add `--stop <plan>` or a documented stop command that kills the full process tree and marks in-progress stages interrupted.
  - Make Bash 3.2 compatible if using Bash, or use a small Node CLI to avoid shell portability issues.
  - Add stale state detection in the monitor.
  - Add state/log cleanup guidance.
- Files:
  - `scripts/codex/eweser-plan-orchestrator.sh`
  - `scripts/codex/eweser-plan-monitor.sh`
  - docs
- Tests:
  - Start/stop smoke.
  - Stale state marker smoke.

## Suggested Command UX

```bash
scripts/codex/eweser-plan-orchestrator.sh docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md --dry-run
scripts/codex/eweser-plan-orchestrator.sh docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md --max-parallel 2
scripts/codex/eweser-plan-monitor.sh docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md
scripts/codex/eweser-plan-monitor.sh docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md --watch --interval 60
scripts/codex/eweser-plan-orchestrator.sh docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md --resume
scripts/codex/eweser-plan-orchestrator.sh docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md --stop
```

## Risks

- Parallel workers can create incompatible assumptions even with disjoint file paths. Mitigation: use dependency edges and conservative serialization around shared contracts.
- Multiple worktrees increase local state complexity. Mitigation: central monitor, explicit cleanup, and branch naming conventions.
- Plan parsing can become brittle if the plan format stays too loose. Mitigation: require a structured YAML block for orchestrated plans.
- QA/review agents can duplicate work or disagree. Mitigation: QA is verification/reporting; Review is findings-first code review. Keep outputs separate.
- Long-running agents can survive interruption. Mitigation: process-tree stop flow and stale state detection are v1 requirements.

## Execution Summary

Implemented v1 on 2026-04-29.

- Added `scripts/codex/eweser-plan-orchestrator.sh` and `scripts/codex/eweser-plan-monitor.sh` as stable user-facing commands.
- Added the Node implementation in `scripts/codex/lib/eweser-plan-orchestrator.mjs` to avoid Bash 3.2 portability issues while preserving shell entrypoints.
- Added `scripts/codex/README.md` with the marked orchestration metadata contract, validation rules, state layout, stop/resume notes, and command UX.
- Added `scripts/codex/fixtures/orchestrated-plan.fixture.md` for parser, dry-run, and monitor smoke coverage.
- Implemented validation for unique run IDs, dependency existence/cycles, supported agents/models, required write scopes, conservative serialization paths, parallel write-scope overlap, and final-stage names.
- Implemented explicit model routing: `coding`/`strong` worker runs use `gpt-5.4`, `simple`/`fast`/`mini` worker runs use `gpt-5.4-mini`, and final QA/review stages use `gpt-5.4`. The supervising chat can stay on `gpt-5.5` without leaking that model into worker execution.
- Implemented dry-run, `--run`, `--max-parallel`, `--sequential`, `--resume`, `--stop`, `--allow-dirty`, and `--commit` flags.
- Implemented local state/log/report layout under `.codex/orchestrator/<plan-slug>/`.
- Implemented worker worktree creation, `codex exec` worker prompts with `$eweser-code`, per-run logging, status files, changed-file scope checks, dependency scheduling, and blocked-state recording.
- Implemented integration through worker branch squash merges, per-run test reruns, conflict recording, optional per-run commits, and final QA/review `codex exec` handoff using `$eweser-qa` and `$eweser-review`.
- Implemented stop handling that reads the active marker, kills the process tree, removes the marker, and marks in-progress state files as interrupted.
- Verification run:
  - `node --check scripts/codex/lib/eweser-plan-orchestrator.mjs`
  - `scripts/codex/eweser-plan-orchestrator.sh scripts/codex/fixtures/orchestrated-plan.fixture.md --dry-run`
  - `scripts/codex/eweser-plan-monitor.sh scripts/codex/fixtures/orchestrated-plan.fixture.md`
  - `npx eslint scripts/codex/lib/eweser-plan-orchestrator.mjs`
  - `npx prettier --check scripts/codex/lib/eweser-plan-orchestrator.mjs scripts/codex/fixtures/orchestrated-plan.fixture.md scripts/codex/README.md docs/ai/plans/2026-04-29-large-coding-run-orchestrator.md`

Known v1 constraints:

- Orchestrated plans must mark the executable YAML block with `<!-- eweser-orchestration -->`; unmarked example YAML blocks are ignored to avoid accidentally running documentation examples.
- Mutating runs refuse dirty integration branches by default. Use `--allow-dirty` only after checking the current diff.
- The metadata parser intentionally supports the simple YAML subset used by the contract, not arbitrary YAML.
- Full end-to-end worker execution was not run against a real coding plan in this implementation session; only parser, dry-run, monitor, lint, syntax, and formatting smoke checks were run.
