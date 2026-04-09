import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../env.js';

import { logger } from '@eweser/logger';

const migrationClient = postgres(env.DATABASE_URL, { max: 1 });

async function main() {
  logger.info('Running migrations...');
  await migrate(drizzle(migrationClient), { migrationsFolder: './drizzle' });

  logger.info('Migrations complete!');
  process.exit(0);
}

main().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
