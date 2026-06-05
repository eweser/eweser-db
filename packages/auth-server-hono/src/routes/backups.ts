/**
 * Purpose: User snapshot backup upload, listing, and signed download routes.
 * Exports: backupsRouter.
 * Touches: Access-grant/session auth, object storage, and backup snapshot metadata.
 * Read before editing: packages/auth-server-hono/src/INDEX.md and AGENTS.md.
 */
import { Hono, type Context } from 'hono';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { auth } from '../auth.js';
import { env } from '../env.js';
import { parseAccessGrantId } from '../model/access_grants.js';
import {
  getBackupSnapshotForActor,
  insertBackupSnapshot,
  listBackupSnapshots,
} from '../model/backup-snapshots.js';
import type { BackupSnapshot } from '../db/schema/backup_snapshots.js';
import {
  buildSnapshotObjectKey,
  createDownloadUrl,
  createUploadUrl,
  getDownloadUrlTtlSeconds,
  getStorageProviderProfile,
  objectExists,
  storageIsConfigured,
} from '../lib/storage.js';

const DEFAULT_RETENTION_DAYS = 90;
const SNAPSHOT_CONTENT_TYPE = 'application/vnd.eweser.snapshot+json';

const uploadMetadataSchema = z
  .object({
    documentCount: z.number().int().nonnegative(),
    filename: z.string().min(1).max(200).optional(),
    providerProfileId: z.string().min(1).optional(),
    retentionDays: z.number().int().positive().max(3650).optional(),
    roomCount: z.number().int().nonnegative(),
  })
  .strict();

const directUploadMetadataSchema = uploadMetadataSchema.extend({
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  filename: z.string().min(1).max(200),
  sizeBytes: z.number().int().nonnegative(),
});

const directUploadSchema = z
  .object({
    metadata: directUploadMetadataSchema,
    providerProfileId: z.string().min(1).optional(),
  })
  .strict();

type AccessGrantJWT = {
  access_grant_id: string;
  roomIds: string[];
};

type BackupActor =
  | {
      accessGrantId: string;
      kind: 'grant';
      userId: string;
    }
  | {
      kind: 'session';
      userId: string;
    };

export const backupsRouter = new Hono();

function storageProfileError(profileId: string | undefined) {
  const profile = getStorageProviderProfile(profileId);
  if (!profile) {
    return {
      error: 'Storage provider profile unavailable',
      status: 400 as const,
    };
  }
  if (!storageIsConfigured(profile.id)) {
    return { error: 'Object storage is not configured', status: 503 as const };
  }
  return null;
}

async function resolveActor(request: Request): Promise<BackupActor | null> {
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (bearerToken) {
    try {
      const decoded = jwt.verify(
        bearerToken,
        env.SERVER_SECRET
      ) as AccessGrantJWT;
      const { ownerId } = parseAccessGrantId(decoded.access_grant_id);
      if (!ownerId) return null;
      return {
        accessGrantId: decoded.access_grant_id,
        kind: 'grant',
        userId: ownerId,
      };
    } catch {
      return null;
    }
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return null;
  }

  return {
    kind: 'session',
    userId: session.user.id,
  };
}

function actorSnapshotScope(actor: BackupActor) {
  return {
    userId: actor.userId,
    ...(actor.kind === 'grant' ? { accessGrantId: actor.accessGrantId } : {}),
  };
}

function retentionExpiry(days = DEFAULT_RETENTION_DAYS): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function serializeSnapshot(snapshot: BackupSnapshot) {
  return {
    id: snapshot.id,
    accessGrantId: snapshot.accessGrantId,
    providerProfileId: snapshot.providerProfileId,
    objectKey: snapshot.objectKey,
    filename: snapshot.filename,
    contentHash: snapshot.contentHash,
    sizeBytes: snapshot.sizeBytes,
    roomCount: snapshot.roomCount,
    documentCount: snapshot.documentCount,
    retentionExpiresAt: snapshot.retentionExpiresAt?.toISOString() ?? null,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt?.toISOString() ?? null,
  };
}

backupsRouter.post('/upload', async (c) => {
  return c.json(
    {
      error:
        'Proxy backup uploads are disabled. Use /api/backups/prepare-upload and upload directly to object storage.',
    },
    410
  );
});

backupsRouter.post('/prepare-upload', async (c) => {
  const actor = await resolveActor(c.req.raw);
  if (!actor) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid snapshot upload payload' }, 400);
  }

  const parsedBody = directUploadSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Invalid snapshot upload payload' }, 400);
  }

  const providerProfileId =
    parsedBody.data.metadata.providerProfileId ??
    parsedBody.data.providerProfileId ??
    env.STORAGE_PROVIDER_PROFILE_ID;
  const storageError = storageProfileError(providerProfileId);
  if (storageError) {
    return c.json({ error: storageError.error }, storageError.status);
  }

  const metadata = parsedBody.data.metadata;
  if (metadata.sizeBytes > env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024) {
    return c.json({ error: 'Snapshot exceeds configured size limit' }, 413);
  }

  const objectKey = buildSnapshotObjectKey({
    contentHash: metadata.contentHash,
    filename: metadata.filename,
    userId: actor.userId,
  });
  const exists = await objectExists(objectKey, providerProfileId);

  return c.json({
    objectKey,
    providerProfileId,
    upload: exists
      ? null
      : {
          expiresInSeconds: getDownloadUrlTtlSeconds(),
          headers: {
            'content-type': SNAPSHOT_CONTENT_TYPE,
          },
          method: 'PUT',
          url: await createUploadUrl({
            contentType: SNAPSHOT_CONTENT_TYPE,
            objectKey,
            providerProfileId,
          }),
        },
  });
});

backupsRouter.post('/complete-upload', async (c) => {
  const actor = await resolveActor(c.req.raw);
  if (!actor) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid snapshot upload payload' }, 400);
  }

  const parsedBody = directUploadSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Invalid snapshot upload payload' }, 400);
  }

  const metadata = parsedBody.data.metadata;
  const providerProfileId =
    metadata.providerProfileId ??
    parsedBody.data.providerProfileId ??
    env.STORAGE_PROVIDER_PROFILE_ID;
  const storageError = storageProfileError(providerProfileId);
  if (storageError) {
    return c.json({ error: storageError.error }, storageError.status);
  }

  const objectKey = buildSnapshotObjectKey({
    contentHash: metadata.contentHash,
    filename: metadata.filename,
    userId: actor.userId,
  });

  if (!(await objectExists(objectKey, providerProfileId))) {
    return c.json({ error: 'Snapshot object was not uploaded' }, 409);
  }

  const created = await insertBackupSnapshot({
    userId: actor.userId,
    accessGrantId: actor.kind === 'grant' ? actor.accessGrantId : null,
    providerProfileId,
    objectKey,
    filename: metadata.filename,
    contentHash: metadata.contentHash,
    sizeBytes: metadata.sizeBytes,
    roomCount: metadata.roomCount,
    documentCount: metadata.documentCount,
    retentionExpiresAt: retentionExpiry(metadata.retentionDays),
  });

  return c.json({ snapshot: serializeSnapshot(created) });
});

async function listSnapshots(c: Context) {
  const actor = await resolveActor(c.req.raw);
  if (!actor) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const snapshots = await listBackupSnapshots(actorSnapshotScope(actor));
  return c.json({ snapshots: snapshots.map(serializeSnapshot) });
}

backupsRouter.get('/', listSnapshots);
backupsRouter.get('', listSnapshots);

backupsRouter.get('/:id/download-url', async (c) => {
  const actor = await resolveActor(c.req.raw);
  if (!actor) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return c.json({ error: 'Invalid snapshot id' }, 400);
  }

  const snapshot = await getBackupSnapshotForActor({
    ...actorSnapshotScope(actor),
    id,
  });
  if (!snapshot) {
    return c.json({ error: 'Snapshot not found' }, 404);
  }

  const storageError = storageProfileError(snapshot.providerProfileId);
  if (storageError) {
    return c.json({ error: storageError.error }, storageError.status);
  }

  const url = await createDownloadUrl(
    snapshot.objectKey,
    snapshot.providerProfileId
  );
  return c.json({
    expiresInSeconds: getDownloadUrlTtlSeconds(),
    snapshot: serializeSnapshot(snapshot),
    url,
  });
});
