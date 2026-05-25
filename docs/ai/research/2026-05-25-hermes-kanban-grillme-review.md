# Hermes Kanban Grillme Review

Date: 2026-05-25

## Scope

This is a bounded `eweser-grill-with-docs` pass for the active Hermes/Eweser
planning lane. It reviewed:

- `docs/ai/plans/2026-05-24-hermes-kanban-overnight.md`
- `/home/jacob/code/hermes-control/docs/eweser-kanban-overnight.md`
- `/home/jacob/code/hermes-control/docs/plans/2026-05-24-hermes-kanban-eweser-overnight.md`
- `/home/jacob/code/hermes-control/docs/plans/2026-05-24-eweser-first-hermes-provider.md`
- `docs/ai/plans/2026-05-16-db-readme-todo-backlog.md` for the remaining
  terminology-heavy backlog runs

Reference docs used: `AGENTS.md`, `INDEX.md`, `GLOSSARY-MAP.md`,
`docs/ai/adr/README.md`, and the relevant auth, MCP, and Ewe Note glossaries.

## Resolved Terms

- Use `Agent Journal` for Hermes summary writes.
- Use `human notes` for Jacob-owned source material such as
  `/home/jacob/Documents/Work`; these are read-only unless Jacob explicitly
  asks for writes.
- Use `readable room scope` and `writable room scope` for MCP permissions.
- Use `remote MCP endpoint` for auth-server HTTP `/mcp`, and `MCP server` when
  the local stdio package or the remote endpoint could both apply.
- Use `Ewe Note`, `base`, `vault`, `note room`, and `source path` as defined in
  `packages/ewe-note/GLOSSARY.md`.

No glossary file needed a term change in this pass.

## Findings

1. Runs 1-4 are no longer blocked on GitHub auth after PR publication.
   - Setup PR: https://github.com/eweser/eweser-db/pull/44
   - Local dogfood/env fix PR: https://github.com/eweser/eweser-db/pull/45

2. Run 5 is only blocked on production tester prerequisites now.
   - `EWESER_PROD_TEST_EMAIL` was not present in the safe env-presence check.
   - A browser sign-in password or equivalent tester credential was not present.
   - `DATABASE_URL` was present in repo `.env`, but not in `~/.hermes/.env`.
   - The production operator script must still dry-run before any apply.

3. Run 6 should start as a grill/audit card, not an implementation card.
   - Local dogfood proved Ewe Note can save a synthetic note.
   - It did not produce enough concrete navigation/presentation gaps to justify
     immediate UI changes.
   - The safe next step is an Ewe Note navigation/presentation gap audit against
     read-only dogfood material, then a scoped implementation card if the audit
     finds real gaps.

4. Run 7 can split into local-evidence and production-evidence reconciliation.
   - Local claims can be checked now against PR #45 evidence.
   - Production claims still depend on run 5.
   - This avoids blocking all site-promise cleanup on missing production
     credentials while preserving the production stop rule.

5. Run 8 can begin as a read-only grill/split task.
   - The DB README backlog already says runs 4-13 need
     `eweser-grill-with-docs` before coding.
   - The safe next action is task decomposition and terminology grilling only,
     not implementation of federation, encrypted rooms, compatibility policy, or
     agent-access changes.

6. The Hermes-first provider plan has a hard grillme gate.
   - No runtime mutation, provider activation, cron change, gateway restart,
     migration, or external write should happen before a slice-specific grillme
     result is recorded.

7. Current Hermes MCP runtime is a separate preflight risk.
   - `hermes mcp test eweser` failed because the configured local auth API at
     `127.0.0.1:38101` was not listening.
   - Treat this as a runtime preflight card before relying on Hermes MCP inside
     cron or provider work.

## Kanban Routing

Safe work to queue now:

- Production tester dogfood remains blocked until exact secret-provided tester
  credentials exist in a runtime secret surface.
- Ewe Note navigation/presentation gap audit can be unblocked as read-only
  planning QA.
- Local-only site promise reconciliation can be unblocked.
- DB README backlog grill/split can be unblocked as read-only planning work.
- Hermes-first provider grillme can be queued as read-only planning work.
- Hermes MCP runtime preflight can be queued as runtime diagnostics only.

Do not run more than four implementation tasks concurrently. Keep auth,
production writes, MCP scope, DB schema/migrations, and Ewe Note core navigation
serialized unless a later grill result proves the write scopes are independent.

## Open Questions

1. Where should Hermes production tester secrets live for worker use:
   `~/.hermes/.env`, the `eweser-prod-ops` profile home, or another secret
   store?
2. Should run 5 production dogfood wait for PR #45 to merge, or is the existing
   production code path sufficient because PR #45 only fixes local worktree env
   generation?

## Self-Reflection

The docs made the main boundaries discoverable: local-first data ownership,
Agent Journal vs human notes, and readable/writable MCP scopes were clear. The
weakest area was production tester credential routing; the plan says
secret-provided credentials, but it does not name the runtime secret surface or
the browser credential variable contract. The second weak area was run 6: the
plan assumes dogfood will identify Ewe Note gaps, but the completed dogfood
evidence mostly proved the baseline path works.

## Skill Adjustment Suggestions

- Add a grill prompt for "dependency unblocking" that distinguishes real
  blockers from policy gates and missing credentials.
- Add a production-credential checklist example to the grill prompts, using
  presence-only checks and never printing values.
