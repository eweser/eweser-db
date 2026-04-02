# Plan: System Testing First Pass (Examples + DB + Auth)

## Goal

Define and execute a high-confidence test strategy proving that the migrated stack works for real user flows, prioritizing toy example apps plus the core db SDK and auth services.

## Scope

- In: feature inventory, user journeys, test matrix, and implementation plan for `examples/example-basic`, `packages/db`, `packages/auth-server-hono`, and `packages/auth-pages`.
- In: using old `old-code/*.cy.js` and old example apps as behavior references only.
- In: rewriting outdated toy examples where needed to keep examples as teaching apps and E2E fixtures.
- Out: `packages/ewe-note` and production-app-specific flows.
- Out: aggregator deep validation (covered in a later phase).

## Feature Inventory (Current New Stack)

1. Auth session and account bootstrap

- Email/password and OAuth sign-in/sign-up routes via Hono/better-auth.
- Session-based account bootstrap that ensures starter profile rooms exist.

2. Access-grant and permissions model

- Login query flow (redirect/domain/collections/name).
- Permission approval/deny and redirect token handoff.
- Room invite generation and acceptance.

3. DB SDK core behavior

- Token pickup from URL/storage and login orchestration.
- Registry sync with auth server.
- Local room/document operations (create/update/delete, undeleted filtering, sort by recency).
- Remote sync connection lifecycle (load room, connect/disconnect status changes).
- Room metadata actions (rename room, share link generation).

4. Example app behavior (toy app contract)

- `example-basic` note CRUD against room documents.
- Auto-room bootstrapping, room listing, room switching behavior through loaded rooms.
- Share-link modal and copy flow.
- Auth redirect round-trip and post-login data continuity.

## User Journeys To Validate

1. First-time app user

- Opens example app, gets auth redirect, signs up/in, grants permissions, returns to app, sees initialized room and can create notes.

2. Returning user

- Opens example app with valid session/token, skips permission friction where appropriate, continues editing existing notes.

3. Local-first editing

- User creates/edits/deletes notes with local IndexedDB loaded first; UI remains functional before remote sync settles.

4. Multi-room usage

- User can work across more than one room and maintain room-specific note state.

5. Sharing and invite acceptance

- User creates room invite link from example app, invitee accepts via auth flow, and invited user can access the shared room.

6. Auth failure and guardrails

- Invalid login and invalid/expired invite paths return expected UX and API errors.

## Runs

### Run 1: Build Test Matrix and Coverage Map

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Mostly documentation and mapping work with low algorithmic complexity.
- [x] Create a traceable matrix mapping features and journeys to unit/integration/E2E layers.
- [x] Define pass/fail criteria and required fixtures per journey.
- [x] Files: `docs/ai/testing/examples-db-auth-matrix.md` (new), `docs/ai/plans/2026-04-03-testing-plan-examples-db-auth.md` (status updates).
- [x] Tests: none (planning artifact).

Run 1 status: complete. Coverage matrix created at `docs/ai/testing/examples-db-auth-matrix.md`.

### Run 2: Auth API Contract and Session Flow Tests

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Route-level behavior includes auth/session boundaries, JWT grants, and redirect-sensitive flows.
- [x] Expand `packages/auth-server-hono` route tests for all core paths:
- [x] `GET /health`, `GET /ping`.
- [x] Auth proxy paths (`sign-up`, `sign-in`, `session`, OAuth callback passthrough behavior).
- [x] `GET /api/account/bootstrap` starter-room behavior and profile room expectations.
- [x] Access-grant endpoints (`sync-registry`, `permissions`, `create-room-invite`, `accept-room-invite`, `update-room/:roomId`, `refresh-sync-token/:roomId`).
- [x] Add negative-path tests: missing auth headers, invalid room ownership, malformed invite token, invalid permission payload.
- [x] Files: `packages/auth-server-hono/src/routes/*.test.ts`, and service tests under `packages/auth-server-hono/src/services/**` as needed.
- [x] Tests: `cd packages/auth-server-hono && npm test`.

Run 2 status: complete.

### Run 3: DB SDK Integration Tests Against New Contracts

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: SDK tests must validate orchestration across local persistence, token state, and remote contract assumptions.
- [x] Add/expand tests for `generateLoginUrl`, `login`, `syncRegistry`, `loadRoom`, `loadRooms`, `newRoom`, `renameRoom`, and `generateShareRoomLink` against current route contracts.
- [x] Add tests for token refresh behavior and connection status transitions.
- [x] Validate local-first behavior (room loads with IndexedDB provider before remote provider).
- [x] Files: `packages/db/src/methods/connection/*.test.ts`, `packages/db/src/index.test.ts`, and additional integration tests in `packages/db/src/**/*.test.ts`.
- [x] Tests: `cd packages/db && npm test`.

Run 3 status: complete.

Run 3 implementation notes:

- Added DB contract tests for login URL generation, login orchestration, registry sync, remote/local room loading, share-link generation, new room creation, and room rename behavior.
- Extracted rename-room logic into `packages/db/src/methods/renameRoom.ts` and wired it through `Database` for direct unit coverage.
- Verified `packages/db` tests pass after additions.

### Run 4: Rewrite Example Test Fixtures (Toy Apps)

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Requires product-shaping decisions and selective rebuild of outdated examples to align with the new db/auth stack.
- [ ] Decide minimal toy example set for teaching + regression:
- [ ] Keep `example-basic` as core notes flow.
- [ ] Recreate `multi-room` toy app on new stack.
- [ ] Recreate `interop` toy app pair on new stack.
- [ ] Optional: recreate `editor` toy app only if collaborative editor behavior is still a target.
- [ ] Document each toy example’s teaching objective and its E2E responsibilities.
- [ ] Files: `examples/` new app folders as approved, plus `examples/*/README.md`.
- [ ] Tests: each example must run locally and expose deterministic selectors for E2E.

### Run 5: E2E User Journey Suite (Examples + Auth + DB)

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: End-to-end reliability requires careful setup/teardown, data isolation, and anti-flake strategies.
- [ ] Replace legacy Matrix-era assertions with new-stack assertions and routes.
- [ ] Build journey specs:
- [ ] `basic-auth-and-crud.cy.ts`.
- [ ] `basic-returning-user.cy.ts`.
- [ ] `share-invite-flow.cy.ts`.
- [ ] `multi-room.cy.ts` (new toy app).
- [ ] `interop.cy.ts` (new toy app pair).
- [ ] Add stable selectors in example UIs to avoid text-fragile tests.
- [ ] Files: `e2e/cypress/tests/*.cy.ts`, `e2e/cypress/support/**`, plus small UI selector updates in `examples/**`.
- [ ] Tests: `npm run test:e2e` with documented service prerequisites.

### Run 6: CI Test Pipeline and Reliability Hardening

- **Recommended Agent**: `03-quality-assurance` (Fast)
- **Reason**: Mostly execution-hardening and pipeline tuning once functional tests exist.
- [ ] Define smoke vs full E2E split to keep PR runtime practical.
- [ ] Add retry policy, artifact capture, and deterministic seed/reset strategy.
- [ ] Ensure CI jobs start required services for E2E and fail fast on readiness issues.
- [ ] Files: `.github/workflows/quality.yaml`, `cypress.config.ts`, `docs/ai/quality-gates-matrix.md`, and test setup scripts.
- [ ] Tests: CI dry run + local smoke confirmation.

## Risks

- Contract drift between `packages/db` expectations and `packages/auth-server-hono` endpoint behavior.
- E2E flakiness from async sync states and cross-service startup races.
- Example rewrite scope creep if toy apps are not kept intentionally minimal.
- Authentication/OAuth flows may require environment-specific test doubles in CI.

## Execution Summary

```text
Run 1.1: Build test matrix (Fast)
├── Run 1.2: Auth API contract tests (Smart)
├── Run 1.3: DB SDK integration tests (Smart) [Parallel with 1.2]
└── Run 1.4: Rewrite toy example fixtures (Smart) [Starts after 1.1; can overlap late 1.2/1.3]
    └── Run 1.5: E2E user journey suite (Smart)
        └── Run 1.6: CI reliability hardening (Fast)
```

## Status

- [x] Approved by user

## Handoff

Current completion:

- Run 1 complete.
- Run 2 complete.
- Run 3 complete.

Ready next:

- Run 4 (rewrite toy example fixtures on new stack): define exact app set (`example-basic`, `multi-room`, `interop`, optional `editor`) and add deterministic selectors.
- Run 5 (E2E suite buildout): implement new-stack Cypress journeys against rewritten toy examples.

Key artifacts for next owner:

- Coverage matrix: `docs/ai/testing/examples-db-auth-matrix.md`.
- New auth test files: `packages/auth-server-hono/src/index.test.ts`, `packages/auth-server-hono/src/routes/access-grant.test.ts`.
- New db test files: `packages/db/src/methods/connection/generateLoginUrl.test.ts`, `packages/db/src/methods/connection/login.test.ts`, `packages/db/src/methods/connection/syncRegistry.test.ts`, `packages/db/src/methods/connection/loadRooms.test.ts`, `packages/db/src/methods/connection/generateShareRoomLink.test.ts`, `packages/db/src/methods/newRoom.test.ts`, `packages/db/src/methods/renameRoom.test.ts`.
