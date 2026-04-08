# Plan: One-Click Deploy — DigitalOcean & Railway

## Goal

Make both one-click deploy buttons functional and deploy a real production instance of EweserDB on each platform.

## Current State

| Issue | Detail |
|-------|--------|
| Railway template 404 | Template URL `https://railway.app/template/eweser-db` points to an unpublished template. No `railway.toml` in repo. |
| DO button may fail | `.do/app.yaml` exists but is missing `auth-pages`, `ewe-note`, and `aggregator` services. |
| ewe-note no Dockerfile | `packages/ewe-note/` has no Dockerfile; needed for both platforms. |
| auth-pages Dockerfile uses `COPY . .` | Requires monorepo root build context — must match `.do/app.yaml` `source_dir: /` |

## Routing Architecture

| URL | Service |
|-----|---------|
| `yourdomain.com` | Static landing page |
| `yourdomain.com/auth/` | Auth pages (login/signup) |
| `yourdomain.com/api/` | Auth API (Hono) |
| `yourdomain.com/sync` | Hocuspocus WebSocket |
| `yourdomain.com/aggregator/` | Aggregator API |
| `notes.yourdomain.com` | Ewe Note app (subdomain) |

Caddy handles subdomain routing for `notes.*` and path routing for everything else. On DO App Platform, this requires the `notes` service to have its own domain mapping.

## Scope

**In:**
- Create `packages/ewe-note/Dockerfile` (nginx + monorepo build)
- Update Caddyfile to serve `notes.{$DOMAIN}` as a separate virtual host
- Fix/complete `.do/app.yaml` (add auth-pages, ewe-note, aggregator with subdomain route)
- Create `railway.toml` for multi-service Railway deployment
- Update Railway deploy button URL (Railway "deploy from GitHub" format, not template URL)
- Create `.env.example` with all production vars documented
- Actually deploy to DigitalOcean using the existing API key

**Out:**
- Aggregator Dockerfile changes (already complete ✓)
- SSL cert provisioning (handled by Caddy auto-HTTPS / platform)
- Custom domain configuration (user-specific)
- Federated / multi-node setup

## Runs

### Run 1: ewe-note Dockerfile

**Recommended Agent:** `02-coder` (Fast)  
**Reason:** Straightforward copy of auth-pages Dockerfile pattern with ewe-note workspace names substituted.

- [ ] Create `packages/ewe-note/Dockerfile`
  - Multi-stage: node:22-slim builder (monorepo root context, builds shared → db → ewe-note)
  - Serve stage: nginx:1.29-alpine serving `packages/ewe-note/dist` at `/usr/share/nginx/html`
  - Copy `packages/auth-pages/nginx.conf` as reference (or create `packages/ewe-note/nginx.conf`)
- [ ] Verify: `docker build -f packages/ewe-note/Dockerfile .` from repo root succeeds

**Files:**
- `packages/ewe-note/Dockerfile` (create)
- `packages/ewe-note/nginx.conf` (create — copy from auth-pages)

---

### Run 2: Fix `.do/app.yaml` + Caddyfile subdomain routing

**Recommended Agent:** `02-coder` (Fast)  
**Reason:** Config editing — adding missing services and subdomain routing.

The DigitalOcean App Platform button URL is structurally valid. Current issues to fix:
- Missing `auth-pages` service (Dockerfile exists, needs `source_dir: /`)
- Missing `ewe-note` service (Dockerfile from Run 1) — routes via own subdomain `notes.{domain}` (DO custom domain)
- Missing `aggregator` service (Dockerfile exists ✓, `source_dir: packages/aggregator`)
- `sync-server` missing env vars: `AGGREGATOR_WEBHOOK_URL`, `WEBHOOK_SECRET`
- Remove Caddy from DO App Platform spec (DO handles TLS/routing itself)
- Update Caddyfile for self-hosted: `notes.{$DOMAIN}` as separate virtual host routing to ewe-note nginx

**Files:**
- `.do/app.yaml` (modify)
- `docker/Caddyfile` (update — add `notes.{$DOMAIN}` virtual host)

---

### Run 3: Create `railway.toml`

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** Railway config format has nuances — multi-service monorepo setup needs correct `[build]` and `[deploy]` sections per service.

Railway's `railway.toml` format supports a single service per file. For multi-service monorepos, Railway uses `railway.json` or multiple config files, OR deploys are managed per-service through the dashboard with a shared repo.

**Practical approach:** Railway doesn't have native multi-service `railway.toml` support like Docker Compose. The recommended Railway approach for a monorepo is:
1. One Railway project
2. Multiple "services" each pointing to the same repo but different build configs
3. A `railway.toml` at root can configure the _default_ service; per-service overrides are set via Railway dashboard

**What to create:**
- `railway.toml` — configures the primary service (auth-api) + documents the multi-service setup
- `packages/auth-server-hono/railway.toml` — per-service config for auth-api
- `packages/sync-server/railway.toml` — per-service config for sync-server
- `packages/aggregator/railway.toml` — per-service config for aggregator

**Railway button URL fix:**
The correct format for deploying from a GitHub repo (not a published template):
```
https://railway.app/new/template?template=https://github.com/eweser/eweser-db
```
This works without needing to publish a Railway template. Update `README.md` and `docs/deployment/railway.md`.

**Files:**
- `railway.toml` (create)
- `packages/auth-server-hono/railway.toml` (create)
- `packages/sync-server/railway.toml` (create)
- `packages/aggregator/railway.toml` (create)
- `README.md` (update Railway button URL)
- `docs/deployment/railway.md` (update button URL + add multi-service instructions)

---

### Run 4: `.env.example` and docs

**Recommended Agent:** `02-coder` (Fast)  
**Reason:** Documentation and config file creation.

- [ ] Create `.env.example` with all production vars, comments, and `openssl rand -hex 32` generation instructions
- [ ] Update `docs/deployment/digital-ocean.md` — accurate step-by-step for current stack
- [ ] Update `docs/deployment/railway.md` — accurate multi-service setup instructions

**Files:**
- `.env.example` (create)
- `docs/deployment/digital-ocean.md` (update)
- `docs/deployment/railway.md` (update)

---

### Run 5: Deploy to DigitalOcean

**Recommended Agent:** `02-coder` (Smart)  
**Reason:** Uses DO API key from `.env`. Needs to create the App Platform app via `doctl` or DO API, then verify deployment succeeds.

**Steps:**
1. Install/verify `doctl` CLI is available
2. Authenticate with the DO API key from `.env`
3. Create the app: `doctl apps create --spec .do/app.yaml`
4. Monitor deployment until health checks pass
5. Note the assigned URL
6. Update `README.md` with a live demo URL if desired

**Dependencies:** Runs 1, 2 must be complete. Repo must be public (it is).

**Risk:** The DO API key in `.env` is a personal key — the App Platform app will be created under that account.

---

### Run 6: Railway deployment guidance

**Recommended Agent:** Human (or `02-coder` with Railway CLI)  
**Reason:** Railway deployment requires OAuth browser-based authentication; cannot be scripted from `.env` credentials alone.

**What the coder can prepare:**
- Install Railway CLI: `npm install -g @railway/cli`
- Create a `setup-railway.sh` script that runs `railway login`, creates the project, adds services, and sets env vars
- Document exact commands

**What the user must do manually:**
- `railway login` (opens browser)
- `railway link` to associate with the project
- Set secrets via dashboard or `railway variables set`

**Files:**
- `scripts/setup-railway.sh` (create — interactive setup script)

---

## Risks

| Risk | Mitigation |
|------|-----------|
| DO App Platform doesn't support Caddy as a service (it manages routing itself) | Remove Caddy from `.do/app.yaml` — DO App Platform has its own routing/HTTPS |
| ewe-note Dockerfile build time may be slow (full monorepo `npm ci`) | Use layer caching; consider a lighter build that only installs workspace deps needed |
| Railway template vs "deploy from GitHub" UX difference | The GitHub deploy URL still works; template publishing is optional |
| WEBHOOK_SECRET missing from env | Add to `.env.example` and `.do/app.yaml` global envs |
| `sync-server` on DO App Platform uses ephemeral filesystem — SQLite state lost on restart | Use `instance_count: 1` and accept SQLite volatility for MVP; note in docs |

## Execution Summary

```text
Run 1: ewe-note Dockerfile (Fast)
Run 2: Fix .do/app.yaml (Fast)  ← depends on Run 1 (needs ewe-note confirmed)
Run 3: railway.toml (Smart)     ← can run parallel with Run 2
Run 4: .env.example + docs (Fast) ← parallel with Run 2+3
    └── Run 5: Deploy to DO (Smart) ← depends on Runs 1+2 merged to main
    └── Run 6: Railway setup script (Fast) ← depends on Run 3
```

Parallel opportunities:
- Runs 2, 3, 4 can all start simultaneously after Run 1 is done
- Run 5 and 6 are sequential deployments after config files land

## Status

- [ ] Approved by user
