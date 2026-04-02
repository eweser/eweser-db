# Quality Gates Matrix — EweserDB Monorepo

## Overview

This matrix defines the quality gates (lint, format, type-check, unit, e2e) required for each active workspace. Gates are categorized as:

- **Fail**: Blocks merge; must pass before PR approval.
- **Warn**: Visible but non-blocking; encourages fix before merge.
- **Optional**: Future target; enabled for selected packages first.

All gates run on PR via CI; developers can run locally before push via `npm run check`.

---

## Gate Definitions

| Gate           | Command                | Scope                        | Purpose                                   |
| -------------- | ---------------------- | ---------------------------- | ----------------------------------------- |
| **lint**       | `npm run lint`         | All `.ts/.tsx/.js/.jsx`      | Catch bugs, style issues, unused code     |
| **format**     | `npm run format:check` | All source files             | Ensure code formatting consistency        |
| **type-check** | `npm run type-check`   | All `.ts/.tsx`               | Catch type errors, null safety violations |
| **unit-test**  | `npm run test`         | Package unit tests           | Validate logic and prevent regressions    |
| **e2e-test**   | `npm run test:e2e`     | Full integration (root only) | Validate user workflows end-to-end        |

---

## Workspace Matrix

### Core SDK: `packages/db`

| Gate           | Current       | Phase 1 | Phase 2 | Phase 3 | Notes                              |
| -------------- | ------------- | ------- | ------- | ------- | ---------------------------------- |
| **lint**       | warn          | error   | error   | error   | Strict TS + bug-catching rules     |
| **format**     | warn          | check   | check   | check   | Prettier consistency               |
| **type-check** | script exists | error   | error   | error   | Already strict: true               |
| **unit-test**  | passes        | error   | error   | error   | Existing coverage to maintain      |
| **e2e-test**   | n/a           | n/a     | n/a     | n/a     | Covered by example app integration |

**Strictness Timeline**:

- **Phase 1** (Week 1): Promote lint to error; add format:check to CI.
- **Phase 2** (Week 2): Add type-check gate; fix any TS issues.
- **Phase 3** (Week 3+): Maintain as quality floor.

**Phase 1 Fixes Needed**:

- Scan for unused vars, console.log, etc. → fix or suppress.
- Add any missing TS strict options (noUncheckedIndexedAccess, etc.).

---

### Shared Types: `packages/shared`

| Gate           | Current       | Phase 1 | Phase 2 | Phase 3 | Notes                           |
| -------------- | ------------- | ------- | ------- | ------- | ------------------------------- |
| **lint**       | warn/missing  | error   | error   | error   | No explicit lint script; add it |
| **format**     | warn          | check   | check   | check   | Prettier consistency            |
| **type-check** | script exists | error   | error   | error   | Already strict: true            |
| **unit-test**  | passes        | error   | error   | error   | Existing coverage to maintain   |
| **e2e-test**   | n/a           | n/a     | n/a     | n/a     | No app-level testing needed     |

**Strictness Timeline**:

- **Phase 1** (Week 1): Add `lint` script; promote to error; add format:check to CI.
- **Phase 2** (Week 2): Add type-check gate.
- **Phase 3** (Week 3+): Maintain as quality floor.

**Phase 1 Fixes Needed**:

- Add `lint` script to package.json.
- Fix unused vars, style issues.
- Verify TS strict options.

---

### Auth Backend (Hono): `packages/auth-server-hono`

| Gate           | Current         | Phase 1 | Phase 2 | Phase 3 | Notes                                   |
| -------------- | --------------- | ------- | ------- | ------- | --------------------------------------- |
| **lint**       | missing         | error   | error   | error   | No explicit lint script; requires setup |
| **format**     | warn            | check   | check   | check   | Prettier consistency                    |
| **type-check** | script exists   | error   | error   | error   | Already strict: true                    |
| **unit-test**  | passes (vitest) | error   | error   | error   | Existing tests to maintain              |
| **e2e-test**   | n/a             | n/a     | n/a     | n/a     | Covered by app integration test         |

**Strictness Timeline**:

- **Phase 1** (Week 1): Add `lint` script; promote to error; add format:check to CI.
- **Phase 2** (Week 2): Add type-check gate; expand unit test coverage if gaps exist.
- **Phase 3** (Week 3+): Maintain as quality floor.

**Phase 1 Fixes Needed**:

- Add `lint` script to package.json.
- Ensure lint config is applied.
- Fix any lint issues.

---

### Sync Server: `packages/sync-server`

| Gate           | Current       | Phase 1  | Phase 2 | Phase 3 | Notes                                |
| -------------- | ------------- | -------- | ------- | ------- | ------------------------------------ |
| **lint**       | missing       | warn     | error   | error   | No explicit lint script; new package |
| **format**     | missing       | warn     | check   | check   | Early-stage package                  |
| **type-check** | script exists | error    | error   | error   | Already strict: true                 |
| **unit-test**  | missing       | optional | warn    | error   | No tests yet; expand incrementally   |
| **e2e-test**   | n/a           | n/a      | n/a     | n/a     | Covered by sync integration test     |

**Strictness Timeline**:

- **Phase 1** (Week 1): Add `lint` and `format:check` as warn; add `type-check` gate to error.
- **Phase 2** (Week 2): Promote lint to error; add initial unit tests.
- **Phase 3** (Week 3+): Require unit test coverage.

**Phase 1 Fixes Needed**:

- Add `lint` script (can share eslint-config-ts).
- Fix type-check errors.
- Create initial vitest config if needed.

---

### UI Components Library: `packages/examples-components`

| Gate           | Current       | Phase 1  | Phase 2 | Phase 3 | Notes                             |
| -------------- | ------------- | -------- | ------- | ------- | --------------------------------- |
| **lint**       | missing       | warn     | error   | error   | No explicit lint script           |
| **format**     | warn          | check    | check   | check   | Prettier consistency              |
| **type-check** | script exists | error    | error   | error   | Already strict: true              |
| **unit-test**  | missing       | optional | warn    | error   | No tests yet; add selectively     |
| **e2e-test**   | n/a           | n/a      | n/a     | n/a     | Covered by ewe-note/example-basic |

**Strictness Timeline**:

- **Phase 1** (Week 1): Add `lint` as warn; add format:check; gate type-check to error.
- **Phase 2** (Week 2): Promote lint to error; add test script and initial tests.
- **Phase 3** (Week 3+): Require test coverage.

**Phase 1 Fixes Needed**:

- Add `lint` script to package.json.
- Fix type-check errors.

---

### App: `packages/ewe-note`

| Gate           | Current          | Phase 1  | Phase 2  | Phase 3  | Notes                              |
| -------------- | ---------------- | -------- | -------- | -------- | ---------------------------------- |
| **lint**       | error            | error    | error    | error    | Already strict; maintain           |
| **format**     | warn             | check    | check    | check    | Prettier consistency               |
| **type-check** | error (tsconfig) | error    | error    | error    | Already noUnusedLocals, etc.       |
| **unit-test**  | missing          | optional | optional | warn     | App-level unit testing optional    |
| **e2e-test**   | partial          | optional | optional | optional | UI testing not prioritized Phase 1 |

**Strictness Timeline**:

- **Phase 1** (Week 1): Add format:check gate; maintain lint + type-check.
- **Phase 2** (Week 2+): Consider snapshot or component integration tests if high-value.

**Phase 1 Fixes Needed**:

- Verify format:check passes.
- Keep lint and type-check as-is.

---

### Auth Server (Next.js, Migrating Away): `packages/auth-server`

| Gate           | Current           | Phase 1  | Phase 2  | Phase 3  | Notes                             |
| -------------- | ----------------- | -------- | -------- | -------- | --------------------------------- |
| **lint**       | warn              | warn     | warn     | warn     | Migrating away; keep non-blocking |
| **format**     | warn              | check    | check    | check    | Prettier consistency              |
| **type-check** | error (next lint) | error    | error    | error    | Next.js built-in                  |
| **unit-test**  | missing           | optional | optional | optional | Will be replaced by Hono          |
| **e2e-test**   | covered           | covered  | covered  | covered  | By ewe-note and example-basic     |

**Strictness Timeline**:

- **Phase 1** (Week 1): Add format:check gate only; keep lint as warn due to migration.
- **Phase 2+**: Once Hono-based auth is fully active, migrate to stricter policy.

**Rationale**: Next.js auth-server is being migrated to Hono. Over-strict enforcement now would add churn and risk to ongoing work. Keep gates minimal to unblock migration; tighten once new auth backend is stable.

---

### Example App: `examples/example-basic`

| Gate           | Current          | Phase 1  | Phase 2  | Phase 3  | Notes                         |
| -------------- | ---------------- | -------- | -------- | -------- | ----------------------------- |
| **lint**       | error            | error    | error    | error    | Already strict; maintain      |
| **format**     | warn             | check    | check    | check    | Prettier consistency          |
| **type-check** | error (tsconfig) | error    | error    | error    | Already strict: true          |
| **unit-test**  | missing          | optional | optional | optional | Demo app; unit tests optional |
| **e2e-test**   | covered          | covered  | covered  | covered  | By `npm run test:e2e`         |

**Strictness Timeline**:

- **Phase 1** (Week 1): Add format:check gate; maintain lint + type-check.
- **Phase 2+**: Maintain as-is.

**Phase 1 Fixes Needed**:

- Verify format:check passes.
- Keep lint and type-check as-is.

---

## Summary: Phase 1 (First Two Weeks)

### CI Gates Required

All PRs must pass:

1. Lint (error) — `npm run lint`
2. Format Check (error) — `npm run format:check`
3. Type-Check (error) — `npm run type-check`
4. Unit Tests (error where tests exist) — `npm run test`

### Workspace-by-Workspace Rollout

- **Core + Critical** (Week 1): `db`, `shared`, `auth-server-hono`, `sync-server` + example-basic.
- **Secondary** (Week 2): `ewe-note`, `examples-components`.
- **Migration Exemption**: `auth-server` keeps lint as warn until Hono cutover.

### Implementation Checklist

- [ ] Root `package.json`: Add `check` script (lint + format:check + type-check + test).
- [ ] Root `.prettierrc.json`: Create standardized prettier config.
- [ ] Shared ESLint configs: Tighten rules (ban ts-comment, promote unused vars, demote console warn).
- [ ] Workspace scripts: Add missing `lint`, `format`, `type-check` scripts.
- [ ] CI workflows: Repair `.github/workflows/pre-deploy.yaml` to run real commands.
- [ ] Package fixes: Fix obvious lint/type-check failures before gates activate.

---

## Timeline & Ownership

| Phase | Duration | Focus                                                         | Owner                      |
| ----- | -------- | ------------------------------------------------------------- | -------------------------- |
| **1** | Week 1–2 | Lint, format, type-check gates + workspace script unification | 02-coder (Runs 1–3)        |
| **2** | Week 3–4 | TS strictness options + test coverage baseline                | 02-coder (Runs 4–6)        |
| **3** | Week 5+  | Pre-commit hooks + optional automation                        | 02-coder (Run 7, optional) |

---

## Notes for Agents

### For `02-coder` (Smart):

- Order of operations matters: Prettier config + shared ESLint configs must land before package-level fixes.
- Watch out for: `auth-server` (Next.js) needs special handling during migration.
- Test locally before CI: `npm run check` should be the single source of truth.

### For `03-quality-assurance`:

- Verify: Each workspace can run its required gates without errors.
- Validate: CI workflows execute the intended commands (no typos, no missing scripts).
- Sign off: All Phase 1 packages pass all Phase 1 gates before proceeding to Phase 2.

### For Humans (Reviewers):

- Expect: Large first wave of formatting and lint-fix commits in PR Run 2–3.
- Watch: `auth-server` exemption — confirm it's not masking real issues.
- Iterate: If a gate is too strict, we'll add exemptions and revisit in Phase 2.
