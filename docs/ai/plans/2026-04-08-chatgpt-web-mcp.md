# Plan: ChatGPT Web MCP Integration (Remote HTTP MCP + OAuth 2.0)

## Goal

Add a remotely-hosted HTTP MCP endpoint to `auth-server-hono` so users can connect ChatGPT web (and any other remote MCP client) to their EweserDB data using OAuth 2.0.

## Background

The existing `@eweser/mcp` package uses stdio transport (local only — Claude Desktop, Copilot). ChatGPT web requires:
1. A publicly hosted MCP endpoint using **Streamable HTTP transport** (`POST /mcp`)
2. **OAuth 2.0 Authorization Code + PKCE** — ChatGPT fetches `/.well-known/oauth-authorization-server`, then redirects the user to authorize and exchanges a code for an access token
3. The MCP endpoint must accept that access token as a `Bearer` token

The MCP SDK v1.29.0 (already installed) includes `WebStandardStreamableHTTPServerTransport` and even a Hono example at `dist/cjs/examples/server/honoWebStandardStreamableHttp.js`. The tool logic in `packages/mcp-server/src/tools.ts` is already written and just needs a new entry point.

## Architecture Decision

Add the HTTP MCP endpoint **directly into `auth-server-hono`** as new routes:
- `POST /mcp` — Streamable HTTP MCP endpoint (authenticated via OAuth access token or agent bearer token)
- `GET /.well-known/oauth-authorization-server` — OAuth 2.0 server metadata
- `GET /oauth/authorize` — Authorization page (redirect to auth-pages login flow)
- `POST /oauth/token` — Token exchange endpoint
- `POST /oauth/revoke` — Token revocation

This keeps a single origin for all API calls and reuses the existing PostgreSQL user/session infrastructure via Drizzle.

**Out of scope for this plan:** better-auth's `oidcProvider` plugin (not yet stable enough and overkill — we need a minimal OAuth 2.0 AS, not full OIDC).

## Scope

**In:**
- `packages/auth-server-hono`: new routes (`/mcp`, `/oauth/*`, `/.well-known/oauth-authorization-server`)
- New DB migration: `oauth_clients` and `oauth_codes` tables (Drizzle + Postgres)
- `packages/mcp-server/src/tools.ts` refactored to export a `registerTools` factory (it already does — just verify the import path works from the hono package)
- Caddy config: route `/mcp` and `/oauth` to `auth-api`
- `docker-compose.dev.yml` / `docker-compose.prod.yml`: no new services needed
- Documentation: `packages/mcp-server/README.md` — new "Remote / ChatGPT Web" section

**Out:**
- Mobile clients (separate plan)
- better-auth `oidcProvider` plugin
- Publishing a separate `@eweser/mcp-http` npm package
- Persistent MCP sessions (stateless per-request mode is sufficient for ChatGPT)

## Runs

### Run 1: DB schema — `oauth_clients` and `oauth_codes` tables

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Pure Drizzle schema + migration, no logic

Tasks:
- [ ] Add `oauth_clients` table to `packages/auth-server-hono/src/db/schema/` with fields: `id`, `clientId`, `clientName`, `redirectUris` (jsonb), `isFirstParty` (bool), `createdAt`
- [ ] Add `oauth_codes` table: `id`, `code` (hashed), `userId`, `clientId`, `codeChallenge`, `codeChallengeMethod`, `redirectUri`, `expiresAt`, `usedAt`
- [ ] Add `oauth_access_tokens` table: `id`, `tokenHash`, `userId`, `clientId`, `scopes`, `expiresAt`, `revokedAt`
- [ ] Run `npm run db:generate` and `npm run db:migrate` in `packages/auth-server-hono`
- [ ] Seed: insert the ChatGPT well-known `client_id` (`chatgpt-web`) as a first-party client in a migration or seed script

Files:
- `packages/auth-server-hono/src/db/schema/oauth.ts` (new)
- `packages/auth-server-hono/src/db/schema/index.ts` (add export)
- `packages/auth-server-hono/drizzle/` (generated migration)

---

### Run 2: OAuth 2.0 Authorization Server routes

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Security-critical auth code flow; needs careful PKCE + timing-safe comparisons

Tasks:
- [ ] `GET /.well-known/oauth-authorization-server` — return RFC 8414 metadata JSON pointing at `/oauth/authorize` and `/oauth/token`
- [ ] `GET /oauth/authorize?client_id=&redirect_uri=&code_challenge=&code_challenge_method=S256&state=&scope=` — validate params, require user session (redirect to `/api/auth/sign-in` if not logged in), show consent UI (simple HTML or redirect to auth-pages), store code in DB, redirect back with `?code=&state=`
- [ ] `POST /oauth/token` — exchange auth code for access token; verify PKCE S256 challenge; issue `oauth_access_tokens` record; return `{ access_token, token_type: "bearer", expires_in }`
- [ ] `POST /oauth/revoke` — revoke a token (set `revokedAt`)
- [ ] Middleware `oauthBearerAuth`: extract `Authorization: Bearer <token>`, hash it, look up `oauth_access_tokens`, verify not expired/revoked, attach `userId` to context — used by the MCP route

Files:
- `packages/auth-server-hono/src/routes/oauth.ts` (new)
- `packages/auth-server-hono/src/middleware/oauth-bearer-auth.ts` (new)
- `packages/auth-server-hono/src/model/oauth.ts` (new — DB calls)
- `packages/auth-server-hono/src/index.ts` (add `app.route('/oauth', oauthRouter)` and `/.well-known`)
- `packages/auth-server-hono/src/routes/oauth.test.ts` (new — happy-path tests)

---

### Run 3: HTTP MCP endpoint (`POST /mcp`)

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Integrates MCP SDK transport with existing DataLayer/tools; needs per-request initialization

Tasks:
- [ ] Install `@eweser/mcp` as a workspace dep in `auth-server-hono` (or copy/re-export `registerTools` and `DataLayer` — prefer workspace dep)
- [ ] Create `packages/auth-server-hono/src/routes/mcp.ts`: Hono route `app.all('/mcp', ...)` that:
  1. Accepts `Authorization: Bearer` token (OAuth access token **or** legacy agent bearer token — check `oauth_access_tokens` first, then `agent_configs`)
  2. Resolves `userId` and permissions from token
  3. On first request per user session, initializes `DataLayer` (connect to Hocuspocus rooms for that user)
  4. Creates `WebStandardStreamableHTTPServerTransport`, registers tools via `registerTools(...)`, connects MCP server, delegates to `transport.handleRequest(c.req.raw)`
  5. Adds CORS headers needed by ChatGPT: `mcp-session-id`, `mcp-protocol-version`
- [ ] Session management: use `mcp-session-id` header to cache `DataLayer` instances across calls (stateful sessions) — fall back to stateless (re-init each request) if header absent
- [ ] Update `packages/auth-server-hono/src/index.ts` to mount the MCP router
- [ ] Update `packages/auth-server-hono/example.env` with any new vars (none expected)

Files:
- `packages/auth-server-hono/src/routes/mcp.ts` (new)
- `packages/auth-server-hono/src/index.ts` (add route)
- `packages/auth-server-hono/package.json` (add `@eweser/mcp` workspace dep)
- `packages/mcp-server/src/tools.ts` (verify exports are clean — may need minor refactor)
- `packages/mcp-server/src/data-layer.ts` (verify exports)

---

### Run 4: Caddy + Docker wiring

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Config-only changes

Tasks:
- [ ] `docker/Caddyfile`: add `handle /mcp { reverse_proxy auth-api:3000 }` and `handle /oauth/* { reverse_proxy auth-api:3000 }` and `handle /.well-known/* { reverse_proxy auth-api:3000 }`
- [ ] `docker-compose.prod.yml`: verify `auth-server-hono` is the `auth-api` service (check current state — may already be wired)
- [ ] Test locally: `docker compose -f docker-compose.dev.yml up --build` and verify the health check on `/mcp`

Files:
- `docker/Caddyfile`
- `docker-compose.prod.yml` (possibly no change)

---

### Run 5: Consent UI in auth-pages

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Simple React SPA page; deterministic implementation

Tasks:
- [ ] Add `/oauth/consent` route to `packages/auth-pages` (React SPA)
- [ ] Shows: app name, requested scopes, "Allow" / "Deny" buttons
- [ ] On "Allow": POST to `/oauth/authorize` with `?action=approve` to complete the auth code redirect
- [ ] On "Deny": redirect back with `error=access_denied`
- [ ] For ChatGPT (first-party client): auto-approve without showing consent page (skip to redirect immediately)

Files:
- `packages/auth-pages/src/pages/OAuthConsent.tsx` (new)
- `packages/auth-pages/src/App.tsx` (add route)

---

### Run 6: Documentation + README

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Docs only

Tasks:
- [ ] `packages/mcp-server/README.md`: add "Remote MCP / ChatGPT Web" section with setup instructions (add server URL in ChatGPT settings → Connectors → MCP)
- [ ] `docs/ai/plans/2026-04-08-chatgpt-web-mcp.md`: mark status Approved

---

## Risks

1. **ChatGPT's OAuth client_id** — ChatGPT web uses a specific `client_id` in its OAuth flow (e.g. `https://chatgpt.com`). The exact value needs to be confirmed from ChatGPT's documentation or by testing. The first-party client seeding in Run 1 should use the real value.
2. **PKCE implementation** — Must be timing-safe. Use `crypto.timingSafeEqual` for all hash comparisons. Incorrect PKCE is a security vulnerability.
3. **DataLayer lifecycle in HTTP context** — `DataLayer` currently assumes a long-lived process (Hocuspocus WebSocket connections). In the stateless HTTP case, each request would reconnect — this could be slow. The session-caching approach in Run 3 mitigates this but needs careful cleanup to avoid connection leaks.
4. **Monorepo dep order** — `auth-server-hono` depending on `@eweser/mcp` creates a new intra-monorepo dependency. Must verify `@eweser/mcp` builds cleanly as a library entry point (currently its `main` points to `dist/index.js` which is the CLI binary entry). May need to add a separate library export.
5. **Changeset** — Neither `auth-server-hono` (private) nor `@eweser/mcp` (published) API changes that break clients, but `@eweser/mcp` exportability change would be a minor semver bump.

## Execution Summary

```text
Run 1: DB schema (Fast) ─────────────────────────────────────────────┐
Run 2: OAuth routes (Smart) ──────────── depends on Run 1            │
Run 3: HTTP MCP endpoint (Smart) ─────── depends on Run 1, Run 2     │
Run 4: Caddy + Docker (Fast) ─────────── depends on Run 3            │
Run 5: Consent UI (Fast) ─────────────── depends on Run 2             │
         \                                                            │
          └─ Run 4 + Run 5 can run in parallel after Run 3           │
Run 6: Docs (Fast) ───────────────────── after all above             ─┘
```

Parallelizable:
- Run 4 and Run 5 can run simultaneously (different packages, same API contract from Run 2/3)

## Integration with One-Click Deploy Plan

This plan is intentionally merged with `2026-04-08-one-click-deploy.md`:

- **MCP Run 4 (Caddy wiring) folds into Deploy Run 2** — same Caddyfile edit; one coder does both
- **MCP env vars fold into Deploy Run 4** — `.env.example` documents OAuth vars alongside sync/auth secrets
- **Deploy Run 5 (actual DO deploy) depends on MCP Runs 1–3** — deploy after MCP routes land so it ships complete
- **E2E ChatGPT OAuth testing** requires the live DO URL (HTTPS redirect requirement); local dev can validate the MCP tools but not the full OAuth flow

### Combined Sequence

```text
MCP Run 1: DB schema (Fast)           ← start here (auth-server-hono only, no clash with deploy agent)
MCP Run 2: OAuth routes (Smart)       ← parallel safe: deploy agent is working on ewe-note
MCP Run 3: HTTP /mcp endpoint (Smart) ← after Run 2
     │
     ├── Deploy Run 2: .do/app.yaml + Caddyfile (folds in MCP Run 4 Caddy changes)
     ├── Deploy Run 3: railway.toml
     └── Deploy Run 4: .env.example + docs (includes MCP OAuth vars)
          │
          └── Deploy Run 5: doctl deploy to DO ← everything above done
```

## Status

- [x] Approved by user — fold into deploy plan, ship MCP with default server
