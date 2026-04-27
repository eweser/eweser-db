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

describe('DataLayer permission enforcement', () => {
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
  });
});
