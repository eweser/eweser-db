# Draft Plan: AI Memory Launch Readiness

## Goal

Perform QA, legal, security, privacy, and launch-readiness review after the main
memory strategy feature and any approved advanced memory plans are implemented.

## Scope

- In: permissions/audit review, secret leakage checks, hosted/self-host copy,
  attribution/NOTICE obligations, privacy/terms updates, manual testing, and
  final verification.
- Out: new feature implementation except focused fixes found during QA and
  approved inside the expanded launch plan.

## Assumptions / Open Questions

- Assumption: this plan runs after the user has manually tested the main memory
  feature.
- Open question: which advanced processors, if any, are included in the launch
  target?
- Open question: does paid hosted memory require updated privacy/terms language
  before launch?

## Runs

Run order: sequential. Expand this draft before coding if QA, legal/privacy,
and documentation updates need separate runs.

### Run 1: QA And Compliance Review

- **Id**: `run-1`
- **Title**: `QA And Compliance Review`
- **Deliverable**: Launch readiness report with pass/fail status, remaining
  risks, legal/privacy/doc updates, and manual test evidence.
- **Files**:
  - `docs/ai/plans/2026-04-28-compliance-and-legal.md`: update if memory
    changes compliance posture.
  - `docs/security/*`: add or update memory security notes.
  - Package READMEs: update user-facing setup and privacy behavior.
- **Steps**:
  - [ ] Review every memory read/write path for auth, scopes, and auditability.
  - [ ] Verify ordinary memory does not intentionally store secrets.
  - [ ] Verify hosted/self-host docs and product copy match implementation.
  - [ ] Verify attribution/NOTICE obligations for any bundled processors.
  - [ ] Run relevant app, auth-server, MCP, shared, e2e, and root checks.
- **Tests**:
  - `npm test --workspace @eweser/mcp`
  - `npm test --workspace @eweser/shared`
  - Auth-server tests.
  - App tests.
  - `npm run check`
  - Cypress tests if auth/sync/user workflow surfaces changed.
- **Verification**:
  - Launch checklist passes or documents remaining risk.
- **Manual test handoff**:
  - Record the complete end-to-end user flow, browser/API/MCP commands,
    screenshots or evidence paths, expected results, remaining risks, and which
    checks a release decision depends on.
- **Dependencies**: main memory strategy plan and any approved advanced memory
  plans completed.
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop if legal obligations, privacy terms, telemetry behavior, permissions, or
secret-handling risks are unresolved.

## Approval Boundary

This draft is not approved for coding. Expand it when the launch target is
known.

## Execution Summary

| Run     | Status | Files Changed | Verification | Notes |
| ------- | ------ | ------------- | ------------ | ----- |
| `run-1` | Draft  |               |              |       |

## Self-Reflection / Instruction Improvements

- None yet.
