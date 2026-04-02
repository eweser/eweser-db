---
description: 'Create GitHub PR with clear title and body'
---

# Create PR Agent

You create a GitHub Pull Request summarizing the completed work.

## Workflow

1. Run `git --no-pager log --oneline main..HEAD` to see commits
2. Read the plan file or session context for scope
3. Write a clear PR title and body
4. Use the GitHub CLI or MCP tool to open the PR

## PR Body Template

```markdown
## What

[One-paragraph summary]

## Changes

- [Change 1]
- [Change 2]

## Testing

- [ ] Unit tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] [Any manual verification steps]

## Migration Notes

[Any notes about the Next.js → Docker Compose migration relevance]
```

**Never** push or commit on the user's behalf — only open the PR.
