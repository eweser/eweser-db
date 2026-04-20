# Security Go-Live Checklist

## 1. Secrets and Environment

- Set strong random values (32+ chars) for:
  - `SERVER_SECRET`
  - `BETTER_AUTH_SECRET`
  - `SYNC_AUTH_SECRET`
  - OAuth client secrets
  - Turnstile secret keys
- Configure:
  - `AUTH_SERVER_URL` and `BETTER_AUTH_BASE_URL` to HTTPS origin
  - `AUTH_TRUSTED_ORIGINS` with explicit production origins only
  - `MCP_ALLOWED_ORIGINS` to approved MCP client origins
  - `TRUST_PROXY=true` only behind known reverse proxy path
- Ensure no `.env` files are committed and secret-scanning CI is green.

## 2. Auth and Account Safety

- Confirm server-side controls are active:
  - Rate limits on sign-in/sign-up/reset/OAuth/token verification endpoints
  - Temporary lockout/backoff on repeated auth failures
  - CAPTCHA enforcement on protected auth endpoints (when configured)
  - Email verification required for sensitive actions
- Confirm account recovery works end-to-end:
  - Forgot password request
  - Password reset completion
  - Session revocation on password reset
- Confirm 2FA rollout:
  - Enable/disable TOTP
  - Verify TOTP challenge flow
  - Regenerate and store backup codes
  - Passkeys/WebAuthn: deferred at launch (not supported by installed `better-auth` plugin set)

## 3. Edge and Browser Policy

- Caddy headers verified in production response:
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `X-Frame-Options` / `frame-ancestors`
  - `Permissions-Policy`
- Confirm auth cookies are `Secure`, `HttpOnly`, and `SameSite=Lax` in production.
- Verify OAuth and `/mcp` CORS behavior matches allowed origins only.

## 4. MCP and Agent Token Hardening

- Confirm agent token defaults:
  - Expiration default and max TTL
  - Read/readwrite scope restrictions
  - Rotation and revocation events are logged
- Confirm `/mcp` behavior:
  - Unauthorized requests return 401
  - Session mode and deployment model are explicit (`single` vs `redis`)
  - Access anomalies are visible in logs/audit events

## 5. Supply Chain and Operations

- CI gates passing:
  - Lint, format, type-check, tests
  - Secret scanning
  - Dependency audit triage (no critical runtime vulnerabilities)
- Postgres backup/restore drill completed:
  - Backup procedure documented
  - Restore tested in non-production environment
- On-call launch watch:
  - Monitor auth failures, lockout spikes, and MCP auth failures
  - Alert route defined for suspicious bursts

## 7. Launch Evidence

- Verified artifacts for this hardening pass:
  - Email delivery and security logging: `packages/auth-server-hono/src/auth.ts`, `packages/auth-server-hono/src/email.ts`
  - Reset request canonical path and legacy alias coverage: `packages/auth-server-hono/src/routes/auth.ts`, `packages/auth-server-hono/src/routes/auth.test.ts`
  - 32+ character secret enforcement and provider env validation: `packages/auth-server-hono/src/env.ts`, `packages/auth-server-hono/src/env.test.ts`
  - Automated auth smoke in CI: `scripts/run-e2e-smoke.mjs`, `e2e/cypress/tests/auth-security-smoke.cy.ts`, `.github/workflows/quality.yaml`
  - Ops drill and alert route reference: `docs/ai/research/2026-04-20-go-live-ops-evidence.md`, `docs/security-incident-response.md`, `docs/deployment/digital-ocean.md`

## 6. Incident Response Quick Actions

- Credential/key compromise:
  - Rotate `BETTER_AUTH_SECRET`, `SERVER_SECRET`, `SYNC_AUTH_SECRET`
  - Rotate OAuth client secrets and CAPTCHA secrets
- Active account abuse:
  - Revoke affected sessions (`/auth/revoke-other-sessions` or admin procedure)
  - Revoke/rotate affected agent tokens
  - Revoke affected OAuth access tokens
- Post-incident:
  - Capture timeline and affected users
  - Preserve relevant security/audit logs
  - File remediation tasks before relaunch
