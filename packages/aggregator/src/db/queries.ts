import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { DBInstance } from './client.js';
import { indexedDocuments } from './schema.js';

export interface SearchFilters {
  collectionKey?: string[];
  memoryType?: string[];
  agentId?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface AgentSearchResult {
  id: string;
  _ref: string;
  title: string;
  summary?: string;
  collectionKey: string;
  roomId: string;
  snippet: string;
  score: number;
  memoryType?: string;
  agentId?: string;
  date?: string;
  tags?: string[];
}

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

/**
 * Agent-scoped full-text search.
 * roomIds must be pre-validated to only contain rooms the agent is allowed to access.
 * Boost memory/decision docs 1.5x.
 */
export async function agentSearchDocuments(
  db: Pick<DBInstance, 'execute'>,
  params: {
    query: string;
    roomIds: string[];
    filters?: SearchFilters;
    limit?: number;
  }
): Promise<AgentSearchResult[]> {
  const limit = Math.min(params.limit ?? 10, 10);
  const { query, roomIds, filters } = params;

  if (roomIds.length === 0) return [];

  // Build WHERE conditions as SQL fragments
  const conditions: ReturnType<typeof sql>[] = [
    sql`room_id = ANY(ARRAY[${sql.join(roomIds.map((id) => sql`${id}::uuid`), sql`, `)}])`,
    sql`to_tsvector('english', document_data::text) @@ plainto_tsquery('english', ${query})`,
    sql`(document_data->>'_deleted')::boolean IS DISTINCT FROM true`,
  ];

  if (filters?.collectionKey && filters.collectionKey.length > 0) {
    const keys = filters.collectionKey;
    conditions.push(sql`collection_key = ANY(ARRAY[${sql.join(keys.map((k) => sql`${k}`), sql`, `)}])`);
  }
  if (filters?.memoryType && filters.memoryType.length > 0) {
    const types = filters.memoryType;
    conditions.push(sql`document_data->>'memoryType' = ANY(ARRAY[${sql.join(types.map((t) => sql`${t}`), sql`, `)}])`);
  }
  if (filters?.agentId) {
    conditions.push(sql`document_data->>'agentId' = ${filters.agentId}`);
  }
  if (filters?.tags && filters.tags.length > 0) {
    const tags = filters.tags;
    conditions.push(sql`document_data->'tags' ?| ARRAY[${sql.join(tags.map((t) => sql`${t}`), sql`, `)}]::text[]`);
  }
  if (filters?.dateFrom) {
    conditions.push(sql`document_data->>'date' >= ${filters.dateFrom}`);
  }
  if (filters?.dateTo) {
    conditions.push(sql`document_data->>'date' <= ${filters.dateTo}`);
  }

  // Combine all conditions with AND — using raw SQL for flexibility
  const whereExpr = sql.join(conditions, sql` AND `);

  const rows = (await db.execute(sql`
    SELECT
      id::text,
      room_id::text AS "roomId",
      collection_key AS "collectionKey",
      document_data AS "documentData",
      ts_rank(
        to_tsvector('english', document_data::text),
        plainto_tsquery('english', ${query})
      ) AS base_score,
      CASE
        WHEN collection_key = 'conversations'
          AND document_data->>'memoryType' IN ('memory', 'decision') THEN 1.5
        ELSE 1.0
      END AS boost,
      ts_headline(
        'english',
        document_data::text,
        plainto_tsquery('english', ${query}),
        'MaxWords=40, MinWords=15, MaxFragments=1'
      ) AS snippet
    FROM indexed_documents
    WHERE ${whereExpr}
    ORDER BY (
      ts_rank(
        to_tsvector('english', document_data::text),
        plainto_tsquery('english', ${query})
      ) * CASE
        WHEN collection_key = 'conversations'
          AND document_data->>'memoryType' IN ('memory', 'decision') THEN 1.5
        ELSE 1.0
      END
    ) DESC
    LIMIT ${limit}
  `)) as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const data = row['documentData'] as Record<string, unknown> | null ?? {};
    const docId = (data['_id'] as string | undefined) ?? (row['id'] as string);
    const roomId = row['roomId'] as string;
    const collectionKey = row['collectionKey'] as string;
    const rawSnippet = (row['snippet'] as string | undefined) ?? '';
    const snippet = rawSnippet.slice(0, 200);

    const result: AgentSearchResult = {
      id: row['id'] as string,
      _ref: `${collectionKey}.${roomId}.${docId}`,
      title: (data['title'] as string | undefined) ?? '',
      collectionKey,
      roomId,
      snippet,
      score: Number(row['base_score']) * Number(row['boost']),
    };
    if (data['summary'] !== undefined) result.summary = data['summary'] as string;
    if (data['memoryType'] !== undefined) result.memoryType = data['memoryType'] as string;
    if (data['agentId'] !== undefined) result.agentId = data['agentId'] as string;
    if (data['date'] !== undefined) result.date = data['date'] as string;
    if (Array.isArray(data['tags'])) result.tags = data['tags'] as string[];
    return result;
  });
}
