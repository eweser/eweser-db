---
applyTo: "packages/auth-server/**"
---

# Auth Server Instructions

## ⚠️ Migration In Progress

This package is being migrated **away from Next.js** to a standalone Node server (Express or Hono, TBD) + React SPA.

### Until migration is complete:
- Avoid adding Next.js-specific patterns
- Keep business logic in pure functions separate from framework code
- Drizzle queries, JWT logic, and Supabase client code should be framework-agnostic
- New API routes should be simple request/response handlers, not Next.js-coupled

## Auth Architecture

- **Supabase** handles user authentication (sign up, sign in, OAuth)
- **Drizzle ORM** for custom database queries (room access, user profiles)
- **JWT** tokens for room access authorization
- **Y-Sweet** connection strings issued by auth server for authorized rooms

## Database

- Supabase PostgreSQL with Drizzle ORM
- **Never delete migrations** — only add new ones
- Create migrations: `npx supabase migration new <name>`
- Apply locally: `npx supabase db reset`

## Environment Variables

Required (see `example.env` or `LOCAL_DEVELOPMENT.md`):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_CONNECTION_URL` (for Drizzle)
- `SERVER_SECRET` (for JWT signing)
- `Y_SWEET_CONNECTION_STRING`
