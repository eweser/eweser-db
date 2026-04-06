import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env.js';

const sqlClient = postgres(env.DATABASE_URL, {
  prepare: false,
  idle_timeout: 60,
});

export const db = drizzle(sqlClient);
export type DBInstance = typeof db;
