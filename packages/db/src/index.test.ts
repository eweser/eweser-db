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
    logLevel: 1,
  };
  const DB = new Database(options);
  expect(DB).toBeDefined();
  expect(DB.authServer).toBe(options.authServer);
  expect(DB.logLevel).toBe(options.logLevel);
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
