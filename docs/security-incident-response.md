# Security Incident Response (Auth + MCP)

## Immediate Containment

1. Freeze risky surfaces:
   - Temporarily disable new sign-ups.
   - Disable MCP ingress if compromise touches agent/OAuth tokens.
2. Rotate exposed secrets:
   - `BETTER_AUTH_SECRET`
   - `SERVER_SECRET`
   - `SYNC_AUTH_SECRET`
   - OAuth client secrets
   - CAPTCHA secret keys
3. Revoke active credentials:
   - Invalidate user sessions.
   - Revoke all agent tokens.
   - Revoke OAuth access tokens.

## Alert Routing

- Launch owner route:
  - Page on auth failure spikes, password-reset abuse bursts, or MCP auth failure surges.
  - Trigger conditions: repeated 429 bursts on auth endpoints, repeated `password.reset.delivery_failed`, or sustained 401/403 spikes on `/mcp`.
- Escalation route:
  - If the launch owner does not acknowledge within 15 minutes, page the backup operator and suspend new sign-ups until triage starts.
- Required data in the first page:
  - Absolute time window
  - Affected endpoint or service
  - Source IPs or origin set, if available
  - Last deploy SHA / release identifier

## Session and Token Revocation

- Revoke Better Auth sessions by deleting rows in `session` table for impacted users.
- Revoke agent tokens by clearing `agent_configs.token_hash` / setting `is_active=false`.
- Revoke OAuth tokens by setting `oauth_access_tokens.revoked_at=now()`.

## Forensics and Scope

- Pull affected events from:
  - `security_events`
  - `agent_access_logs`
  - reverse proxy access logs
- Identify first known bad timestamp and potentially impacted users/rooms.
- Preserve logs and DB snapshots before destructive cleanup.

## Recovery

1. Patch root cause and deploy.
2. Verify auth + MCP flows in staging.
3. Restore service in phases:
   - Internal users
   - Limited external traffic
   - Full traffic
4. Force re-authentication where relevant.

## Post-Incident

- Publish incident summary with timeline and impact.
- Track permanent remediation tasks with owners and due dates.
- Update this runbook/checklist based on gaps found.
