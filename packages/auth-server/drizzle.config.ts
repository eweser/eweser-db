import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const SUPABASE_CONNECTION_URL = process.env.SUPABASE_CONNECTION_URL ?? '';
if (!SUPABASE_CONNECTION_URL) {
  throw new Error('SUPABASE_CONNECTION_URL not set');
}

export default {
  out: './supabase/migrations',
  schema: './src/lib/drizzle/*',
  driver: 'pg',
  introspect: {
    casing: 'preserve',
  },
  dbCredentials: {
    connectionString: SUPABASE_CONNECTION_URL,
  },
} satisfies Config;
