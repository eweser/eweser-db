# Draft Plan: AI Memory Graphiti-Style Temporal Graph

## Goal

Evaluate and, if approved, add an optional Graphiti-style temporal graph
processor for relationship-heavy and time-sensitive memory.

## Scope

- In: dated license/telemetry verification, graph adapter spike, source episode
  ingestion, query path, provenance, delete/revocation behavior, and deployment
  footprint.
- Out: making Graphiti the source of truth, default onboarding branding, or
  enabling telemetry by default in privacy-sensitive/self-hosted deployments.

## Assumptions / Open Questions

- Implementation finding from the main strategy MVP: Knowledge Graph remains
  pending in the deterministic evaluation harness. This plan should extend the
  requirement-change and temporal-correctness fixtures before claiming graph
  recommendations.
- Assumption: Eweser source episodes remain canonical and graph nodes/edges are
  derived rebuildable artifacts.
- Open question: which graph backend is acceptable for local dev, hosted, and
  self-hosted deployments?
- Open question: should temporal graph results feed MCP search directly or only
  appear as an advanced strategy?

## Runs

Run order: sequential. Expand this draft before coding if legal review, graph
backend setup, adapter implementation, and deployment docs need separate runs.

### Run 1: Temporal Graph Adapter Spike

- **Id**: `run-1`
- **Title**: `Temporal Graph Adapter Spike`
- **Deliverable**: A dated legal/telemetry decision and temporal graph adapter
  spike that can ingest source episodes, answer a query, and preserve
  provenance.
- **Files**:
  - `docs/deployment/*`: graph backend and telemetry notes.
  - `packages/shared/src/collections/*`: graph artifact/provenance types if
    needed.
  - New processor package/service path: exact path to be chosen in expanded plan.
- **Steps**:
  - [ ] Verify current license, NOTICE, telemetry defaults, hosted terms, and
        transitive dependency obligations with dated sources.
  - [ ] Define adapter boundaries before importing dependencies.
  - [ ] Ingest one source episode into derived graph artifacts.
  - [ ] Query derived graph results and map them back to source memory ids.
  - [ ] Verify source deletion/revocation invalidates derived graph records.
- **Tests**:
  - Fake graph adapter unit tests.
  - Ingest/query/provenance tests.
  - Delete/revocation invalidation tests.
- **Verification**:
  - Local spike answers a temporal query with source provenance.
- **Manual test handoff**:
  - Record graph service setup, seed episode data, ingest step, sample temporal
    query, expected result, provenance inspection, and deletion/revocation
    invalidation check.
- **Dependencies**: main memory strategy onboarding plan completed and manually
  tested.
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop if telemetry cannot be disabled, backend footprint is too large, or
delete/revocation semantics cannot be enforced.

## Approval Boundary

This draft is not approved for coding. Expand it with dated source checks and a
chosen graph backend before implementation.

## Execution Summary

| Run     | Status | Files Changed | Verification | Notes |
| ------- | ------ | ------------- | ------------ | ----- |
| `run-1` | Draft  |               |              |       |

## Self-Reflection / Instruction Improvements

- None yet.
