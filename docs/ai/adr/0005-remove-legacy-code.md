# ADR-0005: Remove Legacy Code — Next.js/Supabase/Y-Sweet

**Status:** Accepted & Implemented  
**Date:** 2026-04-03

## Context

Migration from Next.js + Supabase + Y-Sweet to Hono + better-auth + Hocuspocus is complete. Legacy code must be removed.

## Decision

Delete the following in a single coordinated effort:

| Item                                           | Reason                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `packages/auth-server/`                        | Next.js + Supabase auth server — fully replaced by `auth-server-hono` + `auth-pages`          |
| `old-code/`                                    | Pre-Hocuspocus era: Matrix + y-webrtc + MongoDB aggregator, 6 old examples, old Cypress tests |
| `.github/workflows/auth-sever-sdb-deploy.yaml` | Supabase migration deploy — no longer needed                                                  |
| Stale `package.json` scripts                   | `dev:auth-server`, `build-auth-server`, `run-auth-server`                                     |

## CI Update

Replace `npm run dev:auth-server` with `docker compose -f docker-compose.dev.yml up -d` in e2e-smoke workflow.

## Minor Updates

- `packages/db/src/room.ts`: Remove `WebrtcProvider` type import (breaking change — needs changeset)
- `packages/db/package.json`: Remove `y-webrtc` dependency

## Consequences

- Monorepo contains only active packages
- No legacy runtime to maintain
- y-webrtc removed from published SDK

## Related

- [2026-04-03-remove-legacy-code.md](../plans/2026-04-03-remove-legacy-code.md)
