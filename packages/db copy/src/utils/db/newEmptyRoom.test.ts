import { describe, expect, it } from 'vitest';
import { CollectionKey, Database } from '../..';
import { baseUrl } from '../../test-utils';
import { newEmptyRoom } from '../';

describe('newEmptyRoom', () => {
  it('makes a new empty room', () => {
    const db = new Database({ baseUrl });
    db.userId = 'user';
    const room = newEmptyRoom(db, 'notes', 'test');
    expect(room.collectionKey).toBe('notes');
    expect(room.roomId).toBe('#test~notes~user');
    expect(room.connectStatus).toBe('initial');
    expect(room.created).toBeDefined();
    expect(room.tempDocs).toEqual({});
    expect(room.matrixProvider).toBeNull();
    expect(room.webRtcProvider).toBeNull();
    expect(room.indexeddbProvider).toBeNull();
    expect(room.created).toBeDefined();
    expect(room.roomId).not.toBeDefined();
  });
});
