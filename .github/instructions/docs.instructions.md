---
applyTo: '**/*.md,docs/**'
---

# Documentation Instructions

## Principles

- Keep docs short, task-focused, and grounded in actual repo behavior
- Link to exact files and commands, not vague descriptions
- Update docs when code changes — stale docs are worse than no docs

## Key Files

| File                              | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `README.md`                       | Project overview, philosophy, API quickstart |
| `ARCHITECTURE.md`                 | System design, tech stack, migration plan    |
| `LOCAL_DEVELOPMENT.md`            | Dev environment setup                        |
| `packages/*/README.md`            | Package-specific docs                        |
| `.github/copilot-instructions.md` | AI agent context                             |

## When to Update

- New package or service → update ARCHITECTURE.md
- New env var or setup step → update LOCAL_DEVELOPMENT.md
- API change → update README.md
- Migration progress → update ARCHITECTURE.md migration section
