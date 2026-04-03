import { sql } from 'drizzle-orm';
import type { DBInstance } from './client.js';
import { indexedDocuments } from './schema.js';

export type IndexedDocumentInput = {
  roomId: string;
  collectionKey: string;
  userId?: string | undefined;
  documentData: unknown;
};

type UpsertDB = Pick<DBInstance, 'insert'>;

export async function upsertIndexedDocument(
  db: UpsertDB,
  input: IndexedDocumentInput
): Promise<void> {
  await db
    .insert(indexedDocuments)
    .values({
      roomId: input.roomId,
      collectionKey: input.collectionKey,
      userId: input.userId,
      documentData: input.documentData,
    })
    .onConflictDoUpdate({
      target: [indexedDocuments.roomId, indexedDocuments.collectionKey],
      set: {
        userId: input.userId,
        documentData: input.documentData,
        updatedAt: sql`now()`,
      },
    });
}
