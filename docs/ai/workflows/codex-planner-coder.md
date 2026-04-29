# Codex Planner -> Coder Workflow

This is the canonical Codex workflow for substantial or ambiguous EweserDB work.
`AGENTS.md` remains the top-level repository policy; this document explains how
to apply that policy in Codex sessions.

## When to Use This Workflow

Use Planner -> Coder when work is substantial, ambiguous, cross-package,
security-sensitive, migration-related, or likely to affect public package APIs.

For small, clear fixes, Codex may implement directly while still following
`AGENTS.md`, package `AGENTS.md` files, and normal verification expectations.

## Roles

### Planner

Planner creates an implementation-ready plan and stops for approval.

Planner may:

- Read repository docs, package instructions, and relevant code.
- Ask clarifying questions when goal, scope, or acceptance criteria are unclear.
- Run read-only inspection and small feasibility checks when useful.
- Create or update plan documents in `docs/ai/plans/`.

Planner must not:

- Edit product code.
- Begin implementation before approval.
- Treat unresolved decisions as approved implementation scope.

### Coder

Coder owns implementation and QA for the approved plan.

Coder must:

- Read the approved plan and treat it as the approval boundary.
- Implement all runs sequentially unless the plan explicitly permits another
  order.
- Write or update tests appropriate to the risk and scope.
- Run the narrowest relevant verification first, then broader checks when the
  change crosses package boundaries.
- Perform an internal QA pass against the plan, `AGENTS.md`, security rules,
  Yjs rules, changeset rules, and monorepo consistency.
- Fix issues found during internal QA when they are inside the approval boundary.
- Stop and ask for approval when implementation requires scope outside the
  approved plan.
- Update the plan execution summary and self-reflection sections.

### Standalone QA

Standalone QA is for independent re-QA or audit requests after implementation.
It is not the required third step of the Codex-native workflow. A standalone QA
agent reports findings and recommended fixes; it should not silently expand or
replace coder-owned QA.

## Plan Requirements

Every new implementation plan should use `docs/ai/plans/_template.md` and
include:

- Goal
- Scope
- Assumptions / open questions
- Runs with id, title, files, steps, tests, verification, dependencies, model
  tier, and risk level
- Stop conditions
- Approval boundary
- Execution summary
- Self-reflection / instruction improvements

## Approval Boundary

The approved plan is the implementation boundary. Coder can make normal
implementation decisions inside that boundary, including focused fixes found by
verification or internal QA. Coder must stop for approval before adding new
features, changing public API beyond the plan, deleting migrations, changing
security behavior beyond the plan, or performing destructive operations.

## Completion Standard

Coder is done when:

- All approved runs are implemented or explicitly marked blocked.
- Relevant tests/checks have run, or skipped checks are documented with reasons.
- Internal QA findings are fixed or reported as remaining risks.
- The plan's execution summary reflects what changed and what was verified.
- The plan's self-reflection section records useful instruction or process
  improvements found during the work.
