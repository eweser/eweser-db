// @vitest-environment jsdom
import type { Database } from '@eweser/db';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGetUserFromDb } from './user';

describe('useGetUserFromDb', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads name and email through the access-grant identity endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            email: 'test@example.com',
            image: 'https://images.example/avatar.png',
            name: 'Test User',
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const database = {
      authServer: 'https://auth.example.com',
      getRooms: vi.fn(() => []),
      getToken: vi.fn(() => 'test-access-grant-token'),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Database;

    const hook = renderHook(() => useGetUserFromDb(database, true));

    await waitFor(() => {
      expect(hook.result.current).toEqual({
        avatar: 'https://images.example/avatar.png',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth.example.com/api/account/identity',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-access-grant-token' },
        referrerPolicy: 'no-referrer',
      })
    );
  });
});
