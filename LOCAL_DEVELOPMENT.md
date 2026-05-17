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

# 3. Start the frontend workspaces you need
npm run dev
npm run dev --workspace @eweser/app
npm run dev --workspace @eweser/ewe-note
```

## Worktree Quick Start

Jacob's shell has EweserDB-aware worktree helpers in `~/.zshrc`:

```bash
ewtnew my-feature              # create /home/jacob/code/eweser-db.worktrees/my-feature
cd ../eweser-db.worktrees/my-feature
ewenv                         # load and print this worktree's ports
ewdocker                      # start backend services detached
ewapp                         # start the auth/account app
ewe2e                         # start backend services and run the smoke E2E suite
```

`ewtnew` delegates to the generic `wtnew` helper, then runs
`scripts/worktree-env.mjs` to generate `.worktree-ports`, update the worktree's
ignored `.env`, and write ignored Vite `.env.local` files for the example app,
auth app, and Ewe Note. Each worktree gets a deterministic high-port block so
Docker, Vite, and Cypress can run without colliding with the main checkout or
other worktrees.

## Local URLs

| App                   | URL                           |
| --------------------- | ----------------------------- |
| Example basic app     | http://localhost:38110        |
| Auth API health       | http://localhost:38101/health |
| Auth pages dev server | http://localhost:3001/auth/   |
| Ewe Note dev server   | http://localhost:5181/        |
| Dozzle log viewer     | http://localhost:9999         |

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

These defaults work for local development. Override them in `.env` if needed.

| Variable               | Default                   | Description                     |
| ---------------------- | ------------------------- | ------------------------------- |
| `POSTGRES_HOST_PORT`   | `5499`                    | PostgreSQL host port            |
| `SYNC_A_HOST_PORT`     | `38181`                   | Primary sync server host port   |
| `SYNC_B_HOST_PORT`     | `38182`                   | Secondary sync server host port |
| `AGGREGATOR_HOST_PORT` | `38190`                   | Aggregator host port            |
| `AUTH_API_HOST_PORT`   | `38101`                   | Auth API host port              |
| `DOZZLE_PORT`          | `9999`                    | Dozzle host port                |
| `SERVER_SECRET`        | `dev-secret`              | Auth API secret                 |
| `BETTER_AUTH_SECRET`   | `change-me-in-production` | better-auth secret              |
| `SYNC_AUTH_SECRET`     | `dev-secret`              | Shared sync token secret        |
| `WEBHOOK_SECRET`       | `dev-webhook-secret`      | Sync webhook secret             |

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
