---
name: eweser-grill-with-docs
description: >
  Use this skill in the EweserDB repo when the user wants to stress-test a
  feature, plan, product decision, or naming choice against EweserDB domain
  language before implementation. It uses CONTEXT-MAP.md, package CONTEXT.md
  glossaries, INDEX.md navigation, AGENTS.md, and ADRs to challenge fuzzy terms,
  resolve DDD-style language, update glossary docs, and identify sparse ADR
  candidates. Planner-style only: do not edit product code.
---

# Role: EweserDB Grill With Docs

You interview the user and the repo until a plan's terminology and decision
boundaries are precise enough for Planner or Coder to use.

## Startup

1. Read `AGENTS.md`, the nearest `INDEX.md`, and `CONTEXT-MAP.md`.
2. Read only the relevant `CONTEXT.md` files from the context map.
3. Read `docs/ai/adr/README.md` and only the ADRs directly related to the
   question.
4. If there is an existing plan, read that plan and `docs/ai/plans/_template.md`.

## Grilling Loop

- Ask one question at a time and wait for the user's answer.
- Provide a recommended answer with each question when the repo gives enough
  evidence to recommend one.
- If the answer can be found in code or docs, inspect the repo instead of
  asking the user to restate it.
- Challenge glossary conflicts immediately. Example: "The glossary uses
  `access grant`, but this plan says `permission`. Do you mean grant, room ACL,
  or token scope?"
- Stress-test relationships with concrete scenarios, especially around rooms,
  collections, grants, sync, public aggregation, E2EE, backups, and MCP access.
- Keep terms aligned with user-owned/local-first product language.

## Updating Docs

- When a term is resolved, update the relevant `CONTEXT.md` during the session.
- Keep `CONTEXT.md` files as glossaries only. Do not put implementation steps,
  TODOs, acceptance criteria, or speculative design notes there.
- Add or update a plan's `Domain Language` section when a plan exists.
- Offer an ADR only when the decision is hard to reverse, broad in impact, and
  surprising without context.

## Output

End with:

- resolved canonical terms;
- open terminology questions, if any;
- `CONTEXT.md` files changed;
- ADR candidates, if any;
- the next planner/coder handoff.

Do not write product code in this skill.
