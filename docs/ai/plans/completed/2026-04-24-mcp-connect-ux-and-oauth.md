# Plan: MCP Connect UX and OAuth for Claude Desktop, Claude Web, ChatGPT Web, Copilot, Codex, and OpenClaw

Status: completed on 2026-04-24

## Goal

Ship a production-ready "Connect AI" experience on `eweser.com` that lets users connect Claude Desktop, Claude web, ChatGPT web, GitHub Copilot, Codex, and OpenClaw to their Eweser account with the least-friction auth flow each client can support, while adding the missing OAuth compatibility work for remote MCP clients.

## Scope

- In:
  - `packages/auth-pages` signed-in "Connect AI" UX for Claude Desktop, Copilot, and Codex
  - `packages/auth-pages` signed-in "Connect AI" UX for Claude Desktop, Claude web, ChatGPT web, Copilot, Codex, and OpenClaw
  - `packages/auth-server-hono` backend support for client-aware MCP auth onboarding
  - OAuth compatibility work for remote HTTP MCP clients that can authenticate against `https://www.eweser.com/mcp`
  - Smart-link / guided setup flow for local clients that still need an agent token bootstrap
  - MCP setup docs and snippets for the six target clients only
  - Route/unit/integration coverage for the new auth and setup flows
- Out:
  - Generic third-party OAuth marketplace support beyond these named clients
  - Passkeys/WebAuthn
  - Changes to Yjs document schemas or room sync semantics
  - Broad redesign of the rest of the auth app

## Acceptance Criteria

- Signed-in users can open a dedicated "Connect AI" page on `eweser.com` and see client cards for Claude Desktop, Claude web, ChatGPT web, Copilot, Codex, and OpenClaw.
- Each card clearly chooses one auth path:
  - Claude Desktop: short-lived, scoped agent token bootstrap with ready-to-paste stdio config
  - Claude web: remote HTTP MCP with OAuth
  - ChatGPT web: remote HTTP MCP with OAuth
  - Copilot: remote HTTP MCP with OAuth if supported by verified client metadata; otherwise token-backed HTTP fallback with explicit reason
  - Codex: remote HTTP MCP with OAuth if supported by verified client metadata; otherwise token-backed HTTP fallback with explicit reason
  - OpenClaw: guided token bootstrap with the correct local config format unless verified remote OAuth support is available and worth shipping
- OAuth support on `auth-server-hono` is extended so Copilot/Codex can authenticate without hand-created agent tokens when their client metadata is known or dynamically registered.
- Token bootstrap never puts bearer tokens in URLs; any smart link only lands on an authenticated setup page that can mint or rotate a token server-side.
- Users can revoke or rotate agent-token-based connections from the same UI.
- Documentation and generated snippets match the production endpoint and client config formats for all target clients.

## Architecture Notes

- `packages/auth-server-hono` is migration-sensitive and any schema change requires a new Drizzle migration; no existing migrations may be edited or removed.
- `packages/mcp-server` is a published package, but this plan avoids changing its public runtime API unless required for snippet parity. If implementation later changes its published contract, add a changeset.
- The existing `/mcp` route already accepts either OAuth bearer tokens or legacy agent bearer tokens; the work here is compatibility, registration, and onboarding UX rather than a new transport.
- No `packages/shared` changes are planned; this avoids a monorepo-wide downstream rebuild cascade.

## Proposed Auth Matrix

- Claude Desktop:
  - Primary: agent token + stdio `@eweser/mcp`
  - UX: "Connect" opens a guided setup page that creates a short-lived scoped token, shows the exact config JSON, and explains revoke/rotate
  - Reason: local desktop setup is config-driven and token bootstrap is the lowest-friction path today
- Claude web:
  - Primary: remote HTTP MCP at `https://www.eweser.com/mcp` with OAuth
  - UX: show the connector URL, explain the Claude Connectors flow, and rely on OAuth redirect/consent
  - Reason: Claude web already supports remote custom connectors; this should be a first-class launch path
- ChatGPT web:
  - Primary: remote HTTP MCP at `https://www.eweser.com/mcp` with OAuth
  - UX: show the connector URL, developer mode/custom connector prerequisites, and rely on OAuth redirect/consent
  - Reason: ChatGPT web supports remote MCP connectors and is a high-value AI-native surface for Eweser
- GitHub Copilot:
  - Primary: remote HTTP MCP at `https://www.eweser.com/mcp` with OAuth
  - Fallback: token-backed HTTP config snippet if verified OAuth client metadata is unavailable or incompatible during implementation
  - Reason: this is the cleanest long-term UX for VS Code-hosted MCP
- Codex:
  - Primary: remote HTTP MCP at `https://www.eweser.com/mcp` with OAuth
  - Fallback: token-backed HTTP config using `bearer_token_env_var`
  - Reason: Codex already has first-class remote MCP support, so OAuth is the right target when registration is in place
- OpenClaw:
  - Primary: token bootstrap with local config snippet
  - Secondary: remote HTTP MCP if OpenClaw's current production client support makes OAuth feasible without additional product risk
  - Reason: OpenClaw is still best served by explicit local config until its remote MCP auth story is verified in Run 1

## Runs

### Run 1: Lock Client Compatibility Matrix and UX Contract

- **Recommended tier**: strong
- **Reason**: This is the decision run. It fixes which client gets OAuth vs token bootstrap, validates official client metadata, and prevents churn in later backend/UI work.
- [x] Verify the current official MCP config/auth expectations for Claude Desktop, Claude web, ChatGPT web, GitHub Copilot, Codex, and OpenClaw against primary docs
- [x] Decide and document the final auth matrix per client, including fallback behavior if OAuth metadata cannot be verified for Copilot/Codex
- [x] Define the signed-in UX contract for `/account/connect-ai`:
  - card layout and copy
  - what "Connect" does for each client
  - what token scope/TTL defaults are used when a token path is required
  - what revoke/rotate/status metadata is surfaced
- [x] Explicitly verify the seeded `chatgpt-web` and `claude-web` OAuth registrations against current official callback/client requirements and record whether a migration is needed
- [x] Explicitly decide whether OpenClaw is launchable as token-only in this pass or needs remote HTTP MCP support added
- [x] Define the "smart link" rule explicitly: no token in URL, only server-generated setup sessions/pages
- [x] Confirm package boundaries and whether any published-package changeset will be required
- [ ] Files to update:
  - `docs/ai/plans/2026-04-24-mcp-connect-ux-and-oauth.md` (status/details)
  - optional supporting research note under `docs/ai/research/`
- [ ] Verification:
  - documented client matrix with exact endpoint/config expectations

### Run 2: OAuth Compatibility Layer for Claude Web, ChatGPT Web, Copilot, and Codex

- **Recommended tier**: strong
- **Reason**: Security-sensitive auth work spanning DB schema, OAuth routes, and remote MCP compatibility.
- [x] Extend the OAuth client model to support the required Claude web, ChatGPT web, Copilot, and Codex registration path:
  - preferred path: verified seeded first-party client entries for Claude web, ChatGPT web, Copilot, and Codex
  - fallback path if metadata is not stable enough: add minimal dynamic client registration support for public MCP clients
- [x] Add any required schema columns/tables for client registration metadata, trust level, or onboarding source
- [x] Add a new Drizzle migration; never modify existing `0003_oauth.sql`
- [x] Update OAuth route validation and authorization behavior to work with the chosen registration model
- [x] Ensure `/oauth/authorize`, `/oauth/token`, and `/.well-known/oauth-authorization-server` expose what the target clients need
- [x] Ensure `/mcp` continues to accept OAuth bearer tokens and agent tokens without ambiguity
- [x] Add or expand tests for:
  - Claude web and ChatGPT web client registration lookup
  - Copilot/Codex client registration lookup
  - redirect URI validation
  - PKCE code exchange
  - negative auth paths and revocation
- [ ] Files to change:
  - `packages/auth-server-hono/src/db/schema/oauth.ts`
  - `packages/auth-server-hono/src/model/oauth.ts`
  - `packages/auth-server-hono/src/routes/oauth.ts`
  - `packages/auth-server-hono/src/routes/oauth.test.ts`
  - `packages/auth-server-hono/src/index.ts`
  - `packages/auth-server-hono/drizzle/*` (new migration only)
- [ ] Tests to run:
  - `npm run build --workspace @eweser/auth-server-hono`
  - `npm test --workspace @eweser/auth-server-hono`

### Run 3: Agent Token Bootstrap and Setup Session APIs for Claude Desktop and OpenClaw

- **Recommended tier**: coder
- **Reason**: Core onboarding logic, but more bounded than the OAuth compatibility work.
- [x] Add a server-side onboarding API for "Connect AI" that creates a short-lived setup session for a target client
- [x] Implement token bootstrap for token-based flows:
  - mint scoped agent token server-side
  - default to conservative TTL and permissions
  - optionally prefill allowed collections/rooms if the UX exposes that in this pass
- [x] Return client-specific setup payloads without exposing tokens in query params
- [x] Add revoke/rotate helpers tuned for onboarding UX so users can refresh a broken setup from the same page
- [x] Reuse existing `agents` model/routes where possible instead of creating a parallel token system
- [x] Add route/model tests for setup session creation, token minting defaults, and rotate/revoke actions
- [ ] Files to change:
  - `packages/auth-server-hono/src/routes/agents.ts`
  - `packages/auth-server-hono/src/model/agents.ts`
  - new onboarding route or service under `packages/auth-server-hono/src/routes/` and/or `src/services/`
  - related test files
- [ ] Tests to run:
  - `npm run build --workspace @eweser/auth-server-hono`
  - targeted Vitest for new onboarding and agent flows

### Run 4: Signed-In Connect AI UX in Auth Pages

- **Recommended tier**: coder
- **Reason**: Cross-cutting but mostly UI/state orchestration inside the existing auth-pages SPA.
- [x] Add a dedicated signed-in route such as `/account/connect-ai`
- [x] Add navigation from the current account home/security surfaces
- [x] Build client cards with distinct UX:
  - Claude Desktop: generate token setup payload and render stdio config JSON
  - Claude web: show remote MCP URL, OAuth expectations, and launch steps
  - ChatGPT web: show remote MCP URL, OAuth expectations, and developer mode/setup steps
  - Copilot: show OAuth connect CTA if enabled, else HTTP token config fallback
  - Codex: show OAuth connect CTA if enabled, else HTTP token config fallback
- [x] Add OpenClaw card with token-based local config snippet and remote HTTP option only if Run 1/2 confirms it is worth exposing
- [x] Add post-connect state:
  - connection created / token issued
  - last used / expiry / permission level
  - revoke / rotate actions
- [x] Keep the page intentionally scoped; do not redesign unrelated account flows
- [x] Add auth-pages tests for rendering, connect actions, fallback messaging, and revoke/rotate flows
- [ ] Files to change:
  - `packages/auth-pages/src/pages.tsx`
  - `packages/auth-pages/src/App.test.tsx`
  - `packages/auth-pages/src/lib/api.ts`
  - any new local component files if the page is split
- [ ] Tests to run:
  - `npm run build --workspace @eweser/auth-pages`
  - `npm test --workspace @eweser/auth-pages`

### Run 5: Client Snippets, Docs, and Production Wiring

- **Recommended tier**: fast
- **Reason**: Mostly documentation and config parity once the behavior is settled.
- [x] Update MCP docs to document the six supported client paths only
- [x] Add production-ready snippets that exactly match the new onboarding payloads
- [x] Document OAuth path vs token fallback behavior so support/debugging is obvious
- [x] Verify production ingress/env wiring for:
  - `/.well-known/oauth-authorization-server`
  - `/oauth/*`
  - `/mcp`
  - `MCP_ALLOWED_ORIGINS`
- [ ] Files to change:
  - `packages/mcp-server/README.md`
  - deployment docs if current production docs are missing MCP auth setup notes
- [ ] Verification:
  - config snippets lint/parse cleanly
  - docs align with actual route behavior

### Run 6: End-to-End Verification and Launch Readiness

- **Recommended tier**: strong
- **Reason**: This feature crosses auth, docs, and production compatibility. Final verification needs a deliberate pass.
- [x] Validate the full happy paths in a production-like environment:
  - Claude Desktop token setup flow
  - Claude web OAuth flow
  - ChatGPT web OAuth flow
  - Copilot OAuth or fallback flow
  - Codex OAuth or fallback flow
  - OpenClaw token or remote flow
- [x] Validate failure paths:
  - expired token
  - revoked token
  - unregistered OAuth client
  - invalid redirect URI
- [x] Confirm security hardening remains intact:
  - rate limits
  - verified-email requirement for sensitive actions
  - no token-in-URL regressions
- [x] Decide whether to add a small Cypress or smoke test for the signed-in Connect AI page if the environment can support it cleanly
- [x] Update the security/deployment checklist docs if launch procedures changed
- [ ] Verification to run:
  - `npm run build`
  - relevant package test suites
  - optional targeted E2E/smoke if feasible

## Execution Summary

| Run | Title                                                                        | Tier   | Depends on | Can parallelise with          |
| --- | ---------------------------------------------------------------------------- | ------ | ---------- | ----------------------------- |
| 1   | Lock Client Compatibility Matrix and UX Contract                             | strong | None       | None                          |
| 2   | OAuth Compatibility Layer for Claude Web, ChatGPT Web, Copilot, and Codex    | strong | 1          | None                          |
| 3   | Agent Token Bootstrap and Setup Session APIs for Claude Desktop and OpenClaw | coder  | 1          | 2                             |
| 4   | Signed-In Connect AI UX in Auth Pages                                        | coder  | 1, 3       | 2 after API contract is fixed |
| 5   | Client Snippets, Docs, and Production Wiring                                 | fast   | 2, 3, 4    | None                          |
| 6   | End-to-End Verification and Launch Readiness                                 | strong | 2, 3, 4, 5 | None                          |

## Recommended Implementation Order

1. Finish Run 1 first and treat the auth matrix as fixed before code starts.
2. Start Run 2 immediately after Run 1 because it is the highest-risk compatibility/security work.
3. Run 3 can proceed in parallel once the UX/auth matrix is frozen.
4. Start Run 4 after the onboarding API contract from Run 3 is stable.
5. Leave Run 5 and Run 6 for the end so docs and verification reflect the shipped behavior rather than the intended behavior.

## Execution Notes

- Run 1 locked the launch matrix and recorded supporting research in `docs/ai/research/2026-04-24-mcp-client-matrix.md`.
- Run 2 added dynamic public client registration plus OAuth token last-used tracking.
- Run 3 added `/api/account/connect-ai/*` onboarding, rotate, and revoke routes on top of the existing agents system.
- Run 4 shipped `/account/connect-ai` with six client cards and scoped account navigation updates.
- Run 5 updated MCP documentation and verified existing Caddy routing already covers `/.well-known/*`, `/oauth/*`, and `/mcp`.
- Run 6 completed package builds and package test suites; root-wide verification is recorded in the final handoff.
