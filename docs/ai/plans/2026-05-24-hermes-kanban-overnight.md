# Plan: Hermes Kanban Overnight Loop

## Goal

Set up Hermes as a continuous EweserDB supervisor that wakes every 30 minutes,
keeps a Hermes Kanban board moving, opens ready PRs, reports through Lark and
GitHub, and dogfoods Eweser MCP before expanding into the DB backlog.

This file is the canonical EweserDB work plan. If a Codex or Hermes session is
resumed after context compaction, reopen this file before continuing.

## Scope

- In: EweserDB dogfood/backlog ordering, production tester support, local and
  production verification policy, Kanban worker rules, and the narrow operator
  script needed to mark a secret-provided production tester account verified.
- In: Hermes board/profile/cron setup that references this plan from the
  management repo and runtime.
- Out: Autonomous merge or deploy, broad production data writes, writing to
  Jacob's human notes, native Eweser memory-provider work, public auth bypass
  endpoints, and DB README backlog runs before the dogfood gate passes.

## Assumptions / Open Questions

- Assumption: Continuous half-hour supervision stays enabled until disabled.
- Assumption: Eweser repo docs are canonical; Hermes Kanban is the execution
  queue and runtime state.
- Assumption: Production credentials, tester email/password, MCP tokens, Lark
  chat IDs, Railway tokens, and database URLs stay out of tracked files.
- Assumption: `/home/jacob/code/eweser-db/.env` is the approved Eweser
  presence-check secret surface for this gate. It is Git-ignored. Check only
  whether `DATABASE_URL`, `EWESER_PROD_TEST_EMAIL`, and
  `EWESER_PROD_TEST_PASSWORD` are present; never print values.
- Assumption: Hermes may push branches and open non-draft ready PRs, but may not
  merge or deploy.
- Assumption: Hermes may run the production tester verification write only for
  the exact secret-provided test account after a dry-run.
- Open question: The literal Lark delivery target must be resolved at runtime by
  `/sethome` or an untracked `platform:chat_id` value.
- Open question: Production Railway project/environment identifiers must be
  supplied through the existing local Railway config or environment, not tracked
  here.
- Resolved on 2026-05-25: the real current-plan grill report is
  `docs/ai/research/2026-05-25-current-plan-grillme-gate.md`; the older
  Hermes-only grill report is a bounded precursor, not the central gate.

## Domain Language

- Glossary docs: `GLOSSARY-MAP.md`, `packages/mcp-server/GLOSSARY.md`, and
  `packages/auth-server-hono/GLOSSARY.md`.
- New terms:
  - Hermes Kanban board: the Hermes runtime work queue, not canonical project
    memory.
  - Dogfood gate: the required local and production proof that login, Ewe Note,
    Connect AI, MCP token setup, and MCP sync match the website promises.
  - Agent Journal: the dedicated writable AI memory area used for concise
    Hermes summaries.
  - Human notes: Jacob-owned notes readable only when explicitly scoped and
    never writable unless Jacob explicitly asks.
- Changed terms: None.
- ADR candidates: None for this setup pass; revisit if production operator
  verification grows beyond a local script.

## Runs

## Run Order And Manual Test Handoffs

Run order:

1. Write and grill this plan plus the Hermes Control operating note.
2. Add the production tester operator script.
3. Create Hermes board, profiles, cron, and initial Kanban seed tasks.
4. Prove local dogfood.
5. Prove production tester dogfood.
6. Improve Ewe Note file navigation and note presentation.
7. Reconcile landing/site promises.
8. Split and resume DB README backlog runs 4+.

Hermes may run up to four implementation tasks in parallel only when
`eweser-main` verifies that write scopes and dependencies do not conflict. Auth,
DB schema/migrations, MCP scope, and Ewe Note core navigation serialize by
default.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with delivered behavior, commands, test data assumptions,
manual steps, expected results, and known gaps.

### Run 1: Plan And Runtime Control Docs

- **Id**: `run-1`
- **Title**: `Plan and runtime control docs`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - This canonical EweserDB plan.
  - A Hermes Control operating note that names the board, profiles, cron job,
    delivery policy, and stop rules.
  - Reconciled Hermes Control memory/MCP doc language so it reflects the current
    `codex_app_server` baseline.
- **Files**:
  - `docs/ai/plans/2026-05-24-hermes-kanban-overnight.md`: canonical plan.
  - `/home/jacob/code/hermes-control/docs/eweser-kanban-overnight.md`: runtime
    operating note.
  - `/home/jacob/code/hermes-control/docs/memory-and-eweser-mcp.md`: stale
    runtime language cleanup.
- **Steps**:
  - [x] Save the approved plan in this file.
  - [x] Run a bounded `grill-with-docs` pass against Hermes Control docs.
  - [x] Update the Hermes operating note and stale MCP runtime wording.
- **Tests**:
  - `git diff --check`
  - Narrow prettier check for touched Markdown if available.
- **Verification**:
  - Plan contains stop rules and compaction anchor.
  - No secrets, credentials, chat IDs, or account identifiers are tracked.
- **Manual test handoff**:
  - Not needed: docs-only setup pass.
- **Dependencies**:
  - Approved user plan.
- **Model tier**: `coder`
- **Risk level**: `low`

### Run 2: Production Tester Operator Script

- **Id**: `run-2`
- **Title**: `Production tester operator script`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - A local script that can dry-run and then apply verified-email status only
    for the exact secret-provided production tester account.
- **Files**:
  - `scripts/ops/verify-prod-test-user.mjs`: script.
  - `scripts/INDEX.md`: script index entry.
  - Auth-server tests or targeted script tests, if the repo test harness can run
    the script without production credentials.
- **Steps**:
  - [ ] Require `DATABASE_URL` and `EWESER_PROD_TEST_EMAIL`.
  - [ ] Require `--dry-run` or `--apply`; default to refusing execution.
  - [ ] Refuse ambiguous or non-exact email matches.
  - [ ] Redact email in console output.
  - [ ] On `--apply`, set `users.email_verified = true` for that one user.
  - [ ] Insert a security event such as
        `email.verified.operator_test_bypass` with metadata that does not include
        secrets.
- **Tests**:
  - Script-level dry-run tests against a temporary database or mocked database
    layer where practical.
  - `npm run type-check --workspace @eweser/auth-server-hono` if auth-server
    source is touched.
- **Verification**:
  - `node scripts/ops/verify-prod-test-user.mjs --dry-run` exits with a clear
    missing-env error when required env is absent.
  - No public route or bypass endpoint is added.
- **Manual test handoff**:
  - Before production use, run dry-run with real secret-provided test account
    env, then run `--apply` only for that account.
- **Dependencies**:
  - Run 1.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 3: Hermes Runtime Board, Profiles, Cron, And Seed Tasks

- **Id**: `run-3`
- **Title**: `Hermes runtime board, profiles, cron, and seed tasks`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - Hermes board `eweser`, default workdir `/home/jacob/code/eweser-db`.
  - Profiles cloned from `default`: `eweser-main`, `eweser-coder`,
    `eweser-reviewer`, `eweser-prod-ops`.
  - Continuous `30m` supervisor cron under `eweser-main`.
  - Initial Kanban tasks seeded in the order below.
- **Files**:
  - `/home/jacob/code/hermes-control/docs/eweser-kanban-overnight.md`: exact
    runtime commands and prompt text.
  - Hermes runtime state under `~/.hermes`: board, profiles, cron, tasks.
- **Steps**:
  - [ ] Run `scripts/status.sh` from Hermes Control.
  - [ ] Create board `eweser` if missing.
  - [ ] Create/describe profiles if missing.
  - [ ] Create seed Kanban cards with idempotency keys.
  - [ ] Create a continuous `30m` cron job with a self-contained prompt.
  - [ ] Keep `approvals.mode: manual` and `approvals.cron_mode: deny`.
- **Tests**:
  - `hermes profile list`
  - `hermes kanban boards list`
  - `hermes kanban assignees --json`
  - `hermes cron list`
  - `hermes mcp list`
  - `hermes mcp test eweser`
  - `timeout 180 hermes -z "Reply with exactly: HERMES_CODEX_READY"`
- **Verification**:
  - Dispatcher sees assignable profiles.
  - Cron exists and is supervisor-only.
  - Seed cards have branch/workspace/PR stop rules in their bodies.
- **Manual test handoff**:
  - From Lark, run `/sethome` in the desired chat before relying on chat
    delivery. Then confirm the next supervisor digest reaches that chat.
- **Dependencies**:
  - Run 1.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: Local Dogfood Gate

- **Id**: `run-4`
- **Title**: `Local dogfood gate`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Local proof that login, Ewe Note, Connect AI token setup, MCP room listing,
    MCP search, and summary-only memory writes work.
- **Files**:
  - Plan execution summary only unless code fixes are required.
- **Steps**:
  - [ ] Run the Eweser runtime-orientation status script before services.
  - [ ] Start local services through repo-documented commands.
  - [ ] Use `/home/jacob/Documents/Work` as read-only source material in local
        dogfood.
  - [ ] Do not write back to the human-note vault.
  - [ ] Save concise Hermes summaries only to the dedicated Agent Journal room.
- **Tests**:
  - Targeted auth/connect-ai tests.
  - Targeted Ewe Note tests/type-check.
  - MCP smoke: list rooms, search, and one summary-only write.
- **Verification**:
  - Local UI and MCP behavior match documented website promises.
- **Manual test handoff**:
  - Open the local Ewe Note URL, confirm file navigation and imported-note
    presentation, then verify the MCP token can read/search only the scoped
    rooms and write only Agent Journal summaries.
- **Dependencies**:
  - Runs 2 and 3.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 5: Production Tester Dogfood Gate

- **Id**: `run-5`
- **Title**: `Production tester dogfood gate`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Production proof using a secret-provided tester account, synthetic notes,
    and the approved personal-docs dogfood path from
    `docs/ai/research/2026-05-25-current-plan-grillme-gate.md`.
- **Files**:
  - Plan execution summary only unless code fixes are required.
- **Steps**:
  - [ ] Run presence-only `.env` check for `DATABASE_URL`,
        `EWESER_PROD_TEST_EMAIL`, and `EWESER_PROD_TEST_PASSWORD`; block if any
        required value is missing.
  - [ ] Check Railway status with the existing `scripts/railway.mjs` helper.
  - [ ] Create/sign in the secret-provided test account.
  - [ ] Run production tester verification script dry-run, then apply for that
        exact account if needed.
  - [ ] Create synthetic production notes only.
  - [ ] For Jacob's personal dogfood, run the `docs/personal` inventory/import
        gate into production Ewe Note base `Eweser Strategy`; stop on redacted
        secret findings and do not edit imported strategy docs through MCP.
  - [ ] Generate a scoped MCP token through Connect AI.
  - [ ] Verify MCP read/search and Agent Journal write boundaries, including
        Codex MCP write access limited to a new `Dogfood verification` note in
        `Eweser Strategy`.
- **Tests**:
  - Presence-only `.env` preflight.
  - `node scripts/railway.mjs status <project> production`
  - Browser smoke of signup/signin/Connect AI.
  - Ewe Note production import/edit smoke for `Eweser Strategy`.
  - MCP smoke with synthetic production data.
- **Verification**:
  - Public email verification remains intact.
  - Operator bypass is audited and limited to the exact tester account.
- **Manual test handoff**:
  - Review synthetic production notes and generated MCP scope; revoke/rotate the
    tester token after proof if desired.
  - Open production Ewe Note, confirm `Eweser Strategy` imported notes, edit the
    `Dogfood verification` note, and confirm imported strategy docs were not
    modified by MCP.
- **Dependencies**:
  - Runs 2, 3, and 4.
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 6: Ewe Note File Navigation And Presentation

- **Id**: `run-6`
- **Title**: `Ewe Note file navigation and presentation`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `full`
- **Deliverable**:
  - Better local dogfood experience for browsing files/folders and reading
    imported notes in Ewe Note.
- **Files**:
  - `packages/ewe-note/src/`: scoped UI/navigation changes.
  - Tests near the changed components.
- **Steps**:
  - [ ] Audit current navigation against the local dogfood notes.
  - [ ] Improve file/folder navigation without breaking offline-first behavior.
  - [ ] Improve note presentation for imported Markdown.
  - [ ] Preserve auth-grant and sync-state behavior.
- **Tests**:
  - `npm test --workspace @eweser/ewe-note`
  - `npm run type-check --workspace @eweser/ewe-note`
  - Browser smoke across desktop and mobile widths.
- **Verification**:
  - A user can browse the local dogfood corpus comfortably.
- **Manual test handoff**:
  - Navigate representative imported notes and folders, then verify editing does
    not write to the source human vault.
- **Dependencies**:
  - Run 4.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 7: Landing And Site Promise Reconciliation

- **Id**: `run-7`
- **Title**: `Landing and site promise reconciliation`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Public landing and connected-tools copy/link behavior matches real login,
    Ewe Note, MCP, and Connect AI behavior.
- **Files**:
  - `packages/landing/src/`: copy/link updates if needed.
  - `packages/app/src/`: only if Connect AI UX evidence requires a fix.
- **Steps**:
  - [ ] Compare website claims to local and production dogfood evidence.
  - [ ] Remove or soften claims that are not true yet.
  - [ ] Keep GitHub/README fallback links stable when docs domains are absent.
- **Tests**:
  - Landing build/type-check commands scoped to touched package.
  - Browser link smoke.
- **Verification**:
  - The site does not promise unsupported MCP/login/Ewe Note behavior.
- **Manual test handoff**:
  - Click primary CTAs and connected-tools links from a built or deployed page.
- **Dependencies**:
  - Runs 4 and 5.
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 8: Split And Resume DB README Backlog

- **Id**: `run-8`
- **Title**: `Split and resume DB README backlog`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - Smaller grilled tasks for DB README backlog runs 4+ with explicit
    micro-example and Ewe Note e2e acceptance paths where a shared feature has
    browser/user-facing behavior.
- **Files**:
  - `docs/ai/plans/2026-05-16-db-readme-todo-backlog.md`: split tasks and
    execution summary updates.
  - Implementation files only as authorized by each split task.
- **Steps**:
  - [ ] Run `eweser-grill-with-docs` for terminology-heavy tasks.
  - [ ] Split federation, encrypted-room, compatibility, SDK lifecycle, and
        agent-access work into small PR-sized Kanban cards.
  - [ ] For federation, federated public search, realtime collaboration, secure
        rooms, and cross-collection queries, name the focused `examples/*`
        micro app or example-app change first, then name the Ewe Note e2e path
        for the integrated workflow.
  - [ ] Preserve PR gating and task dependencies.
- **Tests**:
  - Per-card targeted tests.
  - Broader package checks when shared behavior changes.
- **Verification**:
  - Each task has a clear write scope, PR acceptance criteria, and test path.
    Shared features must be proven in micro examples before Ewe Note integration
    is considered sufficient.
- **Manual test handoff**:
  - Review the split backlog before implementation starts.
- **Dependencies**:
  - Runs 4 through 7.
- **Model tier**: `strong`
- **Risk level**: `medium`

## Stop Conditions

Stop and ask for user approval if:

- Implementation requires work outside this plan's scope.
- A public package API change, migration, auth/security behavior change, or
  destructive operation is needed but was not explicitly planned.
- Verification exposes a blocking issue that cannot be fixed inside the approval
  boundary.
- Required secrets, credentials, or unavailable services block verification.
- A task would write to Jacob's human notes or production user data other than
  the exact secret-provided tester account.
- A PR would need merge or deploy authority.

## Approval Boundary

Approval of this plan authorizes Coder or Hermes workers to implement the runs
above, make focused supporting edits needed for those runs, write/update tests,
run relevant verification, perform internal QA, fix issues found inside this
boundary, update this plan's execution summary, push branches, and open ready
PRs.

Approval does not authorize unrelated refactors, autonomous merges or deploys,
direct pushes to `main`, public auth bypasses, production writes outside the
secret-provided tester account, secret handling in tracked files, migration
deletion, or writing to human notes.

## Execution Summary

| Run     | Status              | Files Changed                                                                                             | Verification                                                                                                                                                                                                                                                                                                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------- | ------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-1` | Complete            | This plan; Hermes Control docs                                                                            | `git diff --check`; targeted Prettier check                                                                                                                                                                                                                                                                   | Plan saved before runtime mutation; Hermes runtime wording reconciled; no secrets added.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `run-2` | Complete            | `scripts/ops/verify-prod-test-user.mjs`; `scripts/ops/verify-prod-test-user.test.mjs`; `scripts/INDEX.md` | `node --test scripts/ops/verify-prod-test-user.test.mjs`; no-DB dry-run fail-closed check; `git diff --check`; targeted Prettier check                                                                                                                                                                        | Local operator script added; no public endpoint added; production use still requires secret-provided tester env and dry-run first.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `run-3` | Complete            | Hermes runtime board/profiles/cron/tasks                                                                  | `scripts/status.sh`; `hermes profile list`; `hermes kanban boards list`; `hermes kanban assignees --json`; `hermes cron list --all`; `hermes cron status`; `hermes mcp list`; `hermes mcp test eweser`; `timeout 180 hermes -z "Reply with exactly: HERMES_CODEX_READY"`; simulated Kanban-worker shell smoke | Board `eweser`, four profiles, continuous default-scheduler cron, and dogfood-first seed tasks created. Delivery is local until Lark `/sethome`. Future-phase cards are blocked. Eweser profiles use `openai_runtime: auto` to avoid the Kanban-only Codex app-server `bwrap` sandbox failure; default remains `codex_app_server`. The malformed first board DB was preserved as `~/.hermes/kanban/boards/eweser/kanban.db.corrupt-20260524-1507` and the board was reinitialized. Plain `--workspace worktree` resolved to the root checkout when the board default workdir was set, so coding cards now use explicit pre-created worktree paths. |
| `run-4` | Complete            | Hermes Kanban task `t_c0b8f0c3`; PR #45                                                                   | Local dogfood worker handoff; `node --test scripts/worktree-env.test.mjs`; `git diff --check`; `npm run code-index:check`; pre-push formatting and tracked secret scan; ready PR https://github.com/eweser/eweser-db/pull/45                                                                                  | Local dogfood evidence covered local signup/sign-in, Ewe Note synthetic note save, Connect AI token setup, MCP room list/search, and one summary-only Agent Journal write. Human notes stayed read-only. Superseded root-checkout task `t_206b1a83` is archived.                                                                                                                                                                                                                                                                                                                                                                                   |
| `run-5` | Blocked             | Hermes Kanban task `t_645b46df`                                                                           | Pending                                                                                                                                                                                                                                                                                                       | Local dogfood dependency is satisfied by PR #45. Remaining blocker is exact secret-provided production tester credentials and production DB env in an approved runtime secret surface; production operator script must dry-run before any apply.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `run-6` | Unblocked           | Hermes Kanban task `t_6a3ad371`; grillme follow-up                                                        | `docs/ai/research/2026-05-25-hermes-kanban-grillme-review.md`                                                                                                                                                                                                                                                 | Unblocked only for read-only gap audit/grill work first. Do not start Ewe Note core navigation implementation until the audit identifies concrete navigation/presentation gaps and a scoped worker card is created.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `run-7` | Partially unblocked | Hermes Kanban task `t_53bd7bff`; grillme follow-up                                                        | `docs/ai/research/2026-05-25-hermes-kanban-grillme-review.md`                                                                                                                                                                                                                                                 | Local-evidence site-promise reconciliation can proceed against run-4/PR #45 evidence. Production-evidence claims remain blocked until run-5 completes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `run-8` | Unblocked           | Hermes Kanban task `t_4fe8f025`; grillme follow-up                                                        | `docs/ai/research/2026-05-25-hermes-kanban-grillme-review.md`                                                                                                                                                                                                                                                 | Unblocked only for read-only `eweser-grill-with-docs` and task-splitting work for DB README backlog runs 4+. Do not implement federation, encrypted-room, compatibility, SDK lifecycle, or agent-access changes until split cards have clear scopes and approvals.                                                                                                                                                                                                                                                                                                                                                                                 |

## Self-Reflection / Instruction Improvements

- After compaction, the next agent must reopen this file and continue from the
  Execution Summary rather than relying on chat history.
- The 2026-05-25 grillme pass found that dependency unblocking must distinguish
  missing production secrets from completed local evidence, and that Ewe Note
  navigation work needs a gap audit before implementation.
