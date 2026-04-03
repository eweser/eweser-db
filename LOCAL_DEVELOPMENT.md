# Local Development Setup

> **Docker-only backend** — Backend services (PostgreSQL, sync servers, aggregator, auth API) run in Docker. Frontend apps run on the host via `npm run dev` for hot reloading.

## Prerequisites

| Software                                                          | Version  | Notes                                 |
| ----------------------------------------------------------------- | -------- | ------------------------------------- |
| [Node.js](https://volta.sh/)                                      | v20.11.0 | Managed by Volta (see `package.json`) |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest   | Required for backend services         |
| Git                                                               | Any      | For cloning                           |

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/eweser/eweser-db.git
cd eweser-db
npm install

# 2. Start backend services (Docker)
npm run dev:docker

# 3. Start frontend apps (in a new terminal)
npm run dev
```

| App               | URL                           |
| ----------------- | ----------------------------- |
| Example app       | http://localhost:38110        |
| Auth API (health) | http://localhost:38101/health |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Your Browser                         │
│  ┌─────────────┐  ┌──────────────────────────────────┐ │
│  │   Example   │  │  Other apps using @eweser/db      │ │
│  │   App       │  │                                  │ │
│  │ (Vite dev)  │  │                                  │ │
│  └──────┬──────┘  └───────────────┬───────────────────┘ │
│         │                         │                     │
│         │    ┌───────────────────┘                     │
│         │    │                                         │
│  ┌──────▼────▼────┐                                    │
│  │  @eweser/db    │  ← Yjs CRDT, IndexedDB local      │
│  │  (core SDK)    │    persistence                    │
│  └──────┬─────────┘                                    │
└─────────┼───────────────────────────────────────────────┘
          │ WebSocket (Hocuspocus)
          │                  ┌─────────────────────────┐
          │                  │   Docker Compose Dev    │
          │    ┌────────────▼──────────┐              │
          │    │  Hocuspocus Sync      │              │
          │    │  Server (x2)          │              │
          │    └────────────┬──────────┘              │
          │                 │                          │
          │    ┌────────────▼──────────┐              │
          │    │  PostgreSQL           │              │
          │    │  Auth API (Hono +     │              │
          │    │  better-auth)         │              │
          │    │  Aggregator           │              │
          │    └────────────────────────┘              │
          └──────────────────────────────────────────────┘
```

## NPM Scripts

### Docker Backend

```bash
npm run dev:docker       # Start all backend services
npm run dev:docker:stop  # Stop all services
npm run dev:docker:build # Rebuild & start
npm run dev:docker:logs  # Tail logs
npm run dev:docker:clean # Stop and remove volumes
```

### Frontend Dev Servers

```bash
npm run dev              # Start all frontend dev servers (DB, shared, examples)
npm run dev:db           # Core SDK only (watch mode)
npm run dev:shared       # Shared types only (watch mode)
npm run dev:example-basic # Example app only
```

### Quality & Release

```bash
npm run check      # lint + format + type-check + test
npm run lint:fix   # Auto-fix lint issues
npm run format     # Auto-fix formatting
npm run changeset  # Create a changeset for publishing
```

## VS Code Tasks

Open Command Palette → "Tasks: Run Task" → select one of:

| Task                           | Description                           |
| ------------------------------ | ------------------------------------- |
| **Docker: Start Backend**      | Start all backend services            |
| **Docker: Stop Backend**       | Stop all backend services             |
| **Docker: Rebuild & Start**    | Rebuild images and start              |
| **Docker: Clean Volumes**      | Stop and delete all data              |
| **Docker: View Logs**          | Tail backend logs                     |
| **Run All Dev**                | Docker backend + all frontend servers |
| **Run DB Dev**                 | Core SDK only                         |
| **Run Shared Dev**             | Shared types only                     |
| **Run Example-basic Dev**      | Example app only                      |
| **Run Example-components Dev** | UI components only                    |

## Environment Variables

Default values work for local development. Override in `.env.local` if needed:

| Variable               | Default                   | Description                 |
| ---------------------- | ------------------------- | --------------------------- |
| `POSTGRES_HOST_PORT`   | `5499`                    | PostgreSQL port             |
| `POSTGRES_PASSWORD`    | `changeme`                | PostgreSQL password         |
| `SYNC_A_HOST_PORT`     | `38181`                   | Primary sync server port    |
| `SYNC_B_HOST_PORT`     | `38182`                   | Secondary sync server port  |
| `AGGREGATOR_HOST_PORT` | `38190`                   | Aggregator service port     |
| `AUTH_API_HOST_PORT`   | `38101`                   | Auth API port               |
| `SYNC_AUTH_SECRET`     | `dev-secret`              | Secret for sync server auth |
| `WEBHOOK_SECRET`       | `dev-webhook-secret`      | Webhook authentication      |
| `SERVER_SECRET`        | `dev-secret`              | Auth server secret          |
| `BETTER_AUTH_SECRET`   | `change-me-in-production` | better-auth secret          |

## Docker Services

| Service         | Internal Port | Host Port | Purpose                       |
| --------------- | ------------- | --------- | ----------------------------- |
| `postgres`      | 5432          | 5499      | Database                      |
| `sync-server`   | 8080          | 38181     | Primary CRDT sync             |
| `sync-server-2` | 8080          | 38182     | Secondary CRDT sync           |
| `aggregator`    | 8090          | 38190     | Data indexing                 |
| `auth-api`      | 3000          | 38101     | Auth API (Hono + better-auth) |

## Stopping Services

```bash
# Stop Docker backend
npm run dev:docker:stop

# Stop everything (Ctrl+C in terminals running dev servers)

# Clean slate (removes all data)
npm run dev:docker:clean
```

## Common Issues

### Port Already in Use

```bash
# Find what's using port 38101
lsof -i :38101
# or
docker ps --format "{{.Names}}\t{{.Ports}}"
```

### Docker Build Fails

```bash
# Clean Docker cache and rebuild
docker system prune -a
npm run dev:docker:build
```

### Docker Build Context Errors

If you see `"/src": not found` or similar path errors during build, the build context for that service is wrong. Each `build:` in `docker-compose.dev.yml` must set `context` to the package directory (not repo root), except for `auth-api` which expects repo root:

```yaml
# ✅ Correct — context is the package directory
sync-server:
  build:
    context: packages/sync-server
    dockerfile: Dockerfile

# ✅ Correct — auth-api Dockerfile uses COPY packages/shared paths
auth-api:
  build:
    context: .
    dockerfile: packages/auth-server-hono/Dockerfile

# ❌ Wrong — context is repo root but Dockerfile does COPY src/ src/
sync-server:
  build:
    context: .
    dockerfile: packages/sync-server/Dockerfile
```

### "Too Many Event Listeners"

This happens when too many rooms are connected. Use `db.disconnectRoom()` to disconnect from rooms when not needed.

## Project Structure

```
packages/
  db/                    ← @eweser/db — Core SDK (Yjs, IndexedDB)
  shared/                ← @eweser/shared — Types & utilities
  auth-server-hono/      ← Auth API (Hono + better-auth)
  aggregator/            ← Search/indexing service
  examples-components/   ← Reusable UI components
  sync-server/           ← Hocuspocus sync server

examples/
  example-basic/         ← Minimal demo app
  example-multi-room/    ← Multi-room demo
  example-interop-notes/ ← Notes interoperability demo
  example-interop-flashcards/ ← Flashcards demo
  example-aggregator/    ← Aggregator demo
```

## E2E Tests

E2E tests (Cypress) are **not yet Docker-ized**. They currently run against:

- Legacy Next.js auth-server on port `38100`
- Built example-basic preview on port `38110`

After the auth-server migration is complete (removing Next.js), the E2E smoke test in `.github/workflows/quality.yaml` will need updating to use the Docker backend instead.

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- See [README.md](README.md) for project philosophy and API overview
- Check `docs/deployment/` for production deployment guides
