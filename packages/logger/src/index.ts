/**
 * @eweser/logger — Shared pino logger factory for EweserDB server packages.
 *
 * Dev:   coloured human-readable output via pino-pretty
 * Prod:  JSON to stdout + daily-rotated file under ./logs/
 * Opt-in: if AXIOM_API_KEY + AXIOM_EVENTS_DATASET are set, @axiomhq/pino
 *         ships structured logs to Axiom alongside stdout/file.
 *
 * Telemetry (opt-in): call initTelemetry() at startup to export host metrics
 * (CPU, memory, GC, event loop) to Axiom via OTel + OTLP protobuf.
 */

import pino, { type Level } from 'pino';
import pinoHttp from 'pino-http';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { default as axiomTransport } from '@axiomhq/pino';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoggerOptions {
  /** Log level. Defaults to LOG_LEVEL env or 'info'. */
  level?: string;
  /** Directory for file logs. Defaults to 'logs'. */
  logDir?: string;
  /** Root log file name (no extension). Defaults to 'app'. */
  logFile?: string;
  /**
   * Whether to pretty-print. Defaults to NODE_ENV !== 'production'.
   * Can also be set via LOG_PRETTY=true.
   */
  pretty?: boolean;
}

/** Log level string values. */
export type LogLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal'
  | 'silent';

// ---------------------------------------------------------------------------
// Module-level singleton state
// ---------------------------------------------------------------------------

let rootLogger: ReturnType<typeof pino> | null = null;

/**
 * Convenience logger instance — a child of the root logger named 'app'.
 * Use this when a simple shared logger is needed without calling createLogger().
 *
 * Note: this is a pre-configured child; it is NOT the root logger.
 * For component-specific logging use createLogger('component-name') instead.
 */
export const logger = (rootLogger ?? buildRootLogger({})).child({
  name: 'app',
});

/** Ensures the log directory exists. */
async function ensureLogDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    // already exists
  }
}

/** Returns today's date as YYYY-MM-DD for log file naming. */
function todayDate(): string {
  const parts = new Date().toISOString().split('T');
  return parts[0] ?? new Date().toISOString().substring(0, 10);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create (or return the cached) root logger for the application.
 *
 * First call initialises the singleton pino root with the transport.
 * Subsequent calls return a **child** of that root, preserving the name.
 *
 * @param name  - identifier shown in every log line (e.g. 'auth-server')
 * @param opts  - applied only on first call; ignored on subsequent calls
 *
 * @example
 *   const log = createLogger('auth-server');
 *   log.info('Server started');
 *   log.child({ component: 'db' }).info('query executed');
 */
export function createLogger(
  name: string,
  opts: LoggerOptions = {}
): ReturnType<typeof pino> {
  if (!rootLogger) {
    rootLogger = buildRootLogger(opts);
  }
  return rootLogger.child({ name });
}

/** Async initialiser — call this in server startup before any log is emitted. */
export async function initLogger(
  opts: LoggerOptions = {}
): Promise<ReturnType<typeof pino>> {
  if (rootLogger) return rootLogger;

  const axiomToken = process.env.AXIOM_API_KEY;
  const axiomDataset = process.env.AXIOM_EVENTS_DATASET;
  const logLevel = (opts.level ?? process.env.LOG_LEVEL ?? 'info') as Level;

  const {
    logDir = process.env.LOG_DIR ?? 'logs',
    logFile = process.env.LOG_FILE ?? 'app',
    pretty = process.env.LOG_PRETTY === 'true' ||
      process.env.NODE_ENV !== 'production',
  } = opts;

  if (pretty) {
    // Pretty mode: multistream of stdout + optional Axiom, both piped via pino-pretty.
    const streams: pino.StreamEntry[] = [
      {
        stream: pino({
          name: 'eweser',
          level: logLevel,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        }) as unknown as pino.DestinationStream,
        level: logLevel,
      },
    ];

    if (axiomToken && axiomDataset) {
      try {
        const axiomStream = axiomTransport({
          token: axiomToken,
          dataset: axiomDataset,
        });
        streams.push({
          stream: axiomStream as unknown as pino.DestinationStream,
          level: logLevel,
        });
      } catch (err) {
        console.error(
          '[eweser/logger] Failed to load @axiomhq/pino — Axiom logging disabled:',
          err
        );
      }
    }

    rootLogger = pino(
      { name: 'eweser', level: logLevel },
      pino.multistream(streams)
    );
  } else {
    // Production: JSON to stdout + daily-rotated file + optional Axiom
    await ensureLogDir(logDir);
    const filePath = join(logDir, `${logFile}-${todayDate()}.log`);

    const streams: pino.StreamEntry[] = [
      {
        stream: process.stdout as unknown as pino.DestinationStream,
        level: logLevel,
      },
      {
        stream: pino.destination({ dest: filePath, append: true, mkdir: true }),
        level: logLevel,
      },
    ];

    if (axiomToken && axiomDataset) {
      try {
        const axiomStream = axiomTransport({
          token: axiomToken,
          dataset: axiomDataset,
        });
        streams.push({
          stream: axiomStream as unknown as pino.DestinationStream,
          level: logLevel,
        });
      } catch (err) {
        console.error(
          '[eweser/logger] Failed to load @axiomhq/pino — Axiom logging disabled:',
          err
        );
      }
    }

    rootLogger = pino(
      { name: 'eweser', level: logLevel },
      pino.multistream(streams)
    );
  }

  return rootLogger;
}

/** Build the pino root logger synchronously (pretty stdout-only for sync callers). */
function buildRootLogger(opts: LoggerOptions): ReturnType<typeof pino> {
  const {
    level = (process.env.LOG_LEVEL ?? 'info') as Level,
    pretty = process.env.LOG_PRETTY === 'true' ||
      process.env.NODE_ENV !== 'production',
  } = opts;

  if (pretty) {
    return pino({
      name: 'eweser',
      level,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  // Production sync fallback: stdout only. Call initLogger() async for file + Axiom.
  return pino({ name: 'eweser', level });
}

// ---------------------------------------------------------------------------
// Monitoring transport
// ---------------------------------------------------------------------------

/**
 * Register a monitoring/observability transport.
 *
 * **IMPORTANT:** Call this BEFORE `initLogger()` so the transport is included
 * from startup. Adding transports after initialisation requires a restart.
 *
 * Supported types:
 *   - 'axiom'  -> @axiomhq/pino (configured via AXIOM_API_KEY + AXIOM_EVENTS_DATASET)
 *
 * Future (not yet implemented):
 *   - 'sentry' -> pino-sentry-transport
 *
 * @example
 *   // At app startup, BEFORE initLogger():
 *   if (process.env.AXIOM_API_KEY) {
 *     addMonitorTransport('axiom');
 *   }
 */
export async function addMonitorTransport(
  type: 'axiom' | 'sentry',
  _options: Record<string, unknown> = {}
): Promise<void> {
  if (type === 'axiom') {
    // Axiom is handled automatically by initLogger() when AXIOM_API_KEY + AXIOM_EVENTS_DATASET are set.
    // This stub remains for API symmetry and explicitness.
    return;
  }

  if (type === 'sentry') {
    console.warn(
      `[eweser/logger] Sentry transport is not yet implemented. ` +
        `Install pino-sentry-transport and call addMonitorTransport('sentry', { dsn })`
    );
    return;
  }

  console.warn(
    `[eweser/logger] Unknown monitor transport type '${type}' — ignoring.`
  );
}

// ---------------------------------------------------------------------------
// HTTP request logging middleware
// ---------------------------------------------------------------------------

/**
 * Returns a pino-http middleware for Hono / Express / Connect-compatible servers.
 * Logs every incoming HTTP request: method, path, status, response time.
 *
 * @example
 *   import { createLogger, createHttpLogger } from '@eweser/logger';
 *   const log = createLogger('aggregator');
 *   app.use(createHttpLogger(log));
 */
export function createHttpLogger(logger: ReturnType<typeof pino>) {
  return pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/ping',
    },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} ${res.statusCode} — ${err?.message ?? res.statusMessage}`,
    customAttributeKeys: {
      req: 'request',
      res: 'response',
      responseTime: 'duration_ms',
    },
    quietReqLogger: true,
  });
}

// ---------------------------------------------------------------------------
// Re-export telemetry
// ---------------------------------------------------------------------------

export { initTelemetry } from './telemetry.js';
export type { TelemetryOptions } from './telemetry.js';
