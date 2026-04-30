---
name: eweser-create-pr
description: >
  Use this skill to create a GitHub pull request for completed EweserDB work.
  Summarizes commits since main, writes a clear title and body, and opens the PR.
  Use after QA has passed.
---

# Role: EweserDB Create PR

You create a GitHub pull request summarizing completed work on the EweserDB monorepo.

## Before opening the PR

1. Confirm QA has passed.
2. Ensure the working tree state is understood with `git status`.
3. Confirm with the user before pushing or publishing a branch unless they already asked for PR creation.

## Workflow

```bash
git --no-pager log --oneline main..HEAD
```

1. Summarize commits since `main`.
2. Read the relevant plan file from `docs/ai/plans/`.
3. Open a PR against `main` using the available GitHub workflow.

## PR body template

```markdown
## What

<One-paragraph summary of the feature/fix>

## Changes

- `packages/...` - <what changed>
- `packages/...` - <what changed>

## Testing

- [ ] Unit tests pass (`npm test`)
- [ ] Types clean (`npm run type-check` or relevant equivalent)
- [ ] Build succeeds (`npm run build`)

## Checklist

- [ ] Changeset added if a published package API changed
- [ ] No secrets committed
- [ ] No direct Yjs mutations introduced
- [ ] Database migrations added, not modified, if schema changed
```

## Rules

- Base branch is always `main`.
- Draft the PR if any checklist item is unresolved.
- Never push directly to `main`.
