/**
 * Tests for routes/federation.ts
 *
 * Federated route endpoints: remote invite/accept/revoke (inbound signed
 * requests from peer servers) and submit-invite/submit-accept-notification
 * (outbound from local admin). All remote HTTP calls and DB operations
 * are mocked; only the route logic + request verification are tested here.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { Context, Next } from 'hono';

// ─── Module-level mock variables (following access-grant.test.ts pattern) ──

const createFederatedPrincipalMock = vi.fn();
const getFederatedPrincipalsByRoomMock = vi.fn();
const getFederatedPrincipalMock = vi.fn();
const getFederatedPrincipalByIdMock = vi.fn();
const checkFederatedGrantMock = vi.fn();
const updateFederatedPrincipalStatusMock = vi.fn();
const revokeAllFederatedPrincipalsForRoomMock = vi.fn();

const createSignedRequestMock = vi.fn();
const verifySignedRequestFromServerMock = vi.fn();
const fetchPeerWellKnownMock = vi.fn();
const sendSignedRequestToPeerMock = vi.fn();
const generateRequestIdMock = vi.fn();

const getRoomByIdMock = vi.fn();
const parseAccessGrantIdMock = vi.fn(() => ({ ownerId: 'admin-user-id' }));

vi.mock('../services/federation/principal.js', () => ({
  createFederatedPrincipal: createFederatedPrincipalMock,
  getFederatedPrincipalsByRoom: getFederatedPrincipalsByRoomMock,
  getFederatedPrincipal: getFederatedPrincipalMock,
  getFederatedPrincipalById: getFederatedPrincipalByIdMock,
  checkFederatedGrant: checkFederatedGrantMock,
  updateFederatedPrincipalStatus: updateFederatedPrincipalStatusMock,
  revokeAllFederatedPrincipalsForRoom: revokeAllFederatedPrincipalsForRoomMock,
}));

vi.mock('../services/federation/signed-request.js', () => ({
  createSignedRequest: createSignedRequestMock,
  verifySignedRequestFromServer: verifySignedRequestFromServerMock,
  fetchPeerWellKnown: fetchPeerWellKnownMock,
  sendSignedRequestToPeer: sendSignedRequestToPeerMock,
  generateRequestId: generateRequestIdMock,
}));

vi.mock('../model/rooms/calls.js', () => ({
  getRoomById: getRoomByIdMock,
}));

vi.mock('../model/access_grants.js', () => ({
  parseAccessGrantId: parseAccessGrantIdMock,
  createAccessGrantId: vi.fn(),
  getAccessGrantById: vi.fn(),
}));

vi.mock('../env.js', () => ({
  env: {
    AUTH_SERVER_DOMAIN: 'server-a.com',
    AUTH_SERVER_URL: 'http://localhost:38101',
    SERVER_SECRET: 'test-secret-key-that-is-long-enough-for-jwt-hmac-32',
  },
}));

vi.mock('../middleware/jwt-auth.js', () => ({
  requireJwtAuth: async (c: Context, next: Next) => {
    c.set('roomIds', ['223e4567-e89b-12d3-a456-426614174001']);
    c.set('access_grant_id', 'admin-user-id|grant');
    await next();
  },
}));

// ─── Helpers ───────────────────────────────────────────────────────

function principal(overrides?: Record<string, unknown>) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    roomId: '223e4567-e89b-12d3-a456-426614174001',
    serverDomain: 'server-b.com',
    remoteUserId: 'user-on-b',
    accessLevel: 'write',
    invitedBy: 'admin-user-id',
    inviteStatus: 'pending',
    grantedAt: new Date('2026-05-30T00:00:00Z'),
    updatedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

const SAMPLE_PRINCIPAL = principal();
const ACCEPTED_PRINCIPAL = principal({ inviteStatus: 'accepted' });

// ─── Test setup ────────────────────────────────────────────────────

let app: Hono;

beforeEach(async () => {
  vi.clearAllMocks();
  const { federationRouter } = await import('./federation.js');
  app = new Hono();
  app.route('/api/federation', federationRouter);
});

// ─── Tests ─────────────────────────────────────────────────────────

describe('POST /api/federation/remote/invite', () => {
  it('returns 400 when token is missing', async () => {
    const res = await app.request('/api/federation/remote/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serverDomain: 'server-b.com' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when serverDomain is missing', async () => {
    const res = await app.request('/api/federation/remote/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'signed-token' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 403 when signed request verification fails', async () => {
    verifySignedRequestFromServerMock.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const res = await app.request('/api/federation/remote/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'bad-token',
        serverDomain: 'server-b.com',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 when action is not invite', async () => {
    verifySignedRequestFromServerMock.mockReturnValueOnce({
      action: 'accept',
      issuerDomain: 'server-a.com',
      roomId: 'room-1',
      remoteUserId: 'user-on-b',
      issuedAt: new Date().toISOString(),
      requestId: 'req-1',
    });

    const res = await app.request('/api/federation/remote/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'valid-token',
        serverDomain: 'server-a.com',
      }),
    });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('Unexpected action'),
    });
  });

  it('returns 200 and creates federated principal for valid signed invite', async () => {
    verifySignedRequestFromServerMock.mockReturnValueOnce({
      action: 'invite',
      issuerDomain: 'server-a.com',
      roomId: SAMPLE_PRINCIPAL.roomId,
      remoteUserId: SAMPLE_PRINCIPAL.remoteUserId,
      accessLevel: 'write',
      issuedAt: new Date().toISOString(),
      requestId: 'req-1',
    });
    createFederatedPrincipalMock.mockResolvedValueOnce(SAMPLE_PRINCIPAL);

    const res = await app.request('/api/federation/remote/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'valid-token',
        serverDomain: 'server-a.com',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, principalId: SAMPLE_PRINCIPAL.id });
  });

  it('returns 500 when creation fails', async () => {
    verifySignedRequestFromServerMock.mockReturnValueOnce({
      action: 'invite',
      issuerDomain: 'server-a.com',
      roomId: 'room-1',
      remoteUserId: 'user-on-b',
      accessLevel: 'read',
      issuedAt: new Date().toISOString(),
      requestId: 'req-2',
    });
    createFederatedPrincipalMock.mockRejectedValueOnce(new Error('DB error'));

    const res = await app.request('/api/federation/remote/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'valid-token',
        serverDomain: 'server-a.com',
      }),
    });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/federation/remote/accept', () => {
  it('returns 403 when signature is invalid', async () => {
    verifySignedRequestFromServerMock.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const res = await app.request('/api/federation/remote/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'bad-token',
        serverDomain: 'server-b.com',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 and updates principal to accepted', async () => {
    verifySignedRequestFromServerMock.mockReturnValueOnce({
      action: 'accept',
      issuerDomain: 'server-a.com',
      roomId: SAMPLE_PRINCIPAL.roomId,
      remoteUserId: SAMPLE_PRINCIPAL.remoteUserId,
      issuedAt: new Date().toISOString(),
      requestId: 'req-3',
    });
    getFederatedPrincipalMock.mockResolvedValueOnce(SAMPLE_PRINCIPAL);
    updateFederatedPrincipalStatusMock.mockResolvedValueOnce(
      ACCEPTED_PRINCIPAL
    );

    const res = await app.request('/api/federation/remote/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'valid-token',
        serverDomain: 'server-a.com',
      }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      principalId: SAMPLE_PRINCIPAL.id,
    });
    expect(updateFederatedPrincipalStatusMock).toHaveBeenCalledWith(
      SAMPLE_PRINCIPAL.id,
      'accepted'
    );
  });

  it('returns 404 when pending principal not found', async () => {
    verifySignedRequestFromServerMock.mockReturnValueOnce({
      action: 'accept',
      issuerDomain: 'server-a.com',
      roomId: 'unknown-room',
      remoteUserId: 'unknown-user',
      issuedAt: new Date().toISOString(),
      requestId: 'req-4',
    });
    getFederatedPrincipalMock.mockResolvedValueOnce(null);

    const res = await app.request('/api/federation/remote/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'valid-token',
        serverDomain: 'server-a.com',
      }),
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/federation/remote/revoke', () => {
  it('returns 200 even when principal not found (idempotent)', async () => {
    verifySignedRequestFromServerMock.mockReturnValueOnce({
      action: 'revoke',
      issuerDomain: 'server-a.com',
      roomId: 'room-x',
      remoteUserId: 'user-x',
      issuedAt: new Date().toISOString(),
      requestId: 'req-5',
    });
    getFederatedPrincipalMock.mockResolvedValueOnce(null);

    const res = await app.request('/api/federation/remote/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'valid-token',
        serverDomain: 'server-a.com',
      }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
  });

  it('returns 200 and updates principal status to revoked', async () => {
    verifySignedRequestFromServerMock.mockReturnValueOnce({
      action: 'revoke',
      issuerDomain: 'server-a.com',
      roomId: SAMPLE_PRINCIPAL.roomId,
      remoteUserId: SAMPLE_PRINCIPAL.remoteUserId,
      issuedAt: new Date().toISOString(),
      requestId: 'req-6',
    });
    getFederatedPrincipalMock.mockResolvedValueOnce(SAMPLE_PRINCIPAL);
    updateFederatedPrincipalStatusMock.mockResolvedValueOnce(
      principal({ inviteStatus: 'revoked' })
    );

    const res = await app.request('/api/federation/remote/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: 'valid-token',
        serverDomain: 'server-a.com',
      }),
    });
    expect(res.status).toBe(200);
    expect(updateFederatedPrincipalStatusMock).toHaveBeenCalledWith(
      SAMPLE_PRINCIPAL.id,
      'revoked'
    );
  });
});

describe('POST /api/federation/submit-invite', () => {
  beforeEach(() => {
    createSignedRequestMock.mockReturnValue({
      token: 'signed-jwt-token',
      serverDomain: 'server-a.com',
    });
    generateRequestIdMock.mockReturnValue('req-gen-1');
    sendSignedRequestToPeerMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, principalId: 'peer-principal-1' }),
    } as Response);
  });

  it('returns 400 for invalid body', async () => {
    const res = await app.request('/api/federation/submit-invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roomId: 'not-a-uuid' }),
    });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Invalid request',
    });
  });

  it('returns 403 when room is not in JWT room list', async () => {
    const res = await app.request('/api/federation/submit-invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roomId: '00000000-0000-0000-0000-000000000999',
        remoteUserId: 'user-on-b',
        remoteServerDomain: 'server-b.com',
        accessType: 'write',
      }),
    });
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid room' });
  });

  it('returns 404 when room does not exist', async () => {
    getRoomByIdMock.mockResolvedValueOnce(null);
    fetchPeerWellKnownMock.mockResolvedValueOnce({
      serverDomain: 'server-b.com',
      publicKey: 'key',
      federationApiUrl: 'https://server-b.com',
      hocuspocusUrl: 'wss://server-b.com',
    });

    const res = await app.request('/api/federation/submit-invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        roomId: '223e4567-e89b-12d3-a456-426614174001',
        remoteUserId: 'user-on-b',
        remoteServerDomain: 'server-b.com',
        accessType: 'write',
      }),
    });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/federation/principals/:roomId', () => {
  it('returns 403 when room is not in JWT list', async () => {
    const res = await app.request(
      '/api/federation/principals/00000000-0000-0000-0000-000000000999'
    );
    expect(res.status).toBe(403);
  });

  it('returns empty array when no federated principals', async () => {
    getFederatedPrincipalsByRoomMock.mockResolvedValueOnce([]);

    const res = await app.request(
      '/api/federation/principals/223e4567-e89b-12d3-a456-426614174001'
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([]);
  });

  it('returns federated principals formatted as records', async () => {
    getFederatedPrincipalsByRoomMock.mockResolvedValueOnce([SAMPLE_PRINCIPAL]);

    const res = await app.request(
      '/api/federation/principals/223e4567-e89b-12d3-a456-426614174001'
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual({
      id: SAMPLE_PRINCIPAL.id,
      roomId: SAMPLE_PRINCIPAL.roomId,
      serverDomain: SAMPLE_PRINCIPAL.serverDomain,
      remoteUserId: SAMPLE_PRINCIPAL.remoteUserId,
      accessLevel: SAMPLE_PRINCIPAL.accessLevel,
      invitedBy: SAMPLE_PRINCIPAL.invitedBy,
      inviteStatus: SAMPLE_PRINCIPAL.inviteStatus,
      grantedAt: SAMPLE_PRINCIPAL.grantedAt.toISOString(),
      updatedAt: null,
      revokedAt: null,
    });
  });
});

describe('secret-safe responses', () => {
  it('does not leak SERVER_SECRET in error responses', async () => {
    const res = await app.request(
      '/api/federation/principals/223e4567-e89b-12d3-a456-426614174001'
    );
    const text = await res.text();
    expect(text).not.toContain('test-secret-key');
    expect(text).not.toContain('SERVER_SECRET');
    expect(text).not.toContain('SECRET');
  });

  it('does not return stack traces in errors', async () => {
    const res = await app.request('/api/federation/remote/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const text = await res.text();
    expect(text).not.toContain('at ');
    expect(text).not.toContain('stack');
  });
});
