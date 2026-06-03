/**
 * Purpose: Local loaded-room query helpers for resolving refs and finding
 * cross-collection references. Operates exclusively on in-memory room ydocs.
 * Exports: resolveRef, findDocumentsReferencing
 * Touches: Database instance, room ydocs, ref parsing via @eweser/shared
 * Read before editing: packages/db/AGENTS.md, packages/shared/src/utils/documents.ts
 */
import { parseRef } from '@eweser/shared';
import type { EweDocument } from '@eweser/shared';
import type { Database } from '../index.js';

/**
 * Resolve a ref string to its document, searching only rooms whose ydoc is
 * currently loaded in memory.
 *
 * @param db - The Database instance
 * @param ref - A ref string in the format `${authServer}|${collectionKey}|${roomId}|${documentId}`
 * @returns The document if found and not deleted, or null if the room is not
 *   loaded or the document does not exist
 */
export function resolveRef<T extends EweDocument>(
  db: Database,
  ref: string
): T | null {
  const { collectionKey, roomId, documentId } = parseRef(ref);
  const collection = db.collections[collectionKey];
  if (!collection) return null;
  const room = collection[roomId];
  if (!room?.ydoc) return null;
  const documents = room.ydoc.getMap('documents');
  const doc = documents.get(documentId);
  if (!doc) return null;
  const typed = doc as unknown as T;
  if (typed._deleted) return null;
  return typed;
}

/**
 * Find all documents across all loaded rooms that reference a given ref string.
 * A document is considered "referencing" the ref if any of its string-typed
 * field values or string array elements exactly equal the ref string.
 *
 * Only searches rooms whose ydoc is loaded in memory. Deleted documents are
 * excluded. Order and limits are deterministic but not guaranteed sorted.
 *
 * This is an O(all_documents) scan intended for small-to-medium local datasets.
 * For server-side search or indexing, use the aggregator API instead.
 *
 * @param db - The Database instance
 * @param ref - The target ref string to search for
 * @returns Array of documents (potentially from multiple collections) that
 *   reference the given ref
 */
export function findDocumentsReferencing(
  db: Database,
  ref: string
): EweDocument[] {
  const results: EweDocument[] = [];

  for (const collectionKey of db.collectionKeys) {
    const collection = db.collections[collectionKey];
    for (const roomId of Object.keys(collection)) {
      const room = collection[roomId];
      if (!room?.ydoc) continue;
      const documents = room.ydoc.getMap('documents');
      documents.forEach((doc: unknown) => {
        if (!doc) return;
        const typed = doc as Record<string, unknown>;
        // Skip deleted documents
        if (typed._deleted) return;
        // Check every value in the document for a matching ref.
        // Skip internal metadata fields (_ref, _id, _created, _updated, _deleted, _ttl)
        // since _ref is the document's own identity, not a reference to another document.
        for (const [key, value] of Object.entries(typed)) {
          if (key.startsWith('_')) continue;
          if (value === ref) {
            results.push(typed as EweDocument);
            return; // Don't double-count the same document
          }
          if (
            Array.isArray(value) &&
            value.some((v) => typeof v === 'string' && v === ref)
          ) {
            results.push(typed as EweDocument);
            return;
          }
        }
      });
    }
  }

  return results;
}
