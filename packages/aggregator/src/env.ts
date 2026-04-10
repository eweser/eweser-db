import { logger } from '@eweser/logger';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://eweser:changeme@localhost:5432/eweser'),
  PORT: z.coerce.number().default(8090),
  SYNC_SERVER_URL: z.string().url().default('ws://localhost:8080'),
  SYNC_AUTH_SECRET: z.string().min(1).default('changeme'),
  WEBHOOK_SECRET: z.string().optional(),
  /** Base URL of the EweserDB auth server (for agent token verification). Optional — if omitted, agent search endpoint is disabled. */
  EWESER_AUTH_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error(
    { errors: parsed.error.flatten().fieldErrors },
    'Invalid environment variables:'
  );
  process.exit(1);
}

export const env = parsed.data;
