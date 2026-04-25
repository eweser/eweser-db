# ADR-0005: Remove Legacy Code

**Status:** Accepted; historical migration record
**Date:** 2026-04-03

## Context

This ADR records the cutover away from the old Next.js + Supabase auth stack. The current repository uses Hono + better-auth for auth and Hocuspocus for sync.

## Decision

Remove the legacy runtime pieces that belonged to the old auth stack:

| Item                                           | Reason                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/auth-server/`                        | Old Next.js + Supabase auth server, replaced by `packages/auth-server-hono/` and `packages/auth-pages/` |
| `old-code/`                                    | Pre-Hocuspocus era code, examples, and migration-only tests                                             |
| `.github/workflows/auth-sever-sdb-deploy.yaml` | Supabase-era deploy workflow no longer used                                                             |
| Stale root scripts                             | `dev:auth-server`, `build-auth-server`, `run-auth-server`                                               |

## Result

- The current auth surface is `packages/auth-server-hono` plus `packages/auth-pages`.
- The root workspace scripts now point at the Docker compose stack and the active frontend workspaces.
- Historical migration notes remain in `docs/ai/plans/` and this ADR.

## Follow-Up

The earlier migration plan also discussed removing `y-webrtc` from `@eweser/db`, but that dependency is still present in the current source tree. Treat that removal as a separate follow-up if and when the compatibility path is actually dropped.

## Related

- [2026-04-03-remove-legacy-code.md](../plans/2026-04-03-remove-legacy-code.md)
