# ADR-0004: Privacy & Autonomy Guarantees

**Status:** Accepted — Partially Implemented (architectural guarantees via Yjs in place; privacy policy page and audit logging deferred)  
**Date:** 2026-04-03

## Context

EweserDB claims privacy guarantees that must be technically credible and legally honest.

## Decisions

### Architectural guarantees (always true)

1. **Local-first** — data lives in IndexedDB first; server is relay only
2. **Open-source verifiable** — sync server and auth server are open source
3. **Open data format** — Yjs CRDTs with typed schemas; export at any time
4. **No vendor lock-in** — `SYNC_URL` env var change = migration

### Technical protections on hosted service

5. TLS 1.3 in transit
6. PostgreSQL encrypted at rest (disk level)
7. Minimal metadata in logs (no content, IP scrubbed after 24hr)
8. Hard-delete account = real deletion
9. Full JSON export on demand

### Policy commitments

10. No reading of user data
11. No sale or sharing of data
12. No training on user data
13. Transparency report for legal requests
14. GDPR + CCPA baseline globally

### Honest limitation

**No E2EE** — true end-to-end encryption would make real-time collaboration and server-side search impossible. Statement: "We protect by architecture, policy, and technical controls. For absolute cryptographic privacy, self-host."

### Optional Phase 2 feature

Room-level E2EE for sensitive rooms (health, finance, journal) — client-side encryption, last-write-wins for conflicts, no real-time collaboration on encrypted rooms.

## Consequences

- Privacy story is architecture-led, not policy-only
- Self-hosting is the gold-standard guarantee
- E2EE for shared rooms is a Phase 2 trade-off decision

## Related

- [2026-04-03-privacy-and-autonomy.md](../plans/2026-04-03-privacy-and-autonomy.md)
