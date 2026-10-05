import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from '@hocuspocus/provider';
import type { AgentConfig, AgentRoom } from './auth.js';
import { DataLayer } from './data-layer.js';
import { fetchSyncToken } from './auth.js';

vi.mock('./auth.js', () => ({ fetchSyncToken: vi.fn() }));
vi.mock('@eweser/logger', () => ({
  createLogger: () => ({ child: () => ({ warn: vi.fn(), error: vi.fn() }) }),
}));

// The real providers create listeners, awareness/checker intervals and retry
// attempts. Only the network socket is replaced; no network calls can escape.
class TestWebSocket extends EventTarget {
  static instances: TestWebSocket[] = [];
  readyState = 0;
  binaryType = 'arraybuffer';
  identifier = '';
  close = vi.fn(() => {
    this.readyState = 3;
  });
  send = vi.fn();
  constructor(_url: string) {
    super();
    TestWebSocket.instances.push(this);
  }
}
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
const room: AgentRoom = {
  id: 'notes',
  name: 'Notes',
  collectionKey: 'notes',
  syncUrl: null,
  syncBaseUrl: null,
};
const makeLayer = () => new DataLayer(agent, 'http://auth.test', 'test-only');
const realConnect = HocuspocusProvider.prototype.connect;
function simulateSyncedRoom() {
  return vi
    .spyOn(HocuspocusProvider.prototype, 'connect')
    .mockImplementation(function (this: HocuspocusProvider) {
      const pending = realConnect.call(this);
      this.isSynced = true;
      this.emit('synced', { state: true });
      return pending;
    });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', TestWebSocket);
  TestWebSocket.instances.length = 0;
  vi.mocked(fetchSyncToken).mockResolvedValue({
    syncToken: 'test-only',
    syncUrl: 'ws://fake.test',
    tokenExpiry: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('DataLayer ownership of the real Hocuspocus websocket provider', () => {
  it('releases actual checker/awareness/refresh timers and sockets over repeated lifetimes', async () => {
    simulateSyncedRoom();
    const destroyProvider = vi.spyOn(HocuspocusProvider.prototype, 'destroy');
    const destroySocket = vi.spyOn(
      HocuspocusProviderWebsocket.prototype,
      'destroy'
    );
    const destroyDocument = vi.spyOn(Y.Doc.prototype, 'destroy');
    for (let i = 0; i < 10; i++) {
      const layer = makeLayer();
      await layer.init([room]);
      expect(vi.getTimerCount()).toBeGreaterThan(0);
      await layer.disconnect();
      await layer.disconnect();
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBe(0);
      expect(destroyProvider).toHaveBeenCalledTimes(i + 1);
      expect(destroySocket).toHaveBeenCalledTimes(i + 1);
      expect(destroyDocument).toHaveBeenCalledTimes(i + 1);
      expect(
        TestWebSocket.instances.every((socket) => socket.readyState === 3)
      ).toBe(true);
    }
    const socketCount = TestWebSocket.instances.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(TestWebSocket.instances).toHaveLength(socketCount);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels real pending connection/retry and sync waits during partial initialization', async () => {
    const layer = makeLayer();
    const init = layer.init([room]);
    const rejected = expect(init).rejects.toThrow(AggregateError);
    await vi.advanceTimersByTimeAsync(0);
    expect(TestWebSocket.instances).toHaveLength(1);
    await layer.disconnect();
    await rejected;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(TestWebSocket.instances).toHaveLength(1);
    expect(TestWebSocket.instances[0].readyState).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans the owned socket and document if the real provider constructor fails after awareness setup', async () => {
    vi.spyOn(
      HocuspocusProviderWebsocket.prototype,
      'attach'
    ).mockImplementationOnce(() => {
      throw new Error('attach failed');
    });
    const destroySocket = vi.spyOn(
      HocuspocusProviderWebsocket.prototype,
      'destroy'
    );
    const destroyDocument = vi.spyOn(Y.Doc.prototype, 'destroy');
    await expect(makeLayer().init([room])).rejects.toThrow(AggregateError);
    expect(destroySocket).toHaveBeenCalledTimes(1);
    expect(destroyDocument).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(TestWebSocket.instances).toHaveLength(0);
  });

  it('cleans both real providers when connection startup rejects', async () => {
    vi.spyOn(HocuspocusProvider.prototype, 'connect').mockRejectedValueOnce(
      new Error('start failed')
    );
    const destroySocket = vi.spyOn(
      HocuspocusProviderWebsocket.prototype,
      'destroy'
    );
    const destroyProvider = vi.spyOn(HocuspocusProvider.prototype, 'destroy');
    await expect(makeLayer().init([room])).rejects.toThrow(AggregateError);
    expect(destroySocket).toHaveBeenCalledTimes(1);
    expect(destroyProvider).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not destroy an unrelated shared socket or its document', async () => {
    const shared = new HocuspocusProviderWebsocket({
      url: 'ws://shared.test',
      connect: false,
    });
    const document = new Y.Doc();
    const external = new HocuspocusProvider({
      websocketProvider: shared,
      name: 'external',
      document,
    });
    const baseline = vi.getTimerCount();
    const destroyShared = vi.spyOn(shared, 'destroy');
    simulateSyncedRoom();
    const layer = makeLayer();
    await layer.init([room]);
    await layer.disconnect();
    await vi.advanceTimersByTimeAsync(0);
    expect(destroyShared).not.toHaveBeenCalled();
    expect(document.isDestroyed).toBe(false);
    expect(shared.configuration.providerMap.get('external')).toBe(external);
    expect(vi.getTimerCount()).toBe(baseline);
    external.destroy();
    shared.destroy();
    document.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
