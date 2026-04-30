## Goal

Fixture plan used by the Eweser plan orchestrator smoke tests.

<!-- eweser-orchestration -->

```yaml
orchestration:
  enabled: true
  maxParallel: 2
  baseBranch: main
  finalStages:
    - qa
    - review
runs:
  - id: docs-run
    title: Update docs
    agent: eweser-code
    model: fast
    parallel: true
    dependsOn: []
    writeScope:
      - docs/ai/testing/**
    tests:
      - npm run format:check
    changeset: no
  - id: scripts-run
    title: Update script fixture
    agent: eweser-code
    model: fast
    parallel: true
    dependsOn: []
    writeScope:
      - scripts/codex/fixtures/**
    tests:
      - node --version
    changeset: no
```

## Runs

### Run 1: Update docs

### Run 2: Update script fixture

## Execution Summary

Not run. Fixture only.
