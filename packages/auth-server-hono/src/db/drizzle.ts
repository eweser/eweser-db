import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../env.js';

const sql = postgres(env.DATABASE_URL, {
  prepare: false,
  idle_timeout: 60,
});

export const db = drizzle(sql);
export type DBInstance =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];
