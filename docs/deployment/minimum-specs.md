# Minimum Hardware Specifications for Self-Hosting EweserDB

## TL;DR

EweserDB runs well on **a $6/month VPS with 512 MB RAM, 1 vCPU, and 10 GB disk**.

## Recommended Minimum

| Resource      | Minimum          | Comfortable      |
| ------------- | ---------------- | ---------------- |
| **RAM**       | 512 MB           | 1 GB             |
| **CPU**       | 1 vCPU           | 2 vCPU           |
| **Disk**      | 10 GB            | 25 GB            |
| **Bandwidth** | 500 GB/mo        | Unlimited        |
| **OS**        | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

## Why So Small?

EweserDB is local-first. The server is a **relay**, not a data warehouse:

- The sync server (Hocuspocus) only holds incremental Yjs update deltas, not full document copies
- The auth server handles authentication and room registry — low traffic for personal use
- The aggregator is optional and can run on the same host

Most personal deployments serve 1–5 users. At that scale, the $6/month tier at any major VPS provider is sufficient.

## Services and Their Memory Footprint

| Service                                    | Idle RAM    | Active RAM  |
| ------------------------------------------ | ----------- | ----------- |
| PostgreSQL                                 | ~80 MB      | ~150 MB     |
| Sync server (Hocuspocus)                   | ~30 MB      | ~60 MB      |
| Auth API (Hono)                            | ~30 MB      | ~50 MB      |
| Caddy (reverse proxy)                      | ~20 MB      | ~30 MB      |
| Aggregator (optional)                      | ~40 MB      | ~80 MB      |
| MinIO object storage (optional, for files) | ~120 MB     | ~200 MB     |
| **Total (no media)**                       | **~200 MB** | **~370 MB** |
| **Total (with MinIO)**                     | **~320 MB** | **~570 MB** |

## Storage Growth

### Text and structured data (base — free on eweser.com)

All text-based collections — notes, conversations, agent configs, agent backups, bookmarks, access logs — are stored as Yjs CRDT documents. These are very small and include built-in version history.

| Data type                        | Size per 1,000 items |
| -------------------------------- | -------------------- |
| Notes (text)                     | ~2 MB                |
| AI conversations                 | ~5 MB                |
| Agent config backups             | ~1 MB                |
| Yjs update log (version history) | ~3 MB                |
| PostgreSQL metadata              | ~1 MB                |

A power user with 10,000 notes + 5,000 conversations + agent backups: roughly **100 MB** of data. 10 GB disk is more than enough for years of text-only use.

### File and image storage (optional — premium on eweser.com)

Binary files (images, PDFs, video) are **not** stored in Yjs or PostgreSQL. They require a separate object storage service (MinIO for self-hosting). Yjs documents store only a content-addressed reference (hash/ID); the blob lives in object storage and is cached locally in the browser.

| User type                            | Rough data volume | Recommended disk |
| ------------------------------------ | ----------------- | ---------------- |
| Text-only                            | ~60 MB            | 10 GB            |
| Light media (1,000 photos, 500 docs) | ~4 GB             | 25 GB            |
| Heavy media (10,000 photos + video)  | 30–100 GB         | 100 GB+          |

> **Note:** The $6/month VPS is sufficient for text-only use. For media-heavy deployments, plan for a larger disk volume (most providers charge ~$0.10/GB/month for extra block storage).

## Network Requirements

- **Inbound ports:** 80 (HTTP, redirects to HTTPS), 443 (HTTPS)
- **Outbound:** Standard HTTPS. No special requirements.
- **Static IP:** Optional (DNS can use DDNS for dynamic IPs)

## Providers That Work Well

| Provider      | Min Plan       | Monthly Cost | Notes                                     |
| ------------- | -------------- | ------------ | ----------------------------------------- |
| DigitalOcean  | Basic Droplet  | $6/mo        | "Deploy to DigitalOcean" button available |
| Hetzner Cloud | CX11           | €4/mo        | Best price/performance in EU              |
| Vultr         | Cloud Compute  | $6/mo        | Good global coverage                      |
| Linode/Akamai | Nanode         | $5/mo        | Reliable US provider                      |
| Railway       | Starter        | $5/mo        | Managed containers, no SSH required       |
| Render        | Free → Starter | $7/mo        | Easy deploys from GitHub                  |
| Fly.io        | Free tier      | Free–$5/mo   | Container-based, generous free tier       |

## Docker + Docker Compose Required

All deployment guides assume:

- **Docker Engine** ≥ 24.0
- **Docker Compose** ≥ 2.20 (the `docker compose` plugin, not `docker-compose` v1)

To install on Ubuntu:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```
