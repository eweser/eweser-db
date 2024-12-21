import postgres from 'postgres';
import { drizzle, PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { SUPABASE_CONNECTION_URL } from '../../../services/database/supabase/backend-config';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { ExtractTablesWithRelations } from 'drizzle-orm';

export type DBInstance =
  | ReturnType<typeof drizzle>
  | PgTransaction<
      PostgresJsQueryResultHKT,
      Record<string, unknown>,
      ExtractTablesWithRelations<Record<string, unknown>>
    >;
export type DBQuery<T> = (dbInstance?: DBInstance) => T;

export const DB_CONNECTION: {
  instance: ReturnType<typeof postgres> | null;
  connections: Set<number>;
} = {
  instance: null,
  connections: new Set(),
};

/**
 * Drizzle database
 * @param instance - Drizzle instance. Used if chaining transactions to avoid creating new connections
 */
export const db = (instance?: DBInstance) => {
  if (instance) {
    return instance;
  }

  if (DB_CONNECTION.instance !== null) {
    return drizzle(DB_CONNECTION.instance);
  }

  DB_CONNECTION.instance = postgres(SUPABASE_CONNECTION_URL, {
    prepare: false,
    idle_timeout: 60,
    debug: (conn, _query) => {
      DB_CONNECTION.connections.add(conn);
    },
    onclose: (conn) => {
      DB_CONNECTION.connections.delete(conn);
      DB_CONNECTION.instance = null;
    },
  });

  return drizzle(DB_CONNECTION.instance);
};
