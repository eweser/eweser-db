import { describe, expect, it } from 'vitest';
import { waitForRemoteSyncProviderReady } from './vault-sync';

function createProvider(initialSynced = false) {
  const listeners = new Map<
    'synced' | 'authenticationFailed',
    Set<(payload: { state?: boolean; reason?: string }) => void>
  >([
    ['synced', new Set()],
    ['authenticationFailed', new Set()],
  ]);

  return {
    synced: initialSynced,
    on(
      event: 'synced' | 'authenticationFailed',
      callback: (payload: { state?: boolean; reason?: string }) => void
    ) {
      listeners.get(event)?.add(callback);
    },
    off(
      event: 'synced' | 'authenticationFailed',
      callback: (payload: { state?: boolean; reason?: string }) => void
    ) {
      listeners.get(event)?.delete(callback);
    },
    emit(
      event: 'synced' | 'authenticationFailed',
      payload: { state?: boolean; reason?: string }
    ) {
      listeners.get(event)?.forEach((callback) => callback(payload));
    },
  };
}

describe('waitForRemoteSyncProviderReady', () => {
  it('returns immediately when the provider is already synced', async () => {
    await expect(
      waitForRemoteSyncProviderReady(createProvider(true))
    ).resolves.toBeUndefined();
  });

  it('waits until the provider reports synced', async () => {
    const provider = createProvider(false);
    const ready = waitForRemoteSyncProviderReady(provider, 200);

    setTimeout(() => {
      provider.synced = true;
      provider.emit('synced', { state: true });
    }, 10);

    await expect(ready).resolves.toBeUndefined();
  });

  it('rejects when the provider authentication fails', async () => {
    const provider = createProvider(false);
    const ready = waitForRemoteSyncProviderReady(provider, 200);

    setTimeout(() => {
      provider.emit('authenticationFailed', { reason: 'bad token' });
    }, 10);

    await expect(ready).rejects.toThrow(
      'Remote sync provider authentication failed: bad token'
    );
  });
});
