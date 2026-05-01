# Plan: <Title>

## Goal

<One concise statement of the intended user-visible or system outcome.>

## Scope

- In: <What this plan is approved to change.>
- Out: <Related work that is intentionally excluded.>

## Assumptions / Open Questions

- Assumption: <Known fact or working assumption.>
- Open question: <Question that must be answered before or during implementation.>

## Runs

## Run Order And Manual Test Handoffs

Run order: <Sequential by default, or describe allowed concurrency.>

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: <Title>

- **Id**: `run-1`
- **Title**: `<Title>`
- **Deliverable**:
  - <Concrete result this run leaves behind.>
- **Files**:
  - `<path>`: <expected change>
- **Steps**:
  - [ ] <Implementation step>
- **Tests**:
  - <Test file or command>
- **Verification**:
  - <Narrow command or manual verification>
- **Manual test handoff**:
  - <What a separate tester should do after this run, or "Not needed: <reason>".>
- **Dependencies**:
  - <None | run id | external prerequisite>
- **Model tier**: `fast | coder | strong`
- **Risk level**: `low | medium | high`

## Stop Conditions

Stop and ask for user approval if:

- Implementation requires work outside this plan's scope.
- A public package API change, migration, auth/security behavior change, or
  destructive operation is needed but was not explicitly planned.
- Verification exposes a blocking issue that cannot be fixed inside the approval
  boundary.
- Required secrets, credentials, or unavailable services block verification.

## Approval Boundary

Approval of this plan authorizes Coder to implement the runs above, make focused
supporting edits needed for those runs, write/update tests, run relevant
verification, perform internal QA, fix issues found inside this boundary, and
update this plan's execution summary.

Approval does not authorize unrelated refactors, new product scope, destructive
git operations, direct pushes to `main`, secret handling, migration deletion, or
published package API changes not called out above.

## Execution Summary

| Run     | Status      | Files Changed | Verification | Notes |
| ------- | ----------- | ------------- | ------------ | ----- |
| `run-1` | Not started |               |              |       |

## Self-Reflection / Instruction Improvements

- <Record any useful improvement to repo instructions, skill docs, tests, or
  future planning discovered during implementation. Use "None" if no improvement
  is found.>
