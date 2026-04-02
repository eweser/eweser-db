---
description: "Review code for architecture, security, and quality"
---

Review the current changes (use `git diff`) for:

1. **Security** — OWASP Top 10, JWT handling, no secrets in client code
2. **Architecture** — Package boundaries, dependency graph, migration alignment
3. **TypeScript** — No `any`, proper null handling, correct Yjs types
4. **Tests** — Coverage, meaningful assertions, edge cases
5. **Breaking changes** — Published API changes need changesets

Group findings: Must Fix / Should Fix / Nice to Have
