import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFile, getFileUrl, uploadFile } from './files.js';

describe('file helpers', () => {
  const getToken = vi.fn(() => 'grant-token');
  const db = {
    authServer: 'https://auth.example.com',
    getToken,
  };

  beforeEach(() => {
    getToken.mockClear();
    vi.restoreAllMocks();
  });

  it('uploads multipart form data to the auth server', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          attachment: {
            _id: 'attachment-1',
            _createdAt: new Date().toISOString(),
            _updatedAt: new Date().toISOString(),
            baseId: 'base-1',
            contentHash: 'hash',
            filename: 'file.png',
            mimeType: 'image/png',
            remoteObjectKey: 'rooms/attachments/hash/file.png',
            remoteProviderProfileId: 'railway-buckets',
            size: 4,
            sourcePath: 'Attachments/file.png',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const attachment = await uploadFile({
      db: db as never,
      file: new Uint8Array([1, 2, 3, 4]),
      metadata: {
        baseId: 'base-1',
        filename: 'file.png',
        mimeType: 'image/png',
        size: 4,
        sourcePath: 'Attachments/file.png',
      },
      roomId: 'attachments-room',
    });

    expect(attachment.remoteObjectKey).toBe('rooms/attachments/hash/file.png');
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://auth.example.com/api/files/upload'
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer grant-token'
    );
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it('requests a presigned url for a remote attachment', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          url: 'https://bucket.example.com/rooms/attachments/hash/file.png',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const url = await getFileUrl({
      attachment: {
        remoteObjectKey: 'rooms/attachments/hash/file.png',
      },
      db: db as never,
      roomId: 'attachments-room',
    });

    expect(url).toBe(
      'https://bucket.example.com/rooms/attachments/hash/file.png'
    );
  });

  it('downloads bytes from a presigned url', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: 'https://bucket.example.com/rooms/attachments/hash/file.png',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([9, 8, 7]).buffer, { status: 200 })
      );

    const bytes = await downloadFile({
      attachment: {
        remoteObjectKey: 'rooms/attachments/hash/file.png',
      },
      db: db as never,
      roomId: 'attachments-room',
    });

    expect(Array.from(bytes)).toEqual([9, 8, 7]);
  });
});
