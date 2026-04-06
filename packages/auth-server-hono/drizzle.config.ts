import { defineConfig } from 'drizzle-kit';
import { fileURLToPath } from 'node:url';

const schemaPath = fileURLToPath(
  new URL('./src/db/schema/index.ts', import.meta.url)
);
const migrationsPath = fileURLToPath(new URL('./drizzle', import.meta.url));

export default defineConfig({
  schema: schemaPath,
  out: migrationsPath,
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://eweser:changeme@localhost:5432/eweser',
  },
});
