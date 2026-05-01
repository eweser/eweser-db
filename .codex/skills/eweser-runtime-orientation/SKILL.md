---
name: eweser-runtime-orientation
description: >
  Use this skill for EweserDB runtime orientation before running tests/services.
  It reduces guesswork for local/prod endpoints, worktree-specific ports, and
  repeated environment setup checks.
---

# EweserDB Runtime Orientation

Use this skill whenever you need to run code, start services, run tests, or inspect
local/prod environment status for EweserDB.

## Why this skill exists

Agents should avoid guessing environment state. This skill creates a deterministic,
low-latency startup path:
identify worktree and branch → read project guidance → load local runtime notes →
probe listeners/services → run only the required command.

## Workflow (required)

1. Confirm repository and worktree

```bash
pwd
git rev-parse --show-toplevel
git branch --show-current
```

2. Read `LOCAL_DEVELOPMENT.md` and nearest `INDEX.md` files before running tests.

```bash
sed -n '1,220p' LOCAL_DEVELOPMENT.md
# plus root package-level INDEX.md files where present
```

3. Load local machine runtime notes (create once if missing):

```bash
mkdir -p ~/.codex/local/eweser-db
if [ ! -f ~/.codex/local/eweser-db/runtime.md ]; then
  cat > ~/.codex/local/eweser-db/runtime.md <<'EOF'
# EweserDB Runtime Notes

Machine: $(hostname)
Updated: $(date -Iseconds)

## Worktree Slots

## Service Endpoints

## Dev Notes
EOF
fi
```

4. Refresh discovered state before meaningful operations.

```bash
~/.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh refresh
```

5. Use discovered state to avoid assumptions.

- Never assume fixed ports.
- Never assume the app always runs on 8000.
- Do not map local stack values to prod URLs.
- Use discovered service health results before Cypress or long-running browser flows.

## Canonical local runtime notes format

`~/.codex/local/eweser-db/runtime.md` is machine-specific and worktree-aware.

```markdown
# EweserDB Runtime Notes

Machine: <hostname>
Updated: 2026-05-02T00:00:00Z

## Worktree Slots

- /home/jacob/eweser-db: main
- /home/jacob/eweser-db.worktrees/feature-x: pr-1234

## Service Endpoints

- Auth API: http://localhost:3001
- App UI: http://localhost:5174
- Sync: ws://localhost:38181

## Dev Notes

- docker compose: docker compose -f docker-compose.dev.yml up
- caddy: running
- last_cypress_target: auth-api@3001 + app@5174
```

If live discovery differs from notes, prefer live discovery and refresh notes.

## Helper script contract

This skill relies on:

- `~/.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status` — outputs worktree, branch, and
  current listening ports for common Eweser services.
- `~/.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh refresh` — probes ports and writes the
  latest observed endpoints into `~/.codex/local/eweser-db/runtime.md`.

## Safety rules

- Always verify target endpoints before destructive actions.
- Never write data to prod endpoints from these local notes.
- If notes are stale, run `refresh` and continue with the refreshed values.
