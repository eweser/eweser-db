# Current Plan Grillme Gate

Date: 2026-05-25

## Scope

This is the central `eweser-grill-with-docs` result for de-duped plans listed
under `## Current Plans` in `docs/ai/plans/README.md`. Completed, implemented,
superseded, and historical plans are excluded from implementation approval, but
may remain references when they explain current terms.

Reference docs used: `AGENTS.md`, `INDEX.md`, `GLOSSARY-MAP.md`,
`docs/ai/adr/README.md`, package glossaries for auth, MCP, DB, aggregator,
sync-server, and Ewe Note, plus relevant ADRs and current plan files.

## Global Gates

- Implementation remains blocked until the relevant plan has a recorded grill
  outcome in this report or a follow-up report linked from the Kanban card. The
  plans in this report now have recorded outcomes; their Kanban cards may be
  marked ready unless the row below names an explicit blocker.
- Allowed work before implementation approval: PR review/status checks,
  read-only diagnostics, grill/split tasks, and Kanban hygiene.
- Use `/home/jacob/code/eweser-db/.env` as the approved Eweser secret surface.
  Presence-only check on 2026-05-25:
  - `DATABASE_URL`: present
  - `EWESER_PROD_TEST_EMAIL`: missing
  - `EWESER_PROD_TEST_PASSWORD`: missing
- Production tester dogfood remains blocked until those values are present and
  the operator script dry-run succeeds.
- PR #44 and PR #45 are review-ready status items, not implementation blockers.

## Testing Contract

- Every substantial shared feature must have a fast micro-example path before it
  is treated as Ewe Note-ready.
- Micro examples should live under `examples/` or an equivalent focused example
  app and be wired into the Cypress e2e suite when browser behavior is part of
  the feature.
- Ewe Note remains the integrated dogfood surface, but it should test the
  composed user workflow after the micro app proves the feature contract.
- For federation and collaboration features, prefer cheap two-client or
  two-server example tests first:
  - federated public search: local search results first, federated public
    results second, with origin labels;
  - realtime collaboration: two clients editing the same room with deterministic
    convergence assertions;
  - federated room sharing: origin-authoritative read/write grants before Ewe
    Note collaboration UX;
  - secure rooms: a minimal secure-room example proving lock/unlock and search
    unavailability before Ewe Note room-management UI;
  - cross-collection query: small notes/flashcards example before Ewe Note
    navigation or backlinks depend on it.
- Ewe Note e2e tests are still required for user-facing integrated flows,
  including production dogfood import/edit proof, federated search UX, realtime
  collaboration UX, secure-room labels/tooltips, and any note-app behavior that
  exposes shared SDK/server features.

## Current Plan Outcomes

| Plan                                          | Status                | Grill outcome                                                                                                                                                                                                                                                           | Allowed next action                                                                                                         | Plan edits required                                                                                              |
| --------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `2026-04-28-app-shell-migration.md`           | Evidence-ready        | Product proof takes priority; missing design-token package is design cleanup only, not a product-proof blocker.                                                                                                                                                         | Ready for read-only/local route evidence; production-domain proof only after dogfood gates.                                 | No immediate edit unless copy claims product proof not yet verified.                                             |
| `2026-04-29-ai-memory-strategy-onboarding.md` | Dogfood-ready         | Manual dogfood required. Imported personal base may grant one Codex MCP read/write test agent, but writes are limited to a new `Dogfood verification` note unless specifically approved. Prompt-only automatic capture is private dogfood only, not public-launch safe. | Ready for private dogfood with provenance and delete/undo expectations; public launch needs stronger secure-memory design.  | Update capture-mode/public-launch language before implementation.                                                |
| `2026-04-28-compliance-and-legal.md`          | Private dogfood-ready | Private production dogfood may proceed before DMCA/mailbox closure. Public signup remains blocked on DMCA agent registration and monitored legal contacts.                                                                                                              | Ready for private dogfood only. Public launch closure remains external/legal.                                               | Record manual deletion/export process as launch-acceptable only if monitored mailbox/process exists.             |
| `2026-04-19-go-live-security-hardening.md`    | Private dogfood-ready | Final independent go/no-go security verification blocks public signup, not Jacob's private production dogfood.                                                                                                                                                          | Ready for narrow auth/env preflight for private dogfood; independent final QA before public launch.                         | None unless checklist claims public PASS before Run 4.                                                           |
| `2026-04-03-ai-first-launch-strategy.md`      | Strategic reference   | Current website positioning is acceptable for now; `Own your AI brain` remains useful background but copy/design is frozen.                                                                                                                                             | Reference only.                                                                                                             | No copy edits now.                                                                                               |
| `2026-05-24-hermes-kanban-overnight.md`       | Ready setup           | Board is readable and SQLite integrity is OK. Production tester card remains blocked on missing `.env` values.                                                                                                                                                          | Ready for PR review, non-production dogfood, site reconciliation, and split cards; keep production tester dogfood blocked.  | Update summary to point to this central report.                                                                  |
| `2026-05-16-db-readme-todo-backlog.md`        | Ready to split        | Runs 4+ require split cards and grill outcomes before coding. Federation/search/E2EE/compatibility decisions below are resolved enough for plan edits.                                                                                                                  | Ready for split cards; implementation cards may start after their scope includes micro-example and Ewe Note e2e acceptance. | Yes: add federated public-search run, testing contract, E2EE UX decisions, compatibility/SDK/metering decisions. |
| Design/copy plans                             | Proposed/reference    | Freeze for now. Current website positioning is acceptable unless a concrete false product claim is found.                                                                                                                                                               | No implementation from these plans.                                                                                         | Possibly move superseded sources out of active lane later.                                                       |
| Ewe Note UX plans                             | Dogfood-ready         | Personal dogfood uses current editor. UX work should be driven by dogfood findings first. Tasks are found-in-notes v1. Templates are low-priority/local-only unless they confuse the UI. TipTap is not a blocker unless current editor fails required proof.            | Ready for production personal-docs dogfood and serialized gap-driven UX cards with Ewe Note e2e tests.                      | Yes for any plan that marks TipTap/templates as launch blockers.                                                 |
| `2026-04-02-phase-4-deploy.md`                | Mostly done           | Finished/superseded by current deployment/landing work.                                                                                                                                                                                                                 | Move to old/completed plans; create narrow follow-ups only if evidence shows gaps.                                          | Yes: remove from Current Plans.                                                                                  |

## Personal Docs Dogfood

- `docs/personal` is a dogfood blocker and should move into the user's
  production Ewe Note account.
- Destination: production Ewe Note base named `Eweser Strategy`.
- Import path: inventory first, then logged-in browser Ewe Note UI import.
- Import shape: one note per Markdown file, preserving filename/source-path
  metadata for traceability.
- If inventory flags possible secrets or sensitive lines, stop and ask before
  importing flagged files.
- Acceptance:
  - redacted inventory passes;
  - production browser import succeeds;
  - a new `Dogfood verification` note can be created/edited;
  - Codex MCP can read/search the base;
  - Codex MCP writes only the verification note.
- After verification, replace tracked `docs/personal` content with a minimal
  pointer to the production Ewe Note base. Do not rewrite Git history.
- If imported personal docs conflict with tracked launch plans, stop and bring
  the conflict to Jacob immediately.

## DB Backlog Decisions

- Federation:
  - Store explicit federated-principal records; render as `user@server` for UX.
  - Use peer fan-out for v1 federated public search.
  - Federated public search queries local search first and trusted peer public
    search second, with separate sections and origin labels.
  - Search only explicitly public rooms across peers. Granted collaborative
    rooms should already be locally synced and searched locally.
  - Query only explicit trusted peers. New self-hosted servers should include
    `eweser.com` as a removable default trusted peer.
  - Federated collaborative room sharing supports read/write grants, with the
    origin server authoritative.
  - Private federated collaborative rooms are not indexed on remote servers in
    v1.
  - Federation-as-backup is deferred; not crucial for the current path.
- E2EE / secure rooms:
  - First use case is secure vault rooms.
  - Room management should expose a secure-room option with badges, tooltips,
    and explainers for limitations.
  - Secure rooms lose remote web MCP, server-side search, and public
    aggregation in v1.
  - ChatGPT/web remote connectors use plaintext MCP-readable rooms only.
  - v1 key model: recovery phrase/export, no server-held room keys, no
    account-password recovery.
- Compatibility and SDK lifecycle:
  - Pre-live breaking schema/API changes are acceptable when they serve the
    clean long-term model, but dogfood data needs deterministic migration or
    fixture handling and post-launch compatibility guarantees must be written.
  - Remove stale WebRTC/temp-doc support.
  - Add an idempotent first-run seed API with CRDT-safe writes.
- Hosted sync metering:
  - V1 limits are generous abuse caps for ordinary sync, not the primary
    monetization line.
  - Paid tiers should focus on hosted file storage and backups versus BYO
    storage.

## Open Questions

- Exact production tester credentials remain unavailable in `.env`.
- Legal mailbox/DMCA completion is external to private dogfood but still blocks
  public signup.
- Public automatic memory capture needs a stronger secure-memory or
  secret-handling design before launch.

## Kanban Notes

- Ready implementation cards are allowed for the grilled plans in this report
  unless explicitly blocked here. Shared-feature cards must name their
  micro-example and Ewe Note e2e acceptance path where applicable.
- PR #44 and PR #45 should be treated as review-ready work, not blockers.
- Keep auth, production writes, MCP scope, DB schema/migrations, federation,
  encrypted rooms, and Ewe Note core navigation serialized unless a later grill
  result proves disjoint write scopes.

## Self-Reflection

The strongest clarification was that Ewe Note is an integrated dogfood surface,
not the first place to prove every shared capability. Fast micro examples should
catch SDK/server/federation/search/collaboration failures before Ewe Note e2e
tests assert the composed user experience.

## Skill Adjustment Suggestions

- Add an `example-app-first` testing prompt to `eweser-grill-with-docs` for
  shared features that later surface in Ewe Note.
- Add grill examples for E2EE/MCP trust-boundary choices and for distinguishing
  private dogfood safety from public-launch safety.
