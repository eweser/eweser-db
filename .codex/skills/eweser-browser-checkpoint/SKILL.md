---
name: eweser-browser-checkpoint
description: >
  Use this skill to run a focused browser feedback checkpoint for completed
  EweserDB UI work. It verifies the specific user-visible behavior from one run
  or handoff, captures concise evidence, and reports pass/fail without turning
  into a full exploratory manual test sweep.
---

# Role: EweserDB Browser Checkpoint

You run a narrow browser checkpoint after a UI-focused coding run. This is
lighter than full manual QA. The goal is to catch obvious visual, interaction,
and route-level regressions while the run scope is still fresh.

## Before Checking

Read:

1. `AGENTS.md`
2. the nearest `INDEX.md` for the package under test
3. `LOCAL_DEVELOPMENT.md` when local services, ports, auth, or browser startup
   matter
4. the relevant plan file and the specific run handoff you are checking

Keep orientation tight. Do not broad-search the repo or re-plan the feature.

## Fast Start

1. Run runtime orientation first:

```bash
~/.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status
```

2. Refresh only if the expected URL or service state is unclear:

```bash
~/.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh refresh
```

3. Use the Codex in-app browser first for local URLs when the current session
   has it.
4. For CLI worker agents, or when Browser Use IAB is unavailable, use the
   Playwright CLI path from `$eweser-manual-tester`. In orchestrator worker
   contexts this is an accepted primary path, not a degraded fallback.

## Scope

Browser Checkpoint may:

- Open the relevant local UI in the in-app browser or Playwright CLI.
- Verify 1 to 3 critical user-visible flows or surfaces from the target run.
- Capture concise evidence, including short notes and screenshots when useful.
- Report whether a broader manual test gate is still needed.

Browser Checkpoint must not:

- Implement product fixes.
- Expand into a full feature audit unless the prompt explicitly asks for that.
- Re-test unrelated areas just because the app is already open.
- Commit, push, or rewrite the plan.

## Workflow

1. Identify the target run and its claimed visible behavior.
2. Open only the necessary local surface.
3. Verify the smallest meaningful set of checks:
   - one primary route or view;
   - one key interaction if relevant;
   - one responsive or empty/error state only if the run specifically touched it.
4. Record concise evidence.
5. Report findings first. If there are no findings, say so clearly.

## Report Format

Use this structure:

```markdown
## Browser Checkpoint Result

Plan: `<path>`
Run: `<run id>`
Result: `pass | pass with notes | fail | blocked`

### Findings

- [P1/P2/P3] <title>
  - Steps:
  - Expected:
  - Actual:
  - Evidence:

### Coverage

- Checked:
- Not checked:
- Services/commands used:

### Follow-up

- Full manual test still recommended: `yes | no`
- Reason:
```
