import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const indexedDocuments = pgTable(
  'indexed_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id').notNull(),
    collectionKey: text('collection_key').notNull(),
    userId: text('user_id'),
    documentData: jsonb('document_data').$type<unknown>().notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('indexed_documents_room_collection_unique').on(
      table.roomId,
      table.collectionKey
    ),
    index('indexed_documents_document_data_gin_idx').using(
      'gin',
      table.documentData
    ),
    index('indexed_documents_fts_gin_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.documentData}::text)`
    ),
  ]
);

export type IndexedDocument = typeof indexedDocuments.$inferSelect;
