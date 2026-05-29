import type { DatabaseOptions, DocSeed, Note } from '.';
import { Database } from '.';
import { it, expect, afterAll } from 'vitest';
import { wait } from '@eweser/shared';

// Ensure window is available in Node test environment (needed by getAccessGrantTokenFromUrl)
const _originalWindow = globalThis.window;
globalThis.window = globalThis.window ?? ({} as Window & typeof globalThis);
afterAll(() => {
  globalThis.window = _originalWindow;
});

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
it.todo(
  'Can use local server',
  async () => {
    // todo
  },
  60000
);

it('seedDocuments creates documents in a room', async () => {
  const seeds: DocSeed<'notes'>[] = [
    {
      collectionKey: 'notes',
      roomId: 'seed-test-room',
      roomName: 'Seed Test Room',
      docId: 'seed-doc-1',
      doc: { text: 'seeded content' } as DocSeed<'notes'>['doc'],
    },
  ];

  const db = new Database({ seedDocuments: seeds });

  // Poll until seedDocuments completes (fire-and-forget in constructor)
  // or timeout after 5 seconds
  for (let i = 0; i < 50; i++) {
    const room = db.collections['notes']?.['seed-test-room'];
    if (room?.ydoc) {
      const docs = room.getDocuments();
      if (docs.get('seed-doc-1')) break;
    }
    await wait(100);
  }

  const room = db.getRoom('notes', 'seed-test-room');
  expect(room).toBeDefined();
  expect(room.ydoc).toBeDefined();

  const docs = room.getDocuments();
  const doc = docs.get('seed-doc-1');
  expect(doc).toBeDefined();
  expect((doc as Note).text).toBe('seeded content');
  expect(doc?._id).toBe('seed-doc-1');
  expect(typeof doc?._created).toBe('number');
  expect(typeof doc?._updated).toBe('number');
}, 10000);
