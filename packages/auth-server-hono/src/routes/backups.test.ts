import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const createDownloadUrlMock = vi.fn();
const createUploadUrlMock = vi.fn();
const getStorageProviderProfileMock = vi.fn();
const objectExistsMock = vi.fn();
const storageIsConfiguredMock = vi.fn();
const getSessionMock = vi.fn();
const insertBackupSnapshotMock = vi.fn();
const listBackupSnapshotsMock = vi.fn();
const getBackupSnapshotForActorMock = vi.fn();
const TEST_SERVER_SIGNING_KEY = ['1234567890', '1234567890123456789012'].join(
  ''
);
const TEST_CONTENT_HASH = 'a'.repeat(64);

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

vi.mock('../lib/storage.js', () => ({
  buildSnapshotObjectKey: ({
    userId,
    contentHash,
    filename,
  }: {
    userId: string;
    contentHash: string;
    filename: string;
  }) => `backups/${userId}/${contentHash}/${filename}`,
  createDownloadUrl: createDownloadUrlMock,
  createUploadUrl: createUploadUrlMock,
  getDownloadUrlTtlSeconds: () => 900,
  getStorageProviderProfile: getStorageProviderProfileMock,
  objectExists: objectExistsMock,
  storageIsConfigured: storageIsConfiguredMock,
}));

vi.mock('../model/backup-snapshots.js', () => ({
  getBackupSnapshotForActor: getBackupSnapshotForActorMock,
  insertBackupSnapshot: insertBackupSnapshotMock,
  listBackupSnapshots: listBackupSnapshotsMock,
}));

const { backupsRouter } = await import('./backups.js');

function snapshotRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '58e14414-8fa6-4c31-86f1-bf78fc153a2b',
    accessGrantId: 'user-1|app.local',
    providerProfileId: 'railway-buckets',
    objectKey: 'backups/user-1/hash/snapshot.json',
    filename: 'snapshot.json',
    contentHash: 'hash',
    sizeBytes: 100,
    roomCount: 1,
    documentCount: 2,
    retentionExpiresAt: null,
    createdAt: new Date('2026-05-19T00:00:00.000Z'),
    updatedAt: null,
    ...overrides,
  };
}

async function accessGrantToken() {
  return await import('jsonwebtoken').then(({ default: jwt }) =>
    jwt.sign(
      {
        access_grant_id: 'user-1|app.local',
        roomIds: ['room-1'],
      },
      TEST_SERVER_SIGNING_KEY
    )
  );
}

describe('backupsRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/backups', backupsRouter);
    app.route('/api/backups/', backupsRouter);
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
    createDownloadUrlMock.mockResolvedValue(
      'https://bucket.example.com/snapshot'
    );
    createUploadUrlMock.mockResolvedValue(
      'https://bucket.example.com/snapshot-upload'
    );
    getSessionMock.mockResolvedValue(null);
    insertBackupSnapshotMock.mockResolvedValue(snapshotRow());
    listBackupSnapshotsMock.mockResolvedValue([snapshotRow()]);
    getBackupSnapshotForActorMock.mockResolvedValue(snapshotRow());
  });

  it('rejects legacy proxy snapshot uploads', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/backups/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await accessGrantToken()}`,
        },
      })
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error:
        'Proxy backup uploads are disabled. Use /api/backups/prepare-upload and upload directly to object storage.',
    });
  });

  it('prepares and completes a direct snapshot upload for an access-grant actor', async () => {
    const metadata = {
      contentHash: TEST_CONTENT_HASH,
      documentCount: 2,
      filename: 'snapshot.json',
      roomCount: 1,
      sizeBytes: 100,
    };

    const response = await app.fetch(
      new Request('http://localhost/api/backups/prepare-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await accessGrantToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      objectKey: `backups/user-1/${metadata.contentHash}/snapshot.json`,
      providerProfileId: 'railway-buckets',
      upload: {
        expiresInSeconds: 900,
        headers: {
          'content-type': 'application/vnd.eweser.snapshot+json',
        },
        method: 'PUT',
        url: 'https://bucket.example.com/snapshot-upload',
      },
    });
    expect(createUploadUrlMock).toHaveBeenCalledWith({
      contentType: 'application/vnd.eweser.snapshot+json',
      objectKey: `backups/user-1/${metadata.contentHash}/snapshot.json`,
      providerProfileId: 'railway-buckets',
    });

    objectExistsMock.mockResolvedValueOnce(true);
    const completeResponse = await app.fetch(
      new Request('http://localhost/api/backups/complete-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await accessGrantToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata }),
      })
    );

    expect(completeResponse.status).toBe(200);
    const body = await completeResponse.json();
    expect(body.snapshot.id).toBe('58e14414-8fa6-4c31-86f1-bf78fc153a2b');
    expect(insertBackupSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accessGrantId: 'user-1|app.local',
        contentHash: metadata.contentHash,
        documentCount: 2,
        objectKey: `backups/user-1/${metadata.contentHash}/snapshot.json`,
        providerProfileId: 'railway-buckets',
        userId: 'user-1',
      })
    );
  });

  it('lists snapshots for the signed-in session user', async () => {
    getSessionMock.mockResolvedValue({
      user: { id: 'user-1' },
    });

    const response = await app.fetch(
      new Request('http://localhost/api/backups/')
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.snapshots).toHaveLength(1);
    expect(listBackupSnapshotsMock).toHaveBeenCalledWith({ userId: 'user-1' });
  });

  it('returns a signed download url for an owned snapshot', async () => {
    const response = await app.fetch(
      new Request(
        'http://localhost/api/backups/58e14414-8fa6-4c31-86f1-bf78fc153a2b/download-url',
        {
          headers: {
            Authorization: `Bearer ${await accessGrantToken()}`,
          },
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expiresInSeconds: 900,
      snapshot: expect.objectContaining({
        id: '58e14414-8fa6-4c31-86f1-bf78fc153a2b',
      }),
      url: 'https://bucket.example.com/snapshot',
    });
    expect(getBackupSnapshotForActorMock).toHaveBeenCalledWith({
      accessGrantId: 'user-1|app.local',
      id: '58e14414-8fa6-4c31-86f1-bf78fc153a2b',
      userId: 'user-1',
    });
  });

  it('rejects unavailable provider profiles before upload', async () => {
    getStorageProviderProfileMock.mockReturnValueOnce(null);

    const response = await app.fetch(
      new Request('http://localhost/api/backups/prepare-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await accessGrantToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            contentHash: TEST_CONTENT_HASH,
            documentCount: 2,
            filename: 'snapshot.json',
            roomCount: 1,
            sizeBytes: 1,
          },
          providerProfileId: 'unknown-profile',
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Storage provider profile unavailable',
    });
    expect(createUploadUrlMock).not.toHaveBeenCalled();
  });

  it('rejects unused snapshot creation-time metadata', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/backups/prepare-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await accessGrantToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            contentHash: TEST_CONTENT_HASH,
            createdAt: '2026-05-19T00:00:00.000Z',
            documentCount: 2,
            filename: 'snapshot.json',
            roomCount: 1,
            sizeBytes: 1,
          },
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid snapshot upload payload',
    });
    expect(createUploadUrlMock).not.toHaveBeenCalled();
  });
});
