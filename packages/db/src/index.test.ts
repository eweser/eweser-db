import type { DatabaseOptions } from '.';
import { Database } from '.';
import { it, expect } from 'vitest';

const collectionKeys = ['notes', 'flashcards', 'profiles'];
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
