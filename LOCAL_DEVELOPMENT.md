# Local Development Setup

> **Backend in Docker, frontends on the host.** `docker-compose.dev.yml` runs PostgreSQL, the sync servers, the aggregator, the auth API, and Dozzle. The React/Vite apps run on the host for fast refresh.

## Prerequisites

| Software                                                          | Version  | Notes                                |
| ----------------------------------------------------------------- | -------- | ------------------------------------ |
| [Node.js](https://volta.sh/)                                      | v20.11.0 | Managed by Volta, see `package.json` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest   | Required for backend services        |
| Git                                                               | Any      | For cloning                          |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/eweser/eweser-db.git
cd eweser-db
npm install

# 2. Start backend services
npm run dev:docker
```

### Running all apps from VS Code (recommended)

Open the Command Palette and run:
`Tasks: Run Task` → `Run All Dev`

This starts backend + shared services and the frontend apps in one batch. It uses host ports from `.worktree-ports` when the file is present.

If you need terminal-only startup, use the command list in the [CLI startup section](#cli-startup).

### Worktree port isolation

Jacob's `ewtnew` helper generates `.worktree-ports` automatically through
`scripts/worktree-env.mjs`. For an existing checkout or manual worktree, copy
the template once:

```bash
cp -n .worktree-ports.example .worktree-ports
```

Then edit `.worktree-ports` for your worktree port assignments. The file is
ignored and should stay local.

`Run All Dev` reads this file with:

```bash
source .worktree-ports 2>/dev/null
```

## Local URLs

| App                | URL                           |
| ------------------ | ----------------------------- |
| Landing page       | http://localhost:4000/        |
| Auth API health    | http://localhost:38101/health |
| Auth pages         | http://localhost:3001/auth/   |
| Example basic app  | http://localhost:38110/       |
| Multi-room notes   | http://localhost:38120/       |
| Interop notes      | http://localhost:38130/       |
| Interop flashcards | http://localhost:38140/       |
| Ewe Note           | http://localhost:5181/        |
| Dozzle log viewer  | http://localhost:9999         |

## CLI Startup

For terminal workflows or non-VS Code setups, run backend + each frontend explicitly:

```bash
npm run dev:docker
```

In separate terminals:

```bash
source .worktree-ports 2>/dev/null || true

npm run dev --workspace @eweser/db
npm run dev --workspace @eweser/shared
cd packages/landing && npm run dev -- --host 127.0.0.1 --port "${LANDING_PORT:-4000}" --strictPort
cd packages/app && npm run dev -- --host 127.0.0.1 --port "${AUTH_PAGES_PORT:-${APP_PORT:-3001}}" --strictPort
cd examples/example-basic && npm run dev -- --host 127.0.0.1 --port "${EXAMPLE_BASIC_PORT:-38110}" --strictPort
cd examples/example-multi-room && npm run dev -- --host 127.0.0.1 --port "${EXAMPLE_MULTI_ROOM_PORT:-38120}" --strictPort
cd examples/example-interop-notes && npm run dev -- --host 127.0.0.1 --port "${EXAMPLE_INTEROP_NOTES_PORT:-38130}" --strictPort
cd examples/example-interop-flashcards && npm run dev -- --host 127.0.0.1 --port "${EXAMPLE_INTEROP_FLASHCARDS_PORT:-38140}" --strictPort
cd packages/ewe-note && npm run dev -- --host 127.0.0.1 --port "${EWE_NOTE_PORT:-5181}" --strictPort
```

`npm run dev` still covers shared SDK + example workspaces, and `npm run dev --workspace @eweser/app`/`npm run dev --workspace @eweser/ewe-note` start those apps without custom ports unless you pass your own overrides.

## NPM Scripts

### Backend

```bash
npm run dev:docker       # Start backend services
npm run dev:docker:stop  # Stop backend services
npm run dev:docker:build # Rebuild images and start
npm run dev:docker:logs  # Tail backend logs
npm run dev:docker:clean # Stop and remove volumes
```

### Frontend Workspaces

```bash
npm run dev                               # Shared SDK + example workspaces
npm run dev --workspace @eweser/app     # App SPA
npm run dev --workspace @eweser/ewe-note   # Note app
npm run dev --workspace @eweser/db         # Core SDK only
npm run dev --workspace @eweser/shared     # Shared types only
```

### Quality and Testing

```bash
npm run check      # lint + format:check + type-check + test
npm run lint:fix   # Auto-fix lint issues
npm run format     # Auto-fix formatting
npm run test      # Workspace unit tests
npm run test:e2e   # Cypress smoke run
npm run dev-e2e    # Cypress GUI
```

## Docker Services

| Service         | Internal Port | Host Port | Purpose                |
| --------------- | ------------- | --------- | ---------------------- |
| `postgres`      | 5432          | 5499      | Database               |
| `sync-server`   | 8080          | 38181     | Primary CRDT sync      |
| `sync-server-2` | 8080          | 38182     | Secondary CRDT sync    |
| `aggregator`    | 8090          | 38190     | Public indexing/search |
| `auth-api`      | 3000          | 38101     | Hono + better-auth API |
| `dozzle`        | 8080          | 9999      | Log viewer             |

## Environment Variables

These defaults work for local development. Override backend/container values in `.env` and frontend ports per worktree with `.worktree-ports`.

| Variable                          | Default                   | Description                                            |
| --------------------------------- | ------------------------- | ------------------------------------------------------ |
| `POSTGRES_HOST_PORT`              | `5499`                    | PostgreSQL host port                                   |
| `SYNC_A_HOST_PORT`                | `38181`                   | Primary sync server host port                          |
| `SYNC_B_HOST_PORT`                | `38182`                   | Secondary sync server host port                        |
| `AGGREGATOR_HOST_PORT`            | `38190`                   | Aggregator host port                                   |
| `AUTH_API_HOST_PORT`              | `38101`                   | Auth API host port                                     |
| `DOZZLE_PORT`                     | `9999`                    | Dozzle host port                                       |
| `SERVER_SECRET`                   | `dev-secret`              | Auth API secret                                        |
| `BETTER_AUTH_SECRET`              | `change-me-in-production` | better-auth secret                                     |
| `SYNC_AUTH_SECRET`                | `dev-secret`              | Shared sync token secret                               |
| `WEBHOOK_SECRET`                  | `dev-webhook-secret`      | Sync webhook secret                                    |
| `LANDING_PORT`                    | `4000`                    | Landing page dev server port (VS Code task override)   |
| `AUTH_PAGES_PORT` / `APP_PORT`    | `3001`                    | App auth pages dev server port (VS Code task override) |
| `EXAMPLE_BASIC_PORT`              | `38110`                   | Example basic dev server port                          |
| `EXAMPLE_MULTI_ROOM_PORT`         | `38120`                   | Multi-room demo dev server port                        |
| `EXAMPLE_INTEROP_NOTES_PORT`      | `38130`                   | Interop notes dev server port                          |
| `EXAMPLE_INTEROP_FLASHCARDS_PORT` | `38140`                   | Interop flashcards dev server port                     |
| `EWE_NOTE_PORT`                   | `5181`                    | Ewe Note dev server port                               |

## Project Structure

```
packages/
  db/
  shared/
  auth-server-hono/
  app/
  sync-server/
  aggregator/
  examples-components/
  ewe-note/
  mcp-server/

examples/
  example-basic/
  example-multi-room/
  example-interop-notes/
  example-interop-flashcards/
  example-aggregator/
  react-native/
```

## E2E Tests

E2E tests run against:

- The Docker backend on ports `38101`, `38181`, `38182`, and `38190`
- The built example-basic preview on port `38110`

Run them locally with:

```bash
npm run dev:docker
npm run build-example:basic
npm run run-example-preview:basic
npm run test:e2e
```

## Common Issues

### Port Already in Use

```bash
lsof -i :38101
docker ps --format "{{.Names}}\t{{.Ports}}"
```

### Docker Build Fails

```bash
docker system prune -a
npm run dev:docker:build
```

### Too Many Event Listeners

Disconnect rooms you are no longer using with `db.disconnectRoom()`.

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for the current system design
- See [README.md](README.md) for the project overview and API example
- Check `docs/deployment/` for production deployment guides
