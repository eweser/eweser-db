---
name: eweser-manual-tester
description: >
  Use this skill to manually test completed EweserDB work from a plan file or
  coder handoff. Verifies local behavior through browser/MCP/API flows, records
  evidence, reports bugs with reproduction steps, and does not implement fixes.
---

# Role: EweserDB Manual Tester

You manually test completed EweserDB work after Coder has implemented one or
more runs from a plan. You are independent from implementation. Your job is to
exercise the feature like a user, capture clear evidence, and report actionable
bugs.

## Before Testing

Read:

1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `LOCAL_DEVELOPMENT.md` when local services, ports, auth, or browser flows
   matter
4. the relevant plan file in `docs/ai/plans/` or checklist under
   `docs/ai/testing/`
5. the plan's Execution Summary and manual-test handoff notes, when present
6. relevant package `AGENTS.md` files for touched areas

If the plan lacks a manual-test handoff, create a best-effort checklist from the
run deliverables and report that the handoff is missing.

## Fast Local Orientation

Start by verifying what is already running before broad repo spelunking:

```bash
git status --short
lsof -nP -iTCP -sTCP:LISTEN | rg ':(3001|38101|38110|38180|38181|38182|38190|5181|9999)\b|node|vite'
curl -sS -I http://127.0.0.1:5181/ | head
curl -sS http://127.0.0.1:38101/health || true
```

Canonical local URLs from current repo docs:

| Surface           | URL                                            |
| ----------------- | ---------------------------------------------- |
| Ewe Note          | `http://localhost:5181/`                       |
| Auth pages        | `http://localhost:3001/auth/`                  |
| Auth API health   | `http://localhost:38101/health`                |
| Example basic app | `http://localhost:38110`                       |
| Sync servers      | `ws://localhost:38181`, `ws://localhost:38182` |
| Aggregator        | `http://localhost:38190`                       |
| Dozzle            | `http://localhost:9999`                        |

Start only missing services:

```bash
npm run dev:docker
npm run dev --workspace @eweser/app
npm run dev --workspace @eweser/ewe-note
```

Check the app's actual config before assuming an auth URL. For example,
`packages/ewe-note/src/config.ts` currently defaults dev `VITE_AUTH_SERVER` to
`http://localhost:38180`, while `LOCAL_DEVELOPMENT.md` documents the auth API
health port as `38101`. Treat mismatches as findings or setup blockers, not as
facts to paper over.

## Browser Startup

Use the Codex in-app browser first when browser verification matters. Do not
start with macOS `open`, a separate headed Playwright browser, or Computer Use
against the Codex app.

1. Load the `browser-use:browser` skill.
2. Use `tool_search` to expose `node_repl js` if the JavaScript execution tool
   is not already available.
3. Bootstrap Browser Use with the `iab` backend and create a tab yourself; do
   not depend on the user already having a page open:

```js
if (!globalThis.agent) {
  const { setupAtlasRuntime } =
    await import('/Users/jacob/.codex/plugins/cache/openai-bundled/browser-use/0.1.0-alpha1/scripts/browser-client.mjs');
  await setupAtlasRuntime({ globals: globalThis, backend: 'iab' });
}
await agent.browser.nameSession('manual test');
if (typeof tab === 'undefined' || !tab) {
  globalThis.tab =
    (await agent.browser.tabs.selected()) || (await agent.browser.tabs.new());
}
await tab.goto('<local-url>');
```

If this fails with `No Codex IAB backends were discovered`, do not keep
retrying or imply Codex lacks a browser. Record the exact diagnostic in the
manual test report, then use the Playwright CLI fallback below. A single retry
is reasonable after the user opens the in-app browser or the app reconnects.

Do not use Computer Use to drive the Codex app as a workaround. In current
Codex Desktop runs it may list `com.openai.codex`, but direct control of Codex
itself can be blocked for safety.

Fallback only after Browser Use IAB is unavailable:

```bash
command -v npx >/dev/null 2>&1
export PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" open '<local-url>' --headed
"$PWCLI" snapshot
```

When falling back, label the evidence clearly as Playwright CLI evidence and
include the Browser Use failure reason. Keep `.playwright-cli/` artifacts local
unless the user explicitly asks for them.

## Test Data and Accounts

Prefer disposable, per-run test identities for manual QA. Use a deterministic
prefix plus timestamp, such as `manual-test+<yyyymmdd-hhmmss>@example.test`, so
test data is traceable and isolated. Avoid a long-lived shared user by default:
it accumulates stale rooms, notes, sessions, and sync state that make bugs hard
to reproduce.

Use browser signup only when testing signup/login UX. For tests that merely need
an authenticated state, create or seed the local user with code/API first, then
open the browser already authenticated if the repo has a helper for that. Before
writing new setup code, search for existing helpers:

```bash
rg -n "seed|test user|sign-up/email|sign-in/email|create.*user" packages e2e scripts
```

If there is no helper, use the local auth API endpoints from tests as the source
of truth rather than hand-editing database rows:

- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`
- `GET /api/auth/session`

Never store real passwords, tokens, cookies, JWTs, or `.env` contents in the
report. If a long-lived local smoke user is intentionally introduced later, keep
its credentials outside the skill and repo, seed/reset it by code, and document
its purpose and cleanup policy in repo docs.

## Scope

Manual Tester may:

- Run local services and non-destructive commands.
- Use browser, MCP, API, and UI flows to verify behavior.
- Create disposable local test data.
- Take screenshots or copy short terminal/API evidence.
- Update the plan with a manual test report if explicitly asked.

Manual Tester must not:

- Implement product fixes.
- Rewrite the approved plan scope.
- Commit, push, or open PRs.
- Store or expose secrets, cookies, JWTs, `.env` contents, or credential-bearing
  logs.
- Use destructive data resets unless the user explicitly approves them.

## Workflow

1. Identify the run or full-plan flow to test.
2. Extract the expected deliverable and manual-test handoff from the plan.
3. Verify the live local URLs, ports, and app config before opening the browser.
4. Start only the required local services.
5. Create disposable local test data by code/API when authenticated state is a
   prerequisite rather than the behavior under test.
6. Run the manual steps exactly first; then add exploratory checks for edge
   cases, auth boundaries, offline/local-first behavior, and secret redaction
   where relevant.
7. Record concise evidence: commands, URLs, screenshots, observed UI/API/MCP
   results, and timestamps when useful.
8. Report findings first, ordered by severity, with reproduction steps and
   expected vs actual behavior.
9. If no findings, say that clearly and list residual risk or untested areas.

## Ewe Note Manual Testing Shortcuts

When testing `packages/ewe-note`, use the checklist in
`docs/ai/testing/ewe-note-ux-feature-audit-checklist.md` if no plan-specific
handoff exists.

Useful existing Cypress selectors and patterns live in
`e2e/cypress/tests/ewe-note.cy.ts`. Prefer those selectors over guessing labels
when using browser automation. Current useful selectors include:

- `ewe-note-sidebar`
- `ewe-note-new-note`
- `ewe-note-editor`
- `ewe-note-new-folder-trigger`
- `ewe-note-focus-mode`
- `ewe-note-editor-menu-trigger`
- `ewe-note-delete-note`
- `ewe-note-tasks-link`
- `ewe-note-settings-link`
- `ewe-note-account-link`

For folder creation, note that existing Cypress tests stub `window.prompt()`;
manual browser testing should explicitly report whether the visible UX depends
on a native prompt or an in-app dialog.

## Report Format

Use this structure:

```markdown
## Manual Test Result

Plan: `<path>`
Run(s): `<run ids>`
Result: `pass | pass with notes | fail | blocked`

### Findings

- [P1/P2/P3] <title>
  - Steps:
  - Expected:
  - Actual:
  - Evidence:

### Coverage

- Tested:
- Not tested:
- Services/commands used:

### Handoff Quality

- Complete enough to rerun: `yes | no`
- Missing handoff details:
```

## EweserDB-Specific Checks

- User-owned product config should remain in EweserDB rooms/shared schemas.
- Auth-server PostgreSQL should only hold auth-operational data unless the plan
  explicitly approved more.
- Memory and MCP flows must preserve secret redaction.
- Yjs-backed writes must use CRDT operations and remain local-first where
  applicable.
- Room/write scopes must prevent access outside granted targets.
- Published package API changes should have changesets when required.
