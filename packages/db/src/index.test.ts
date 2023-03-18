import { Database } from '.';
import { it, expect } from 'vitest';
import { ensureMatrixIsRunning, matrixTestConfig } from './test-utils/matrixTestUtilServer';
import { createMatrixUser } from './test-utils/matrixTestUtil';

const collectionKeys = ['notes', 'flashcards'];
const defaultHomeServer = 'https://matrix.org';

it('Database initializes', () => {
  const DB = new Database();
  expect(DB).toBeDefined();
  expect(DB.collectionKeys).toEqual(collectionKeys);
  expect(Object.keys(DB.collections)).toEqual(['registry', ...collectionKeys]);
  expect(DB.baseUrl).toBe(defaultHomeServer);
  expect(DB.userId).toBe('');
  expect(DB.matrixClient).toBe(null);
});
it('Can use local server', async () => {
  await ensureMatrixIsRunning();

  const DB = new Database({
    baseUrl: matrixTestConfig.baseUrl,
  });
  expect(DB.baseUrl).toBe('http://localhost:8888');
  await createMatrixUser('dummydum', 'dumdum');
});
