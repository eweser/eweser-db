import { logger } from '@eweser/logger';
import { z } from 'zod';

const envSchema = z.object({
  /** Bearer token for agent authentication */
  EWESER_AGENT_TOKEN: z.string().min(1),
  /** Base URL of the EweserDB auth server, e.g. http://localhost:38101 */
  EWESER_AUTH_URL: z.string().url(),
  /** Optional override for the Hocuspocus sync server WebSocket URL */
  EWESER_SYNC_URL: z.string().optional(),
  /** Optional aggregator URL for PostgreSQL-backed search. Falls back to in-memory if omitted. */
  EWESER_AGGREGATOR_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error(
    { errors: parsed.error.flatten().fieldErrors },
    '[eweser-mcp] Missing required environment variables'
  );
  process.exit(1);
}

export const env = parsed.data;
