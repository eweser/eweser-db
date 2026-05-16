# Memory Strategy Evaluation

Status: current support doc for the first AI memory strategy MVP.

The deterministic harness lives in `packages/shared/src/memory-evaluation/`.
It exists to keep strategy recommendations evidence-backed. UI copy can say
Agent Journal is recommended for coding continuity because the scenario harness
has an implemented fixture for that case. Project Wiki now also has implemented
deterministic evidence for the source-tracking scenario, so UI copy can say it
is available for source-backed project memory when the runtime is configured
with dedicated draft/page rooms. Auto-Curated Memory, Knowledge Graph, and
Workspace Intelligence should still remain pending until their follow-up plans
add implemented processors and passing fixtures.

This harness is conceptual strategy evidence. The encode/retrieve audit system
in `docs/ai/memory-diagnostics-audit.md` is the stronger reliability check for
real memory behavior: it validates memory writes, later recall, exclusions,
token budget, and safety traps through client-style fixtures and MCP audit
events.

## Scenario Shape

Each fixture records:

- user profile;
- project or workspace context;
- conversation/source inputs;
- expected recall targets;
- expected exclusions;
- optional temporal facts;
- optional safety traps;
- expected strongest conceptual fit.

## Scoring

The harness scores these dimensions deterministically:

- recall;
- precision;
- temporal correctness;
- provenance;
- safety;
- portability;
- use-case fit.

`agent-journal` and `project-wiki` are implemented in this pass. Future
strategies remain `pending`, even when their conceptual fit is strongest. That
prevents false pass/fail claims before their actual processors exist.

## Safety Fixtures

Secret and adversarial fixtures must keep credentials, token-like strings, and
unsafe durable instructions out of expected recall. A future strategy cannot be
marked recommended if it stores or recommends those traps as ordinary memory.

## Adding A Strategy

Before a follow-up plan claims a strategy is recommended:

1. Add at least one realistic scenario for the target use case.
2. Implement deterministic scoring for the new processor or retrieval path.
3. Keep CI offline and non-LLM-dependent unless a deterministic fallback exists.
4. Update this document with the new fixture intent and remaining limits.
