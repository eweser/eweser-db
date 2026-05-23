# EweserDB

## Plain English

EweserDB is a local-first, user-owned database monorepo built around Yjs rooms,
shared schemas, auth grants, sync, and interoperable apps.

## Owns

- The top-level product architecture, workspace layout, repo-wide workflows,
  and policy entry points.
- The navigation path from product docs to package, example, script, and test
  ownership.

## Start Here

- [`README.md`](./README.md): Product philosophy and SDK overview.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): Current runtime topology and package
  relationships.
- [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md): Local service setup and
  ports.
- [`AGENTS.md`](./AGENTS.md): Repo-wide agent policy.
- [`GLOSSARY-MAP.md`](./GLOSSARY-MAP.md): Domain-language glossary map for
  planning and AI agents.
- [`docs/ai/code-indexing.md`](./docs/ai/code-indexing.md): Index format and
  checker contract.
- [`packages/INDEX.md`](./packages/): Workspace package map.
- [`examples/INDEX.md`](./examples/): Demo and interop app map.

## Children

- [`packages/`](./packages/): SDK packages, services, apps, logger, and MCP
  server.
- [`examples/`](./examples/): Teaching apps and interop demos.
- [`docs/`](./docs/): Architecture, workflows, plans, ADRs, deployment, and
  security docs.
- [`scripts/`](./scripts/): Release, CI, E2E, secrets, deployment, and agent
  helper scripts.
- [`e2e/`](./e2e/): Cypress specs and support files for user workflows.

## Key Contracts

- Product data that must interoperate across apps belongs in EweserDB rooms or
  shared schemas, not auth-server PostgreSQL, unless a plan explicitly says
  otherwise.
- PostgreSQL in `packages/auth-server-hono` is for auth, sessions, grants,
  OAuth, operational tokens, and security/audit metadata.
- Public package API changes to `@eweser/db`, `@eweser/shared`, or
  `@eweser/examples-components` require a changeset.
- Never delete migrations or commit secrets.
- `GLOSSARY.md` files are glossaries only. Put implementation plans in
  `docs/ai/plans/` and architectural decisions in ADRs.

## Update Triggers

- Update when the monorepo layout, package relationships, root commands,
  architecture docs, domain-language map, agent workflow, or top-level quality
  gates change.
- Update nearby child indexes when ownership, public entry points, auth/security
  behavior, Yjs behavior, or test commands change.

## Testing

- `npm run code-index:check`: Validates required indexes, index links, and
  source-header format.
- `npm run check`: Runs root lint, format, type-check, and unit gates.

## Runtime Flow

Browser apps use `@eweser/db` for local IndexedDB-backed Yjs rooms, obtain
auth/grant state from `@eweser/auth-server-hono`, sync through
`@eweser/sync-server`, and optionally expose public searchable data through
`@eweser/aggregator`.

## Links

- [`docs/ai/workflows/codex-planner-coder.md`](./docs/ai/workflows/codex-planner-coder.md):
  Canonical Planner -> Coder workflow.
- [`docs/ai/plans/`](./docs/ai/plans/): Implementation plans and handoffs.
