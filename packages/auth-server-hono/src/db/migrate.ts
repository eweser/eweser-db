import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../env.js';

const migrationClient = postgres(env.DATABASE_URL, { max: 1 });

async function main() {
  // eslint-disable-next-line no-console -- intentional migration progress log
  console.log('Running migrations...');
  await migrate(drizzle(migrationClient), { migrationsFolder: './drizzle' });
  // eslint-disable-next-line no-console -- intentional migration progress log
  console.log('Migrations complete!');
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console -- intentional migration failure log
  console.error('Migration failed:', err);
  process.exit(1);
});
