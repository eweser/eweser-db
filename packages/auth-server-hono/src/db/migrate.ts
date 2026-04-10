import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';
import { env } from '../env.js';

import { logger } from '@eweser/logger';

const migrationClient = postgres(env.DATABASE_URL, { max: 1 });

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, '..', '..', 'drizzle');

async function main() {
  logger.info('Running migrations...');
  await migrate(drizzle(migrationClient), { migrationsFolder });

  logger.info('Migrations complete!');
  process.exit(0);
}

main().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
