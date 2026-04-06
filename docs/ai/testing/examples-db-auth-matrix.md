# Examples + DB + Auth Testing Matrix

## Purpose

Create traceable coverage from user-visible behaviors to the correct test layer so the migrated stack can be validated with minimal blind spots.

## Layers

- Unit: pure logic and route/service behavior without full browser flows.
- Integration: cross-module behavior inside one package boundary (SDK orchestration, route contracts).
- E2E: browser-level user journeys across example app, auth pages, auth API, and sync behavior.

## Coverage Matrix

| Feature Area                | User Journey                     | Critical Behaviors                                                           | Unit                                                   | Integration                                                                    | E2E                                                                  | Pass Criteria                                                                |
| --------------------------- | -------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Auth sign-up/sign-in        | First-time user can authenticate | Email/password happy path, invalid credentials, session established          | `packages/auth-server-hono/src/routes/auth.test.ts`    | `packages/auth-pages/src/App.test.tsx`                                         | `e2e/cypress/tests/basic-auth-and-crud.cy.ts`                        | User reaches app after auth and can create data                              |
| Auth session guard          | Returning user path              | Protected routes redirect unauthenticated users, authenticated users proceed | `packages/auth-pages/src/App.test.tsx`                 | `packages/auth-pages/src/pages.tsx` route behavior tests                       | `e2e/cypress/tests/basic-returning-user.cy.ts`                       | Returning user reaches app without breaking navigation                       |
| Account bootstrap           | Starter room provisioning        | `/api/account/bootstrap` ensures profile rooms and returns user metadata     | `packages/auth-server-hono/src/routes/account.test.ts` | service-level tests for room/access-grant provisioning                         | covered by auth-and-crud and returning-user suites                   | Bootstrap response contains expected profile rooms and user object           |
| Login query and permissions | Third-party app grant handshake  | Query validation, permission submit/deny, redirect token handoff             | `packages/auth-pages/src/lib/login-query.ts` tests     | `packages/auth-server-hono/src/routes/access-grant.ts` permissions route tests | `e2e/cypress/tests/basic-auth-and-crud.cy.ts` permission segment     | Redirect includes token on approve, error on deny/invalid                    |
| Registry sync               | SDK and auth contract alignment  | Client rooms synced, token rotated, user id returned                         | service tests for `sync-rooms-with-client`             | db tests for `syncRegistry` behavior                                           | indirectly via all authenticated suites                              | Client registry and server rooms converge after login                        |
| Local-first room load       | App usable before remote settles | IndexedDB room/doc availability before remote provider connected             | db room load tests                                     | db login/loadRooms integration tests                                           | `e2e/cypress/tests/basic-auth-and-crud.cy.ts` local-first assertions | Notes UI usable after local load and remains consistent after remote connect |
| Note CRUD                   | Core teaching flow in toy app    | Create, edit, soft delete, list/selection behavior                           | db document helper tests                               | example-basic component behavior tests (if added)                              | `e2e/cypress/tests/basic-auth-and-crud.cy.ts`                        | CRUD visible and persists across reload/session                              |
| Room rename                 | Metadata mutation path           | Rename route authorization and local registry update                         | auth route/service tests for update-room               | db rename room tests                                                           | included in basic auth+crud suite                                    | Renamed room title persists and is reflected in registry/UI                  |
| Share link generation       | Invite initiation                | create-room-invite contract and client link generation                       | auth route tests for create-room-invite                | db `generateShareRoomLink` tests                                               | `e2e/cypress/tests/share-invite-flow.cy.ts`                          | Share link is generated and can be consumed by invitee flow                  |
| Invite acceptance           | Cross-user sharing flow          | invite token validation, access update, redirect to target app               | auth route/service tests for accept-room-invite        | auth-pages accept flow tests                                                   | `e2e/cypress/tests/share-invite-flow.cy.ts`                          | Invitee gains expected room access; invalid/expired invite is rejected       |
| Multi-room toy app          | Folder/group usage               | room isolation, create/switch room, room-specific documents                  | db room lifecycle tests                                | example multi-room app tests                                                   | `e2e/cypress/tests/multi-room.cy.ts`                                 | Notes do not leak across rooms; switching retains expected state             |
| Interop toy apps            | Cross-app shared schema behavior | writes in app A visible in app B with same user/session permissions          | shared schema and db helper tests                      | interop app integration tests                                                  | `e2e/cypress/tests/interop.cy.ts`                                    | Cross-app linked/related data appears and remains editable                   |
| Error guardrails            | Failure UX and API safety        | invalid auth token, invalid invite, unauthorized room update                 | auth route negative-path tests                         | db error handling tests                                                        | included in auth, invite, and multi-room suites                      | Errors are explicit and non-destructive                                      |

## Required Fixtures

1. Test accounts

- One primary user for baseline journeys.
- One secondary user for invite/share coverage.

2. Seedable room state

- Empty notes room baseline.
- Optional multi-room baseline for room switching tests.

3. Environment and services

- Auth API running (`packages/auth-server-hono`).
- Auth pages running (`packages/auth-pages`).
- Example app(s) running (starting with `examples/example-basic`).
- Sync server and backing database available for remote connection assertions.

4. Deterministic selectors

- Add explicit data-test attributes in toy app UIs and auth pages where selectors are currently text-fragile.

## Exit Criteria for Run 1

- Every journey from the plan maps to at least one owned test file.
- Each critical behavior has a clear primary test layer and fallback layer.
- Pass criteria are explicit enough to prevent ambiguous green runs.
- Fixture dependencies are documented and can be automated in CI later.

## Next Run Hand-off

Run 2 implementation should begin with:

1. auth API route/negative-path expansion (`packages/auth-server-hono`).
2. db contract tests for login/sync/load/share alignment (`packages/db`).
