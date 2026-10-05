import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import type { AgentConfig, AgentRoom, SyncTokenResult } from './auth.js';

const state = vi.hoisted(() => ({
  providers: [] as {
    document: Y.Doc;
    destroy: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    setConfiguration: ReturnType<typeof vi.fn>;
    listeners: Map<string, Set<(event: { state: boolean }) => void>>;
  }[],
  synced: (_room: string) => true,
  failConstructor: false,
}));
vi.mock('@hocuspocus/provider', () => ({
  HocuspocusProvider: class {
    document: Y.Doc;
    isSynced: boolean;
    listeners = new Map<string, Set<(event: { state: boolean }) => void>>();
    disconnect = vi.fn();
    destroy = vi.fn(() => {
      this.disconnect();
      this.listeners.clear();
    });
    setConfiguration = vi.fn();
    constructor(config: { document: Y.Doc; name: string }) {
      if (state.failConstructor) throw new Error('provider constructor failed');
      this.document = config.document;
      this.isSynced = state.synced(config.name);
      state.providers.push(this);
    }
    on(name: string, callback: (event: { state: boolean }) => void) {
      const callbacks = this.listeners.get(name) ?? new Set();
      callbacks.add(callback);
      this.listeners.set(name, callbacks);
    }
    off(name: string, callback: (event: { state: boolean }) => void) {
      this.listeners.get(name)?.delete(callback);
    }
  },
}));
vi.mock('./auth.js', () => ({ fetchSyncToken: vi.fn() }));
// Keep logger transport scheduling out of the provider/timer lifetime count.
vi.mock('@eweser/logger', () => ({
  createLogger: () => ({
    child: () => ({ warn: vi.fn(), error: vi.fn() }),
  }),
}));
const { fetchSyncToken } = await import('./auth.js');
const { DataLayer } = await import('./data-layer.js');
const agent: AgentConfig = {
  id: 'agent',
  userId: 'user',
  name: 'Test',
  type: 'mcp',
  allowedCollections: [],
  allowedRooms: [],
  permissions: 'readwrite',
  isActive: true,
  tokenExpiresAt: null,
};
const room = (id: string): AgentRoom => ({
  id,
  name: id,
  collectionKey: 'notes',
  syncUrl: null,
  syncBaseUrl: null,
});
const token = (): SyncTokenResult => ({
  syncToken: 'test-only',
  syncUrl: 'ws://sync.test',
  tokenExpiry: new Date(Date.now() + 15 * 60_000).toISOString(),
});
const makeLayer = () => new DataLayer(agent, 'http://auth.test', 'test-only');
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.useFakeTimers();
  state.providers.length = 0;
  state.synced = () => true;
  state.failConstructor = false;
  vi.mocked(fetchSyncToken)
    .mockReset()
    .mockImplementation(async () => token());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('DataLayer resource lifecycle with real Y.Doc instances', () => {
  it('releases documents, providers and timers exactly once across repeated request layers', async () => {
    for (let i = 0; i < 20; i++) {
      const layer = makeLayer();
      await layer.init([room('notes')]);
      const provider = state.providers[i];
      const destroyDoc = vi.spyOn(provider.document, 'destroy');
      expect(provider.document).toBeInstanceOf(Y.Doc);
      expect(vi.getTimerCount()).toBe(1);
      expect(provider.listeners.get('synced')?.size).toBe(0);
      await layer.disconnect();
      await layer.disconnect();
      expect(provider.destroy).toHaveBeenCalledTimes(1);
      expect(provider.disconnect).toHaveBeenCalledTimes(1);
      expect(destroyDoc).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    }
  });

  it('cleans partial init on disconnect and cannot allocate after a pending token arrives', async () => {
    state.synced = () => false;
    const gate = deferred<SyncTokenResult>();
    vi.mocked(fetchSyncToken).mockImplementation(async (_token, _url, id) =>
      id === 'pending-token' ? gate.promise : token()
    );
    const layer = makeLayer();
    const init = layer.init([room('pending-sync'), room('pending-token')]);
    const rejection = expect(init).rejects.toThrow(AggregateError);
    await vi.advanceTimersByTimeAsync(0);
    expect(state.providers).toHaveLength(1);
    const provider = state.providers[0];
    await layer.disconnect();
    expect(provider.document.isDestroyed).toBe(true);
    gate.resolve(token());
    await rejection;
    expect(state.providers).toHaveLength(1);
    expect(provider.destroy).toHaveBeenCalledTimes(1);
    expect(layer.listRooms()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('destroys a failed room while preserving partial-success initialization', async () => {
    state.synced = (id) => id === 'good';
    const layer = makeLayer();
    const init = layer.init([room('good'), room('timeout')]);
    await vi.advanceTimersByTimeAsync(30_000);
    await init;
    expect(layer.listRooms().map((r) => r.id)).toEqual(['good']);
    expect(state.providers[1].destroy).toHaveBeenCalledTimes(1);
    expect(state.providers[1].document.isDestroyed).toBe(true);
    expect(state.providers[0].destroy).not.toHaveBeenCalled();
    await layer.disconnect();
    expect(state.providers[0].destroy).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not resurrect an in-flight refresh after disconnect', async () => {
    const layer = makeLayer();
    await layer.init([room('notes')]);
    const gate = deferred<SyncTokenResult>();
    vi.mocked(fetchSyncToken).mockImplementationOnce(() => gate.promise);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    await layer.disconnect();
    gate.resolve(token());
    await vi.advanceTimersByTimeAsync(0);
    expect(state.providers[0].setConfiguration).not.toHaveBeenCalled();
    expect(state.providers[0].destroy).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('destroys the Y.Doc when provider construction fails', async () => {
    state.failConstructor = true;
    const destroyDoc = vi.spyOn(Y.Doc.prototype, 'destroy');
    await expect(makeLayer().init([room('notes')])).rejects.toThrow(
      AggregateError
    );
    expect(destroyDoc).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases other rooms and every document even when a provider destroy throws', async () => {
    const layer = makeLayer();
    await layer.init([room('first'), room('second')]);
    state.providers[0].destroy.mockImplementationOnce(() => {
      throw new Error('close failed');
    });
    await expect(layer.disconnect()).rejects.toThrow(AggregateError);
    expect(state.providers.every((p) => p.document.isDestroyed)).toBe(true);
    expect(state.providers[1].destroy).toHaveBeenCalledTimes(1);
    await layer.disconnect();
    expect(state.providers[0].destroy).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
