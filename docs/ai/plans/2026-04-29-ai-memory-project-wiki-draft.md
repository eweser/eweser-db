# Draft Plan: AI Memory Project Wiki

## Goal

Add the `project-wiki` strategy as an Eweser-native derived memory view for
project/repo knowledge, using canonical memory sources stored in EweserDB.

## Scope

- In: project-scoped wiki artifact model, generated project pages, review/edit
  flow, Markdown/Obsidian export compatibility, tests, and provenance.
- Out: external processor dependencies, team-wide workspace intelligence, and
  automatic capture outside approved source records.

## Assumptions / Open Questions

- Assumption: the main memory strategy plan has shipped strategy scopes,
  capture modes, and Agent Journal export.
- Open question: should generated wiki pages be ordinary Eweser documents, a new
  memory artifact collection, or both?
- Open question: should generated pages become canonical only after user review?

## Runs

Run order: sequential. Expand this draft before coding if generation, review UI,
and export need separate runs.

### Run 1: Project Wiki Artifact Model

- **Id**: `run-1`
- **Title**: `Project Wiki Artifact Model`
- **Deliverable**: A project-scoped wiki artifact model and first generated
  pages with source provenance and review/export behavior.
- **Files**:
  - `packages/shared/src/collections/*`: project wiki artifact/source types.
  - `packages/app/src/*`: project wiki review/edit UI.
  - `packages/mcp-server/src/*`: project wiki read/export tools if needed.
- **Steps**:
  - [ ] Define project wiki source and artifact documents.
  - [ ] Generate/update pages for overview, decisions, active questions, source
        index, and people/apps/tools.
  - [ ] Store provenance back to source memory ids.
  - [ ] Add review/edit flow before generated pages become canonical if needed.
- **Tests**:
  - Artifact provenance tests.
  - Project scoping tests.
  - Markdown export compatibility tests.
- **Verification**:
  - Manual project wiki generation from a seeded project memory scope.
- **Manual test handoff**:
  - Record how to seed project memory, generate wiki pages, inspect provenance,
    review/edit generated pages, and export the project wiki.
- **Dependencies**: main memory strategy onboarding plan completed and manually
  tested.
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop if wiki generation requires an unapproved external processor, unclear
canonical ownership, or cannot preserve source provenance.

## Approval Boundary

This draft is not approved for coding. Expand it after the main memory strategy
feature has working project scopes.

## Execution Summary

| Run     | Status | Files Changed | Verification | Notes |
| ------- | ------ | ------------- | ------------ | ----- |
| `run-1` | Draft  |               |              |       |

## Self-Reflection / Instruction Improvements

- None yet.
