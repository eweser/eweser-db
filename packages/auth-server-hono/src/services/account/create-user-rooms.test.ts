import { beforeEach, describe, expect, it, vi } from 'vitest';

const transactionMock = vi.fn();
const getAccessGrantByIdMock = vi.fn();
const insertAccessGrantsMock = vi.fn();
const updateAccessGrantMock = vi.fn();
const createAccessGrantIdMock = vi.fn();
const getWritableRoomsByUserIdMock = vi.fn();
const insertRoomsMock = vi.fn();

vi.mock('../../db/drizzle.js', () => ({
  db: {
    transaction: transactionMock,
  },
}));

vi.mock('../../env.js', () => ({
  env: {
    AUTH_SERVER_DOMAIN: 'auth.local',
    SYNC_SERVER_URL: 'ws://sync.local',
  },
}));

vi.mock('../../model/access_grants.js', () => ({
  createAccessGrantId: createAccessGrantIdMock,
  getAccessGrantById: getAccessGrantByIdMock,
  insertAccessGrants: insertAccessGrantsMock,
  updateAccessGrant: updateAccessGrantMock,
}));

vi.mock('../../model/rooms/calls.js', () => ({
  getWritableRoomsByUserId: getWritableRoomsByUserIdMock,
  insertRooms: insertRoomsMock,
}));

const { ensureUserRoomsAndAuthServerAccess } =
  await import('./create-user-rooms.js');

describe('ensureUserRoomsAndAuthServerAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(
      async (callback) => await callback('tx')
    );
    createAccessGrantIdMock.mockReturnValue('user-1|auth.local');
    insertRoomsMock.mockImplementation(async (rooms) => rooms);
    insertAccessGrantsMock.mockResolvedValue([]);
    updateAccessGrantMock.mockResolvedValue({});
  });

  it('adds a missing fileAttachments room for an already bootstrapped user', async () => {
    getWritableRoomsByUserIdMock.mockResolvedValue([
      {
        id: 'public-profile',
        collectionKey: 'profiles',
        name: 'Public Profile',
      },
      {
        id: 'private-profile',
        collectionKey: 'profiles',
        name: 'Private Profile',
      },
      { id: 'notes', collectionKey: 'notes', name: 'Notes' },
      { id: 'flashcards', collectionKey: 'flashcards', name: 'Flashcards' },
      {
        id: 'agent-configs',
        collectionKey: 'agentConfigs',
        name: 'Agent Config',
      },
      {
        id: 'conversations',
        collectionKey: 'conversations',
        name: 'Conversations',
      },
    ]);
    getAccessGrantByIdMock.mockResolvedValue({
      id: 'user-1|auth.local',
      roomIds: ['notes'],
    });

    await ensureUserRoomsAndAuthServerAccess('user-1');

    expect(insertRoomsMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          collectionKey: 'fileAttachments',
          name: 'File Attachments',
          publicAccess: 'private',
          readAccess: ['user-1', 'auth.local'],
          writeAccess: ['user-1', 'auth.local'],
        }),
      ],
      'user-1',
      'tx'
    );
    expect(updateAccessGrantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1|auth.local',
        roomIds: expect.arrayContaining(['notes']),
      }),
      'tx'
    );
    expect(insertAccessGrantsMock).not.toHaveBeenCalled();
  });

  it('creates the default auth-server grant with a fileAttachments room for new users', async () => {
    getWritableRoomsByUserIdMock.mockResolvedValue([]);
    getAccessGrantByIdMock.mockRejectedValue(
      new Error('Access grant not found')
    );

    await ensureUserRoomsAndAuthServerAccess('user-1');

    expect(insertRoomsMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          collectionKey: 'fileAttachments',
          name: 'File Attachments',
        }),
      ]),
      'user-1',
      'tx'
    );
    expect(insertAccessGrantsMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          collections: ['all'],
          requesterId: 'auth.local',
          roomIds: expect.arrayContaining([
            expect.stringMatching(
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
            ),
          ]),
        }),
      ],
      'tx'
    );
    expect(updateAccessGrantMock).not.toHaveBeenCalled();
  });
});
