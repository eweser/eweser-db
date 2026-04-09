/**
 * OpenTelemetry initialisation — host metrics exported to Axiom OTLP endpoint.
 *
 * Opt-in: if AXIOM_API_KEY + AXIOM_METRICS_DATASET are not set, this is a no-op.
 *
 * Axiom's /v1/metrics endpoint only accepts application/x-protobuf.
 * We use @opentelemetry/exporter-metrics-otlp-proto (NOT otlp-http).
 *
 * Architecture: we use OTel's MeterProvider + PeriodicExportingMetricReader
 * directly rather than NodeSDK, because HostMetrics is a standalone BaseMetrics
 * collector (not a NodeSDK Instrumentation).
 */

import {
  PeriodicExportingMetricReader,
  MeterProvider,
} from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { HostMetrics } from '@opentelemetry/host-metrics';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TelemetryOptions {
  /** Defaults to process.env.AXIOM_API_KEY */
  axiomToken?: string;
  /** Defaults to process.env.AXIOM_METRICS_DATASET */
  axiomMetricsDataset?: string;
  /** Deployment environment label added as a resource attribute. Default: NODE_ENV. */
  environment?: string;
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let meterProvider: MeterProvider | null = null;
let hostMetrics: HostMetrics | null = null;

/**
 * Initialise OpenTelemetry host metrics export to Axiom.
 *
 * Call once per process, before any other telemetry is set up.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * @param serviceName  - e.g. 'auth-api', 'sync-server', 'aggregator'
 * @param opts         - optional overrides for env var values
 */
export async function initTelemetry(
  serviceName: string,
  opts: TelemetryOptions = {}
): Promise<void> {
  const token = opts.axiomToken ?? process.env.AXIOM_API_KEY;
  const dataset = opts.axiomMetricsDataset ?? process.env.AXIOM_METRICS_DATASET;

  if (!token || !dataset) {
    // Opt-in not configured — no-op
    return;
  }

  if (meterProvider) {
    // Already initialised
    return;
  }

  const environment = opts.environment ?? process.env.NODE_ENV ?? 'unknown';

  const metricExporter = new OTLPMetricExporter({
    url: 'https://api.axiom.co/v1/metrics',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-axiom-metrics-dataset': dataset,
    },
    timeoutMillis: 25_000,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 30_000,
    exportTimeoutMillis: 20_000,
  });

  // Build resource attributes directly — avoids import of the Resource class
  // whose version may differ between sdk-metrics and the top-level resources package.
  const resourceAttributes = {
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
  };

  // @ts-expect-error Resource class version mismatch between sdk-metrics and resources
  meterProvider = new MeterProvider({
    resourceAttributes,
    metricReaders: [metricReader],
  });

  // Start host metrics collection
  hostMetrics = new HostMetrics({
    meterProvider,
    name: serviceName,
  });
  hostMetrics.start();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[eweser/logger] Shutting down OTel metrics (${signal})...`);
    await meterProvider?.shutdown();
    meterProvider = null;
    hostMetrics = null;
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
