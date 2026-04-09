# ADR-0008: Testing Strategy — Examples + DB + Auth

**Status:** Implemented  
**Date:** 2026-04-03

## Context

Migration complete. Need high-confidence test strategy for the new stack (example-basic, packages/db, auth-server-hono, auth-pages).

## Decision

### Coverage Matrix

| Journey                           | Layer       | Test Type |
| --------------------------------- | ----------- | --------- |
| First-time user flow              | E2E         | Cypress   |
| Returning user with valid session | E2E         | Cypress   |
| Local-first editing               | Integration | Vitest    |
| Multi-room usage                  | Integration | Vitest    |
| Sharing and invite acceptance     | E2E         | Cypress   |
| Auth failure guardrails           | Unit        | Vitest    |
| DB SDK core behavior              | Unit        | Vitest    |
| Auth API contract                 | Unit        | Vitest    |

### Runs Completed

1. **Run 1**: Built test matrix → `docs/ai/testing/examples-db-auth-matrix.md`
2. **Run 2**: Auth API contract tests (all routes, negative paths)
3. **Run 3**: DB SDK integration tests against new contracts

### Test Fixtures

- Old `old-code/*.cy.js` used as behavior reference only (not run)
- Toy examples kept as teaching apps and E2E fixtures

## Consequences

- Auth server: all route-level behavior validated
- DB SDK: orchestration across local persistence + remote contracts validated
- E2E smoke: Docker backend replaces legacy auth-server dependency

## Related

- [2026-04-03-testing-plan-examples-db-auth.md](../plans/2026-04-03-testing-plan-examples-db-auth.md)
