# Plan: Lint, Format, and Test Hardening for Agent-Generated Code

## Goal

Establish strict, useful, and consistently enforced linting, formatting, type-check, and test gates across the monorepo so low-quality or risky agent-generated code cannot merge.

## Scope

- In: ESLint rule tightening, Prettier standardization, workspace script normalization, CI quality gates, and test baseline hardening for active packages.
- In: Active packages and apps in `packages/*` and `examples/example-basic`.
- Out: Legacy `old-code/**` modernization and large-scale test rewrites.
- Out: Product feature changes unrelated to quality gates.

## Runs

### Run 1: Baseline and Gate Design

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Requires cross-workspace policy design to avoid breaking migration work while still increasing strictness.
- [ ] Create a single quality gate matrix (lint, type-check, unit, e2e) for each active workspace.
- [ ] Define rollout levels: fail now vs warn now, including temporary exemptions.
- [ ] Files: `docs/ai/quality-gates-matrix.md` (new), `README.md`, `LOCAL_DEVELOPMENT.md`.
- [ ] Tests: None (documentation and policy definition only).

### Run 2: Lint and Format Foundation

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Shared config changes affect multiple packages and can cause high churn if not scoped correctly.
- [ ] Tighten `@eweser/eslint-config-ts` and `@eweser/eslint-config-react-ts` to prioritize bug-catching rules.
- [ ] Promote key rules from warning to error (for active code) and add focused exceptions only where justified.
- [ ] Add a root Prettier config and ignore file; keep ESLint+Prettier behavior consistent.
- [ ] Add root scripts: `lint`, `lint:fix`, `format`, `format:check`.
- [ ] Files: `packages/eslint-config-ts/index.js`, `packages/eslint-config-react-ts/index.js`, `.prettierrc.json` (new), `.prettierignore` (new), root `package.json`.
- [ ] Tests: Run `npm run lint` and `npm run format:check`.

### Run 3: Workspace Script Normalization

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Mostly repetitive package.json updates with low architectural complexity.
- [ ] Add missing scripts in active workspaces: `lint`, `type-check`, and `test` where absent.
- [ ] Ensure workspace commands can be orchestrated from root without ad-hoc cd chaining.
- [ ] Add a root `check` script that runs lint, format check, type-check, and tests in deterministic order.
- [ ] Files: root `package.json`, `packages/shared/package.json`, `packages/examples-components/package.json`, `packages/sync-server/package.json`, `packages/auth-server-hono/package.json`, `examples/example-basic/package.json`, `packages/ewe-note/package.json`, `packages/auth-server/package.json`.
- [ ] Tests: Execute root `npm run check` and resolve script failures.

### Run 4: TypeScript Strictness Hardening (Incremental)

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Strict compiler options can uncover real bugs but require targeted fixes to avoid large regressions.
- [ ] Add high-value strict options in active packages, initially where risk is lowest.
- [ ] Start with: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` (where class-heavy), and consistent `useUnknownInCatchVariables` behavior.
- [ ] Keep `noUnusedLocals` and `noUnusedParameters` aligned with lint strategy to avoid duplicate noise.
- [ ] Files: package tsconfig files under `packages/*` and `examples/example-basic` as needed.
- [ ] Tests: Per-package `type-check` and root `npm run check`.

### Run 5: CI Enforcement Repair and Tightening

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Current workflows appear misaligned with repository scripts and need careful correction to avoid blocking all PRs.
- [ ] Replace or repair pre-deploy checks to run real, existing commands.
- [ ] Add a dedicated quality workflow for PRs with required checks:
  - lint
  - format check
  - type-check
  - unit tests
  - targeted e2e gate (can be separate job with clear prerequisites)
- [ ] Ensure no references to non-existent scripts/paths.
- [ ] Files: `.github/workflows/pre-deploy.yaml` (or replacement), `.github/workflows/quality.yaml` (new), optionally root `package.json`.
- [ ] Tests: Validate workflow locally where feasible and via PR dry-run.

### Run 6: Test Strategy Tightening for Agent Era

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Needs policy plus selective test additions in critical areas instead of broad brittle coverage targets.
- [ ] Define minimum test expectations per package (core sdk, shared, auth-server-hono, sync-server).
- [ ] Add/expand test scripts for packages with no current tests (`sync-server`, examples-components if needed).
- [ ] Introduce Vitest coverage reporting and conservative floor thresholds for core libraries first.
- [ ] Files: `packages/*/package.json`, Vitest config files as needed (`vitest.config.ts`), `README.md` or `LOCAL_DEVELOPMENT.md`.
- [ ] Tests: `npm test`, package-level tests, coverage report generation.

### Run 7: Optional Pre-Commit Fast Feedback

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Operational quality-of-life setup, independent from core CI enforcement.
- [ ] Add lightweight pre-commit checks (lint-staged + formatter + targeted lint on changed files).
- [ ] Keep pre-commit runtime short to avoid bypass behavior.
- [ ] Files: `.husky/*` (new), `.lintstagedrc.json` (new), root `package.json`.
- [ ] Tests: Simulate staged-file commit flow locally.

## Risks

- Existing code may violate newly elevated error-level rules, causing a large first cleanup wave.
- Strict TypeScript options can surface many legacy nullability/index issues.
- Workflow changes can block PRs if command names are not synchronized first.
- Next.js auth-server is in migration; strictness must not over-couple to soon-to-be-removed framework patterns.

## Execution Summary

```text
Run 1: Baseline and Gate Design (Smart)
└── Run 2: Lint and Format Foundation (Smart)
    ├── Run 3: Workspace Script Normalization (Fast) [Parallel with Run 4 after core policy in Run 2 is stable]
    ├── Run 4: TypeScript Strictness Hardening (Smart) [Parallel with Run 3]
    └── Run 5: CI Enforcement Repair and Tightening (Smart) [Depends on Runs 2-4]
        ├── Run 6: Test Strategy Tightening for Agent Era (Smart) [Parallel with Run 7]
        └── Run 7: Optional Pre-Commit Fast Feedback (Fast) [Parallel with Run 6]
```

## Status

- [ ] Approved by user
