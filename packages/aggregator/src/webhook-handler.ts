import { createHmac, timingSafeEqual } from 'crypto';
import type { Context } from 'hono';
import type { IndexedDocumentInput } from './db/upsert.js';

type WebhookHandlerDeps = {
  remove: (roomId: string, collectionKey?: string | undefined) => Promise<void>;
  upsert: (input: IndexedDocumentInput) => Promise<void>;
  secret?: string | undefined;
};

export function verifyHmacSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;
  const expected =
    'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as JsonRecord;
}

function readString(
  record: JsonRecord | undefined,
  key: string
): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isPublicAccess(
  value: string | undefined
): value is IndexedDocumentInput['publicAccess'] {
  return value === 'read' || value === 'write';
}

function isDeletedDocument(value: unknown): boolean {
  const record = asRecord(value);
  return record?._deleted === true;
}

function withoutDeletedEntries(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;

  const next: JsonRecord = {};
  for (const [key, entry] of Object.entries(record)) {
    if (isDeletedDocument(entry)) continue;
    next[key] = entry;
  }
  return next;
}

function readWebhookDocumentData(params: {
  root: JsonRecord | undefined;
  nestedPayload: JsonRecord | undefined;
  payload: unknown;
}): unknown {
  const document =
    params.root?.document ?? params.nestedPayload?.document ?? undefined;
  const documentRecord = asRecord(document);

  return (
    params.root?.documentData ??
    params.nestedPayload?.documentData ??
    params.root?.state ??
    params.nestedPayload?.state ??
    documentRecord?.documents ??
    document ??
    params.payload
  );
}

export function extractIndexableEvent(
  payload: unknown
): (IndexedDocumentInput & { shouldDelete: boolean }) | null {
  const root = asRecord(payload);
  const nestedPayload = asRecord(root?.payload);
  const context = asRecord(root?.context) ?? asRecord(nestedPayload?.context);

  const roomId =
    readString(root, 'roomId') ??
    readString(root, 'documentName') ??
    readString(nestedPayload, 'roomId') ??
    readString(nestedPayload, 'documentName');

  const collectionKey =
    readString(root, 'collectionKey') ??
    readString(context, 'collectionKey') ??
    readString(nestedPayload, 'collectionKey');

  const userId =
    readString(root, 'userId') ??
    readString(context, 'userId') ??
    readString(nestedPayload, 'userId');

  const publicAccess =
    readString(root, 'publicAccess') ??
    readString(context, 'publicAccess') ??
    readString(nestedPayload, 'publicAccess');

  const documentData = readWebhookDocumentData({
    root,
    nestedPayload,
    payload,
  });

  if (!roomId || !collectionKey) {
    return null;
  }

  const shouldDelete =
    !isPublicAccess(publicAccess) || isDeletedDocument(documentData);

  return {
    roomId,
    collectionKey,
    userId,
    publicAccess: isPublicAccess(publicAccess) ? publicAccess : 'read',
    documentData: withoutDeletedEntries(documentData),
    shouldDelete,
  };
}

export function createWebhookHandler(deps: WebhookHandlerDeps) {
  return async function webhookHandler(c: Context) {
    let payload: unknown;

    if (deps.secret) {
      let rawBody: string;
      try {
        rawBody = await c.req.text();
      } catch {
        return c.json({ error: 'Failed to read request body' }, 400);
      }

      const sig = c.req.header('x-hocuspocus-signature-256');
      if (!verifyHmacSignature(rawBody, sig, deps.secret)) {
        return c.json({ error: 'Invalid signature' }, 401);
      }

      try {
        payload = JSON.parse(rawBody) as unknown;
      } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
      }
    } else {
      try {
        payload = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
      }
    }

    const event = extractIndexableEvent(payload);
    if (!event) {
      return c.json(
        { error: 'Missing roomId/documentName or collectionKey' },
        400
      );
    }

    if (event.shouldDelete) {
      await deps.remove(event.roomId, event.collectionKey);
      return c.json({ status: 'deindexed' }, 200);
    }

    await deps.upsert({
      roomId: event.roomId,
      collectionKey: event.collectionKey,
      userId: event.userId,
      publicAccess: event.publicAccess,
      documentData: event.documentData,
    });
    return c.json({ status: 'indexed' }, 200);
  };
}
