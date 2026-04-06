import { createHmac, timingSafeEqual } from 'crypto';
import type { Context } from 'hono';
import type { IndexedDocumentInput } from './db/upsert.js';

type WebhookHandlerDeps = {
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

export function extractIndexableEvent(
  payload: unknown
): IndexedDocumentInput | null {
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

  const documentData =
    root?.documentData ??
    nestedPayload?.documentData ??
    root?.state ??
    nestedPayload?.state ??
    payload;

  if (!roomId || !collectionKey) {
    return null;
  }

  return {
    roomId,
    collectionKey,
    userId,
    documentData,
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

    await deps.upsert(event);
    return c.json({ status: 'indexed' }, 200);
  };
}
