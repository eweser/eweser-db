import { describe, it, expect, vitest, beforeAll, afterEach } from 'vitest';
import { CollectionKey, Database } from '../../';
import { buildAliasFromSeed, getRegistry, randomString, wait } from '../';
import {
  checkRegistryPopulated,
  populateRegistry,
  waitForRegistryPopulated,
} from './populateRegistry';
import { baseUrl, userLoginInfo } from '../../test-utils';
import { loginToMatrix } from '../../methods/login';
import { createMatrixUser } from '../../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../../test-utils/matrixTestUtilServer';
import type { Profile } from '../../collections';
const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;
beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('populateRegistry', () => {
  it('creates a public and private profile room, and populates the registry with empty profile entries', async () => {
    const db = new Database({ baseUrl });
    await loginToMatrix(db, loginInfo);

    await db.connectRegistry();

    const waitForRegistryPopulatedCallback = vitest.fn();
    waitForRegistryPopulated(db).then(waitForRegistryPopulatedCallback);

    expect(waitForRegistryPopulatedCallback).toHaveBeenCalledTimes(0);
    await wait(250); // enough time for the check to have been tried at least twice
    // wipe registry for the test
    const registry = getRegistry(db);
    registry.clear();
    expect(checkRegistryPopulated(db)).toBe(false);
    const testSeed = 'test' + randomString(8);
    const eventListener = vitest.fn();
    db.on('test', eventListener);
    await populateRegistry(db, testSeed);
    expect(eventListener).toHaveBeenCalled();
    const calls = eventListener.mock.calls;
    const callMessages = calls.map((call) => call[0].message);
    expect(callMessages).toContain('starting populateRegistry');
    expect(callMessages).toContain('created profile room');
    expect(callMessages).toContain('created private profile room');
    expect(callMessages).toContain('populated registry');

    await wait(250); // enough time for the check to have been tried at least twice
    expect(checkRegistryPopulated(db)).toBe(true);
    expect(waitForRegistryPopulatedCallback).toHaveBeenCalledTimes(1);

    const registryAfter = getRegistry(db);
    const values = registryAfter.get('0');
    expect(values?.profiles['public' + testSeed]?.roomId).toEqual(
      buildAliasFromSeed('public' + testSeed, 'profiles', db.userId)
    );
    expect(values?.profiles['private' + testSeed]?.roomId).toEqual(
      buildAliasFromSeed('private' + testSeed, 'profiles', db.userId)
    );
    const publicRoom = db.getRoom<Profile>({
      collectionKey: 'profiles',
      roomId: 'public' + testSeed,
    });
    if (!publicRoom) {
      throw new Error('publicRoom undefined');
    }
    const publicDocs = db.getDocuments<Profile>(publicRoom);
    const defaultProfile = publicDocs.get('default');
    expect(defaultProfile?.firstName).toEqual('New');
    expect(defaultProfile?.lastName).toEqual('User');

    const privateRoom = db.getRoom<Profile>({
      collectionKey: 'profiles',
      roomId: 'private' + testSeed,
    });
    if (!privateRoom) {
      throw new Error('privateRoom undefined');
    }
    const privateDocs = db.getDocuments(privateRoom);
    const privateDefaultProfile = privateDocs.get('default');
    expect(privateDefaultProfile?.firstName).toEqual('New');
    expect(privateDefaultProfile?.lastName).toEqual('User');
  }, 100000);
  it('waitForRegistryPopulated fails with error on timeout', async () => {
    const DB = new Database({ baseUrl });
    const waitForRegistryPopulatedCallback = vitest.fn();
    const registry = getRegistry(DB);
    registry.clear();
    const result = await waitForRegistryPopulated(DB, 100, 10).catch(
      waitForRegistryPopulatedCallback
    );
    expect(result).toBeUndefined();

    expect(waitForRegistryPopulatedCallback).toBeCalledWith(
      new Error('timed out waiting for registry to populate')
    );
  }, 100000);
});
