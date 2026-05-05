---
name: eweser-retrospective-improver
description: >
  Use this skill in the EweserDB repo when the user asks to analyze recent
  Codex session performance, agent flailing, context bloat, missing background
  knowledge, weak prompts, poor skill triggering, repeated sidequests, or
  adoption of INDEX.md and code-map/graph lookup workflows. Runs the local
  session retrospective tooling, inspects high-signal evidence, and makes
  targeted improvements to skills, workflow docs, indexes, helper scripts, or
  retrospective heuristics so future agents get relevant context faster.
---

# Role: EweserDB Retrospective Improver

You improve EweserDB agent behavior based on recent Codex session evidence.
Default to making targeted durable fixes, not just writing analysis, unless the
user explicitly asks for analysis only.

## Workflow

1. Orient from repo guidance:

```bash
pwd
sed -n '1,220p' INDEX.md
sed -n '1,220p' scripts/INDEX.md
sed -n '1,220p' docs/workflows/codex-session-retrospective.md
```

2. Run the retrospective with the real repo path:

```bash
npm run codex:retrospective -- --since <YYYY-MM-DD> --cwd "$(pwd)" --limit 20 --write .ai/reports/codex-session-retrospective-<date>.md
```

Use a cutoff that matches the user request. If unspecified, use the date of the
recent instruction/tooling change being evaluated, or the last few days. If
`.ai/codex-session-retrospective-state.json` already exists and the user asks
for new/recent issues without naming a cutoff, omit `--since`; the analyzer will
start after the stored reviewed-through session.

If the user asks for a read-only check, performance probe, or subagent smoke
test, do not use `--write` and do not mark reviewed unless explicitly requested.
For those runs, use stdout only:

```bash
npm run codex:retrospective -- --cwd "$(pwd)" --limit 20
```

3. Read the report summary and the top sessions. Do not paste full session
   JSONL into context.

```bash
sed -n '1,180p' .ai/reports/codex-session-retrospective-<date>.md
```

4. Inspect only enough raw session evidence to validate the pattern. Extract
   commands, prompts, and tool churn from the highest-score sessions; avoid loading
   full transcripts unless exact wording is necessary.

5. Classify repeated problems:

- `stale background`: repo guidance contradicts current code, e.g. old editor or
  runtime assumptions.
- `navigation`: agents used broad `rg`/`find` before nearest `INDEX.md`.
- `graph lookup`: agents missed `npm run code-map:query` for symbol, import,
  export, package, or barrel-file questions.
- `runtime`: agents ran tests, Cypress, browser flows, or local servers before
  runtime orientation.
- `prompt/skill`: a repo skill or workflow omitted a required first step,
  encouraged oversized context reads, or failed to trigger.
- `tooling`: the retrospective heuristic is noisy, blind to an important
  pattern, or needs a small helper command.

6. Patch the nearest durable source of the repeated failure:

- Update package or root `INDEX.md` when agents cannot find the right entry
  point.
- Update `.codex/skills/*/SKILL.md` when a skill's startup sequence, trigger
  text, or verification ladder caused the issue.
- Update `docs/workflows/*` for human-readable maintenance loops.
- Update `scripts/codex/analyze-session-efficiency.mjs` when the report misses
  or overstates a pattern.
- Add a tiny helper script only when repeated manual command sequences are
  genuinely fragile or noisy.

Prefer local fixes over more root prose. Do not add broad instructions for a
one-off mistake.

7. Create a Coder-ready plan for any needed fix that is not safe to complete
   directly in the retrospective pass.

Create `docs/ai/plans/YYYY-MM-DD-retrospective-<short-slug>.md` from
`docs/ai/plans/_template.md` when a validated improvement:

- touches product/runtime code rather than only skill docs, indexes, workflow
  docs, or analyzer heuristics;
- needs multiple implementation runs or broader verification;
- has unresolved approval questions;
- needs manual QA or browser testing beyond a quick smoke check;
- would be risky to implement while also doing the retrospective.

The plan must be runnable by `$eweser-coder`: include concrete files, steps,
tests, verification, stop conditions, and an approval boundary. End the
retrospective report with a ready prompt:

```text
Use $eweser-coder docs/ai/plans/YYYY-MM-DD-retrospective-<short-slug>.md
```

If every validated improvement was completed directly, say no Coder plan was
needed and why.

8. After acting on a retrospective batch, record the reviewed-through marker so
   the next run does not keep reporting the same old sessions as new:

```bash
npm run codex:retrospective -- --since <YYYY-MM-DD> --cwd "$(pwd)" --limit 20 --write .ai/reports/codex-session-retrospective-<date>-after.md --mark-reviewed
```

Confirm a follow-up run without `--since` starts after that marker:

```bash
npm run codex:retrospective -- --cwd "$(pwd)" --limit 20 --write .ai/reports/codex-session-retrospective-after-marker.md
```

## Context Discipline

- Read indexes and headings first; use targeted `rg` only after narrowing the
  package or workflow.
- When this skill is already loaded, do not re-read the full `SKILL.md`; use
  these loaded instructions and read only the repo indexes, workflow doc, state
  marker, and report summaries needed for the run.
- Use `npm run code-map:query -- --symbol <name>`, `--file <path>`,
  `--package <name>`, or `--top-exports` before broad source dumps for
  TypeScript graph questions.
- Do not use web search or memory lookup for ordinary local retrospective runs
  unless the report points to missing current external context.
- Keep `.ai/reports/*` local unless the user explicitly asks to commit a curated
  report.
- Do not copy secrets, cookies, tokens, `.env` contents, or credential-bearing
  terminal output from session logs into docs, reports, or memory.

## Verification

Run the checks relevant to what changed:

```bash
npm run codex:retrospective -- --since <YYYY-MM-DD> --cwd "$(pwd)" --limit 20 --write .ai/reports/codex-session-retrospective-<date>-after.md
npm run codex:retrospective -- --cwd "$(pwd)" --limit 20 --write .ai/reports/codex-session-retrospective-after-marker.md
npm run code-index:check
npx prettier --check <changed markdown/js files>
python3 /Users/jacob/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/eweser-retrospective-improver
```

If `quick_validate.py` cannot run because its local `yaml` dependency is
missing, say that directly and manually check that `SKILL.md` has only `name`
and `description` frontmatter fields. If a script is changed, run the script on
a small realistic input.

## Report Back

Lead with repeated problems found, then list files changed and verification.
State any remaining risk, especially analyzer noise, low index/header coverage,
or a useful next tooling improvement.
