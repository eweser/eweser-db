import { describe, expect, it, vi } from 'vitest';
import { indexedDocuments } from './schema.js';
import { upsertIndexedDocument } from './upsert.js';

describe('upsertIndexedDocument', () => {
  it('writes document changes with conflict update semantics', async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    const insert = vi.fn().mockReturnValue({ values });

    await upsertIndexedDocument({ insert } as never, {
      roomId: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
      collectionKey: 'notes',
      userId: 'user-1',
      documentData: { title: 'Draft' },
    });

    expect(insert).toHaveBeenCalledWith(indexedDocuments);
    expect(values).toHaveBeenCalledWith({
      roomId: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
      collectionKey: 'notes',
      userId: 'user-1',
      documentData: { title: 'Draft' },
    });
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
  });
});
