#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
BRANCH="$(git -C "$ROOT" branch --show-current 2>/dev/null || echo unknown)"
RUNTIME_DIR="$HOME/.codex/local/eweser-db"
RUNTIME_FILE="$RUNTIME_DIR/runtime.md"

find_port() {
  for port in "$@"; do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      printf "%s" "$port"
      return 0
    fi
  done
  return 1
}

case "${1:-status}" in
  status)
    echo "# Runtime status snapshot"
    echo "ROOT: $ROOT"
    echo "BRANCH: $BRANCH"
    echo "Auth API: $(find_port 3001 3002 3000 8787 8788 || echo unknown)"
    echo "App UI: $(find_port 5173 5174 5175 3000 3001 || echo unknown)"
    echo "Sync: $(find_port 38181 38180 38182 || echo unknown)"
    echo "Postgres: $(find_port 5432 5433 || echo unknown)"
    echo "Aggregator: $(find_port 38190 38191 || echo unknown)"
    ;;
  refresh)
    mkdir -p "$RUNTIME_DIR"
    NOW="$(date -Iseconds)"
    HOST="$(hostname)"

    AUTH_API_PORT="$(find_port 3001 3002 3000 8787 8788 || echo unknown)"
    APP_UI_PORT="$(find_port 5173 5174 5175 3000 3001 || echo unknown)"
    SYNC_PORT="$(find_port 38181 38180 38182 || echo unknown)"
    POSTGRES_PORT="$(find_port 5432 5433 || echo unknown)"

cat > "$RUNTIME_FILE" <<EOF
# EweserDB Runtime Notes

Machine: $HOST
Updated: $NOW

## Worktree Slots
- $ROOT ($BRANCH)

## Service Endpoints
- Auth API: ${AUTH_API_PORT:-unknown}
- App UI: ${APP_UI_PORT:-unknown}
- Sync: ${SYNC_PORT:-unknown}
- Postgres: ${POSTGRES_PORT:-unknown}

## Dev Notes
- Observed via lsof listener scan from eweser-runtime-orientation.sh refresh
EOF

    echo "Updated $RUNTIME_FILE"
    ;;
  *)
    echo "Usage: $0 [status|refresh]"
    exit 1
    ;;
esac
