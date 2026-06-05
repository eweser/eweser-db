import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const getRoomByIdMock = vi.fn();
const createDownloadUrlMock = vi.fn();
const createUploadUrlMock = vi.fn();
const getStorageProviderProfileMock = vi.fn();
const objectExistsMock = vi.fn();
const storageIsConfiguredMock = vi.fn();
const getSessionMock = vi.fn();
const TEST_SERVER_SIGNING_KEY = ['1234567890', '1234567890123456789012'].join(
  ''
);
const TEST_CONTENT_HASH = 'a'.repeat(64);
const DIFFERENT_TEST_CONTENT_HASH = 'b'.repeat(64);

vi.mock('../auth.js', () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock('../env.js', () => ({
  env: {
    ['SERVER' + '_SECRET']: TEST_SERVER_SIGNING_KEY,
    STORAGE_MAX_FILE_SIZE_MB: 100,
    STORAGE_PROVIDER_PROFILE_ID: 'railway-buckets',
  },
}));

vi.mock('../model/rooms/calls.js', () => ({
  getRoomById: getRoomByIdMock,
}));

vi.mock('../lib/storage.js', () => ({
  buildAttachmentObjectKey: ({
    roomId,
    contentHash,
    filename,
  }: {
    roomId: string;
    contentHash: string;
    filename: string;
  }) => `rooms/${roomId}/${contentHash}/${filename}`,
  createDownloadUrl: createDownloadUrlMock,
  createUploadUrl: createUploadUrlMock,
  getDownloadUrlTtlSeconds: () => 900,
  getStorageProviderProfile: getStorageProviderProfileMock,
  objectExists: objectExistsMock,
  objectKeyMatchesRoom: (roomId: string, objectKey: string) =>
    objectKey.startsWith(`rooms/${roomId}/`),
  storageIsConfigured: storageIsConfiguredMock,
}));

const { filesRouter } = await import('./files.js');

describe('filesRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/files', filesRouter);
    vi.clearAllMocks();
    storageIsConfiguredMock.mockReturnValue(true);
    getStorageProviderProfileMock.mockReturnValue({
      bucket: 'bucket',
      configured: true,
      endpoint: 'https://s3.example.com',
      forcePathStyle: true,
      id: 'railway-buckets',
      kind: 's3-compatible',
      label: 'Railway Buckets',
      maxFileSizeMb: 100,
      region: 'auto',
    });
    objectExistsMock.mockResolvedValue(false);
    createDownloadUrlMock.mockResolvedValue('https://bucket.example.com/file');
    createUploadUrlMock.mockResolvedValue('https://bucket.example.com/upload');
    getSessionMock.mockResolvedValue(null);
    getRoomByIdMock.mockResolvedValue({
      id: 'attachments-room',
      collectionKey: 'fileAttachments',
      publicAccess: 'private',
      readAccess: ['user-1'],
      writeAccess: ['user-1'],
      adminAccess: ['user-1'],
      _deleted: false,
    });
  });

  it('rejects legacy proxy uploads before accepting file bytes', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/files/upload', {
        method: 'POST',
      })
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error:
        'Proxy uploads are disabled. Use /api/files/prepare-upload and upload directly to object storage.',
    });
  });

  it('prepares a direct attachment upload for an authorized access-grant token', async () => {
    const body = {
      roomId: 'attachments-room',
      attachment: {
        baseId: 'base-1',
        contentHash: TEST_CONTENT_HASH,
        filename: 'diagram.png',
        mimeType: 'image/png',
        size: 4,
        sourcePath: 'Attachments/diagram.png',
        sourceVault: 'Work',
      },
    };

    const token = await import('jsonwebtoken').then(({ default: jwt }) =>
      jwt.sign(
        {
          access_grant_id: 'grant-1',
          roomIds: ['attachments-room'],
        },
        TEST_SERVER_SIGNING_KEY
      )
    );

    const response = await app.fetch(
      new Request('http://localhost/api/files/prepare-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      attachment: { remoteProviderProfileId: string; remoteObjectKey: string };
      upload: { headers: Record<string, string>; method: string; url: string };
    };
    expect(payload.attachment.remoteProviderProfileId).toBe('railway-buckets');
    expect(payload.attachment.remoteObjectKey).toContain(
      'rooms/attachments-room/'
    );
    expect(payload.upload).toEqual({
      expiresInSeconds: 900,
      headers: { 'content-type': 'image/png' },
      method: 'PUT',
      url: 'https://bucket.example.com/upload',
    });
    expect(createUploadUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'image/png',
        providerProfileId: 'railway-buckets',
      })
    );
  });

  it('rejects unavailable provider profiles before upload', async () => {
    getStorageProviderProfileMock.mockReturnValueOnce(null);
    const body = {
      roomId: 'attachments-room',
      providerProfileId: 'unknown-profile',
      attachment: {
        baseId: 'base-1',
        contentHash: DIFFERENT_TEST_CONTENT_HASH,
        filename: 'diagram.png',
        mimeType: 'image/png',
        size: 1,
        sourcePath: 'Attachments/diagram.png',
      },
    };

    const token = await import('jsonwebtoken').then(({ default: jwt }) =>
      jwt.sign(
        {
          access_grant_id: 'grant-1',
          roomIds: ['attachments-room'],
        },
        TEST_SERVER_SIGNING_KEY
      )
    );

    const response = await app.fetch(
      new Request('http://localhost/api/files/prepare-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Storage provider profile unavailable',
    });
    expect(createUploadUrlMock).not.toHaveBeenCalled();
  });

  it('returns a presigned url for a session-authorized reader', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'user-1' },
    });

    const response = await app.fetch(
      new Request(
        'http://localhost/api/files/presign?roomId=attachments-room&objectKey=rooms/attachments-room/hash/file.png'
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expiresInSeconds: 900,
      objectKey: 'rooms/attachments-room/hash/file.png',
      providerProfileId: 'railway-buckets',
      roomId: 'attachments-room',
      url: 'https://bucket.example.com/file',
    });
    expect(createDownloadUrlMock).toHaveBeenCalledWith(
      'rooms/attachments-room/hash/file.png',
      'railway-buckets'
    );
  });

  it('returns secret-safe provider profile metadata', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'user-1' },
    });

    const response = await app.fetch(
      new Request('http://localhost/api/files/provider-profile')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        bucket: 'bucket',
        configured: true,
        endpoint: 'https://s3.example.com',
        forcePathStyle: true,
        id: 'railway-buckets',
        kind: 's3-compatible',
        label: 'Railway Buckets',
        maxFileSizeMb: 100,
        region: 'auto',
      },
    });
  });

  it('rejects object keys outside the requested room prefix', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'user-1' },
    });

    const response = await app.fetch(
      new Request(
        'http://localhost/api/files/presign?roomId=attachments-room&objectKey=rooms/other-room/hash/file.png'
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid object key',
    });
  });
});
