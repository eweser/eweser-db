# Draft Plan: AI Memory Cognee-Style Workspace Intelligence

## Goal

Evaluate and, if approved, add optional Cognee-style workspace intelligence for
docs, tables, transcripts, and multi-source team/project memory.

## Scope

- In: dated license/terms verification, workspace source model, ingestion
  adapter spike, provenance, deletion/revocation behavior, and deployment notes.
- Out: replacing Eweser canonical storage, broad Lark integration without a
  source-specific plan, or default onboarding exposure.

## Assumptions / Open Questions

- Implementation finding from the main strategy MVP: Workspace Intelligence
  remains pending in the deterministic evaluation harness. This plan should add
  workspace artifact fixtures and explicit provenance expectations before
  making recommendation claims.
- Assumption: workspace intelligence is heavier than Agent Journal and Project
  Wiki, so it should follow manual testing of the main memory feature.
- Open question: which source should be first: local docs, Lark docs/tables,
  meeting transcripts, or uploaded Markdown?
- Open question: what storage/index services are acceptable for self-host?

## Runs

Run order: sequential. Expand this draft before coding if source integration,
processor adapter, and deployment docs need separate runs.

### Run 1: Workspace Intelligence Spike

- **Id**: `run-1`
- **Title**: `Workspace Intelligence Spike`
- **Deliverable**: A dated legal/dependency decision and workspace intelligence
  spike that ingests one approved source type and returns provenance-backed
  results.
- **Files**:
  - `docs/deployment/*`: storage/index and attribution notes.
  - `packages/shared/src/collections/*`: workspace source/artifact types if
    needed.
  - New processor package/service path: exact path to be chosen in expanded plan.
- **Steps**:
  - [ ] Verify current license, NOTICE, hosted terms, telemetry, and transitive
        dependency obligations with dated sources.
  - [ ] Choose one first workspace source.
  - [ ] Ingest a small source set and write derived artifacts with provenance.
  - [ ] Query workspace results and map them back to source records.
  - [ ] Test delete/revocation invalidation.
- **Tests**:
  - Fake adapter unit tests.
  - Source ingestion and provenance tests.
  - Delete/revocation invalidation tests.
- **Verification**:
  - Local spike can answer a workspace query with source provenance.
- **Manual test handoff**:
  - Record selected workspace source, seed data, ingest command, query steps,
    expected result, provenance inspection, and delete/revoke behavior.
- **Dependencies**: main memory strategy onboarding plan completed and manually
  tested.
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop if source permissions, dependency footprint, licensing, or deletion
semantics are unclear.

## Approval Boundary

This draft is not approved for coding. Expand it after choosing the first
workspace source and deployment shape.

## Execution Summary

| Run     | Status | Files Changed | Verification | Notes |
| ------- | ------ | ------------- | ------------ | ----- |
| `run-1` | Draft  |               |              |       |

## Self-Reflection / Instruction Improvements

- None yet.
