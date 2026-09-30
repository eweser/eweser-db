// @vitest-environment jsdom

import type { DatabaseOptions } from '.';
import { Database } from '.';
import { beforeEach, it, expect } from 'vitest';

const collectionKeys = [
  'notes',
  'flashcards',
  'profiles',
  'agentConfigs',
  'agentAccessLogs',
  'conversations',
  'fileAttachments',
  'memoryStrategyConfigs',
  'projectWikiPages',
  'projectWikiDrafts',
];
const defaultAuthServer = 'https://www.eweser.com';

beforeEach(() => {
  localStorage.clear();
});

it('Database initializes with defaults', () => {
  const DB = new Database();
  expect(DB).toBeDefined();
  expect(DB.collectionKeys).toEqual(collectionKeys);
  expect(Object.keys(DB.collections)).toEqual(collectionKeys);
  expect(DB.authServer).toBe(defaultAuthServer);
  expect(DB.userId).toBe('');
  expect(DB.logLevel).toBe(2);
});
it('Database initializes with options', () => {
  const options: DatabaseOptions = {
    authServer: 'https://www.something.com',
    apiServer: 'https://browser-proxy.example.test',
    logLevel: 1,
  };
  const DB = new Database(options);
  expect(DB).toBeDefined();
  expect(DB.authServer).toBe(options.authServer);
  expect(DB.apiServer).toBe(options.apiServer);
  expect(DB.logLevel).toBe(options.logLevel);
});
it('restores the last verified user for offline room access', () => {
  localStorage.setItem('ewe_user_id', JSON.stringify('owner-1'));

  const DB = new Database({ providers: ['IndexedDB'] });

  expect(DB.userId).toBe('owner-1');
});
it('recovers an older saved grant owner for offline room access', () => {
  const payload = btoa(
    JSON.stringify({ access_grant_id: 'owner-1|notes.example.test' })
  );
  localStorage.setItem(
    'ewe_access_grant_token',
    JSON.stringify(`header.${payload}.signature`)
  );
  localStorage.setItem(
    'ewe_room_registry',
    JSON.stringify([
      {
        id: 'shared-room',
        collectionKey: 'notes',
        name: 'Shared notes',
        syncUrl: 'wss://sync.example.test',
        writeAccess: ['owner-1'],
        adminAccess: [],
      },
    ])
  );

  const DB = new Database({ providers: ['IndexedDB'] });

  expect(DB.userId).toBe('owner-1');
  expect(DB.registry[0]?.writeAccess).toEqual(['owner-1']);
});
it('ignores malformed saved grant identities', () => {
  localStorage.setItem('ewe_access_grant_token', JSON.stringify('invalid'));

  const DB = new Database({ providers: ['IndexedDB'] });

  expect(DB.userId).toBe('');
});
it('keeps cached grants for a device room on offline startup', () => {
  localStorage.setItem('ewe_user_id', JSON.stringify('owner-1'));
  localStorage.setItem(
    'ewe_room_registry',
    JSON.stringify([
      {
        id: 'device-room',
        collectionKey: 'notes',
        name: 'Device notes',
        syncUrl: 'wss://sync.example.test',
        readAccess: [],
        writeAccess: ['owner-1'],
        adminAccess: ['owner-1'],
      },
    ])
  );

  const DB = new Database({
    providers: ['IndexedDB'],
    initialRooms: [
      { id: 'device-room', collectionKey: 'notes', name: 'Device notes' },
    ],
  });
  const room = DB.getRoom('notes', 'device-room');

  expect(DB.userId).toBe('owner-1');
  expect(room.syncUrl).toBe('wss://sync.example.test');
  expect(room.writeAccess).toEqual(['owner-1']);
  expect(room.adminAccess).toEqual(['owner-1']);
});
it('Database removes duplicate rooms from a persisted local registry', () => {
  const room = {
    id: 'local-room',
    name: 'Local notes',
    collectionKey: 'notes',
  };
  localStorage.setItem('ewe_room_registry', JSON.stringify([room, room, room]));

  const DB = new Database({ providers: ['IndexedDB'] });

  expect(DB.registry).toEqual([room]);
  expect(JSON.parse(localStorage.getItem('ewe_room_registry') ?? '[]')).toEqual(
    [room]
  );
});
it.todo(
  'Can use local server',
  async () => {
    // todo
  },
  60000
);
