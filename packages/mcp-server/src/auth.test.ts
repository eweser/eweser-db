import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Module under test (imported AFTER the global stub)
// ---------------------------------------------------------------------------
import {
  verifyAgentToken,
  fetchAgentRooms,
  fetchSyncToken,
  logAccess,
} from './auth.js';
import type { AgentConfig, AgentRoom, SyncTokenResult } from './auth.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

const TOKEN = 'test-agent-token';
const AUTH_URL = 'http://localhost:3001';

const AGENT_CONFIG: AgentConfig = {
  id: 'agent-1',
  userId: 'user-1',
  name: 'Test Agent',
  type: 'mcp',
  allowedCollections: ['notes'],
  allowedRooms: ['room-1'],
  permissions: 'readwrite',
  isActive: true,
  tokenExpiresAt: null,
};

const AGENTS_ROOMS: AgentRoom[] = [
  {
    id: 'room-1',
    name: 'My Notes',
    collectionKey: 'notes',
    syncUrl: 'ws://localhost:1234',
    syncBaseUrl: null,
  },
];

const SYNC_RESULT: SyncTokenResult = {
  syncUrl: 'ws://localhost:1234/room-1',
  syncToken: 'sync-jwt',
  tokenExpiry: new Date(Date.now() + 3600_000).toISOString(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('verifyAgentToken', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns the agent config on success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ agent: AGENT_CONFIG }));
    const result = await verifyAgentToken(TOKEN, AUTH_URL);
    expect(result).toEqual(AGENT_CONFIG);
    expect(mockFetch).toHaveBeenCalledWith(
      `${AUTH_URL}/api/agents/verify-token`,
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ error: 'Unauthorized' }, 401)
    );
    await expect(verifyAgentToken(TOKEN, AUTH_URL)).rejects.toThrow('401');
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network failure'));
    await expect(verifyAgentToken(TOKEN, AUTH_URL)).rejects.toThrow(
      'network failure'
    );
  });
});

describe('fetchAgentRooms', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns rooms array on success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ rooms: AGENTS_ROOMS }));
    const rooms = await fetchAgentRooms(TOKEN, AUTH_URL);
    expect(rooms).toEqual(AGENTS_ROOMS);
  });

  it('throws on 403 response', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Forbidden' }, 403));
    await expect(fetchAgentRooms(TOKEN, AUTH_URL)).rejects.toThrow('403');
  });
});

describe('fetchSyncToken', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns sync token result on success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(SYNC_RESULT));
    const result = await fetchSyncToken(TOKEN, AUTH_URL, 'room-1');
    expect(result).toEqual(SYNC_RESULT);
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.roomId).toBe('room-1');
  });

  it('throws on auth failure', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ error: 'Unauthorized' }, 401)
    );
    await expect(fetchSyncToken(TOKEN, AUTH_URL, 'room-1')).rejects.toThrow(
      '401'
    );
  });
});

describe('logAccess', () => {
  beforeEach(() => mockFetch.mockReset());

  it('sends the audit entry without throwing', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ ok: true }));
    await expect(
      logAccess(TOKEN, AUTH_URL, {
        roomId: 'room-1',
        collectionKey: 'notes',
        action: 'read',
        documentCount: 5,
      })
    ).resolves.not.toThrow();
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.action).toBe('read');
    expect(body.documentCount).toBe(5);
  });

  it('throws on server error', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ error: 'Server Error' }, 500)
    );
    await expect(
      logAccess(TOKEN, AUTH_URL, {
        roomId: 'room-1',
        collectionKey: 'notes',
        action: 'write',
      })
    ).rejects.toThrow('500');
  });
});
