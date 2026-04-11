# Railway 1-Click Deploy Guide

## Quick Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/YOUR_TEMPLATE_ID)

## Manual Setup (if template not available)

### 1. Create Project
```bash
railway login
railway link
```

### 2. Add PostgreSQL
In Railway dashboard: **New** → **Database** → **Add PostgreSQL**

### 3. Add Services

For each service below, click **New** → **Empty Service**, then configure:

#### Auth API (`auth-api`)
- **Root Directory**: `packages/auth-server-hono`
- **Dockerfile Path**: `packages/auth-server-hono/Dockerfile`
- **Healthcheck Path**: `/health`
- **Environment Variables**:
  - `DATABASE_URL` (from PostgreSQL plugin)
  - `SERVER_SECRET` (generate: `openssl rand -hex 32`)
  - `BETTER_AUTH_SECRET` (generate)
  - `SYNC_AUTH_SECRET` (generate)
  - `BETTER_AUTH_BASE_URL` (your Railway URL)
  - `AUTH_SERVER_DOMAIN` (your Railway URL)
  - `AUTH_SERVER_URL` (your Railway URL)
  - `SYNC_SERVER_URL` (sync-server Railway URL)

#### Sync Server (`sync-server`)
- **Root Directory**: `packages/sync-server`
- **Dockerfile Path**: `packages/sync-server/Dockerfile`
- **Port**: 8080
- **Environment Variables**:
  - `SYNC_AUTH_SECRET` (same as auth-api)
  - `AGGREGATOR_WEBHOOK_URL` (aggregator webhook URL)
  - `WEBHOOK_SECRET` (generate)

#### Aggregator (`aggregator`)
- **Root Directory**: `packages/aggregator`
- **Dockerfile Path**: `packages/aggregator/Dockerfile`
- **Healthcheck Path**: `/health`
- **Environment Variables**:
  - `DATABASE_URL` (from PostgreSQL)
  - `SYNC_SERVER_URL` (sync-server URL)
  - `SYNC_AUTH_SECRET` (same as auth-api)
  - `WEBHOOK_SECRET` (same as sync-server)

#### Ewe Note (`ewe-note`)
- **Root Directory**: `packages/ewe-note`
- **Dockerfile Path**: `packages/ewe-note/Dockerfile`
- **Port**: 80

#### Auth Pages (`auth-pages`)
- **Root Directory**: `packages/auth-pages`
- **Dockerfile Path**: `packages/auth-pages/Dockerfile`
- **Port**: 80

### 4. Generate Public Domains
For each service: **Settings** → **Networking** → **Generate Domain**

### 5. Update Environment Variables
After domains are generated, update the `*_URL` variables in auth-api and sync-server.

### 6. Custom Domains (Optional)
Add your custom domain in Railway, then create CNAME records in your DNS provider.

## Environment Variables Reference

| Variable | Description | Required For |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | auth-api, aggregator |
| `SERVER_SECRET` | Session secret (32+ hex chars) | auth-api |
| `BETTER_AUTH_SECRET` | Auth encryption secret | auth-api |
| `SYNC_AUTH_SECRET` | Sync auth secret | auth-api, sync-server, aggregator |
| `WEBHOOK_SECRET` | Webhook signature secret | sync-server, aggregator |
| `BETTER_AUTH_BASE_URL` | Public auth API URL | auth-api |
| `AUTH_SERVER_DOMAIN` | Auth server domain | auth-api |
| `AUTH_SERVER_URL` | Full auth server URL | auth-api |
| `SYNC_SERVER_URL` | WebSocket sync URL | auth-api, aggregator |
| `AGGREGATOR_WEBHOOK_URL` | Aggregator webhook endpoint | sync-server |

## Troubleshooting

### Healthcheck Failures
Ensure your Dockerfile exposes the correct port and the healthcheck path responds.

### Build Failures
Check that the Dockerfile path is correct relative to the root directory setting.

### Database Connection Issues
Verify `DATABASE_URL` is set correctly and the PostgreSQL service is running.
