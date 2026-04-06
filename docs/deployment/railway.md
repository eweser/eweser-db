# Deploy EweserDB to Railway

Railway offers managed container deployments with zero server management. No SSH, no Dockerfiles to maintain — just connect your repo and go.

---

## One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/eweser-db?referralCode=eweser)

> Note: The Railway template is configured from `railway.toml` at the root of this repo.

---

## Manual Setup

If the one-click button isn't available, follow these steps:

### 1. Create a Railway project

1. Sign in at [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect your GitHub account if prompted
4. Select the `eweser/eweser-db` repository (or your fork)

### 2. Add a PostgreSQL database

In your Railway project:

1. Click **New** → **Database** → **PostgreSQL**
2. Railway will automatically add a `DATABASE_URL` environment variable to your project

### 3. Add services

EweserDB runs as multiple services. Add each one:

**Auth API:**

- Source: `packages/auth-server-hono`
- Dockerfile: `packages/auth-server-hono/Dockerfile`
- Root directory: `/` (so it can access workspace dependencies)

**Sync Server:**

- Source: `packages/sync-server`
- Dockerfile: `packages/sync-server/Dockerfile`

**Caddy (reverse proxy):**

- Source: `docker/caddy`
- Set the public domain from Railway's generated domain

### 4. Set environment variables

In each service, configure these environment variables:

```env
POSTGRES_PASSWORD=<from-railway-postgres-plugin>
SERVER_SECRET=<random-32-chars>
BETTER_AUTH_SECRET=<random-32-chars>
SYNC_AUTH_SECRET=<random-32-chars>
BETTER_AUTH_BASE_URL=https://<your-railway-domain>
AUTH_SERVER_DOMAIN=<your-railway-domain>
AUTH_SERVER_URL=https://<your-railway-domain>
SYNC_SERVER_URL=wss://<your-railway-domain>/sync
SYNC_PUBLIC_URL=wss://<your-railway-domain>/sync
```

Generate secrets:

```bash
openssl rand -hex 32  # run once per secret
```

### 5. Deploy

Railway auto-deploys on every push to your repository's default branch.

Click **Deploy** to trigger the first deployment.

---

## Costs

Railway's **Starter plan** ($5/month) is sufficient for personal use:

- 512 MB RAM per service
- 1 GB disk
- Shared CPU

See [minimum-specs.md](./minimum-specs.md) for resource requirements.

---

## Custom Domain

1. In Railway, click your service → **Settings** → **Domains**
2. Add your custom domain
3. Create the DNS record your DNS provider as instructed by Railway
4. TLS is handled automatically by Railway

---

## Updates

Railway deploys automatically when you push to the connected branch. No manual intervention needed.

---

## Limitations vs. VPS Deploy

- **Persistent volumes**: Railway's volume support is newer and simpler than Docker. The sync server's SQLite is stored in a Railway volume — it works but isn't as battle-tested as a dedicated VPS.
- **No SSH**: If you need shell access to debug, a Droplet or dedicated server is better.
- **Pricing at scale**: Railway pricing scales with usage. For > 5 concurrent users, comparing Railway vs. a $12 Hetzner server is worthwhile.
