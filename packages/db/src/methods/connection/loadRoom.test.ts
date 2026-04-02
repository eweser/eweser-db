import * as Y from 'yjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../..';
import type { Room, EweDocument } from '../../types';
import type { ServerRoom } from '@eweser/shared';
import { loadRoom } from './loadRoom';

const { initializeDocAndLocalProviderMock, providerInstances } = vi.hoisted(
  () => ({
    initializeDocAndLocalProviderMock: vi.fn(),
    providerInstances: [] as Array<{ configuration: Record<string, unknown> }>,
  })
);

vi.mock('../../utils/connection/initializeDoc', () => ({
  initializeDocAndLocalProvider: initializeDocAndLocalProviderMock,
}));

vi.mock('@hocuspocus/provider', () => {
  class MockHocuspocusProvider {
    configuration: Record<string, unknown>;
    status = 'connected';
    awareness: unknown;
    private listeners = new Map<string, Set<(payload: unknown) => void>>();

    constructor(configuration: Record<string, unknown>) {
      this.configuration = configuration;
      this.awareness = configuration.awareness;
      providerInstances.push(this);
    }

    on(event: string, handler: (payload: unknown) => void) {
      const handlers = this.listeners.get(event) ?? new Set();
      handlers.add(handler);
      this.listeners.set(event, handlers);
      return this;
    }

    off(event: string, handler: (payload: unknown) => void) {
      this.listeners.get(event)?.delete(handler);
      return this;
    }

    emit(event: string, payload: unknown) {
      this.listeners.get(event)?.forEach((handler) => handler(payload));
      return true;
    }

    disconnect = vi.fn(() => {
      this.status = 'disconnected';
      this.emit('status', { status: 'disconnected' });
    });

    destroy = vi.fn();
  }

  return {
    HocuspocusProvider: MockHocuspocusProvider,
    WebSocketStatus: {
      Connecting: 'connecting',
      Connected: 'connected',
      Disconnected: 'disconnected',
    },
  };
});

describe('loadRoom', () => {
  beforeEach(() => {
    providerInstances.length = 0;
    vi.clearAllMocks();
    initializeDocAndLocalProviderMock.mockResolvedValue({
      yDoc: new Y.Doc(),
      localProvider: {},
    });
  });

  it('creates a Hocuspocus provider using the sync url and token loader', async () => {
    const refreshSyncToken = vi.fn().mockResolvedValue({
      syncUrl: 'ws://localhost:8080',
      syncToken: 'sync-token',
      tokenExpiry: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    const db = {
      collections: {
        notes: {},
        flashcards: {},
        profiles: {},
      },
      indexedDBProviderPolyfill: undefined,
      getToken: () => 'access-grant-token',
      useSync: true,
      refreshSyncToken,
      emit: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    } as unknown as Database;

    const serverRoom: ServerRoom = {
      id: 'room-1',
      name: 'Room 1',
      collectionKey: 'notes',
      tokenExpiry: null,
      syncUrl: 'ws://localhost:8080',
      publicAccess: 'private',
      readAccess: [],
      writeAccess: [],
      adminAccess: [],
      createdAt: null,
      updatedAt: null,
      _deleted: false,
      _ttl: null,
    };

    const room = await loadRoom(db)(serverRoom, {
      loadRemote: true,
      awaitLoadRemote: false,
      withAwareness: true,
    });

    expect(providerInstances).toHaveLength(1);

    const provider = providerInstances[0];
    expect(provider.configuration.url).toBe('ws://localhost:8080');
    expect(provider.configuration.name).toBe('room-1');
    expect(provider.configuration.document).toBe(room.ydoc);
    expect(typeof provider.configuration.token).toBe('function');

    const token = await (
      provider.configuration.token as () => Promise<string>
    )();
    expect(token).toBe('sync-token');

    expect(room.syncProvider).toBe(provider);
    expect(room.syncToken).toBe('sync-token');
    expect(room.syncUrl).toBe('ws://localhost:8080');
    expect(refreshSyncToken).toHaveBeenCalledWith(room as Room<EweDocument>);
  });
});
