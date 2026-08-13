import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessGrant } from '../../model/access_grants.js';

const getAccessGrantByIdMock = vi.fn();
const createTokenFromAccessGrantMock = vi.fn();

vi.mock('../../model/access_grants.js', () => ({
  createAccessGrantId: (ownerId: string, requesterId: string) =>
    `${ownerId}|${requesterId}`,
  getAccessGrantById: getAccessGrantByIdMock,
}));

vi.mock('./create-token-from-grant.js', () => ({
  createTokenFromAccessGrant: createTokenFromAccessGrantMock,
}));

const { resolveExistingGrant, satisfies } =
  await import('./resolve-existing-grant.js');

function appGrant(overrides: Partial<AccessGrant> = {}): AccessGrant {
  return {
    collections: ['all'],
    createdAt: new Date('2026-08-10T12:00:00.000Z'),
    id: 'user-1|note.eweser.com',
    isValid: true,
    keepAliveDays: 7,
    ownerId: '00000000-0000-0000-0000-000000000001',
    requesterId: 'note.eweser.com',
    requesterType: 'app',
    roomIds: [],
    updatedAt: null,
    ...overrides,
  };
}

describe('resolveExistingGrant', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T12:00:00.000Z'));
    vi.clearAllMocks();
    createTokenFromAccessGrantMock.mockResolvedValue('fresh-token');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the current settings and a token bounded by remaining grant life', async () => {
    const grant = appGrant();
    getAccessGrantByIdMock.mockResolvedValue(grant);

    await expect(
      resolveExistingGrant('user-1', {
        collections: ['all'],
        domain: 'note.eweser.com',
        redirect: 'https://note.eweser.com/',
        roomIds: [],
      })
    ).resolves.toEqual({
      grant: { collections: ['all'], keepAliveDays: 7, roomIds: [] },
      satisfied: true,
      token: 'fresh-token',
    });
    expect(createTokenFromAccessGrantMock).toHaveBeenCalledWith(
      grant,
      'note.eweser.com',
      { expiresInSeconds: 6 * 24 * 60 * 60 }
    );
  });

  it('returns prior settings without a token when the grant expired', async () => {
    getAccessGrantByIdMock.mockResolvedValue(appGrant({ keepAliveDays: 1 }));

    await expect(
      resolveExistingGrant('user-1', {
        collections: ['all'],
        domain: 'note.eweser.com',
        redirect: 'https://note.eweser.com/',
        roomIds: [],
      })
    ).resolves.toEqual({
      grant: { collections: ['all'], keepAliveDays: 1, roomIds: [] },
      satisfied: false,
    });
    expect(createTokenFromAccessGrantMock).not.toHaveBeenCalled();
  });
});

describe('satisfies', () => {
  it('rejects redirects that do not use HTTP or HTTPS', () => {
    expect(
      satisfies(appGrant(), {
        collections: ['all'],
        domain: 'note.eweser.com',
        redirect: 'javascript://note.eweser.com/callback',
        roomIds: [],
      })
    ).toBe(false);
  });
});
