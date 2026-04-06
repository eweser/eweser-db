# Deploy EweserDB to DigitalOcean

Two deployment options: **App Platform** (managed, no SSH) or **Droplet** (full control).

---

## Option A: DigitalOcean App Platform

Click the button below to deploy EweserDB to DigitalOcean App Platform with one click:

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/eweser/eweser-db/tree/main)

> The `.do/app.yaml` spec at the root of this repo configures the App Platform deployment.

### What you'll need

- A DigitalOcean account (free to sign up)
- A domain name (optional but recommended for HTTPS)

### Steps

1. Click "Deploy to DigitalOcean" above
2. Connect your DigitalOcean account if prompted
3. Review the app spec — DigitalOcean will provision a managed PostgreSQL database automatically
4. Set the required environment variables:
   - `POSTGRES_PASSWORD` — a strong random password (DigitalOcean can generate one)
   - `SERVER_SECRET` — a random 32-character string (`openssl rand -hex 16`)
   - `BETTER_AUTH_SECRET` — a random 32-character string
   - `SYNC_AUTH_SECRET` — a random 32-character string
   - `DOMAIN` — your custom domain, or leave blank for the default `*.ondigitalocean.app` domain
5. Click **Create Resources**
6. Wait ~5 minutes for the deployment to complete
7. Your EweserDB instance is live at the URL shown in the dashboard

---

## Option B: DigitalOcean Droplet (Docker Compose)

Recommended if you want full control, SSH access, or are running other services on the same server.

### 1. Create a Droplet

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

## Updates

To update your deployment when a new version is released:

```bash
cd eweser-db
git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Backups

DigitalOcean can take automated PostgreSQL backups if you use their managed database. For a Droplet, back up the Docker volumes:

```bash
# Backup PostgreSQL data
docker exec eweser-db-postgres-1 pg_dump -U eweser eweser > backup-$(date +%Y%m%d).sql

# Backup sync server SQLite
docker cp eweser-db-sync-server-1:/data/sync.sqlite ./sync-backup-$(date +%Y%m%d).sqlite
```

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
