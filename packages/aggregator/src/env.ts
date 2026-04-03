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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console -- intentional startup env-validation error log
  console.error(
    'Invalid environment variables:',
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
