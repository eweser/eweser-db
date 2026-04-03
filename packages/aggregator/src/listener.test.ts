import { Doc } from 'yjs';
import { describe, expect, it, vi } from 'vitest';
import { observeRoomDocuments } from './listener.js';

describe('observeRoomDocuments', () => {
  it('sends initial snapshot and update snapshots', () => {
    const onUpsert = vi.fn().mockResolvedValue(undefined);
    const doc = new Doc();

    const stopListening = observeRoomDocuments({
      roomId: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
      collectionKey: 'notes',
      userId: 'user-1',
      doc,
      onUpsert,
    });

    const documentsMap = doc.getMap('documents');
    documentsMap.set('draft', { title: 'Updated title' });

    expect(onUpsert).toHaveBeenCalledTimes(2);
    stopListening();
  });
});
