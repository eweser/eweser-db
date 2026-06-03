/**
 * Purpose: Tests for local loaded-room query helpers (resolveRef and
 * findDocumentsReferencing). Covers valid/invalid refs, unloaded rooms,
 * deleted docs, multiple collections, deterministic ordering/limits.
 * Exports: (test file)
 * Touches: query.ts, yjs, vitest
 * Read before editing: packages/db/src/utils/query.ts, packages/db/AGENTS.md
 */
import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';
import type { EweDocument, CollectionKey } from '@eweser/shared';
import { buildRef } from '@eweser/shared';
import type { Database } from '../index.js';
import { resolveRef, findDocumentsReferencing } from './query.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type TestDoc = EweDocument & {
  title?: string;
  noteRefs?: string[];
  relatedRef?: string;
};

const AUTH_SERVER = 'https://www.eweser.com';

function makeDoc(
  id: string,
  collectionKey: CollectionKey,
  roomId: string,
  overrides: Partial<TestDoc> = {}
): TestDoc {
  return {
    _id: id,
    _ref: buildRef({
      authServer: AUTH_SERVER,
      collectionKey,
      roomId,
      documentId: id,
    }),
    _created: Date.now(),
    _updated: Date.now(),
    _deleted: false,
    title: `Doc ${id}`,
    ...overrides,
  } as TestDoc;
}

function makeRoomWithDocs(
  collectionKey: CollectionKey,
  roomId: string,
  docs: TestDoc[]
) {
  const ydoc = new Y.Doc();
  const docMap = ydoc.getMap('documents');
  for (const doc of docs) {
    docMap.set(doc._id, doc);
  }
  return {
    ydoc,
    collectionKey,
    id: roomId,
    name: `${collectionKey}-${roomId}`,
  };
}

/**
 * Build a minimal Database-shaped object with the collections structure
 * needed by resolveRef / findDocumentsReferencing.
 */
function makeMockDb(
  roomsByCollection: Record<string, { roomId: string; docs: TestDoc[] }[]>
): Partial<Database> {
  const collectionKeys = Object.keys(roomsByCollection);
  const collections: Record<string, Record<string, unknown>> = {};

  for (const key of collectionKeys) {
    const rooms: Record<string, unknown> = {};
    const roomDefs = roomsByCollection[key] ?? [];
    for (const { roomId, docs } of roomDefs) {
      rooms[roomId] = makeRoomWithDocs(key as CollectionKey, roomId, docs);
    }
    collections[key] = rooms;
  }

  return {
    collectionKeys: collectionKeys as CollectionKey[],
    collections: collections as Database['collections'],
  } as Partial<Database>;
}

// ---------------------------------------------------------------------------
// resolveRef
// ---------------------------------------------------------------------------

describe('resolveRef', () => {
  it('resolves a document from a valid ref in a loaded room', () => {
    const db = makeMockDb({
      notes: [
        { roomId: 'room-1', docs: [makeDoc('doc-1', 'notes', 'room-1')] },
      ],
    });
    const ref = buildRef({
      authServer: AUTH_SERVER,
      collectionKey: 'notes',
      roomId: 'room-1',
      documentId: 'doc-1',
    });

    const result = resolveRef<TestDoc>(db as unknown as Database, ref);

    expect(result).not.toBeNull();
    expect(result?._id).toBe('doc-1');
    expect(result?.title).toBe('Doc doc-1');
  });

  it('returns null for a ref whose room is not loaded', () => {
    const db = makeMockDb({
      notes: [
        { roomId: 'room-1', docs: [makeDoc('doc-1', 'notes', 'room-1')] },
      ],
    });
    const ref = buildRef({
      authServer: AUTH_SERVER,
      collectionKey: 'notes',
      roomId: 'room-not-loaded',
      documentId: 'doc-42',
    });

    const result = resolveRef(db as unknown as Database, ref);
    expect(result).toBeNull();
  });

  it('returns null for a non-existent document in a loaded room', () => {
    const db = makeMockDb({
      notes: [
        { roomId: 'room-1', docs: [makeDoc('doc-1', 'notes', 'room-1')] },
      ],
    });
    const ref = buildRef({
      authServer: AUTH_SERVER,
      collectionKey: 'notes',
      roomId: 'room-1',
      documentId: 'does-not-exist',
    });

    const result = resolveRef(db as unknown as Database, ref);
    expect(result).toBeNull();
  });

  it('returns null for deleted documents', () => {
    const deletedDoc = makeDoc('doc-del', 'notes', 'room-1', {
      _deleted: true,
    });
    const db = makeMockDb({
      notes: [{ roomId: 'room-1', docs: [deletedDoc] }],
    });
    const ref = buildRef({
      authServer: AUTH_SERVER,
      collectionKey: 'notes',
      roomId: 'room-1',
      documentId: 'doc-del',
    });

    const result = resolveRef(db as unknown as Database, ref);
    expect(result).toBeNull();
  });

  it('resolves documents across different collections', () => {
    const db = makeMockDb({
      notes: [
        { roomId: 'room-1', docs: [makeDoc('note-1', 'notes', 'room-1')] },
      ],
      flashcards: [
        { roomId: 'fc-room', docs: [makeDoc('fc-1', 'flashcards', 'fc-room')] },
      ],
    });
    const noteRef = buildRef({
      authServer: AUTH_SERVER,
      collectionKey: 'notes',
      roomId: 'room-1',
      documentId: 'note-1',
    });
    const fcRef = buildRef({
      authServer: AUTH_SERVER,
      collectionKey: 'flashcards',
      roomId: 'fc-room',
      documentId: 'fc-1',
    });

    expect(resolveRef(db as unknown as Database, noteRef)?._id).toBe('note-1');
    expect(resolveRef(db as unknown as Database, fcRef)?._id).toBe('fc-1');
  });

  it('preserves custom fields on resolved documents', () => {
    const customDoc = makeDoc('doc-custom', 'notes', 'room-1', {
      title: 'Custom Title',
    });
    const db = makeMockDb({
      notes: [{ roomId: 'room-1', docs: [customDoc] }],
    });
    const ref = buildRef({
      authServer: AUTH_SERVER,
      collectionKey: 'notes',
      roomId: 'room-1',
      documentId: 'doc-custom',
    });

    const result = resolveRef<TestDoc>(db as unknown as Database, ref);
    expect(result?.title).toBe('Custom Title');
  });

  it('throws for malformed ref strings', () => {
    const db = makeMockDb({});
    expect(() => resolveRef(db as unknown as Database, 'bad-ref')).toThrow();
    expect(() => resolveRef(db as unknown as Database, '')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// findDocumentsReferencing
// ---------------------------------------------------------------------------

describe('findDocumentsReferencing', () => {
  const note1Ref = buildRef({
    authServer: AUTH_SERVER,
    collectionKey: 'notes',
    roomId: 'room-1',
    documentId: 'note-1',
  });

  it('finds documents that reference a ref in a string field', () => {
    const db = makeMockDb({
      notes: [
        {
          roomId: 'room-1',
          docs: [
            makeDoc('note-1', 'notes', 'room-1'),
            makeDoc('note-2', 'notes', 'room-1', {
              relatedRef: note1Ref,
            }),
          ],
        },
      ],
    });

    const results = findDocumentsReferencing(
      db as unknown as Database,
      note1Ref
    );

    expect(results).toHaveLength(1);
    expect(results[0]?._id).toBe('note-2');
  });

  it('finds documents that reference a ref in a string array field', () => {
    const db = makeMockDb({
      notes: [
        {
          roomId: 'room-1',
          docs: [
            makeDoc('note-1', 'notes', 'room-1'),
            makeDoc('note-2', 'notes', 'room-1', {
              noteRefs: [note1Ref],
            }),
          ],
        },
      ],
    });

    const results = findDocumentsReferencing(
      db as unknown as Database,
      note1Ref
    );

    expect(results).toHaveLength(1);
    expect(results[0]?._id).toBe('note-2');
  });

  it('finds cross-collection references', () => {
    const db = makeMockDb({
      notes: [
        { roomId: 'room-1', docs: [makeDoc('note-1', 'notes', 'room-1')] },
      ],
      flashcards: [
        {
          roomId: 'fc-room',
          docs: [
            makeDoc('fc-1', 'flashcards', 'fc-room', {
              noteRefs: [note1Ref],
            }),
            makeDoc('fc-2', 'flashcards', 'fc-room'),
          ],
        },
      ],
    });

    const results = findDocumentsReferencing(
      db as unknown as Database,
      note1Ref
    );

    expect(results).toHaveLength(1);
    expect(results[0]?._id).toBe('fc-1');
  });

  it('excludes deleted documents that reference the ref', () => {
    const db = makeMockDb({
      notes: [
        {
          roomId: 'room-1',
          docs: [
            makeDoc('note-1', 'notes', 'room-1'),
            makeDoc('note-del', 'notes', 'room-1', {
              _deleted: true,
              relatedRef: note1Ref,
            }),
            makeDoc('note-alive', 'notes', 'room-1', {
              relatedRef: note1Ref,
            }),
          ],
        },
      ],
    });

    const results = findDocumentsReferencing(
      db as unknown as Database,
      note1Ref
    );

    expect(results).toHaveLength(1);
    expect(results[0]?._id).toBe('note-alive');
  });

  it('skips rooms that are not loaded (no ydoc)', () => {
    // Simulate an unloaded room by not adding an ydoc
    const db = makeMockDb({});
    // Inject a mock room without ydoc
    const unloadedRoom = {
      collectionKey: 'notes' as CollectionKey,
      id: 'unloaded-room',
      name: 'Unloaded',
    };
    const collections = db.collections as Record<
      string,
      Record<string, unknown>
    >;
    if (!collections['notes']) collections['notes'] = {};
    collections['notes']['unloaded-room'] = unloadedRoom;

    const results = findDocumentsReferencing(
      db as unknown as Database,
      note1Ref
    );

    // Should not crash and return empty
    expect(results).toEqual([]);
  });

  it('returns empty array when no documents reference the ref', () => {
    const db = makeMockDb({
      notes: [
        {
          roomId: 'room-1',
          docs: [makeDoc('note-1', 'notes', 'room-1')],
        },
      ],
    });
    const otherRef = buildRef({
      authServer: AUTH_SERVER,
      collectionKey: 'notes',
      roomId: 'room-1',
      documentId: 'nonexistent',
    });

    const results = findDocumentsReferencing(
      db as unknown as Database,
      otherRef
    );

    expect(results).toEqual([]);
  });

  it('does not crash on empty database', () => {
    const db = makeMockDb({});
    const results = findDocumentsReferencing(
      db as unknown as Database,
      note1Ref
    );
    expect(results).toEqual([]);
  });

  it('finds documents that reference a ref when present in both string and string[] fields', () => {
    const db = makeMockDb({
      notes: [
        {
          roomId: 'room-1',
          docs: [
            makeDoc('note-1', 'notes', 'room-1'),
            makeDoc('multi-ref', 'notes', 'room-1', {
              relatedRef: note1Ref,
              noteRefs: [note1Ref],
            }),
          ],
        },
      ],
    });

    const results = findDocumentsReferencing(
      db as unknown as Database,
      note1Ref
    );

    // Should only find the doc once even though it matches in two fields
    expect(results).toHaveLength(1);
    expect(results[0]?._id).toBe('multi-ref');
  });

  it('returns multiple documents that reference the same ref', () => {
    const db = makeMockDb({
      notes: [
        {
          roomId: 'room-1',
          docs: [
            makeDoc('note-1', 'notes', 'room-1'),
            makeDoc('ref-a', 'notes', 'room-1', { relatedRef: note1Ref }),
            makeDoc('ref-b', 'notes', 'room-1', { relatedRef: note1Ref }),
          ],
        },
      ],
    });

    const results = findDocumentsReferencing(
      db as unknown as Database,
      note1Ref
    );

    expect(results).toHaveLength(2);
    const ids = results.map((d) => d._id).sort();
    expect(ids).toEqual(['ref-a', 'ref-b']);
  });

  it('is deterministic in results (same db, same ref, same results)', () => {
    const db = makeMockDb({
      notes: [
        {
          roomId: 'room-1',
          docs: [
            makeDoc('note-1', 'notes', 'room-1'),
            makeDoc('ref-a', 'notes', 'room-1', { relatedRef: note1Ref }),
          ],
        },
      ],
    });

    const first = findDocumentsReferencing(db as unknown as Database, note1Ref);
    const second = findDocumentsReferencing(
      db as unknown as Database,
      note1Ref
    );

    expect(first).toEqual(second);
  });
});
