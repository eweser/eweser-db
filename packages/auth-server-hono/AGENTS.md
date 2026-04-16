# Auth Server — Agent Instructions

Applies to: `packages/auth-server-hono/`

## Stack

- **Hono** — lightweight web framework
- **better-auth** — authentication (email/password, OAuth)
- **Drizzle ORM** — type-safe SQL queries
- **PostgreSQL** — self-hosted (via Docker Compose)
- **JWT** — room access tokens issued by sync-server auth hook

> Migration note: This replaced a legacy Next.js auth server. Prefer framework-agnostic approaches.

## Database

- Drizzle ORM with PostgreSQL (not Supabase)
- Migrations in `drizzle/` folder — **never delete, only add**
- Generate migration: `npx drizzle-kit generate`
- Apply migration: `npx drizzle-kit migrate`

## Key Routes

| Route | Purpose |
|-------|---------|
| `GET /health` | Health check |
| `GET /.well-known/oauth-authorization-server` | OAuth metadata |
| `/auth/*` | better-auth routes (login, signup, OAuth) |
| `/account/*` | User account management |
| `/access-grants/*` | Room access permissions |
| `/agents/*` | AI agent management |
| `/oauth/*` | OAuth 2.0 flows |
| `/mcp/*` | MCP (Model Context Protocol) endpoints |

## Required Environment Variables

See `example.env` or `LOCAL_DEVELOPMENT.md`:

- `DATABASE_URL` — PostgreSQL connection string
- `SERVER_SECRET` — JWT signing secret
- `BETTER_AUTH_SECRET` — better-auth encryption key
- `BETTER_AUTH_BASE_URL` — public auth server URL
- `SYNC_SERVER_URL` — Hocuspocus sync server URL
- `SYNC_AUTH_SECRET` — shared secret with sync server

## Security

- Validate all input with Zod before DB operations
- Use parameterised Drizzle queries — never raw SQL string interpolation
- JWT tokens must be verified on every protected route
- No secrets in code or committed `.env` files
