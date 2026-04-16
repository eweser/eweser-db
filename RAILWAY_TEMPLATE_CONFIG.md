# Railway Template Environment Variables

Copy-paste these into each service's environment variables in the Railway template editor.

> **CRITICAL — Monorepo build config**: Railway requires `RAILWAY_DOCKERFILE_PATH` to be set as a
> service variable for each service (do NOT set Root Directory — leave it empty so the build
> context is always the repo root). See [Build Settings](#build-settings) below.

---

## Build Settings

For each service in the Railway template, set:

| Service     | Root Directory | `RAILWAY_DOCKERFILE_PATH` variable     |
| ----------- | -------------- | -------------------------------------- |
| auth-api    | _(empty)_      | `packages/auth-server-hono/Dockerfile` |
| sync-server | _(empty)_      | `packages/sync-server/Dockerfile`      |
| aggregator  | _(empty)_      | `packages/aggregator/Dockerfile`       |
| ewe-note    | _(empty)_      | `packages/ewe-note/Dockerfile`         |
| auth-pages  | _(empty)_      | `packages/auth-pages/Dockerfile`       |

**Why**: Railway resolves `deployfilePath` in `railway.toml` relative to the service root directory.
If root directory is a subdirectory (e.g. `packages/auth-server-hono`), the path gets double-prefixed.
The safe approach is to leave Root Directory empty (repo root = Docker build context) and set
`RAILWAY_DOCKERFILE_PATH` explicitly as a service variable.

---

## Environment Variables per Service

## auth-api

```env
RAILWAY_DOCKERFILE_PATH=packages/auth-server-hono/Dockerfile
DATABASE_URL=${{Postgres.DATABASE_URL}}
SERVER_SECRET=${{secret}}
BETTER_AUTH_SECRET=${{secret}}
SYNC_AUTH_SECRET=${{secret}}
BETTER_AUTH_BASE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
AUTH_SERVER_DOMAIN=${{RAILWAY_PUBLIC_DOMAIN}}
AUTH_SERVER_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
SYNC_SERVER_URL=wss://sync-server-${{RAILWAY_PUBLIC_DOMAIN}}
PORT=3000
```

## sync-server

```env
RAILWAY_DOCKERFILE_PATH=packages/sync-server/Dockerfile
SYNC_AUTH_SECRET=${{auth-api.SYNC_AUTH_SECRET}}
AGGREGATOR_WEBHOOK_URL=https://aggregator-${{RAILWAY_PUBLIC_DOMAIN}}/webhooks/hocuspocus
WEBHOOK_SECRET=${{secret}}
PORT=8080
```

## aggregator

```env
RAILWAY_DOCKERFILE_PATH=packages/aggregator/Dockerfile
DATABASE_URL=${{Postgres.DATABASE_URL}}
SYNC_SERVER_URL=wss://sync-server-${{RAILWAY_PUBLIC_DOMAIN}}
SYNC_AUTH_SECRET=${{auth-api.SYNC_AUTH_SECRET}}
WEBHOOK_SECRET=${{sync-server.WEBHOOK_SECRET}}
PORT=3001
```

## ewe-note

```env
RAILWAY_DOCKERFILE_PATH=packages/ewe-note/Dockerfile
VITE_AUTH_SERVER=https://${{auth-api.RAILWAY_PUBLIC_DOMAIN}}
```

## auth-pages

```env
RAILWAY_DOCKERFILE_PATH=packages/auth-pages/Dockerfile
VITE_AUTH_SERVER_URL=https://${{auth-api.RAILWAY_PUBLIC_DOMAIN}}
VITE_AUTH_API_URL=https://${{auth-api.RAILWAY_PUBLIC_DOMAIN}}
```

## Postgres

Use Railway's default PostgreSQL template or set:

```env
POSTGRES_DB=eweser
POSTGRES_USER=eweser
POSTGRES_PASSWORD=${{secret}}
```

---

## Template Setup Steps

1. **Remove `landing` service** (click X on the card)
2. **For each service**, set Root Directory to _(empty)_ in the service's Build settings
3. **Click each service** → **Variables** → **Edit Raw** → Paste the env vars above (including `RAILWAY_DOCKERFILE_PATH`)
4. **For secrets**: Use the `${{secret}}` placeholder - Railway will auto-generate
5. **For service references**: Use `${{service.VARIABLE}}` syntax
6. **Click Save**
7. **Click Publish**
8. **Copy the template code** (e.g., `a1b2c3d4`)
9. **Update README.md**:
   ```markdown
   [![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/new/template/YOUR_TEMPLATE_CODE)
   ```
