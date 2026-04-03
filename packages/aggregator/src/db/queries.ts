import { and, desc, eq, sql } from 'drizzle-orm';
import type { DBInstance } from './client.js';
import { indexedDocuments } from './schema.js';

export type SearchIndexedDocumentsParams = {
  query: string;
  collectionKey?: string | undefined;
};

type SearchDB = Pick<DBInstance, 'select'>;

export async function searchIndexedDocuments(
  db: SearchDB,
  params: SearchIndexedDocumentsParams
) {
  const searchPredicate = sql`to_tsvector('english', ${indexedDocuments.documentData}::text) @@ plainto_tsquery('english', ${params.query})`;

  const whereClause = params.collectionKey
    ? and(
        searchPredicate,
        eq(indexedDocuments.collectionKey, params.collectionKey)
      )
    : searchPredicate;

  return await db
    .select({
      id: indexedDocuments.id,
      roomId: indexedDocuments.roomId,
      collectionKey: indexedDocuments.collectionKey,
      userId: indexedDocuments.userId,
      documentData: indexedDocuments.documentData,
      updatedAt: indexedDocuments.updatedAt,
    })
    .from(indexedDocuments)
    .where(whereClause)
    .orderBy(desc(indexedDocuments.updatedAt))
    .limit(50);
}

export async function getDocumentsByRoom(db: SearchDB, roomId: string) {
  return await db
    .select({
      id: indexedDocuments.id,
      roomId: indexedDocuments.roomId,
      collectionKey: indexedDocuments.collectionKey,
      userId: indexedDocuments.userId,
      documentData: indexedDocuments.documentData,
      updatedAt: indexedDocuments.updatedAt,
    })
    .from(indexedDocuments)
    .where(eq(indexedDocuments.roomId, roomId))
    .orderBy(desc(indexedDocuments.updatedAt));
}
