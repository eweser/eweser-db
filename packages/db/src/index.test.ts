import Database from '.';
import { it, expect } from 'vitest';

const collectionKeys = ['notes', 'flashcards'];
const defaultHomeServer = 'https://matrix.org';

it('Database initializes', () => {
  const DB = new Database();
  expect(DB).toBeDefined();
  expect(DB.collectionKeys).toEqual(collectionKeys);
  expect(Object.keys(DB.collections)).toEqual(['registry', ...collectionKeys]);
  expect(DB.baseUrl).toBe(defaultHomeServer);
  expect(DB.loggedIn).toBe(false);
  expect(DB.loginStatus).toBe('initial');
  expect(DB.matrixClient).toBe(null);
});
