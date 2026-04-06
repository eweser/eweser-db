import { describe, expect, it, vi } from 'vitest';
import { generateShareRoomLink } from './generateShareRoomLink';
import type { Database } from '../..';

describe('generateShareRoomLink', () => {
  it('returns link from API response', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          href: 'https://app.example.com/notes?token=abc',
          host: 'app.example.com',
        },
      },
      configurable: true,
    });

    const db = {
      serverFetch: vi.fn().mockResolvedValue({
        data: { link: 'https://auth.example.com/invite?token=123' },
        error: null,
      }),
      error: vi.fn(),
    } as unknown as Database;

    const link = await generateShareRoomLink(db)({
      roomId: 'room-1',
      accessType: 'write',
      appName: 'Example App',
    });

    expect(db.serverFetch).toHaveBeenCalledWith(
      '/api/access-grant/create-room-invite',
      {
        body: expect.objectContaining({
          roomId: 'room-1',
          accessType: 'write',
          domain: 'app.example.com',
          redirect: 'https://app.example.com/notes',
          name: 'Example App',
        }),
        method: 'POST',
      }
    );
    expect(link).toBe('https://auth.example.com/invite?token=123');
  });

  it('returns error string when API call fails', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          href: 'https://app.example.com/notes',
          host: 'app.example.com',
        },
      },
      configurable: true,
    });

    const db = {
      serverFetch: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'forbidden' },
      }),
      error: vi.fn(),
    } as unknown as Database;

    const result = await generateShareRoomLink(db)({
      roomId: 'room-1',
      accessType: 'read',
      appName: 'Example App',
    });

    expect(db.error).toHaveBeenCalled();
    expect(result).toContain('forbidden');
  });
});
