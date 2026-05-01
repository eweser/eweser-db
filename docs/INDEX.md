# Docs

## Plain English

This folder contains current project documentation, deployment/security docs,
AI planning history, workflows, research notes, and personal strategy notes.

## Owns

- Current-state docs outside package READMEs.
- Historical plans and ADRs under `docs/ai`.
- Human and agent workflows that are not always-loaded root instructions.

## Start Here

- [`../ARCHITECTURE.md`](../ARCHITECTURE.md): Current system architecture.
- [`../LOCAL_DEVELOPMENT.md`](../LOCAL_DEVELOPMENT.md): Local setup.
- [`ai/code-indexing.md`](./ai/code-indexing.md): Code navigation index
  contract.
- [`ai/workflows/codex-planner-coder.md`](./ai/workflows/codex-planner-coder.md):
  Planner -> Coder workflow.
- [`workflows/code-index-maintenance.md`](./workflows/code-index-maintenance.md):
  Daily index maintenance workflow.

## Children

- [`ai/`](./ai/): ADRs, plans, research, testing notes, and agent workflows.
- [`deployment/`](./deployment/): Deployment provider notes and minimum specs.
- [`personal/`](./personal/): Strategy and roadmap notes.
- [`workflows/`](./workflows/): Cross-tool and maintenance workflows.

## Key Contracts

- Treat `docs/ai/` and `docs/ai/adr/` as historical unless a file explicitly
  says it is current guidance.
- Keep `README.md`, `ARCHITECTURE.md`, and package READMEs aligned with current
  code when commands, ports, package names, auth behavior, or user-facing flows
  change.

## Update Triggers

- Update when doc folders, current workflow docs, deployment docs, ADR policy,
  or plan organization changes.

## Testing

- `npx prettier --check docs/**/*.md`: Checks Markdown formatting when shell
  expansion is available.
- `npm run code-index:check`: Validates local links in docs indexes.
