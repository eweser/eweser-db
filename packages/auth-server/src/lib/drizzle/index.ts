import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { SUPABASE_CONNECTION_URL } from '@/config/supabase-server';

export type DBQuery<T> = (
  drizzlePostgresInstance?: ReturnType<typeof drizzle>
) => T;

export type DBQueryReturn<T extends (...args: any) => any> = Awaited<
  ReturnType<ReturnType<T>>
>;

export type DBInstance = ReturnType<typeof drizzle>;

export const DB_CONN: {
  instance: ReturnType<typeof postgres> | null;
  conns: Set<number>;
} = {
  instance: null,
  conns: new Set(),
};

/**
 * Drizzle database
 * @param instance - Drizzle instance. Used if chaining transactions to avoid creating new connections
 */
export const db = (instance?: ReturnType<typeof drizzle>) => {
  if (instance) return instance;

  if (DB_CONN.instance !== null) {
    return drizzle(DB_CONN.instance);
  }

  DB_CONN.instance = postgres(SUPABASE_CONNECTION_URL, {
    prepare: false,
    idle_timeout: 60,
    debug: (conn, _query) => {
      DB_CONN.conns.add(conn);
    },
    onclose: (conn) => {
      DB_CONN.conns.delete(conn);
      DB_CONN.instance = null;
    },
  });

  return drizzle(DB_CONN.instance);
};

/**
 * Manually close current database connection or the passed drizzle instance
 */
export const close = async (i?: ReturnType<typeof drizzle>) => {
  // @ts-expect-error session.client is not exposed
  const instance = i?.session.client as ReturnType<typeof postgres> | null;

  const conn = instance ?? DB_CONN.instance;
  conn && (await conn.end());
};
