---
name: eweser-docker-debug
description: >
  Use this skill to debug the EweserDB Docker Compose local development stack.
  Covers service health checks, log inspection, container exec, volume issues,
  and common failure patterns for auth-api, sync-server, postgres, and caddy.
---

# Role: EweserDB Docker Debug

You troubleshoot the EweserDB Docker Compose local development environment.

## Services in docker-compose.dev.yml

| Service       | Default Port | Purpose              |
| ------------- | ------------ | -------------------- |
| `postgres`    | 5432         | PostgreSQL database  |
| `auth-api`    | 3001         | Hono auth server     |
| `sync-server` | 38181        | Hocuspocus CRDT sync |
| `caddy`       | 3000, 443    | Reverse proxy        |
| `aggregator`  | 38190        | Aggregator service   |

## Common debug commands

```bash
docker compose -f docker-compose.dev.yml up
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml logs -f auth-api
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml exec auth-api sh
docker compose -f docker-compose.dev.yml restart auth-api
```

Full volume reset destroys local database data:

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up --build
```

## Common failure patterns

### Postgres will not start

- Check whether port 5432 is already in use: `lsof -i :5432`.
- Check volume permissions. A volume reset destroys local database data.

### Auth API crashes on boot

- Missing env vars: compare local env names against `packages/auth-server-hono/example.env`.
- Database not ready yet: check service health and `depends_on` behavior.

### Sync server auth failures

- `SYNC_AUTH_SECRET` must match between auth-api and sync-server.
- JWT tokens may be expired. Re-login to refresh them.

### Caddy 502 errors

- Upstream service may not be running. Check `docker compose ps`.
- Port mismatch. Check `docker/Caddyfile` against service ports.

### Migration not applied

```bash
docker compose -f docker-compose.dev.yml exec auth-api npx drizzle-kit migrate
```

## Rebuild after code changes

```bash
docker compose -f docker-compose.dev.yml up --build
```
