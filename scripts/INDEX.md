# Scripts

## Plain English

This folder contains operational scripts for release, deployment, E2E smoke
tests, secret scanning, agent orchestration, and code-index validation.

## Owns

- Repo-local command implementations called by root `package.json`.
- Automation helpers that are not package runtime code.

## Start Here

- [`run-e2e-smoke.mjs`](./run-e2e-smoke.mjs): Root smoke-test runner.
- [`release.js`](./release.js): Package release helper.
- [`code-index/check-code-index.mjs`](./code-index/check-code-index.mjs):
  Navigation index checker.
- [`code-map/generate-code-map.mjs`](./code-map/generate-code-map.mjs):
  Local TypeScript import/export map prototype.
- [`code-map/query-code-map.mjs`](./code-map/query-code-map.mjs): Compact
  query helper for symbols, packages, files, and export hotspots.
- [`codex/analyze-session-efficiency.mjs`](./codex/analyze-session-efficiency.mjs):
  Scans local Codex session logs for repeated inefficiency patterns.
- [`memory/diagnose-memory-session.mjs`](./memory/diagnose-memory-session.mjs):
  Audits memory fixtures, MCP audit JSONL, and optional Codex session logs for
  useful recall, bounded context, and safety failures.
- [`codex/README.md`](./codex/README.md): Codex helper script notes.

## Children

- [`ai-secrets/`](./ai-secrets/): Secret scanning and AWS agent-session helpers.
- [`codex/`](./codex/): Plan orchestration and mini-worker helpers.
- [`hooks/`](./hooks/): Pre-push autofix and verification scripts.
- [`code-index/`](./code-index/): Index validation tooling.
- [`code-map/`](./code-map/): Local generated code-map experiment tooling.

## Key Contracts

- Scripts must avoid printing secrets and should be safe to run from the root
  commands that reference them.
- Code-index tooling uses Node standard library only.
- Code-map tooling uses the existing TypeScript compiler dependency and writes
  generated output to ignored local paths.
- Deployment scripts should stay aligned with deployment docs.

## Update Triggers

- Update when root scripts are added, renamed, removed, or a script folder gains
  a new ownership boundary.

## Testing

- `npm run code-index:check`: Validates index coverage.
- `npm run code-map`: Writes the local TypeScript import/export map to
  `.ai/code-map.json`.
- `npm run code-map:query -- --symbol buildRef`: Prints targeted code-map
  answers without loading the full generated map into model context.
- `npm run codex:retrospective -- --since 2026-05-02 --cwd /home/jacob/eweser-db`:
  Reports likely agent flailing patterns from new local sessions.
- `npm run memory:diagnose -- --fixture scripts/memory/fixtures/passing-agent-journal.json`:
  Runs the deterministic memory diagnostic report against a fixture.
- `npm run test:e2e`: Exercises the E2E smoke runner.
- `bash scripts/ai-secrets/scan-secrets.sh`: Runs secret scanning when relevant.
