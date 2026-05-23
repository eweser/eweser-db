import { sql } from 'drizzle-orm';
import type { DBInstance } from './client.js';

type SchemaDB = Pick<DBInstance, 'execute'>;

export const indexedDocumentsSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS indexed_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid NOT NULL,
    collection_key text NOT NULL,
    user_id text,
    public_access text NOT NULL DEFAULT 'private',
    document_data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  "ALTER TABLE indexed_documents ADD COLUMN IF NOT EXISTS public_access text NOT NULL DEFAULT 'private'",
  'CREATE UNIQUE INDEX IF NOT EXISTS indexed_documents_room_collection_unique ON indexed_documents (room_id, collection_key)',
  'CREATE INDEX IF NOT EXISTS indexed_documents_document_data_gin_idx ON indexed_documents USING gin (document_data)',
  "CREATE INDEX IF NOT EXISTS indexed_documents_fts_gin_idx ON indexed_documents USING gin (to_tsvector('english', document_data::text))",
] as const;

export async function ensureIndexedDocumentsSchema(db: SchemaDB) {
  for (const statement of indexedDocumentsSchemaStatements) {
    await db.execute(sql.raw(statement));
  }
}
