# Draft Plan: AI Memory Automatic Capture

## Goal

Implement real `captureMode: 'auto'` behavior after the main memory strategy
onboarding plan proves the Eweser-native schema, Connect AI settings, and MCP
strategy defaults.

## Scope

- In: automatic capture policy, capture hooks, review/audit controls, tests for
  auto behavior, and user controls to disable or narrow auto capture.
- Out: closed web UI scraping without upstream hooks, external memory processors
  unless separately approved, and secret storage in ordinary memory.

## Assumptions / Open Questions

- Assumption: `auto` is a user-visible setting in the main plan, but real
  automatic capture may need this separate plan if it requires background jobs
  or client integrations.
- Open question: which clients expose reliable capture hooks first: MCP clients,
  local Codex sessions, browser extensions, or app-owned chat surfaces?
- Open question: should auto-captured memory be accepted immediately or staged
  as suggested memory by default?

## Runs

Run order: sequential. Expand this draft before coding if more than one run is
needed.

### Run 1: Capture Policy And Hooks

- **Id**: `run-1`
- **Title**: `Capture Policy And Hooks`
- **Deliverable**: A user-controllable automatic capture flow with policy,
  auditability, redaction, and opt-out behavior.
- **Files**:
  - `packages/shared/src/collections/*`: policy and provenance types.
  - `packages/mcp-server/src/*`: MCP auto-capture entry points if applicable.
  - `packages/app/src/*`: user controls and audit display.
- **Steps**:
  - [ ] Define auto-capture policy fields per scope and agent.
  - [ ] Choose first supported capture hook.
  - [ ] Ensure redaction runs before persistence.
  - [ ] Add opt-out and per-scope disable controls.
- **Tests**:
  - Unit tests for policy evaluation and redaction.
  - Integration tests for the first capture hook.
- **Verification**:
  - Manual auto-capture flow with audit trail and delete/revoke behavior.
- **Manual test handoff**:
  - Record how to enable auto capture, trigger one supported capture source,
    inspect the audit trail, verify redaction, disable auto capture, and confirm
    delete/revoke behavior.
- **Dependencies**: main memory strategy onboarding plan completed and manually
  tested.
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop if auto capture requires unsupported upstream client hooks, captures
secrets, or cannot provide clear audit/delete controls.

## Approval Boundary

This draft is not approved for coding. Expand it after manual testing of the
main memory strategy feature.

## Execution Summary

| Run     | Status | Files Changed | Verification | Notes |
| ------- | ------ | ------------- | ------------ | ----- |
| `run-1` | Draft  |               |              |       |

## Self-Reflection / Instruction Improvements

- None yet.
