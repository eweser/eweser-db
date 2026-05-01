# Code Index Maintenance

Use this workflow to improve `INDEX.md` coverage and selected source headers in
small, reviewable increments.

## Daily Unit

Pick one folder and keep the pass under 30 minutes.

1. Read the parent `INDEX.md`, the folder's existing `INDEX.md` if present, and
   nearby `README.md` or `AGENTS.md`.
2. Read only the files needed to understand ownership, entry points, contracts,
   and tests.
3. Update the nearest `INDEX.md` so it reflects current responsibilities,
   children, key contracts, update triggers, and testing commands.
4. Add or refine up to five high-value source headers. Prefer entry points,
   services, routes, auth/security boundaries, Yjs/sync boundaries, and complex
   workflow roots.
5. Run `npm run code-index:check`.
6. Record any remaining gaps in the PR description or follow-up plan.

## Good Daily Targets

- `packages/logger/src`
- `packages/sync-server/src`
- `packages/mcp-server/src`
- Deeper `packages/ewe-note/src` folders such as `cli`, `components`, or
  `extensions`

## Ratchet Policy

- Header coverage must not regress as a human review rule.
- CI reports source-header coverage but does not fail on low coverage.
- Do not add headers to tiny files, tests, fixtures, generated files, CSS, JSON,
  mechanical re-export-only files, or files whose folder index is enough.
- Product changes touching indexed folders must update nearby indexes in the
  same PR.

## Review Checklist

- Does the changed index answer what the folder owns?
- Does `Start Here` point to the safest first files?
- Are child links local and valid?
- Are key contracts factual and current?
- Do update triggers mention the changes that would make the index stale?
- Did `npm run code-index:check` pass?

## Testing

- `npm run code-index:check`: Validates required indexes, links, and source
  header format.
- `npx prettier --check docs/workflows/code-index-maintenance.md`: Checks this
  workflow file.
