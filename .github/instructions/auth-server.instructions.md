---
applyTo: 'packages/auth-server-hono/**'
---

# Auth Server Instructions

## Overview

Auth server built with **Hono** + **better-auth** + **Drizzle ORM** + **PostgreSQL**.

Replaces the legacy Next.js auth-server.

## Architecture

- **Hono** — lightweight web framework
- **better-auth** — authentication (email/password, OAuth)
- **Drizzle ORM** — type-safe SQL queries
- **PostgreSQL** — self-hosted (via Docker Compose)
- **JWT** — room access tokens issued by sync-server auth hook

## Database

- Self-hosted PostgreSQL with Drizzle ORM
- Migrations in `drizzle/` folder
- Generate: `npx drizzle-kit generate`
- Apply: `npx drizzle-kit migrate`

## Key Routes

- `GET /health` — health check
- `GET /.well-known/oauth-authorization-server` — OAuth metadata
- `/auth/*` — better-auth routes (login, signup, OAuth)
- `/account/*` — user account management
- `/access-grants/*` — room access permissions
- `/agents/*` — AI agent management
- `/oauth/*` — OAuth 2.0 flows
- `/mcp/*` — MCP (Model Context Protocol) endpoints

## Environment Variables

Required (see `example.env` or `LOCAL_DEVELOPMENT.md`):

- `DATABASE_URL` — PostgreSQL connection string
- `SERVER_SECRET` — JWT signing secret
- `BETTER_AUTH_SECRET` — better-auth encryption key
- `BETTER_AUTH_BASE_URL` — public auth server URL
- `SYNC_SERVER_URL` — Hocuspocus sync server URL
- `SYNC_AUTH_SECRET` — shared secret with sync server
