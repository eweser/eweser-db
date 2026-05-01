# Draft Plan: AI Memory Mem0-Style Processor

## Goal

Evaluate and, if approved, add an optional Mem0-style processor for
`auto-curated` memory while keeping EweserDB as the canonical source of truth.

## Scope

- In: dated license/terms verification, internal processor adapter contract,
  fake-client tests, provenance, disabled fallback, and deployment notes.
- Out: making Mem0 a hard dependency, exposing Mem0 branding in default UX, or
  using Mem0 Cloud without explicit terms review.

## Assumptions / Open Questions

- Assumption: Eweser memory source records remain canonical; processor outputs
  are derived artifacts that can be rebuilt or deleted.
- Open question: should the first implementation use a library, self-hosted
  service, or compatible local processor shape?
- Open question: what storage/index dependencies are acceptable for hosted and
  self-hosted deployments?

## Runs

Run order: sequential. Expand this draft before coding if license review,
adapter implementation, and deployment docs need separate runs.

### Run 1: License And Adapter Spike

- **Id**: `run-1`
- **Title**: `License And Adapter Spike`
- **Deliverable**: A dated legal/dependency decision and optional processor
  adapter spike that writes derived facts with Eweser source provenance.
- **Files**:
  - `docs/deployment/*`: processor deployment and attribution notes.
  - `packages/shared/src/collections/*`: derived fact/artifact provenance types.
  - New processor package/service path: exact path to be chosen in expanded plan.
- **Steps**:
  - [ ] Verify current license, NOTICE, trademarks, hosted terms, telemetry, and
        transitive dependency obligations with dated sources.
  - [ ] Define an internal processor interface before importing dependencies.
  - [ ] Prototype ingestion from Eweser memory records into derived facts.
  - [ ] Add disabled fallback behavior.
- **Tests**:
  - Adapter unit tests with a fake processor client.
  - Provenance tests from source memory id to derived artifact.
  - Processor disabled fallback tests.
- **Verification**:
  - Local spike can ingest seeded memory and write derived artifacts with
    provenance.
- **Manual test handoff**:
  - Record exact seed-memory setup, processor enable/disable steps, ingest
    command, derived artifact inspection, provenance check, and disabled
    fallback behavior.
- **Dependencies**: main memory strategy onboarding plan and Project Wiki or
  artifact model decision.
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop if licensing, telemetry, hosted terms, dependency footprint, or provenance
requirements are unclear.

## Approval Boundary

This draft is not approved for coding. Expand it with dated source checks and a
chosen dependency path before implementation.

## Execution Summary

| Run     | Status | Files Changed | Verification | Notes |
| ------- | ------ | ------------- | ------------ | ----- |
| `run-1` | Draft  |               |              |       |

## Self-Reflection / Instruction Improvements

- None yet.
