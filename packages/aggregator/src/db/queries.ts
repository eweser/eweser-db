import { and, desc, eq, sql } from 'drizzle-orm';
import type { DBInstance } from './client.js';
import { indexedDocuments } from './schema.js';

export type SearchIndexedDocumentsParams = {
  query: string;
  collectionKey?: string | undefined;
  limit?: number;
  offset?: number;
};

type SearchDB = Pick<DBInstance, 'select'>;

export async function searchIndexedDocuments(
  db: SearchDB,
  params: SearchIndexedDocumentsParams
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
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
      rank: sql<number>`ts_rank(to_tsvector('english', ${indexedDocuments.documentData}::text), plainto_tsquery('english', ${params.query}))`,
    })
    .from(indexedDocuments)
    .where(whereClause)
    .orderBy(
      desc(
        sql`ts_rank(to_tsvector('english', ${indexedDocuments.documentData}::text), plainto_tsquery('english', ${params.query}))`
      )
    )
    .limit(limit)
    .offset(offset);
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
    .orderBy(desc(indexedDocuments.updatedAt))
    .limit(200);
}
