# Deploy EweserDB to DigitalOcean

Use a **Droplet** ($6/mo) with the VPS setup script — all services run together on one machine via Docker Compose.

> **Note:** DigitalOcean App Platform deploys each service separately (~$25/mo total). Use Railway for managed one-click deploys instead.

---

## DigitalOcean Droplet (Docker Compose)

**Quickest path** — SSH into your new Droplet and run:

```bash
curl -fsSL https://raw.githubusercontent.com/eweser/eweser-db/main/scripts/setup-vps.sh | bash
# Or with a domain:
DOMAIN=yourdomain.com bash <(curl -fsSL https://raw.githubusercontent.com/eweser/eweser-db/main/scripts/setup-vps.sh)
```

The script installs Docker, clones the repo, generates all secrets, and starts the stack. Skip to [Point your domain](#5-point-your-domain) when done.

---

### Manual setup

- **Image:** Ubuntu 24.04 LTS
- **Plan:** Basic — $6/month (1 vCPU, 512 MB RAM, 10 GB disk)
- **Region:** Closest to your users
- **Authentication:** SSH key (recommended)

See [minimum-specs.md](./minimum-specs.md) for sizing guidance.

### 2. Install Docker

```bash
ssh root@your-droplet-ip
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
```

Log out and back in so the group change takes effect.

### 3. Clone and configure

```bash
git clone https://github.com/eweser/eweser-db.git
cd eweser-db
cp .env.example .env
```

Edit `.env`:

```bash
nano .env
```

Required values to change:

```env
POSTGRES_PASSWORD=<strong-random-password>
SERVER_SECRET=<random-32-chars>
BETTER_AUTH_SECRET=<random-32-chars>
SYNC_AUTH_SECRET=<random-32-chars>
DOMAIN=your-domain.com          # or your droplet IP
AUTH_PUBLIC_URL=https://your-domain.com
AUTH_PUBLIC_DOMAIN=your-domain.com
SYNC_PUBLIC_URL=wss://your-domain.com/sync
```

Generate secrets:

```bash
openssl rand -hex 32  # run 4 times, one for each secret
```

### 4. Use the production Compose file

```bash
docker compose -f docker-compose.prod.yml up -d
```

This uses `docker-compose.prod.yml` which adds health checks, restart policies, and resource limits appropriate for production.

### 5. Point your domain

If using a custom domain, create an **A record** pointing to your Droplet's IP address in your DNS provider.

Caddy handles HTTPS automatically via Let's Encrypt — no certbot needed.

Wait 1–2 minutes for the TLS certificate to provision, then visit `https://your-domain.com`.

### 6. Verify the deployment

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Check the health endpoint
curl https://your-domain.com/api/health
# Should return: {"status":"ok"}
```

---

## Observability (Optional)

Logging and metrics are opt-in. Without configuration, services log to stdout and `./logs/` only.

### Built-in: JSON File Logs

In production, all services write JSON logs to `./logs/app-YYYY-MM-DD.log` (one file per day). No configuration needed:

```bash
# On the server
tail -f ./logs/app-$(date +%Y-%m-%d).log | pino-pretty
grep '"level":50' ./logs/app-2026-04-09.log
```

### Optional: Axiom Cloud (Logs + Metrics)

Axiom's free tier (500 GB/mo) is generous for personal deployments. Both logs and metrics go to the same account.

**1. Create datasets at https://app.axiom.co:**

- `eweser-db-events` (type: **Events**) — for structured logs
- `eweser-db-metrics` (type: **Metrics**) — for host metrics

**2. Add to `.env` on your server:**

```env
AXIOM_API_KEY=your-axiom-ingest-token
AXIOM_EVENTS_DATASET=eweser-db-events
AXIOM_METRICS_DATASET=eweser-db-metrics
```

**3. Restart services:**

```bash
docker compose -f docker-compose.prod.yml up -d
```

**4. Query logs in Axiom:**

```apl
// Recent errors from any service
['eweser-db-events'] | where level >= 50 | take 20

// Slow requests (>1s)
['eweser-db-events'] | where duration_ms > 1000 | take 50
```

**Host metrics available:** CPU, memory, GC duration, event loop lag, active handles — all tagged with `service.name` and `deployment.environment`.

---

## Updates

To update your deployment when a new version is released:

```bash
cd eweser-db
git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Operator Backups

DigitalOcean can take automated PostgreSQL backups if you use their managed database. For a Droplet, back up the Docker volumes:

```bash
# Backup PostgreSQL data
docker exec eweser-db-postgres-1 pg_dump -U eweser eweser > backup-$(date +%Y%m%d).sql

# Backup sync server SQLite
docker cp eweser-db-sync-server-1:/data/sync.sqlite ./sync-backup-$(date +%Y%m%d).sqlite
```

### Restore Drill

Run this in a non-production shell on a regular schedule and record the date in your ops log:

```bash
# Create a scratch database for restore verification
docker exec -i eweser-db-postgres-1 psql -U eweser -c "CREATE DATABASE eweser_restore_check;"

# Restore the most recent dump into the scratch database
cat backup-$(date +%Y%m%d).sql | docker exec -i eweser-db-postgres-1 psql -U eweser eweser_restore_check

# Verify the schema restored
docker exec eweser-db-postgres-1 psql -U eweser -d eweser_restore_check -c "\\dt"

# Remove the scratch database once verification is complete
docker exec eweser-db-postgres-1 psql -U eweser -c "DROP DATABASE eweser_restore_check;"
```

Keep the latest drill note with:

- The exact date and operator
- Backup filename restored
- `\dt` output confirmation
- Any restore errors or timing anomalies

These operator backups are separate from user snapshot backups. User snapshots
are uploaded through the auth API to the configured object-storage provider and
listed from the account app. Operator backups cover PostgreSQL and sync-server
runtime state; user snapshots cover exported room data selected by the client.

## Alert Watch

During launch, monitor:

- Auth 429 spikes on sign-in, sign-up, forgot-password, and verification resend
- `password.reset.delivery_failed` and `email.verification.delivery_failed` events
- MCP 401/403 surges or unusual token-issuance spikes

If those alerts fire, follow `docs/security-incident-response.md` immediately.

---

## Troubleshooting

**Containers not starting?**

```bash
docker compose -f docker-compose.prod.yml logs --tail=50
```

**502 Bad Gateway from Caddy?**
The auth-api or sync-server may still be starting. Wait 30 seconds and try again. Check: `docker compose ps`.

**Database connection errors?**
Ensure `POSTGRES_PASSWORD` in `.env` matches what PostgreSQL initialized with. If you changed the password after first run, you may need to run `docker compose down -v` to reset (⚠️ deletes data).
