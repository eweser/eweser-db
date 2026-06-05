import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  downloadFile,
  getFileCacheStatus,
  getFileUrl,
  pinFile,
  unpinFile,
  uploadFile,
  type FileCacheAdapter,
} from './files.js';

function createMemoryCache() {
  const records = new Map<
    string,
    Awaited<ReturnType<FileCacheAdapter['get']>>
  >();
  const cache: FileCacheAdapter = {
    get: vi.fn(async (key) => records.get(key) ?? null),
    put: vi.fn(async (record) => {
      records.set(record.key, record);
    }),
    remove: vi.fn(async (key) => {
      records.delete(key);
    }),
  };
  return { cache, records };
}

async function fixtureHash(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

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

  it('prepares a direct upload and PUTs bytes to object storage', async () => {
    const differentFixtureHash = await fixtureHash(
      new Uint8Array([1, 2, 3, 4])
    );
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            attachment: {
              _id: 'attachment-1',
              _createdAt: new Date().toISOString(),
              _updatedAt: new Date().toISOString(),
              baseId: 'base-1',
              contentHash: differentFixtureHash,
              filename: 'file.png',
              mimeType: 'image/png',
              remoteObjectKey: `rooms/attachments/${differentFixtureHash}/file.png`,
              remoteProviderProfileId: 'railway-buckets',
              size: 4,
              sourcePath: 'Attachments/file.png',
            },
            upload: {
              headers: { 'content-type': 'image/png' },
              method: 'PUT',
              url: 'https://bucket.example.com/upload',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

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
      providerProfileId: 'railway-buckets',
    });

    expect(attachment.remoteObjectKey).toBe(
      `rooms/attachments/${differentFixtureHash}/file.png`
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://auth.example.com/api/files/prepare-upload'
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer grant-token'
    );
    expect(JSON.parse(init?.body as string)).toEqual({
      attachment: {
        baseId: 'base-1',
        contentHash: differentFixtureHash,
        filename: 'file.png',
        mimeType: 'image/png',
        size: 4,
        sourcePath: 'Attachments/file.png',
      },
      providerProfileId: 'railway-buckets',
      roomId: 'attachments-room',
    });
    expect(fetchMock.mock.calls[1]).toEqual(
      expect.arrayContaining([
        'https://bucket.example.com/upload',
        expect.objectContaining({
          headers: { 'content-type': 'image/png' },
          method: 'PUT',
        }),
      ])
    );
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
        remoteProviderProfileId: 'railway-buckets',
      },
      db: db as never,
      roomId: 'attachments-room',
    });

    expect(url).toBe(
      'https://bucket.example.com/rooms/attachments/hash/file.png'
    );
    expect(fetch).toHaveBeenCalledWith(
      'https://auth.example.com/api/files/presign?objectKey=rooms%2Fattachments%2Fhash%2Ffile.png&roomId=attachments-room&providerProfileId=railway-buckets',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('downloads, verifies, and caches bytes from a presigned url', async () => {
    const { cache } = createMemoryCache();
    const verifiedFixtureHash = await fixtureHash(new Uint8Array([9, 8, 7]));
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
        contentHash: verifiedFixtureHash,
        remoteObjectKey: 'rooms/attachments/hash/file.png',
        remoteProviderProfileId: 'railway-buckets',
      },
      cache,
      db: db as never,
      roomId: 'attachments-room',
    });

    expect(Array.from(bytes)).toEqual([9, 8, 7]);
    expect(cache.put).toHaveBeenCalledWith(
      expect.objectContaining({
        contentHash: verifiedFixtureHash,
        pinned: false,
      })
    );
  });

  it('returns cached bytes without fetching and can pin or unpin them', async () => {
    const { cache } = createMemoryCache();
    const verifiedFixtureHash = await fixtureHash(new Uint8Array([9, 8, 7]));
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
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
    const attachment = {
      contentHash: verifiedFixtureHash,
      remoteObjectKey: 'rooms/attachments/hash/file.png',
      remoteProviderProfileId: 'railway-buckets',
    };

    await pinFile({
      attachment,
      cache,
      db: db as never,
      roomId: 'attachments-room',
    });
    expect((await getFileCacheStatus({ attachment, cache })).pinned).toBe(true);

    fetchMock.mockClear();
    fetchMock.mockRejectedValue(new Error('should not fetch'));
    const cachedBytes = await downloadFile({
      attachment,
      cache,
      db: db as never,
      roomId: 'attachments-room',
    });
    expect(Array.from(cachedBytes)).toEqual([9, 8, 7]);
    expect(fetchMock).not.toHaveBeenCalled();

    await unpinFile({ attachment, cache });
    expect(await getFileCacheStatus({ attachment, cache })).toEqual(
      expect.objectContaining({ available: true, pinned: false })
    );
  });

  it('rejects downloads when content hash verification fails', async () => {
    const { cache } = createMemoryCache();
    const differentFixtureHash = await fixtureHash(
      new Uint8Array([1, 2, 3, 4])
    );
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

    await expect(
      downloadFile({
        attachment: {
          contentHash: differentFixtureHash,
          remoteObjectKey: 'rooms/attachments/hash/file.png',
          remoteProviderProfileId: 'railway-buckets',
        },
        cache,
        db: db as never,
        roomId: 'attachments-room',
      })
    ).rejects.toThrow('content hash verification');
    expect(cache.put).not.toHaveBeenCalled();
  });
});
