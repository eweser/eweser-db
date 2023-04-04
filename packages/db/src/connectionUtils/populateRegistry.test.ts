import { describe, it, expect, vitest, beforeAll, afterEach } from 'vitest';
import { Database, getRegistry, wait } from '..';
import {
  checkRegistryPopulated,
  populateRegistry,
  waitForRegistryPopulated,
} from './populateRegistry';
import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  userLoginInfo,
} from '../test-utils';
import { loginToMatrix } from '../methods/login';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('populateRegistry', () => {
  it('creates a public profile room, and populates the registry with that first entry', async () => {
    const DB = new Database({ baseUrl });
    await loginToMatrix(DB, userLoginInfo);

    await DB.connectRegistry();

    const waitForRegistryPopulatedCallback = vitest.fn();
    waitForRegistryPopulated(DB).then(waitForRegistryPopulatedCallback);

    expect(waitForRegistryPopulatedCallback).toHaveBeenCalledTimes(0);
    await wait(250); // enough time for the check to have been tried at least twice
    // wipe registry for the test
    const registry = getRegistry(DB);
    registry.clear();
    expect(checkRegistryPopulated(DB)).toBe(false);

    const eventListener = vitest.fn();
    DB.on(eventListener);
    await populateRegistry(DB, 'test' + (Math.random() * 10000).toFixed());
    expect(eventListener).toHaveBeenCalled();
    const calls = eventListener.mock.calls;
    const callMessages = calls.map((call) => call[0].message);
    expect(callMessages).toContain('starting populateRegistry');
    expect(callMessages).toContain('created profile room');
    expect(callMessages).toContain('populated registry');

    await wait(250); // enough time for the check to have been tried at least twice
    expect(checkRegistryPopulated(DB)).toBe(true);
    expect(waitForRegistryPopulatedCallback).toHaveBeenCalledTimes(1);
  });
  it('waitForRegistryPopulated fails with error on timeout', async () => {
    const DB = new Database({ baseUrl });
    const waitForRegistryPopulatedCallback = vitest.fn();
    const registry = getRegistry(DB);
    registry.clear();
    const result = await waitForRegistryPopulated(DB, 200, 50).catch(
      waitForRegistryPopulatedCallback
    );
    expect(result).toBeUndefined();

    expect(waitForRegistryPopulatedCallback).toBeCalledWith(
      new Error('timed out waiting for registry to populate')
    );
  });
});
