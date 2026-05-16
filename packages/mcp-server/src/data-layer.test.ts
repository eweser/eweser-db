import { describe, expect, it } from 'vitest';
import { DataLayer } from './data-layer.js';
import type { AgentConfig, AgentRoom } from './auth.js';

const baseRoom: AgentRoom = {
  id: 'room-1',
  name: 'Notes',
  collectionKey: 'notes',
  syncUrl: null,
  syncBaseUrl: null,
};

const baseAgent: AgentConfig = {
  id: 'agent-1',
  userId: 'user-1',
  name: 'Test Agent',
  type: 'mcp',
  allowedCollections: ['notes'],
  allowedRooms: ['room-1'],
  permissions: 'read',
  isActive: true,
  tokenExpiresAt: null,
};

function makeDataLayer(
  agentConfig: Partial<AgentConfig>,
  room: AgentRoom = baseRoom
): DataLayer {
  const dataLayer = new DataLayer(
    { ...baseAgent, ...agentConfig },
    'http://auth.test',
    'agent-token'
  );

  const rooms = (
    dataLayer as unknown as {
      rooms: Map<string, unknown>;
    }
  ).rooms;

  rooms.set(room.id, {
    meta: room,
    ydoc: {},
    provider: {},
    syncToken: 'sync-token',
    tokenExpiry: new Date(Date.now() + 60_000),
  });

  return dataLayer;
}

function connectTestRoom(dataLayer: DataLayer, room: AgentRoom): void {
  const rooms = (
    dataLayer as unknown as {
      rooms: Map<string, unknown>;
    }
  ).rooms;

  rooms.set(room.id, {
    meta: room,
    ydoc: {},
    provider: {},
    syncToken: 'sync-token',
    tokenExpiry: new Date(Date.now() + 60_000),
  });
}

function stubRawDocuments(
  dataLayer: DataLayer,
  documentsByRoomId: Record<string, Record<string, unknown>>
): void {
  dataLayer.getRawDocuments = (<T extends object>(roomId: string) =>
    (documentsByRoomId[roomId] ?? {}) as T) as typeof dataLayer.getRawDocuments;
}

describe('DataLayer permission enforcement', () => {
  it('continues when one room fails to connect during init', async () => {
    const dataLayer = new DataLayer(
      { ...baseAgent, allowedRooms: [] },
      'http://auth.test',
      'agent-token'
    );
    const connectCalls: string[] = [];
    const connectedRoom = { ...baseRoom, id: 'room-ok' };
    const failedRoom = { ...baseRoom, id: 'room-timeout' };

    dataLayer.connectRoom = async (room) => {
      connectCalls.push(room.id);
      if (room.id === failedRoom.id) {
        throw new Error('sync timeout');
      }
      connectTestRoom(dataLayer, room);
    };

    await expect(dataLayer.init([connectedRoom, failedRoom])).resolves.toBe(
      undefined
    );
    expect(connectCalls).toEqual(['room-ok', 'room-timeout']);
    expect(dataLayer.listRooms().map((room) => room.id)).toEqual(['room-ok']);
  });

  it('fails init when every requested room fails to connect', async () => {
    const dataLayer = new DataLayer(
      baseAgent,
      'http://auth.test',
      'agent-token'
    );
    dataLayer.connectRoom = async () => {
      throw new Error('sync timeout');
    };

    await expect(dataLayer.init([baseRoom])).rejects.toThrow(AggregateError);
    await expect(dataLayer.init([baseRoom])).rejects.toThrow(
      'room-1: sync timeout'
    );
  });

  it('preserves legacy readwrite access when no explicit write scope is set', () => {
    const dataLayer = makeDataLayer({ permissions: 'readwrite' });

    expect(() => dataLayer.assertWriteAccess('room-1')).not.toThrow();
  });

  it('denies writes for read-only legacy tokens', () => {
    const dataLayer = makeDataLayer({ permissions: 'read' });

    expect(() => dataLayer.assertWriteAccess('room-1')).toThrow(
      'Agent does not have write permission'
    );
  });

  it('uses explicit read scope before legacy allowed rooms', () => {
    const dataLayer = makeDataLayer({
      readAllowedCollections: ['conversations'],
      readAllowedRooms: ['room-2'],
    });

    expect(() => dataLayer.assertReadAccess('room-1')).toThrow(
      'Agent does not have read permission'
    );
  });

  it('hides connected rooms outside the explicit read scope', () => {
    const dataLayer = makeDataLayer({
      allowedRooms: [],
      readAllowedCollections: ['notes'],
      readAllowedRooms: ['room-2'],
    });
    connectTestRoom(dataLayer, {
      ...baseRoom,
      id: 'room-2',
      name: 'Readable Notes',
    });

    expect(dataLayer.listRooms().map((room) => room.id)).toEqual(['room-2']);
  });

  it('allows explicit room-scoped writes', () => {
    const dataLayer = makeDataLayer({
      permissions: 'read',
      writeAllowedCollections: ['notes'],
      writeAllowedRooms: ['room-1'],
    });

    expect(() =>
      dataLayer.assertWriteAccess('room-1', { text: 'hello' })
    ).not.toThrow();
  });

  it('sets a default memory write room only when exactly one conversations room is writable', () => {
    const dataLayer = makeDataLayer(
      {
        permissions: 'read',
        readAllowedCollections: ['conversations'],
        readAllowedRooms: ['conversation-room-1'],
        writeAllowedCollections: ['conversations'],
        writeAllowedRooms: ['conversation-room-1'],
      },
      {
        id: 'conversation-room-1',
        name: 'Conversations',
        collectionKey: 'conversations',
        syncUrl: null,
        syncBaseUrl: null,
      }
    );

    expect(dataLayer.getMemoryStrategy().scope.defaultWriteRoomId).toBe(
      'conversation-room-1'
    );
  });

  it('leaves defaultWriteRoomId unset when multiple conversations rooms are writable', () => {
    const dataLayer = makeDataLayer(
      {
        permissions: 'read',
        readAllowedCollections: ['conversations'],
        readAllowedRooms: ['conversation-room-1', 'conversation-room-2'],
        writeAllowedCollections: ['conversations'],
        writeAllowedRooms: ['conversation-room-1', 'conversation-room-2'],
      },
      {
        id: 'conversation-room-1',
        name: 'Conversations',
        collectionKey: 'conversations',
        syncUrl: null,
        syncBaseUrl: null,
      }
    );
    connectTestRoom(dataLayer, {
      id: 'conversation-room-2',
      name: 'Conversations 2',
      collectionKey: 'conversations',
      syncUrl: null,
      syncBaseUrl: null,
    });

    const scope = dataLayer.getMemoryStrategy().scope;
    expect(scope.writableRoomIds).toEqual([
      'conversation-room-1',
      'conversation-room-2',
    ]);
    expect(scope.defaultWriteRoomId).toBeUndefined();
    expect(() => dataLayer.resolveMemoryWriteRoom()).toThrow(
      'Multiple writable memory rooms are available'
    );
  });

  it('resolves a configured project-wiki scope from memoryStrategyConfigs docs', () => {
    const dataLayer = makeDataLayer(
      {
        permissions: 'read',
        allowedCollections: [
          'conversations',
          'memoryStrategyConfigs',
          'projectWikiDrafts',
          'projectWikiPages',
        ],
        readAllowedCollections: [
          'conversations',
          'memoryStrategyConfigs',
          'projectWikiDrafts',
          'projectWikiPages',
        ],
        readAllowedRooms: [
          'strategy-room',
          'source-room',
          'draft-room',
          'page-room',
        ],
        writeAllowedCollections: ['projectWikiDrafts', 'projectWikiPages'],
        writeAllowedRooms: ['draft-room', 'page-room'],
      },
      {
        id: 'strategy-room',
        name: 'Strategy Configs',
        collectionKey: 'memoryStrategyConfigs',
        syncUrl: null,
        syncBaseUrl: null,
      }
    );
    connectTestRoom(dataLayer, {
      id: 'source-room',
      name: 'Project Memory',
      collectionKey: 'conversations',
      syncUrl: null,
      syncBaseUrl: null,
    });
    connectTestRoom(dataLayer, {
      id: 'draft-room',
      name: 'Wiki Drafts',
      collectionKey: 'projectWikiDrafts',
      syncUrl: null,
      syncBaseUrl: null,
    });
    connectTestRoom(dataLayer, {
      id: 'page-room',
      name: 'Wiki Pages',
      collectionKey: 'projectWikiPages',
      syncUrl: null,
      syncBaseUrl: null,
    });
    stubRawDocuments(dataLayer, {
      'strategy-room': {
        'config-1': {
          _created: Date.now(),
          _id: 'config-1',
          _ref: 'memoryStrategyConfigs.strategy-room.config-1',
          _updated: Date.now(),
          captureMode: 'manual',
          enabled: true,
          exportFormats: ['obsidian'],
          name: 'Project Wiki',
          readableRoomIds: ['source-room', 'draft-room', 'page-room'],
          scopeKey: 'eweser-db',
          scopeType: 'project',
          sourceRoomIds: ['source-room'],
          strategy: 'project-wiki',
          writableRoomIds: ['draft-room', 'page-room'],
        },
      },
    });

    const strategy = dataLayer.getMemoryStrategy({
      scopeKey: 'eweser-db',
      scopeType: 'project',
    });

    expect(strategy.strategy).toBe('project-wiki');
    expect(strategy.scope.sourceRoomIds).toEqual(['source-room']);
    expect(strategy.scope.draftRoomIds).toEqual(['draft-room']);
    expect(strategy.scope.pageRoomIds).toEqual(['page-room']);
    expect(strategy.scope.writableRoomIds).toEqual(['draft-room', 'page-room']);
  });

  it('resolves project wiki source, draft, and page targets without mutating source rooms', () => {
    const dataLayer = makeDataLayer(
      {
        permissions: 'read',
        allowedCollections: [
          'conversations',
          'memoryStrategyConfigs',
          'projectWikiDrafts',
          'projectWikiPages',
        ],
        readAllowedCollections: [
          'conversations',
          'memoryStrategyConfigs',
          'projectWikiDrafts',
          'projectWikiPages',
        ],
        readAllowedRooms: [
          'strategy-room',
          'source-room',
          'draft-room',
          'page-room',
        ],
        writeAllowedCollections: ['projectWikiDrafts', 'projectWikiPages'],
        writeAllowedRooms: ['draft-room', 'page-room'],
      },
      {
        id: 'strategy-room',
        name: 'Strategy Configs',
        collectionKey: 'memoryStrategyConfigs',
        syncUrl: null,
        syncBaseUrl: null,
      }
    );
    connectTestRoom(dataLayer, {
      id: 'source-room',
      name: 'Project Memory',
      collectionKey: 'conversations',
      syncUrl: null,
      syncBaseUrl: null,
    });
    connectTestRoom(dataLayer, {
      id: 'draft-room',
      name: 'Wiki Drafts',
      collectionKey: 'projectWikiDrafts',
      syncUrl: null,
      syncBaseUrl: null,
    });
    connectTestRoom(dataLayer, {
      id: 'page-room',
      name: 'Wiki Pages',
      collectionKey: 'projectWikiPages',
      syncUrl: null,
      syncBaseUrl: null,
    });
    stubRawDocuments(dataLayer, {
      'strategy-room': {
        'config-1': {
          _created: Date.now(),
          _id: 'config-1',
          _ref: 'memoryStrategyConfigs.strategy-room.config-1',
          _updated: Date.now(),
          captureMode: 'manual',
          enabled: true,
          exportFormats: ['obsidian'],
          name: 'Project Wiki',
          readableRoomIds: ['source-room', 'draft-room', 'page-room'],
          scopeKey: 'eweser-db',
          scopeType: 'project',
          sourceRoomIds: ['source-room'],
          strategy: 'project-wiki',
          writableRoomIds: ['draft-room', 'page-room'],
        },
      },
    });

    const targets = dataLayer.resolveProjectWikiTargets({
      scopeKey: 'eweser-db',
      scopeType: 'project',
    });

    expect(targets.sourceRoomIds).toEqual(['source-room']);
    expect(targets.draftRoomId).toBe('draft-room');
    expect(targets.pageRoomId).toBe('page-room');
    expect(targets.sourceRoomIds).not.toContain(targets.draftRoomId);
    expect(targets.sourceRoomIds).not.toContain(targets.pageRoomId);
  });

  it('requires notes created under a configured writable folder scope to identify that folder', () => {
    const dataLayer = makeDataLayer({
      permissions: 'read',
      writeAllowedCollections: ['notes'],
      writeAllowedRooms: ['room-1'],
      writeAllowedFolderIds: ['folder-ai'],
    });

    expect(() =>
      dataLayer.assertWriteAccess('room-1', { text: 'outside' })
    ).toThrow('note folder or path');
    expect(() =>
      dataLayer.assertWriteAccess('room-1', {
        text: 'inside',
        folderIds: ['folder-ai'],
      })
    ).not.toThrow();
  });

  it('allows note writes under configured source path prefixes', () => {
    const dataLayer = makeDataLayer({
      permissions: 'read',
      writeAllowedCollections: ['notes'],
      writeAllowedRooms: ['room-1'],
      writeAllowedPathPrefixes: ['AI/'],
    });

    expect(() =>
      dataLayer.assertWriteAccess('room-1', {
        text: 'inside',
        sourcePath: 'AI/session.md',
      })
    ).not.toThrow();
    expect(() =>
      dataLayer.assertWriteAccess('room-1', {
        text: 'outside',
        sourcePath: 'AINotes/session.md',
      })
    ).toThrow('note folder or path');
    expect(() =>
      dataLayer.assertWriteAccess('room-1', {
        text: 'traversal',
        sourcePath: 'AI/../other/session.md',
      })
    ).toThrow('note folder or path');
    expect(() =>
      dataLayer.assertWriteAccess('room-1', {
        text: 'absolute',
        sourcePath: '/AI/session.md',
      })
    ).toThrow('note folder or path');
  });
});
