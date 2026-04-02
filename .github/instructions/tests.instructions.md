---
applyTo: '**/*.test.ts,**/*.test.tsx,**/*.spec.ts,e2e/**,cypress/**'
---

# Testing Instructions

## Unit Tests — Vitest

- Located alongside source: `packages/*/src/**/*.test.ts`
- Run all: `npm test` from root
- Run package: `cd packages/db && npm test`

### Testing Yjs Code

- Use real `Y.Doc` instances, not mocks
- Use `fake-indexeddb` for IndexedDB (import at top of test files)
- Test concurrent edits by creating multiple Y.Doc instances and syncing

### Testing Auth

- Mock Supabase client for unit tests
- Mock Y-Sweet for connection tests
- Use real Drizzle queries against test database when possible

## E2E Tests — Cypress

- Located in `e2e/cypress/tests/`
- Config: `cypress.config.ts`
- Run: `npm run test:e2e`
- Requires running dev servers (auth-server + example app)

## Rules

- Tests should assert meaningful behavior, not implementation details
- Each test should be independent — no shared mutable state between tests
- Name tests descriptively: `it('should sync document changes between two clients')`
