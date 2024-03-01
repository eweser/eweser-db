import { describe, expect, it, vitest } from 'vitest';
import { CollectionKey, Database } from '..';

describe('loadAndConnectRoom', () => {
  it('loads offline room and calls callback, and then connects remote', async () => {
    const db = new Database();
    const loadRoomMock = vitest.fn();
    const connectRoomMock = vitest.fn();
    const loadRoomCallback = vitest.fn();
    db.loadRoom = loadRoomMock;
    loadRoomMock.mockImplementationOnce(() => ({
      roomId: 'seed',
    }));
    db.connectRoom = connectRoomMock;
    await db.loadAndConnectRoom(
      { collectionKey: 'flashcards', roomId: 'seed' },
      loadRoomCallback
    );

    expect(loadRoomMock).toHaveBeenCalledTimes(1);
    expect(connectRoomMock).toHaveBeenCalledTimes(1);
    expect(loadRoomCallback).toHaveBeenCalledTimes(1);
  });
});
