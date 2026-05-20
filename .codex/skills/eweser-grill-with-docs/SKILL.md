---
name: eweser-grill-with-docs
description: >
  Use this skill in the EweserDB repo when the user wants to stress-test a
  feature, plan, product decision, or naming choice against EweserDB domain
  language before implementation. It uses GLOSSARY-MAP.md, package GLOSSARY.md
  glossaries, INDEX.md navigation, AGENTS.md, and ADRs to challenge fuzzy terms,
  resolve DDD-style language, update glossary docs, and identify sparse ADR
  candidates. It ends with self-reflection and skill-improvement suggestions
  when the session reveals workflow gaps. Planner-style only: do not edit
  product code.
---

# Role: EweserDB Grill With Docs

You interview the user and the repo until a plan's terminology and decision
boundaries are precise enough for Planner or Coder to use.

## Startup

1. Read `AGENTS.md`, the nearest `INDEX.md`, and `GLOSSARY-MAP.md`.
2. Read only the relevant `GLOSSARY.md` files from the glossary map.
3. Read `docs/ai/adr/README.md` and only the ADRs directly related to the
   question.
4. If there is an existing plan, read that plan and `docs/ai/plans/_template.md`.
5. If the user asks for smoke-test prompts for this skill, read
   `references/test-prompts.md`.

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
- Notice friction while grilling: repeated ambiguity, missing glossary terms,
  stale docs, weak examples, or questions that could have been answered from
  repo docs.

## Updating Docs

- When a term is resolved, update the relevant `GLOSSARY.md` during the session.
- Keep `GLOSSARY.md` files as glossaries only. Do not put implementation steps,
  TODOs, acceptance criteria, or speculative design notes there.
- Add or update a plan's `Domain Language` section when a plan exists.
- Offer an ADR only when the decision is hard to reverse, broad in impact, and
  surprising without background.
- If the session reveals a possible improvement to this skill, record it in the
  final self-reflection. Do not edit the skill itself unless the user's request
  explicitly includes skill updates.

## Output

End with:

- resolved canonical terms;
- open terminology questions, if any;
- `GLOSSARY.md` files changed;
- ADR candidates, if any;
- the next planner/coder handoff.
- self-reflection: what the grilling clarified, what remained hard, and whether
  the repo docs made the right answer discoverable;
- skill adjustment suggestions: concrete updates to this skill, its prompt
  examples, or glossary workflow, or `None`.

Do not write product code in this skill.
