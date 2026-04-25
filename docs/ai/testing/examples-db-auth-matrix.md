# Examples + DB + Auth Testing Matrix

## Purpose

Map user-visible behavior to the smallest useful test layer so auth, sync, and example flows stay covered without duplicating effort.

## Layers

- Unit: pure logic, route behavior, and service helpers.
- Integration: package-level behavior that crosses module boundaries.
- E2E: browser-level user journeys across the example apps, auth pages, auth API, and sync backend.

## Coverage Matrix

| Feature area                 | User journey                       | Critical behaviors                                                           | Unit                                                                                                                                                                      | Integration                                                                   | E2E                                                                                                                                          | Pass criteria                                                        |
| ---------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Auth sign-up/sign-in         | First-time user authenticates      | Email/password happy path, invalid credentials, session established          | `packages/auth-server-hono/src/auth.test.ts`, `packages/auth-server-hono/src/routes/auth.test.ts`, `packages/auth-server-hono/src/env.test.ts`                            | `packages/auth-pages/src/App.test.tsx`                                        | `e2e/cypress/tests/basic-auth-and-crud.cy.ts`, `e2e/cypress/tests/basic-returning-user.cy.ts`, `e2e/cypress/tests/auth-security-smoke.cy.ts` | User reaches the app after auth and can create data                  |
| Auth session guard           | Returning user path                | Protected routes redirect unauthenticated users, authenticated users proceed | `packages/auth-pages/src/App.test.tsx`                                                                                                                                    | `packages/auth-pages/src/lib/login-query.ts` tests                            | `e2e/cypress/tests/basic-returning-user.cy.ts`                                                                                               | Returning user lands in the app without broken navigation            |
| Account bootstrap            | Starter room provisioning          | Bootstrap response includes profile rooms and account metadata               | `packages/auth-server-hono/src/routes/account.test.ts`                                                                                                                    | `packages/auth-server-hono/src/services/account/create-user-rooms.ts` helpers | `e2e/cypress/tests/basic-auth-and-crud.cy.ts`                                                                                                | Bootstrap returns expected user and room state                       |
| Login query and permissions  | Third-party app grant handshake    | Query validation, permission submit/deny, redirect token handoff             | `packages/auth-pages/src/lib/login-query.ts`                                                                                                                              | `packages/auth-server-hono/src/routes/access-grant.test.ts`                   | `e2e/cypress/tests/share-invite-flow.cy.ts`, `e2e/cypress/tests/basic-auth-and-crud.cy.ts`                                                   | Approve flow redirects with a token; deny/invalid cases fail cleanly |
| Sync token and registry sync | SDK and auth contract alignment    | Client rooms sync, token issued, user id returned                            | `packages/db/src/methods/connection/syncRegistry.test.ts`, `packages/db/src/methods/connection/login.test.ts`, `packages/db/src/methods/connection/loadRooms.test.ts`     | `packages/auth-server-hono/src/services/sync-token.ts` helpers                | `e2e/cypress/tests/basic-auth-and-crud.cy.ts`                                                                                                | Client registry and server state converge after login                |
| Local-first room load        | App usable before remote settles   | IndexedDB room/doc availability before remote provider connects              | `packages/db/src/methods/connection/loadRoom.test.ts`, `packages/db/src/methods/connection/loadRooms.test.ts`                                                             | `packages/db/src/index.test.ts`                                               | `e2e/cypress/tests/basic-auth-and-crud.cy.ts`                                                                                                | The UI works from local state first and stays consistent after sync  |
| Note CRUD                    | Core teaching flow in the demo app | Create, edit, soft delete, list/selection behavior                           | `packages/db/src/index.test.ts` and room/document helper tests                                                                                                            | Example app component tests when added                                        | `e2e/cypress/tests/basic-auth-and-crud.cy.ts`                                                                                                | CRUD persists across reloads and sessions                            |
| Room rename                  | Metadata mutation path             | Rename authorization and local registry update                               | `packages/db/src/methods/renameRoom.test.ts`                                                                                                                              | `packages/auth-server-hono/src/routes/account.test.ts`                        | `e2e/cypress/tests/multi-room.cy.ts`                                                                                                         | Renamed rooms persist and show the new title                         |
| Share link generation        | Invite initiation                  | Create-room-invite contract and client link generation                       | `packages/db/src/methods/connection/generateShareRoomLink.test.ts`                                                                                                        | `packages/auth-server-hono/src/routes/access-grant.test.ts`                   | `e2e/cypress/tests/share-invite-flow.cy.ts`                                                                                                  | Share link is generated and can be consumed by invitee flow          |
| Invite acceptance            | Cross-user sharing flow            | Invite token validation, access update, redirect to target app               | `packages/auth-server-hono/src/routes/access-grant.test.ts`                                                                                                               | `packages/auth-pages/src/App.test.tsx`                                        | `e2e/cypress/tests/share-invite-flow.cy.ts`                                                                                                  | Invitee gains access; invalid or expired invites are rejected        |
| Multi-room toy app           | Folder/group usage                 | Room isolation, create/switch room, room-specific documents                  | `packages/db/src/methods/newRoom.test.ts`, `packages/db/src/methods/renameRoom.test.ts`                                                                                   | Example app component tests when added                                        | `e2e/cypress/tests/multi-room.cy.ts`                                                                                                         | Notes do not leak across rooms                                       |
| Interop toy apps             | Cross-app shared schema behavior   | Writes in one app are visible in another with the same session               | Shared schema and db helper tests                                                                                                                                         | Example app component tests when added                                        | `e2e/cypress/tests/interop.cy.ts`                                                                                                            | Cross-app linked data appears and remains editable                   |
| Error guardrails             | Failure UX and API safety          | Invalid auth token, invalid invite, unauthorized room update                 | `packages/auth-server-hono/src/routes/auth.test.ts`, `packages/auth-server-hono/src/routes/access-grant.test.ts`, `packages/auth-server-hono/src/middleware/auth.test.ts` | `packages/db` error-handling helpers                                          | `e2e/cypress/tests/auth-security-smoke.cy.ts`, targeted flows above                                                                          | Errors are explicit and non-destructive                              |

## Required Fixtures

1. Test accounts

- One primary user for the main journeys.
- One secondary user for invite and share coverage.

2. Seedable room state

- Empty notes room baseline.
- Optional multi-room baseline for room switching tests.

3. Environment and services

- Auth API running from `packages/auth-server-hono`.
- Auth pages running from `packages/auth-pages`.
- Example app(s) running, starting with `examples/example-basic`.
- Sync server and Postgres available for remote sync assertions.

4. Deterministic selectors

- Add explicit `data-testid` attributes in toy apps and auth pages where text selectors are fragile.

## Exit Criteria

- Every journey in the matrix maps to at least one owned test file.
- Each critical behavior has a clear primary test layer and a fallback layer.
- Coverage gaps are obvious enough that they can be assigned to the right workspace.
- Fixture dependencies are documented well enough to automate later.

## Next Run Hand-off

If this matrix is used for implementation planning, start with:

1. auth API route and negative-path expansion in `packages/auth-server-hono`.
2. db contract tests for login, sync, load, and share alignment in `packages/db`.
