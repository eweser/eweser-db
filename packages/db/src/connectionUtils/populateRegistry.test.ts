import { describe, it, expect, vitest } from 'vitest';
import { Database, getRegistry, wait } from '..';
import {
  checkRegistryPopulated,
  populateRegistry,
  waitForRegistryPopulated,
} from './populateRegistry';
import type { IDatabase, RegistryData } from '../types';
import { connectMatrixProvider } from './connectMatrixProvider';
import { getOrCreateRegistry } from './getOrCreateRegistryAndSpace';
import { initializeDocAndLocalProvider } from './initializeDoc';
import { baseUrl, userLoginInfo } from '../test-utils';
import { loginToMatrix } from '../methods/login';

describe('populateRegistry', () => {
  it.skip('creates a public profile room, and populates the registry with that first entry', async () => {
    const DB = new Database({ baseUrl }) as IDatabase;
    await loginToMatrix(DB, userLoginInfo);

    await getOrCreateRegistry(DB);

    if (!DB.userId) throw new Error('userId not found');

    const { ydoc } = await initializeDocAndLocalProvider<RegistryData>(
      'registry'
    );

    DB.collections.registry[0].ydoc = ydoc;

    await connectMatrixProvider(DB, DB.collections.registry[0]);

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

    expect(eventListener).toBeCalledTimes(3);
    expect(eventListener).toBeCalledWith({
      event: 'populateRegistry',
      message: 'starting populateRegistry',
      level: 'info',
    });

    expect(eventListener).toBeCalledWith({
      event: 'populateRegistry',
      message: 'created profile room',
      level: 'info',
    });

    expect(eventListener).toBeCalledWith({
      event: 'populateRegistry',
      message: 'populated registry',
      level: 'info',
    });

    await wait(250); // enough time for the check to have been tried at least twice
    expect(checkRegistryPopulated(DB)).toBe(true);
    expect(waitForRegistryPopulatedCallback).toHaveBeenCalledTimes(1);
  });
  it.skip('waitForRegistryPopulated fails with error on timeout', async () => {
    const DB = new Database({ baseUrl }) as IDatabase;
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
