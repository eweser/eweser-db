# Plan: Go-Live Security Hardening Closure

## Goal

Close the remaining launch-blocking security gaps identified in the latest review so the branch can move from FAIL to PASS for go-live readiness.

## Scope

- In:
  - Wire production email delivery for reset and verification flows in auth server
  - Remove reset-path mismatch so hardening applies to the actual UI flow
  - Raise secret minimum length enforcement to match checklist policy
  - Expand automated E2E smoke to cover auth-critical paths
  - Add operational evidence and checklist updates for backup/restore and alert routing
- Out:
  - New auth product features (passkeys, additional MFA UX, admin tooling)
  - Broad architecture changes to MCP session storage
  - Non-security UI redesign work

## Current State

- Completed and verified:
  - Build, typecheck, and tests are green
  - Core auth/MCP hardening is in place (rate limits, verified-email gate, cookie policy, security events, OAuth PKCE, CI scans)
- Remaining blockers from latest review:
  - `sendResetPassword` and `sendVerificationEmail` are stubs only
  - UI calls `/forget-password` while route hardening is wrapped around `/request-password-reset`
  - Auth security smoke is not part of automated smoke run
  - Secret validation still allows 16 chars where checklist requires 32+
  - No recorded backup/restore drill evidence and no explicit alert route definition

## Runs

### Run 1: Email Delivery + Reset Endpoint Canonicalization ✅ COMPLETE

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Changes span better-auth callbacks, env contracts, and route hardening; a mistake can break account recovery in production.
- [x] Replace email sender stubs with real provider integration in auth callbacks
- [x] Add provider env validation and example env docs
- [x] Canonicalize reset request path so UI and server hardening use the same endpoint
- [x] Ensure CAPTCHA and rate limiting apply to the canonical path
- [x] Files:
  - `packages/auth-server-hono/src/auth.ts` — imports `sendPasswordResetEmail`/`sendVerificationEmail` from `email.ts`
  - `packages/auth-server-hono/src/email.ts` — full Resend integration with HTML escaping
  - `packages/auth-server-hono/src/routes/auth.ts` — both `/forget-password` and `/request-password-reset` rate-limited; `/forget-password` rewritten to `/request-password-reset` before `auth.handler`
  - `packages/auth-server-hono/src/env.ts` — `secretSchema = z.string().min(32)`, production email-provider enforcement
  - `packages/auth-server-hono/example.env` — Resend config documented
- [x] Tests (104 passing):
  - `src/email.test.ts` — NEW: unit tests for Resend delivery, HTML escaping, error handling
  - `src/routes/auth.test.ts` — rewrite test fixed: `/forget-password` → `/request-password-reset` verified; rate-limit and non-enumerating response tests
  - `src/auth.test.ts` — email callbacks via mocked fetch; CAPTCHA on both paths
  - `src/env.test.ts` — 32-char secret policy, production email provider required

### Run 2: Secret Policy + Smoke E2E Coverage

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Mostly targeted policy and test harness updates; low algorithmic complexity.
- [x] Raise secret minimum length validation from 16 to 32 for launch-critical secrets
- [x] Update tests and examples to match new policy
- [x] Include auth-security smoke spec in automated smoke command
- [x] Keep smoke suite deterministic via env-gated URL strategy that still runs in CI
- [ ] Files:
  - `packages/auth-server-hono/src/env.ts`
  - `packages/auth-server-hono/src/env.test.ts` (or equivalent)
  - `scripts/run-e2e-smoke.mjs`
  - `e2e/cypress/tests/auth-security-smoke.cy.ts`
  - CI workflow file that calls smoke tests (if required)
- [ ] Tests:
  - Env validation tests for 31 vs 32 char boundaries
  - Cypress smoke pass for auth-security spec in automated path

### Run 3: Ops Evidence + Checklist Completion

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Documentation and operational wiring with clear acceptance outputs.
- [x] Add explicit alert route/runbook entry for auth abuse spikes and MCP auth failure surges
- [x] Record backup/restore drill evidence in docs with command output artifacts and date
- [x] Update go-live checklist to map each blocker to a verified artifact
- [ ] Files:
  - `docs/security-go-live-checklist.md`
  - `docs/security-incident-response.md`
  - `docs/deployment/digital-ocean.md` (or dedicated ops evidence doc)
  - optional artifact file in `docs/ai/research/` or `storage_*.json`
- [ ] Tests:
  - Documentation verification checklist (manual)
  - Final `npm run build`, `npm test`, `npm run test:e2e` confirmation snapshot

### Run 4: Final Go/No-Go Security Verification

- **Recommended Agent**: `03-qa` (Smart)
- **Reason**: Independent verification should be strict and evidence-driven before launch.
- [ ] Re-run full validation gates after Runs 1-3
- [ ] Re-execute checklist audit and produce PASS/FAIL with file-level evidence
- [ ] Confirm no regressions in auth, MCP, OAuth, and CI security checks
- [ ] Files:
  - No code changes expected; review report in `docs/ai/research/` if needed
- [ ] Tests:
  - `npm test`
  - `npx tsc --noEmit`
  - `npm run build`
  - `npm run test:e2e`

## Risks

- Email provider integration may introduce deliverability or templating issues that do not appear in unit tests.
- Endpoint canonicalization can break existing clients if aliases are removed without compatibility handling.
- E2E auth smoke can be flaky if environment bootstrapping is not deterministic.
- Operational checklist items may be marked complete without durable evidence artifacts unless explicitly required.

## Execution Summary

```text
Run 1: Email Delivery + Reset Endpoint Canonicalization (Smart)
├── Run 2: Secret Policy + Smoke E2E Coverage (Fast) [Can run in parallel once Run 1 endpoint decision is fixed]
└── Run 3: Ops Evidence + Checklist Completion (Fast) [Can run in parallel with Run 2]
    └── Run 4: Final Go/No-Go Security Verification (Smart)
```

## Status

- [ ] Approved by user
