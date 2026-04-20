# @eweser/auth-server-hono

Authentication and user management server for EweserDB, built with [Hono](https://hono.dev/) + [better-auth](https://www.better-auth.com/) + [Drizzle ORM](https://orm.drizzle.team/).

## Overview

This package provides the authentication backend for EweserDB:

- **User authentication** — Email/password and OAuth sign-in via better-auth
- **Room access control** — Grant and manage access to shared data rooms
- **AI agent management** — Create and manage tokens for AI agents (MCP server)
- **OAuth 2.0 support** — Full OAuth server implementation for third-party integrations

## Tech Stack

| Component     | Technology  |
| ------------- | ----------- |
| Web Framework | Hono        |
| Auth Library  | better-auth |
| Database      | PostgreSQL  |
| ORM           | Drizzle     |
| Runtime       | Node.js 20+ |

## Development

```bash
# Install dependencies
npm install

# Set up environment
cp example.env .env
# Edit .env with your values

# Run database migrations
npx drizzle-kit migrate

# Start development server
npm run dev
```

## Docker

This service is included in the Docker Compose setup:

```bash
# From repo root
npm run dev:docker
```

## Environment Variables

| Variable               | Required | Description                    |
| ---------------------- | -------- | ------------------------------ |
| `DATABASE_URL`         | ✅       | PostgreSQL connection string   |
| `BETTER_AUTH_SECRET`   | ✅       | Encryption key for sessions    |
| `BETTER_AUTH_BASE_URL` | ✅       | Public URL of the auth server  |
| `SERVER_SECRET`        | ✅       | JWT signing secret             |
| `SYNC_AUTH_SECRET`     | ✅       | Shared secret with sync server |
| `SYNC_SERVER_URL`      | ✅       | Hocusp sync server URL         |
| `TURNSTILE_SECRET_KEY` |          | Optional Cloudflare Turnstile secret for signup captcha |
| `WEBHOOK_SECRET`       |          | Webhook validation secret      |

## API Routes

- `GET /health` — Health check
- `/auth/*` — better-auth authentication endpoints
- `/account/*` — User account management
- `/access-grants/*` — Room access permissions
- `/agents/*` — AI agent token management
- `/oauth/*` — OAuth 2.0 flows
- `/mcp/*` — Model Context Protocol endpoints

## Database Migrations

```bash
# Generate a new migration
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate
```

## Related Packages

- `@eweser/db` — Client SDK that connects to this server
- `@eweser/auth-pages` — React SPA login/signup UI
- `@eweser/sync-server` — Hocuspocus sync server (WebSocket)
