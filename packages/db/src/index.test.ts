import { Database } from '.';
import { it, expect } from 'vitest';
import { ensureMatrixIsRunning } from './test-utils/matrixTestUtilServer';
import { createMatrixUser } from './test-utils/matrixTestUtil';
import { userLoginInfo, HOMESERVER_NAME, matrixTestConfig } from './test-utils';
const loginInfo = userLoginInfo();
const { userId: dummyUserName, password: dummyUserPass } = loginInfo;
const collectionKeys = ['notes', 'flashcards', 'profiles'];
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

  const DB = new Database(matrixTestConfig);
  expect(DB.baseUrl).toBe('http://localhost:8888');
  // can create user against local server
  const signedInClient = await createMatrixUser(dummyUserName, dummyUserPass);
  const signedInUser = await signedInClient?.whoami();
  expect(signedInUser?.user_id).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);
  // 60 seconds because it can take a bit for the server to start up with docker
}, 60000);
