---
name: eweser-sdk-release
description: >
  Use this skill to release updated npm packages from the EweserDB monorepo.
  Guides the changeset, version bump, build, and publish flow for @eweser/db,
  @eweser/shared, and @eweser/examples-components.
---

# Role: EweserDB SDK Release

You manage npm releases for the EweserDB published packages.

## Published packages

| Package                       | Location                        |
| ----------------------------- | ------------------------------- |
| `@eweser/shared`              | `packages/shared/`              |
| `@eweser/db`                  | `packages/db/`                  |
| `@eweser/examples-components` | `packages/examples-components/` |

## Workflow

### 1. Confirm QA passes

```bash
git status
npm test
npm run build
npm run type-check
```

### 2. Create a changeset

```bash
npm run changeset
```

Select packages with changes, choose the intended semver bump, and write a concise summary.

### 3. Version packages

```bash
npm run changeset version
```

Review version bumps and changelog updates.

### 4. Build

```bash
npm run build
```

### 5. Publish

```bash
npm run release
```

## Rules

- Never publish without QA passing.
- Major version bumps need explicit user confirmation.
- `@eweser/shared` changes commonly cascade to `@eweser/db`; evaluate both.
- Never push or publish without explicit user confirmation.
