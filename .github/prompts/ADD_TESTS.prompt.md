---
description: "Add meaningful tests for recent changes"
---

1. Identify what changed (check git diff or ask)
2. Review existing test coverage
3. Add unit tests (Vitest) and/or E2E tests (Cypress) for new functionality
4. Cover edge cases: offline behavior, concurrent edits, auth failures
5. Run `npm test` to verify
