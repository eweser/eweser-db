# Go-Live Ops Evidence

Date: 2026-04-20

## Alert Routing

- Primary route: application logs and auth abuse spikes page the launch owner through the deployment provider alert channel.
- Escalation route: if alert acknowledgement exceeds 15 minutes, escalate to the backup operator and freeze new sign-ups until triage starts.
- Source docs:
  - `docs/security-incident-response.md`
  - `docs/deployment/digital-ocean.md`

## Backup / Restore Drill Commands

The production checklist now requires a dated drill using these commands:

```bash
# Backup PostgreSQL
docker exec eweser-db-postgres-1 pg_dump -U eweser eweser > backup-$(date +%Y%m%d).sql

# Restore into a scratch database
docker exec -i eweser-db-postgres-1 psql -U eweser -c "CREATE DATABASE eweser_restore_check;"
cat backup-$(date +%Y%m%d).sql | docker exec -i eweser-db-postgres-1 psql -U eweser eweser_restore_check
docker exec eweser-db-postgres-1 psql -U eweser -d eweser_restore_check -c "\\dt"

# Cleanup scratch database
docker exec eweser-db-postgres-1 psql -U eweser -c "DROP DATABASE eweser_restore_check;"
```

## Evidence Mapping

- Email delivery hardening: `packages/auth-server-hono/src/auth.ts`, `packages/auth-server-hono/src/email.ts`
- Reset endpoint canonicalization: `packages/auth-server-hono/src/routes/auth.ts`
- Secret policy enforcement: `packages/auth-server-hono/src/env.ts`, `packages/auth-server-hono/src/env.test.ts`
- Automated auth smoke coverage: `scripts/run-e2e-smoke.mjs`, `e2e/cypress/tests/auth-security-smoke.cy.ts`, `.github/workflows/quality.yaml`
- Incident routing and backup drill procedure: `docs/security-incident-response.md`, `docs/deployment/digital-ocean.md`, `docs/security-go-live-checklist.md`
