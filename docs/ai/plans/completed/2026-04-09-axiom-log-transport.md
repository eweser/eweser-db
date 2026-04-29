# Plan: Axiom Observability — Logs + Metrics + Dozzle

## Goal

Ship structured pino logs to Axiom's events dataset and OTel host metrics to Axiom's metrics dataset in production, with Dozzle for dev log viewing — fully opt-in so self-hosters without Axiom get sensible JSON-to-stdout + file fallback.

## Scope

- In:
  - Implement Axiom pino transport in `@eweser/logger` (`AXIOM_API_KEY` + `AXIOM_EVENTS_DATASET`)
  - Implement `initTelemetry()` in `@eweser/logger` — OTel host metrics → Axiom OTLP protobuf endpoint (`AXIOM_METRICS_DATASET`)
  - Wire `initTelemetry()` into sync-server, aggregator, auth-server-hono startup
  - Add Dozzle container to `docker-compose.dev.yml`
  - Update `.env.example` with all Axiom vars (commented out)
  - Pass Axiom env vars through `docker-compose.prod.yml`
  - Update `LOCAL_DEVELOPMENT.md` with logging/metrics section
- Out:
  - Sentry integration (separate future work)
  - Distributed tracing / trace export (separate future work)
  - Axiom MCP server (CLI via terminal is more token-efficient)
  - Production Dozzle (not needed — Axiom covers it)
  - Datadog / Loki / CloudWatch transport implementations

## Env Vars

```
# Events (logs via pino)
AXIOM_API_KEY=                  # Axiom API token — ingest access
AXIOM_EVENTS_DATASET=           # Axiom dataset of type Events

# Metrics (OTel host metrics)
AXIOM_METRICS_DATASET=          # Axiom dataset of type Metrics
```

Both blocks are **opt-in**. If the vars are absent, nothing changes.

## Design: Opt-in with Fallback

```
AXIOM_API_KEY + AXIOM_EVENTS_DATASET set?
  ├── YES → pino multistream: stdout + @axiomhq/pino transport
  └── NO  → pino: stdout only (dev: pretty) or stdout + file (prod)

AXIOM_API_KEY + AXIOM_METRICS_DATASET set?
  ├── YES → OTel NodeSDK + @opentelemetry/host-metrics → OTLP protobuf → api.axiom.co/v1/metrics
  └── NO  → no metrics exporter; OTel SDK not started
```

### Log Transport Architecture

```
pino root logger
  ├── stdout stream (always)
  ├── file stream (prod, if LOG_FILE configured)
  └── @axiomhq/pino transport (only if AXIOM_API_KEY + AXIOM_EVENTS_DATASET set)
```

We'll use `@axiomhq/pino` — the official Axiom pino transport — rather than `@axiomhq/js` directly. It integrates as a pino transport target, so logs are shipped asynchronously via pino's worker thread pipeline. Zero impact on request latency.

### Metrics Architecture

```
OTel NodeSDK (per server process)
  └── PeriodicExportingMetricReader (30s interval)
       └── OTLPMetricExporter (proto)
            └── https://api.axiom.co/v1/metrics
                 Headers: Authorization: Bearer AXIOM_API_KEY
                          x-axiom-metrics-dataset: AXIOM_METRICS_DATASET

Metrics collected automatically by @opentelemetry/host-metrics:
  - CPU utilisation (per core)
  - Memory (used / free / cached)
  - Event loop lag
  - GC duration
  - Active handles / requests
```

> **Important:** Axiom's `/v1/metrics` endpoint **only** accepts `application/x-protobuf`.
> Use `@opentelemetry/exporter-metrics-otlp-proto`, not `otlp-http`.

## Runs

### Run 1: Add Axiom transport to `@eweser/logger`

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Transport wiring requires understanding pino's multistream/transport API + correct async init

**Steps:**

- [x] `npm install @axiomhq/pino` in `packages/logger` (already done)
- [ ] Update `buildRootLogger()` and `initLogger()` to check for `AXIOM_API_KEY` + `AXIOM_EVENTS_DATASET` env vars
  - If both set: add `@axiomhq/pino` as a transport target alongside stdout using pino transport pipeline
  - If not set: current behaviour unchanged (stdout only / stdout + file)
- [ ] Update `addMonitorTransport()` to accept `'axiom'` type; clean up dead stubs (remove datadog/loki/cloudwatch comments, keep sentry as future option)
- [ ] Add `LoggerOptions.axiom?: { token: string; dataset: string }` for programmatic config (env vars take precedence)
- [ ] Build and verify types: `npm run build -w packages/logger`

**Files:**

- `packages/logger/src/index.ts` — transport wiring logic

**Tests:**

- Unit test: `initLogger()` includes Axiom transport when `AXIOM_API_KEY` + `AXIOM_EVENTS_DATASET` are set
- Unit test: `initLogger()` returns stdout-only when vars absent
- (Mock env vars, no real Axiom calls)

### Run 2: OTel host metrics → Axiom

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: OTel SDK setup, OTLP protobuf exporter config, host metrics instrumentation

**Steps:**

- [ ] Install in `packages/logger`:
  ```
  @opentelemetry/sdk-node
  @opentelemetry/host-metrics
  @opentelemetry/exporter-metrics-otlp-proto
  @opentelemetry/resources
  @opentelemetry/semantic-conventions
  ```
- [ ] Add `initTelemetry(serviceName: string, opts?: TelemetryOptions): Promise<void>` export from `@eweser/logger`
  - If `AXIOM_API_KEY` + `AXIOM_METRICS_DATASET` not set → no-op (returns immediately)
  - If set → start OTel `NodeSDK` with:
    - `PeriodicExportingMetricReader` (30s interval)
    - `OTLPMetricExporter` pointing at `https://api.axiom.co/v1/metrics` with headers:
      - `Authorization: Bearer AXIOM_API_KEY`
      - `x-axiom-metrics-dataset: AXIOM_METRICS_DATASET`
    - `HostMetrics` instrumentation (CPU, memory, GC, event loop)
    - Resource: `service.name = serviceName`, `deployment.environment`
- [ ] Add `TelemetryOptions` interface to exports
- [ ] Register graceful shutdown hook (`sdk.shutdown()` on SIGTERM/SIGINT)

**Files:**

- `packages/logger/package.json` — add OTel dependencies
- `packages/logger/src/telemetry.ts` — new file: `initTelemetry()`
- `packages/logger/src/index.ts` — re-export `initTelemetry` and `TelemetryOptions`

**Tests:**

- Unit test: `initTelemetry()` resolves without error when env vars absent (no-op path)
- Unit test: `initTelemetry()` calls `NodeSDK.start()` when env vars present (mock the SDK)

### Run 3: Wire `initTelemetry()` into server startup files

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Straightforward wiring into 3 existing startup files

**Steps:**

- [ ] `packages/auth-server-hono/src/index.ts` — call `await initTelemetry('auth-api')` before `app.listen()`
- [ ] `packages/sync-server/src/index.ts` — call `await initTelemetry('sync-server')`
- [ ] `packages/aggregator/src/index.ts` — call `await initTelemetry('aggregator')`
- [ ] Pass `AXIOM_API_KEY` + `AXIOM_METRICS_DATASET` env vars into each service in `docker-compose.prod.yml`

**Files:**

- `packages/auth-server-hono/src/index.ts`
- `packages/sync-server/src/index.ts`
- `packages/aggregator/src/index.ts`
- `docker-compose.prod.yml`

**Tests:** None — covered by existing smoke tests / e2e.

### Run 4: Add Dozzle to dev Docker Compose

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Simple container definition, no code logic

**Steps:**

- [ ] Add `dozzle` service to `docker-compose.dev.yml`:
  ```yaml
  dozzle:
    image: amir20/dozzle:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - '${DOZZLE_PORT:-9999}:8080'
  ```
- [ ] Add `DOZZLE_PORT=9999` to `docker-compose.dev.yml` default comment

**Files:**

- `docker-compose.dev.yml`

**Tests:** None.

### Run 5: Env vars, .env.example, docs

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Config files and docs only

**Steps:**

- [ ] Add to `.env.example` under a new `# ─── Observability (optional) ───` section:
  ```
  # ─── Observability (optional) ────────────────────────────────────────────────
  # LOG_LEVEL=info
  # LOG_PRETTY=true
  # AXIOM_API_KEY=                    # axiom.co → Settings → API Tokens (ingest)
  # AXIOM_EVENTS_DATASET=eweser-db-events   # Axiom dataset type: Events
  # AXIOM_METRICS_DATASET=eweser-db-metrics # Axiom dataset type: Metrics
  # DOZZLE_PORT=9999                  # Dev: browser log viewer at http://localhost:9999
  ```
- [ ] Pass `AXIOM_API_KEY`, `AXIOM_EVENTS_DATASET`, `AXIOM_METRICS_DATASET` env vars into all relevant services in `docker-compose.prod.yml` (sync-server, sync-server-2, aggregator, auth-api)
- [ ] Update `LOCAL_DEVELOPMENT.md` with an Observability section:
  - Dozzle URL: `http://localhost:9999`
  - Axiom CLI install + example query: `axiom query "['eweser-db-events'] | where level >= 40 | take 20"`
  - Link to Axiom dashboard
- [ ] Add `DOZZLE_PORT` to `.env.example` local dev ports table

**Files:**

- `.env.example`
- `docker-compose.prod.yml`
- `LOCAL_DEVELOPMENT.md`

**Tests:** None.

## Risks

- **`@axiomhq/pino` + pino v9 + ESM**: Package is maintained by Axiom; `@axiomhq/pino` uses pino's transport worker thread API which is ESM-compatible. Verify `"type": "module"` build works.
- **OTel metrics → protobuf only**: `/v1/metrics` rejects JSON. Must use `@opentelemetry/exporter-metrics-otlp-proto`. Using the wrong exporter is a silent failure — logs go via stdio where the OTLP call fails. The tests need to verify the correct exporter class is instantiated.
- **OTel startup cost**: `NodeSDK.start()` is async but fast (~50ms). Calling it before `listen()` adds negligible latency.
- **Transport failures / Axiom outage**: Pino transports fail silently by default — logs still go to stdout. OTel SDK retries on failure; if Axiom is unreachable after retries, metrics are dropped silently. Both are acceptable behaviours.
- **Docker socket access for Dozzle**: Requires read-only access to `/var/run/docker.sock`. Dev-only, acceptable.

## Execution Summary

```text
Run 1: Axiom pino transport in @eweser/logger (Smart)
├── Run 2: OTel host metrics in @eweser/logger (Smart) [Parallel with Run 1 — both modify logger package]
│   └── Run 3: Wire initTelemetry() into servers (Fast) [After Run 2]
└── Run 4: Dozzle in docker-compose.dev.yml (Fast) [Parallel with Runs 1+2]
    └── Run 5: Env vars, .env.example, docs (Fast) [After all above — consolidates all new vars]
```

> Note: Run 1 and Run 2 both touch `packages/logger` — run them sequentially or in separate worktrees.

## Status

- [ ] Approved by user
