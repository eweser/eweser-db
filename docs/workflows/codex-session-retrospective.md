# Codex Session Retrospective

Use this workflow to review new local Codex sessions after repo navigation,
runtime, or instruction changes. The goal is to find repeated wasted motion and
promote only the fixes that will actually reduce future tool churn or token
load.

## When To Run It

- After adding or changing agent-facing repo guidance such as `INDEX.md`,
  runtime-orientation steps, local setup docs, or helper scripts.
- After noticing repeated agent confusion about ports, local app discovery,
  route/file ownership, or recurring verification failures.
- Before adding more root instruction prose, to verify the problem is repeated
  and not just one bad session.

## Inputs

- Local session records under `~/.codex/sessions/`.
- A cutoff date that starts after the instruction or tooling change you want to
  evaluate.
- An optional cwd filter so you only inspect EweserDB sessions.

## Command

```bash
npm run codex:retrospective -- --since 2026-05-02 --cwd /home/jacob/eweser-db
```

Write the report to a local artifact when you want to compare runs over time:

```bash
npm run codex:retrospective -- \
  --since 2026-05-02 \
  --cwd /home/jacob/eweser-db \
  --write .ai/reports/codex-session-retrospective-2026-05-02.md
```

## What The Analyzer Flags

- Missed index-first navigation: broad `rg` or `find` before reading an
  `INDEX.md`.
- Runtime-orientation misses: local verification before the runtime-orientation
  helper runs.
- Broad search churn: many wide search commands in one session.
- Command churn: repeated `git status` or repeated identical probing commands.
- Verification retries: the same test or type-check command rerun after failure.
- Long exploratory sessions that do not collapse to a smaller specific pattern.

These are heuristics, not truth. Treat them as prompts for inspection, not
fully automated judgment.

## Review Method

1. Run the analyzer after the relevant cutoff date.
2. Open the highest-score sessions first.
3. For each repeated category, decide whether the fix belongs in:
   - a nearby `INDEX.md`
   - `LOCAL_DEVELOPMENT.md`
   - the runtime-orientation skill or notes
   - a small helper script under `scripts/`
   - the Planner -> Coder workflow
4. Only promote the fix into durable instructions if the same pattern appears
   across multiple sessions.
5. Re-run the analyzer after the change and compare whether that category
   declines.

## Guardrails

- Do not add broad root-level instruction prose for one-off mistakes.
- Prefer local fixes near the confusion source: index entries, source headers,
  runtime notes, or tiny helper commands.
- Keep generated reports out of Git unless they become curated research docs.
- Treat the session data as operational history. Do not copy secrets or raw
  credential output into docs or memories.

## Testing

- `npm run codex:retrospective -- --since 2026-05-02 --cwd /home/jacob/eweser-db --limit 5`
- `npx prettier --check docs/workflows/codex-session-retrospective.md`
