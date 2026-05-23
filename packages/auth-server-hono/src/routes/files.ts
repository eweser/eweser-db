/**
 * Purpose: Attachment upload and signed-download routes for S3-compatible storage.
 * Exports: filesRouter.
 * Touches: Access-grant auth, room access checks, and object storage adapter.
 * Read before editing: packages/auth-server-hono/src/INDEX.md and AGENTS.md.
 */
import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { auth } from '../auth.js';
import { env } from '../env.js';
import { getRoomById } from '../model/rooms/calls.js';
import {
  buildAttachmentObjectKey,
  createDownloadUrl,
  getDownloadUrlTtlSeconds,
  getStorageProviderProfile,
  objectExists,
  objectKeyMatchesRoom,
  storageIsConfigured,
  uploadObject,
} from '../lib/storage.js';

const uploadAttachmentSchema = z.object({
  baseId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  parentNoteRefs: z.array(z.string()).optional(),
  size: z.number().int().nonnegative().optional(),
  sourcePath: z.string().min(1),
  sourceVault: z.string().min(1).optional(),
});

const presignQuerySchema = z.object({
  objectKey: z.string().min(1),
  providerProfileId: z.string().min(1).optional(),
  roomId: z.string().min(1),
});

type AccessGrantJWT = {
  access_grant_id: string;
  roomIds: string[];
};

type RouteActor =
  | {
      kind: 'grant';
      roomIds: string[];
    }
  | {
      kind: 'session';
      userId: string;
    };

export const filesRouter = new Hono();

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

async function resolveActor(request: Request): Promise<RouteActor | null> {
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (bearerToken) {
    try {
      const decoded = jwt.verify(
        bearerToken,
        env.SERVER_SECRET
      ) as AccessGrantJWT;
      return {
        kind: 'grant',
        roomIds: decoded.roomIds,
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

async function requireAttachmentRoomAccess(params: {
  actor: RouteActor;
  roomId: string;
  access: 'read' | 'write';
}) {
  const room = await getRoomById(params.roomId);
  if (!room || room._deleted) {
    return { error: 'Room not found', status: 404 as const };
  }

  if (room.collectionKey !== 'fileAttachments') {
    return { error: 'Invalid room', status: 400 as const };
  }

  if (params.actor.kind === 'grant') {
    if (!params.actor.roomIds.includes(params.roomId)) {
      return { error: 'Invalid room', status: 403 as const };
    }
    return { room };
  }

  const canRead =
    room.publicAccess === 'read' ||
    room.publicAccess === 'write' ||
    room.readAccess.includes(params.actor.userId) ||
    room.writeAccess.includes(params.actor.userId) ||
    room.adminAccess.includes(params.actor.userId);
  const canWrite =
    room.writeAccess.includes(params.actor.userId) ||
    room.adminAccess.includes(params.actor.userId);

  if (params.access === 'read' && !canRead) {
    return { error: 'Invalid room', status: 403 as const };
  }

  if (params.access === 'write' && !canWrite) {
    return { error: 'Invalid room', status: 403 as const };
  }

  return { room };
}

filesRouter.post('/upload', async (c) => {
  const actor = await resolveActor(c.req.raw);
  if (!actor) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const form = await c.req.formData();
  const roomId = form.get('roomId');
  const attachmentRaw = form.get('attachment');
  const providerProfileIdRaw = form.get('providerProfileId');
  const file = form.get('file');

  if (
    typeof roomId !== 'string' ||
    typeof attachmentRaw !== 'string' ||
    !(file instanceof File)
  ) {
    return c.json({ error: 'Invalid upload payload' }, 400);
  }
  const providerProfileId =
    typeof providerProfileIdRaw === 'string' && providerProfileIdRaw.length > 0
      ? providerProfileIdRaw
      : env.STORAGE_PROVIDER_PROFILE_ID;
  const storageError = storageProfileError(providerProfileId);
  if (storageError) {
    return c.json({ error: storageError.error }, storageError.status);
  }

  const access = await requireAttachmentRoomAccess({
    actor,
    roomId,
    access: 'write',
  });
  if ('error' in access) {
    return c.json({ error: access.error }, access.status);
  }

  let rawAttachment: unknown;
  try {
    rawAttachment = JSON.parse(attachmentRaw);
  } catch {
    return c.json({ error: 'Invalid attachment metadata' }, 400);
  }
  const parsedAttachment = uploadAttachmentSchema.safeParse(rawAttachment);
  if (!parsedAttachment.success) {
    return c.json({ error: 'Invalid attachment metadata' }, 400);
  }

  if (file.size > env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024) {
    return c.json({ error: 'File exceeds configured size limit' }, 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentHash = createHash('sha256').update(bytes).digest('hex');
  const objectKey = buildAttachmentObjectKey({
    roomId,
    contentHash,
    filename: parsedAttachment.data.filename || file.name,
  });

  if (!(await objectExists(objectKey, providerProfileId))) {
    await uploadObject({
      body: bytes,
      contentType:
        file.type ||
        parsedAttachment.data.mimeType ||
        'application/octet-stream',
      objectKey,
      providerProfileId,
    });
  }

  return c.json({
    attachment: {
      ...parsedAttachment.data,
      contentHash,
      localAvailability: 'unknown',
      mimeType:
        file.type ||
        parsedAttachment.data.mimeType ||
        'application/octet-stream',
      remoteObjectKey: objectKey,
      remoteProviderProfileId: providerProfileId,
      size: bytes.byteLength,
    },
  });
});

filesRouter.get('/presign', async (c) => {
  const actor = await resolveActor(c.req.raw);
  if (!actor) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const parsedQuery = presignQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: 'Invalid download request' }, 400);
  }
  const providerProfileId =
    parsedQuery.data.providerProfileId ?? env.STORAGE_PROVIDER_PROFILE_ID;
  const storageError = storageProfileError(providerProfileId);
  if (storageError) {
    return c.json({ error: storageError.error }, storageError.status);
  }

  const access = await requireAttachmentRoomAccess({
    actor,
    roomId: parsedQuery.data.roomId,
    access: 'read',
  });
  if ('error' in access) {
    return c.json({ error: access.error }, access.status);
  }

  if (
    !objectKeyMatchesRoom(parsedQuery.data.roomId, parsedQuery.data.objectKey)
  ) {
    return c.json({ error: 'Invalid object key' }, 400);
  }

  const url = await createDownloadUrl(
    parsedQuery.data.objectKey,
    providerProfileId
  );
  return c.json({
    expiresInSeconds: getDownloadUrlTtlSeconds(),
    objectKey: parsedQuery.data.objectKey,
    providerProfileId,
    roomId: parsedQuery.data.roomId,
    url,
  });
});

filesRouter.get('/download', async (c) => {
  const parsedQuery = presignQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: 'Invalid download request' }, 400);
  }
  const providerProfileId =
    parsedQuery.data.providerProfileId ?? env.STORAGE_PROVIDER_PROFILE_ID;
  const storageError = storageProfileError(providerProfileId);
  if (storageError) {
    return c.json({ error: storageError.error }, storageError.status);
  }

  const actor = await resolveActor(c.req.raw);
  if (!actor) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const access = await requireAttachmentRoomAccess({
    actor,
    roomId: parsedQuery.data.roomId,
    access: 'read',
  });
  if ('error' in access) {
    return c.json({ error: access.error }, access.status);
  }

  if (
    !objectKeyMatchesRoom(parsedQuery.data.roomId, parsedQuery.data.objectKey)
  ) {
    return c.json({ error: 'Invalid object key' }, 400);
  }

  const url = await createDownloadUrl(
    parsedQuery.data.objectKey,
    providerProfileId
  );
  return c.redirect(url, 302);
});

filesRouter.get('/provider-profile', async (c) => {
  const actor = await resolveActor(c.req.raw);
  if (!actor) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const profile = getStorageProviderProfile();
  if (!profile) {
    return c.json({ error: 'Storage provider profile unavailable' }, 404);
  }

  return c.json({ profile });
});
