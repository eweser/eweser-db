# AI Plans

Active, completed, and historical planning notes for EweserDB. The top-level
folder is the working set; finished implementation plans live in
`./completed/`, and superseded handoffs/strategy notes live in `./historical/`.

## Canonical Planning Format

The canonical Codex workflow is Planner -> Coder, documented in
[`../workflows/codex-planner-coder.md`](../workflows/codex-planner-coder.md).
Use [`./_template.md`](./_template.md) for new implementation plans.

Every new plan must include:

- Goal
- Scope
- Assumptions / open questions
- Domain language and relevant `GLOSSARY.md` files when the work introduces or
  changes product terms
- Runs with id, title, files, steps, tests, verification, dependencies, model
  tier, and risk level
- Stop conditions
- Approval boundary
- Execution summary
- Self-reflection / instruction improvements

For terminology-heavy plans or runs, especially federation, encrypted rooms,
public aggregation, MCP/agent access, backups, and compatibility policy, run
`eweser-grill-with-docs` before implementation approval. It should resolve
canonical terms into `GLOSSARY.md` and the plan's Domain Language section without
editing product code. Each grilling session should end with a brief
self-reflection and concrete skill-adjustment suggestions when the workflow
itself needs improvement.

Use `eweser-coder` for coding runs in plan metadata and examples.

Planner creates implementation-ready plans and stops for approval. Coder treats
the approved plan as the approval boundary, implements all runs, verifies,
performs internal QA, fixes issues found inside the boundary, and updates the
plan. Standalone QA is reserved for independent re-QA or audit work.

## Status Categories

- **Current** - Active work or planned work that is still useful as guidance.
- **Completed** - Implemented or delivered; archived in `./completed/`.
- **Historical** - Useful background, but superseded by newer plans or current code.

## Current Plans

### Launch / Product Direction

| Plan                                                                                         | Status                | Notes                                                                                                                       |
| -------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [2026-04-28-app-shell-migration.md](./2026-04-28-app-shell-migration.md)                     | Evidence-ready        | Expand `packages/app` into the app shell; product evidence work is ready, with production-domain proof after dogfood gates. |
| [2026-04-29-ai-memory-strategy-onboarding.md](./2026-04-29-ai-memory-strategy-onboarding.md) | Dogfood-ready         | Private memory dogfood is ready; public automatic capture still needs stronger secure-memory/secret handling.               |
| [2026-04-28-compliance-and-legal.md](./2026-04-28-compliance-and-legal.md)                   | Private dogfood-ready | Private dogfood may proceed; DMCA/legal contact closure still blocks public signup.                                         |
| [2026-04-19-go-live-security-hardening.md](./2026-04-19-go-live-security-hardening.md)       | Private dogfood-ready | Private dogfood may proceed; independent final security/go-live closure still blocks public signup.                         |
| [2026-04-03-ai-first-launch-strategy.md](./2026-04-03-ai-first-launch-strategy.md)           | Strategic reference   | Partly shipped through MCP/Connect AI; current website positioning is acceptable for now.                                   |

### AI Workflow / Tooling

| Plan                                                                                         | Status         | Notes                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [2026-05-01-codebase-navigation-index.md](./2026-05-01-codebase-navigation-index.md)         | Implemented    | Added maintained folder indexes, selected source headers, validation, and CI for trunk-to-leaf codebase navigation.                                                                                              |
| [2026-04-29-large-coding-run-orchestrator.md](./2026-04-29-large-coding-run-orchestrator.md) | Implemented v1 | Supervised plan-run orchestrator scripts, metadata contract, dry-run validation, monitor, worker isolation, integration, stop/resume, and QA/review handoff exist.                                               |
| [2026-05-24-hermes-kanban-overnight.md](./2026-05-24-hermes-kanban-overnight.md)             | Ready setup    | Canonical Eweser plan for Hermes Kanban supervision, dogfood gates, production tester setup, and overnight PR workflow; current-plan grill report is `docs/ai/research/2026-05-25-current-plan-grillme-gate.md`. |
| [2026-05-16-db-readme-todo-backlog.md](./2026-05-16-db-readme-todo-backlog.md)               | Ready to split | Runs 1-3 are implemented in PR #41; runs 4+ can be split into scoped cards with micro-example e2e first and Ewe Note e2e after shared behavior is proven.                                                        |

### Design / Copy

| Plan                                                                                                   | Status            | Notes                                                                                               |
| ------------------------------------------------------------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------- |
| [2026-05-18-landing-theme-css-cleanup.md](./2026-05-18-landing-theme-css-cleanup.md)                   | Frozen            | Do not implement now unless concrete false product claims or evidence-backed site issues are found. |
| [2026-05-18-landing-page-completion-handoff.md](./2026-05-18-landing-page-completion-handoff.md)       | Frozen            | Current website positioning is acceptable for now; keep as reference, not execution scope.          |
| [2026-04-27-core-figma-design-system-recovery.md](./2026-04-27-core-figma-design-system-recovery.md)   | Frozen design     | Redesign work is not launch-path while dogfood gates remain open.                                   |
| [2026-04-27-full-text-page-copy.md](./2026-04-27-full-text-page-copy.md)                               | Current source    | Canonical copy target for landing, app shell, auth, permissions, and MCP pages.                     |
| [2026-04-27-core-copy-deck.md](./2026-04-27-core-copy-deck.md)                                         | Superseded source | Kept because it explains the copy process; exact copy moved to full-text page copy.                 |
| [2026-04-27-landing-page-story-pass.md](./2026-04-27-landing-page-story-pass.md)                       | Reference         | Narrative direction for the current landing work.                                                   |
| [2026-04-27-authenticated-surfaces-design-pass.md](./2026-04-27-authenticated-surfaces-design-pass.md) | Reference         | IA/design guidance for Personal Data Home, Connected Apps, MCP, and auth.                           |

### Ewe Note UX

| Plan                                                                                           | Status        | Notes                                                                                                      |
| ---------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| [2026-04-06-tiptap-migration.md](./2026-04-06-tiptap-migration.md)                             | Follow-up     | Not a dogfood or launch blocker unless current editor fails the required import/edit proof.                |
| [2026-05-01-ewe-note-ux-feature-completion.md](./2026-05-01-ewe-note-ux-feature-completion.md) | Dogfood-ready | Dogfood findings first; Tasks v1 is found-in-notes, templates are low priority/local-only.                 |
| [2026-05-01-obsidian-full-sync-base-files.md](./2026-05-01-obsidian-full-sync-base-files.md)   | Dogfood-ready | Includes production `docs/personal` move into Ewe Note base `Eweser Strategy` before repo pointer cleanup. |
| [2026-04-11-ewe-note-feature-tests.md](./2026-04-11-ewe-note-feature-tests.md)                 | Later QA      | Useful after the UX pass; current Cypress coverage is partial.                                             |

### Deferred Backlog

| Plan                                                                       | Status     | Notes                                                                                             |
| -------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| [2026-04-02-phase-4-deploy.md](./2026-04-02-phase-4-deploy.md)             | Superseded | Move to old/completed plans; current deployment/landing surfaces supersede this broad phase plan. |
| [2026-04-02-phase-5-mobile.md](./2026-04-02-phase-5-mobile.md)             | Deferred   | PWA exists; Capacitor/native app work is not launch-path.                                         |
| [2026-04-03-file-storage.md](./2026-04-03-file-storage.md)                 | Deferred   | Object storage, file APIs, and BYO storage provider work.                                         |
| [2026-04-05-auto-knowledge-graph.md](./2026-04-05-auto-knowledge-graph.md) | Deferred   | Later graph/search layer concept.                                                                 |

## Completed Plans

These were moved to `./completed/` because the repo now contains the corresponding
implementation or delivered artifact.

| Plan                                                                                                           | Evidence / Notes                                                                                   |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [2026-04-02-phase-1-foundation.md](./completed/2026-04-02-phase-1-foundation.md)                               | Hono auth API, sync server, Postgres/Compose, better-auth, and SDK Hocuspocus cutover exist.       |
| [2026-04-02-phase-2-frontend.md](./completed/2026-04-02-phase-2-frontend.md)                                   | `packages/app`, Ewe Note SPA/PWA, example app routing, and Caddy wiring exist.                     |
| [2026-04-02-phase-3-aggregator.md](./completed/2026-04-02-phase-3-aggregator.md)                               | `packages/aggregator` and search/webhook indexing routes exist.                                    |
| [2026-04-02-quality-gates-hardening.md](./completed/2026-04-02-quality-gates-hardening.md)                     | Quality workflow, lint/format/type/test scripts, Cypress smoke, and Lefthook checks exist.         |
| [2026-04-04-mcp-server.md](./completed/2026-04-04-mcp-server.md)                                               | `packages/mcp-server`, agent endpoints, MCP CRUD/search/memory tools, and docs exist.              |
| [2026-04-04-obsidian-vault-sync.md](./completed/2026-04-04-obsidian-vault-sync.md)                             | Vault fixtures, import/export/sync CLI, source paths, attachments, and OFM helpers exist.          |
| [2026-04-05-dogfood-personal-brain.md](./completed/2026-04-05-dogfood-personal-brain.md)                       | Conversations collection, memory tools, and cross-tool workflow docs exist.                        |
| [2026-04-07-rooms-topology-and-doc-split.md](./completed/2026-04-07-rooms-topology-and-doc-split.md)           | Superseded by/recorded in ADR-0007.                                                                |
| [2026-04-08-one-click-deploy.md](./completed/2026-04-08-one-click-deploy.md)                                   | Railway/DO deployment assets and docs are considered complete.                                     |
| [2026-04-08-chatgpt-web-mcp.md](./completed/2026-04-08-chatgpt-web-mcp.md)                                     | OAuth metadata/routes, dynamic clients, token flow, `/mcp`, and consent/Connect AI surfaces exist. |
| [2026-04-08-share-folder-ux.md](./completed/2026-04-08-share-folder-ux.md)                                     | Folder context-menu sharing and share dialog exist in Ewe Note.                                    |
| [2026-04-09-axiom-log-transport.md](./completed/2026-04-09-axiom-log-transport.md)                             | `@eweser/logger`, Axiom pino transport, OTel host metrics, Dozzle, env/docs wiring exist.          |
| [2026-04-11-2fa-user-security.md](./completed/2026-04-11-2fa-user-security.md)                                 | Better-auth 2FA, migrations, account security UI, and challenge flow exist.                        |
| [2026-04-11-landing-page.md](./completed/2026-04-11-landing-page.md)                                           | `packages/landing` Astro site and Docker/nginx integration exist.                                  |
| [2026-04-22-artifact-free-workspace-libraries.md](./completed/2026-04-22-artifact-free-workspace-libraries.md) | Root prebuild/typecheck flow and artifact-free workspace strategy are in place.                    |
| [2026-04-24-mcp-connect-ux-and-oauth.md](./completed/2026-04-24-mcp-connect-ux-and-oauth.md)                   | Marked completed in file; Connect AI/OAuth implementation exists.                                  |
| [2026-04-27-mcp-folder-scoped-ai-access.md](./completed/2026-04-27-mcp-folder-scoped-ai-access.md)             | Marked implemented in file; read/write scope split and MCP enforcement exist.                      |

Older completed plans already archived here are kept as-is:

- [2026-04-02-quality-gates-run-3-handoff.md](./completed/2026-04-02-quality-gates-run-3-handoff.md)
- [2026-04-03-privacy-and-autonomy.md](./completed/2026-04-03-privacy-and-autonomy.md)
- [2026-04-03-remove-legacy-code.md](./completed/2026-04-03-remove-legacy-code.md)
- [2026-04-03-testing-plan-examples-db-auth.md](./completed/2026-04-03-testing-plan-examples-db-auth.md)
- [2026-04-04-conversations-collection.md](./completed/2026-04-04-conversations-collection.md)
- [2026-04-04-cross-agent-memory-search.md](./completed/2026-04-04-cross-agent-memory-search.md)
- [2026-04-06-memory-mcp-wrap-up.md](./completed/2026-04-06-memory-mcp-wrap-up.md)
- [2026-04-06-rooms-architecture-refactor.md](./completed/2026-04-06-rooms-architecture-refactor.md)
- [2026-04-07-topology-comparison.md](./completed/2026-04-07-topology-comparison.md)

## Historical

These were moved to `./historical/` because they are superseded by newer plans,
current code, or newer copy artifacts.

| Plan                                                                                                              | Notes                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [2025-04-02-federation-and-aggregator-strategy.md](./historical/2025-04-02-federation-and-aggregator-strategy.md) | Pre-migration federation strategy; not current guidance.                        |
| [2026-04-02-big-refactor.md](./historical/2026-04-02-big-refactor.md)                                             | High-level migration index; detailed phase plans and current code supersede it. |
| [2026-04-27-core-design-session-handoff.md](./historical/2026-04-27-core-design-session-handoff.md)               | Superseded by current full-text copy and app-shell/design-system plans.         |
| [2026-04-27-next-step-copy-to-figma-handoff.md](./historical/2026-04-27-next-step-copy-to-figma-handoff.md)       | Superseded after the full text-only copy deliverable was created.               |
