# ADR-0006: Quality Gates — Lint/Format/Type-Check Hardening

**Status:** Implemented  
**Date:** 2026-04-02

## Context

Agent-generated code needs strict, enforceable quality gates to prevent low-quality PRs.

## Decision

### ESLint strictness

- Promote `@typescript-eslint/no-explicit-any` to **error**
- Promote `@typescript-eslint/ban-ts-comment` to **error** (with description requirement)
- Promote prettier to **error**
- Use `tseslint.configs.strict` for React packages

### Prettier

- Root `.prettierrc.json` with sensible defaults
- `.prettierignore`: node_modules, dist, .next, build artifacts

### TypeScript strictness

- `noUncheckedIndexedAccess` — enabled
- `exactOptionalPropertyTypes` — enabled
- `useUnknownInCatchVariables` — enabled
- `noImplicitOverride` — enabled for backend/core packages
- Disable duplicate `noUnusedLocals`/`noUnusedParameters` in ewe-note (lint handles it)

### Root scripts

```bash
lint          # ESLint all packages
lint:fix      # Auto-fix lint issues
format        # Prettier write
format:check  # Prettier check
check         # Orchestrator: lint → format:check → type-check → test
```

## Consequences

- Quality gates now fail builds, not just warn
- 39 `any` type violations in `packages/db` identified and fixed
- Format violations across 150+ files resolved

## Related

- [2026-04-02-quality-gates-hardening.md](../plans/2026-04-02-quality-gates-hardening.md)
- [2026-04-02-quality-gates-run-3-handoff.md](../plans/2026-04-02-quality-gates-run-3-handoff.md)
