# Plan: Go-Live Security Hardening

## Goal

Harden EweserDB's public auth and remote-access surface for production launch by adding the missing anti-abuse, account-security, session-safety, edge-security, and MCP/agent protections around the existing Hono + better-auth stack.

## Acceptance Criteria

- Public auth flows enforce server-side abuse controls, not just client-side CAPTCHA.
- Production auth/server startup fails when critical secrets, origins, or HTTPS assumptions are unsafe.
- Sensitive account actions have explicit verification/recovery/session-invalidation behavior.
- MCP, OAuth, and agent-token routes have launch-reviewed scopes, expiry, logging, and transport policy.
- Edge/browser policy is explicit enough that cookies, CSP, HSTS, and framing behavior are intentional rather than framework defaults.
- Security-critical flows have automated coverage in package tests and at least smoke-path E2E coverage.
- A launch checklist exists covering secrets, dependency review, observability, backups, and incident-response basics.

## Scope

- In:
  - `packages/auth-server-hono` auth hardening for sign-in, sign-up, session, OAuth, account recovery, and agent/MCP routes
  - `packages/auth-pages` UX and flow changes needed for CAPTCHA, email verification, recovery, MFA/passkeys, and safer auth messaging
  - `docker/Caddyfile`, `docker-compose.prod.yml`, and auth env validation needed for headers, HTTPS-only assumptions, trusted origins, and proxy-aware deployment hardening
  - Security-focused tests in auth-server-hono, auth-pages, and E2E coverage for critical login/account flows
  - Minimal documentation updates for production env and go-live checklist
- Out:
  - End-to-end encryption
  - Full enterprise IAM / SSO / SCIM
  - Mobile-native auth flows
  - Broad privacy-policy or legal-document drafting
  - Re-architecting sync-server auth beyond the auth server and MCP interfaces it already consumes

## Architecture Review

- `packages/auth-server-hono` is the main implementation target. Any schema changes require new Drizzle migrations in `packages/auth-server-hono/drizzle/`; never edit or delete existing migrations.
- `packages/auth-pages` is an SPA client to the auth API. Security decisions that rely on browser enforcement must still be enforced server-side in Hono/better-auth.
- No `packages/shared`, `packages/db`, or `packages/examples-components` changes are required for the recommended baseline, so no published-package changeset is expected unless scope expands later.
- MCP and OAuth are already live surfaces in `auth-server-hono`; hardening them is part of launch readiness, not optional follow-up.
- Current baseline:
  - Workspace build is green from root `npm run build`
  - Auth server currently lacks explicit global hardening for auth route rate limits, security headers, strict production env checks, email verification/recovery flows, and tighter MCP CORS policy
  - Auth pages currently expose straightforward sign-in/sign-up forms without recovery, MFA, or anti-enumeration UX
  - The current `/mcp` implementation uses permissive `origin: '*'` CORS and an in-memory session cache that needs an explicit launch stance

## Runs

### Run 1: Auth API baseline hardening

- **Recommended tier**: `strong`
- **Reason**: Cross-cutting security defaults in the auth server affect every auth/session flow and are easy to get subtly wrong.
- [ ] Add production-safe auth configuration in `packages/auth-server-hono/src/auth.ts`
- [ ] Enforce strict production env validation in `packages/auth-server-hono/src/env.ts`
  - Fail startup on placeholder secrets
  - Require HTTPS public URLs in production
  - Add explicit trusted-origin / auth-domain configuration
- [ ] Add shared request-hardening middleware in `packages/auth-server-hono/src/index.ts`
  - Origin/proxy-aware request handling
  - Safer default headers for API responses where appropriate
  - Request/response logging review to avoid leaking secrets, tokens, codes, or sensitive query params
- [ ] Add input validation for auth-adjacent JSON routes that currently accept raw bodies without schema parsing
- [ ] Document new required env vars in `packages/auth-server-hono/example.env` and deployment files
- [ ] Files to change:
  - `packages/auth-server-hono/src/auth.ts`
  - `packages/auth-server-hono/src/env.ts`
  - `packages/auth-server-hono/src/index.ts`
  - `packages/auth-server-hono/example.env`
  - `docker-compose.prod.yml`
- [ ] Tests to write:
  - Env validation tests for production-only constraints
  - Route tests asserting safe behavior when origin/headers/env are invalid

### Run 2: Abuse prevention on auth entry points

- **Recommended tier**: `strong`
- **Reason**: CAPTCHA only helps if paired with server-side throttling, lockouts, and non-enumerating failure behavior.
- [ ] Finish CAPTCHA integration with server-side verification, timeout handling, and fail-closed behavior for protected flows
- [ ] Add reusable rate-limiting middleware for:
  - email sign-in
  - email sign-up
  - password-reset request
  - password-reset completion
  - email verification resend
  - OAuth authorize/token endpoints
  - agent token verification / MCP auth failures
- [ ] Add short temporary lockout / backoff strategy per account and per IP for repeated auth failures
- [ ] Normalize auth error responses so login/signup/recovery do not leak whether an email exists
- [ ] Review proxy header trust assumptions; only trust forwarded IPs when requests come from the known reverse proxy path
- [ ] Files to change:
  - `packages/auth-server-hono/src/routes/auth.ts` or wrapper middleware around better-auth routes
  - `packages/auth-server-hono/src/routes/oauth.ts`
  - `packages/auth-server-hono/src/routes/agents.ts`
  - `packages/auth-server-hono/src/routes/mcp.ts`
  - `packages/auth-pages/src/pages.tsx`
- [ ] Tests to write:
  - Rate-limit tests for repeated failed sign-in and reset requests
  - CAPTCHA-required path tests
  - Enumeration-resistance tests for login/reset/signup messaging

### Run 3: Account integrity, recovery, and session safety

- **Recommended tier**: `strong`
- **Reason**: This adds missing core account controls and may require DB schema/plugin work plus flow updates across API and SPA.
- [ ] Enforce email verification policy for sensitive actions
  - decide minimum gate: agent token creation, OAuth consent, room/access-grant actions, password reset completion, possibly all sign-ins
- [ ] Implement password reset request + completion flow in the auth UI and backend config
- [ ] Add session revocation behavior after password change/reset
  - sign out all other sessions
  - invalidate outstanding recovery flows
- [ ] Add basic account-security event logging/audit trail for high-risk actions
  - password reset requested/completed
  - email verified
  - MFA enabled/disabled
  - agent token created/rotated/revoked
- [ ] Review whether better-auth plugin tables/migrations are needed for verification/recovery state; add migrations if required
- [ ] Files to change:
  - `packages/auth-server-hono/src/auth.ts`
  - `packages/auth-server-hono/src/routes/account.ts`
  - `packages/auth-pages/src/pages.tsx`
  - `packages/auth-pages/src/lib/auth-client.ts`
  - `packages/auth-server-hono/drizzle/*` if plugin/schema additions are required
- [ ] Tests to write:
  - Password reset happy-path and expired-token tests
  - Session invalidation tests after reset/change
  - Email verification gating tests on protected actions

### Run 4: MFA and passkey rollout

- **Recommended tier**: `strong`
- **Reason**: User-facing MFA/passkey work is security-critical and touches both backend auth plugins and SPA flow state.
- [ ] Fold the existing `2026-04-11-2fa-user-security.md` work into go-live execution
- [ ] Implement TOTP 2FA enrollment, challenge, backup codes, and recovery UX
- [ ] Add passkey/WebAuthn support if supported cleanly by the installed better-auth version; otherwise explicitly split passkeys behind a deferred run and document why
- [ ] Decide enforcement policy:
  - optional for all users at launch
  - required for admin/operator accounts
  - recommended prompt after signup or first sensitive action
- [ ] Add `/account/security` management UI in auth-pages
- [ ] Files to change:
  - `packages/auth-server-hono/src/auth.ts`
  - `packages/auth-pages/src/lib/auth-client.ts`
  - `packages/auth-pages/src/pages.tsx`
  - `packages/auth-server-hono/drizzle/*` if plugin tables are introduced
- [ ] Tests to write:
  - 2FA challenge flow tests
  - Backup code tests
  - Security page rendering and action tests

### Run 5: Edge, headers, cookies, and browser policy hardening

- **Recommended tier**: `coder`
- **Reason**: This is operationally important but more configuration-heavy than logic-heavy.
- [ ] Add or tighten Caddy-delivered headers:
  - HSTS
  - CSP
  - `frame-ancestors`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - sensible permissions policy
- [ ] Confirm cookie policy for auth sessions is explicit and production-safe
  - `Secure`
  - `HttpOnly`
  - `SameSite`
  - auth subdomain/domain scoping
- [ ] Review SPA asset CSP requirements so auth-pages, landing, and notes still load cleanly
- [ ] Ensure OAuth and auth callback routes are compatible with the final CSP/frame policy
- [ ] Tighten CORS where possible:
  - keep `/mcp` only as permissive as remote MCP clients require
  - do not widen API CORS for browser routes unnecessarily
- [ ] Files to change:
  - `docker/Caddyfile`
  - `docker-compose.prod.yml`
  - `packages/auth-server-hono/src/auth.ts`
  - `packages/auth-server-hono/src/routes/mcp.ts`
  - auth/static serving config if CSP requires script/style nonce or hash adjustments
- [ ] Tests to write:
  - Header assertions in route/proxy tests where feasible
  - Manual verification checklist for CSP/OAuth/cookie behavior

### Run 6: MCP and agent token hardening

- **Recommended tier**: `strong`
- **Reason**: MCP is a high-value remote surface with cross-user data implications if tokens or scopes are mishandled.
- [ ] Tighten `/mcp` authentication and transport policy
  - review `origin: '*'`
  - ensure only required headers/methods are exposed
  - rate-limit auth failures and expensive session creation paths
- [ ] Reduce blast radius of agent tokens
  - default expirations
  - stricter creation defaults
  - clearer read vs readwrite scopes
  - optional one-time creation constraints or explicit warnings in UI
- [ ] Add higher-confidence logging for token rotation/revocation and MCP access anomalies
- [ ] Review multi-instance session-cache note in `routes/mcp.ts`; decide whether launch requires Redis-backed session storage or an explicit single-instance deployment constraint
- [ ] Review OAuth client registration assumptions and hardcoded first-party clients
- [ ] Files to change:
  - `packages/auth-server-hono/src/routes/mcp.ts`
  - `packages/auth-server-hono/src/routes/agents.ts`
  - `packages/auth-server-hono/src/routes/oauth.ts`
  - `packages/auth-pages/src/pages.tsx` if agent-management UX is added in scope
  - `packages/auth-server-hono/src/model/agents.ts` and related schema if defaults change
- [ ] Tests to write:
  - MCP unauthorized/origin/cors tests
  - Agent token expiry/rotation/revocation tests
  - OAuth misuse/pathological-input tests

### Run 7: Supply-chain, secrets, and operational hardening

- **Recommended tier**: `coder`
- **Reason**: Launch security is not complete without deployment, secret-handling, auditability, and recovery controls outside the request handlers themselves.
- [ ] Add or tighten secret-handling and deployment controls
  - document minimum secret length/rotation policy for auth, sync, OAuth, CAPTCHA, and DB credentials
  - ensure example env files and compose configs do not normalize insecure defaults for production
  - verify backups/restores exist for Postgres before launch
- [ ] Add dependency/security review gates that fit the current repo workflow
  - dependency audit policy with triage, not blind auto-failures
  - secret scanning / leak-prevention in CI if not already enabled
  - image/package update review for auth-server-hono and public SPAs
- [ ] Add security observability basics
  - structured audit events for sign-in failures, lockouts, reset flows, agent token events, and suspicious MCP access
  - launch-time alerts/log review checklist for abuse spikes and repeated auth failures
- [ ] Add a short incident-response playbook
  - how to rotate `BETTER_AUTH_SECRET`, `SERVER_SECRET`, `SYNC_AUTH_SECRET`, OAuth client secrets, and CAPTCHA secrets
  - how to revoke sessions, agent tokens, and OAuth tokens quickly
- [ ] Files to change:
  - CI workflow files if present and in scope
  - `packages/auth-server-hono/example.env`
  - `docker-compose.prod.yml`
  - `docs/security-go-live-checklist.md` or equivalent
  - deployment docs / runbooks
- [ ] Tests to write:
  - CI smoke checks for production env safety where feasible
  - Documentation-backed manual verification steps for backup/restore and secret rotation

### Run 8: Final verification and launch gate

- **Recommended tier**: `coder`
- **Reason**: This is mostly test wiring, CI policy, and final release gates after the security work lands.
- [ ] Add a go-live verification checklist under docs
- [ ] Run and fix package tests for auth-server-hono and auth-pages, then expand E2E coverage for:
  - sign-up with CAPTCHA
  - sign-in with throttling feedback
  - email verification
  - password reset
  - MFA challenge
  - OAuth consent
- [ ] Add dependency and secret-scanning gates as appropriate for the existing CI stack
  - validate the policies added in Run 7 are actually wired and passing
- [ ] Verify root `npm run build` and relevant `npm test` remain green
- [ ] Files to change:
  - `e2e/cypress/tests/*`
  - package test files in `packages/auth-server-hono` and `packages/auth-pages`
  - `docs/deployment.md` or new `docs/security-go-live-checklist.md`
- [ ] Tests to write:
  - New Cypress coverage for the critical auth flows above
  - CI smoke checks for production env safety

## Execution Summary

| Run | Title | Tier | Depends on | Can parallelise with |
|-----|-------|------|------------|----------------------|
| 1 | Auth API baseline hardening | strong | None | None |
| 2 | Abuse prevention on auth entry points | strong | 1 | Partially with 5 after interfaces are decided |
| 3 | Account integrity, recovery, and session safety | strong | 1 | Partially with 5 |
| 4 | MFA and passkey rollout | strong | 1, 3 | Partially with 5 |
| 5 | Edge, headers, cookies, and browser policy hardening | coder | 1 | 2, 3, 4 |
| 6 | MCP and agent token hardening | strong | 1, 2 | 5 |
| 7 | Supply-chain, secrets, and operational hardening | coder | 1 | 5, 6 |
| 8 | Final verification and launch gate | coder | 2, 3, 4, 5, 6, 7 | None |

## Launch Priority

- **Must be complete before public launch**: Runs 1, 2, 3, 5, 6, 7, 8.
- **Strongly recommended before launch**: Run 4 for TOTP; if passkeys are not cleanly supported in the current better-auth version, ship without passkeys but document the gap explicitly.

## Notes

- Expected migration touchpoints are in `packages/auth-server-hono/drizzle/` for any MFA, verification, audit, or lockout persistence that cannot be handled purely by existing better-auth tables/plugins.
- No changeset is currently expected because the scoped packages are private/internal. Reassess if implementation expands into published packages.
- Current repo baseline checked during planning: root `npm run build` passes.
- Keep implementation order pragmatic:
  - Run 1 first because it defines the production-safe auth/server contract.
  - Run 2 and Run 3 next because they close the highest-risk public auth gaps.
  - Run 5 and Run 6 should finish before launch because browser policy and remote MCP access are both externally reachable surfaces.
  - Run 7 is not optional busywork; if secrets, backups, rotation, and alerts are undefined, launch readiness is incomplete.
