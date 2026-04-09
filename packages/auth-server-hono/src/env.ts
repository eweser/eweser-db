import { logger } from '@eweser/logger';
import { z } from 'zod';

const defaultAuthApiPort = Number(process.env.AUTH_API_PORT ?? '38101');

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SERVER_SECRET: z.string().min(1),
  PORT: z.coerce.number().default(defaultAuthApiPort),

  /** better-auth secret — must be a long random string in production */
  BETTER_AUTH_SECRET: z.string().min(1).default('change-me-in-production'),
  /** Public base URL of this server, e.g. https://auth.example.com */
  BETTER_AUTH_BASE_URL: z
    .string()
    .default(`http://localhost:${defaultAuthApiPort}`),

  /** Optional OAuth providers */
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  /** Domain of this auth server, e.g. "auth.example.com" */
  AUTH_SERVER_DOMAIN: z
    .string()
    .min(1)
    .default(`localhost:${defaultAuthApiPort}`),
  /** Full URL of this auth server, e.g. "https://auth.example.com" */
  AUTH_SERVER_URL: z.string().default(`http://localhost:${defaultAuthApiPort}`),
  /** WebSocket URL of the Hocuspocus sync server, e.g. "ws://localhost:8080" */
  SYNC_SERVER_URL: z.string().default('ws://localhost:8080'),
  /** Secret for signing Hocuspocus auth JWTs — defaults to SERVER_SECRET if not set */
  SYNC_AUTH_SECRET: z.string().optional(),
  /** Aggregator URL for MCP search tool */
  AGGREGATOR_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error(
    'Invalid environment variables:',
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
