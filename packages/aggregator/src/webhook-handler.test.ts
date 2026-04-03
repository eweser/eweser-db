import { createHmac } from 'crypto';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import {
  createWebhookHandler,
  extractIndexableEvent,
  verifyHmacSignature,
} from './webhook-handler.js';

describe('verifyHmacSignature', () => {
  const secret = 'test-secret';
  const body = JSON.stringify({ roomId: 'abc', collectionKey: 'notes' });
  const validSig =
    'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  it('returns true for a valid signature', () => {
    expect(verifyHmacSignature(body, validSig, secret)).toBe(true);
  });

  it('returns false for a wrong signature', () => {
    expect(verifyHmacSignature(body, 'sha256=deadbeef', secret)).toBe(false);
  });

  it('returns false when signature is undefined', () => {
    expect(verifyHmacSignature(body, undefined, secret)).toBe(false);
  });
});

describe('extractIndexableEvent', () => {
  it('extracts payload fields from nested webhook body', () => {
    const event = extractIndexableEvent({
      payload: {
        documentName: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
        context: {
          collectionKey: 'notes',
          userId: 'user-1',
        },
        documentData: { title: 'hello' },
      },
    });

    expect(event).toEqual({
      roomId: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
      collectionKey: 'notes',
      userId: 'user-1',
      documentData: { title: 'hello' },
    });
  });

  it('returns null when required metadata is missing', () => {
    const event = extractIndexableEvent({
      payload: {
        userId: 'user-1',
      },
    });

    expect(event).toBeNull();
  });
});

describe('createWebhookHandler', () => {
  it('upserts document on webhook changes', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const app = new Hono();

    app.post('/webhooks/hocuspocus', createWebhookHandler({ upsert }));

    const response = await app.fetch(
      new Request('http://localhost/webhooks/hocuspocus', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roomId: '9f9b7fd2-10da-4c55-bd58-19e3e92465b3',
          collectionKey: 'notes',
          userId: 'user-1',
          documentData: { title: 'Draft' },
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'indexed' });
    expect(upsert).toHaveBeenCalledWith({
      roomId: '9f9b7fd2-10da-4c55-bd58-19e3e92465b3',
      collectionKey: 'notes',
      userId: 'user-1',
      documentData: { title: 'Draft' },
    });
  });

  it('returns 401 when secret is set and signature is missing', async () => {
    const upsert = vi.fn();
    const app = new Hono();
    app.post(
      '/webhooks/hocuspocus',
      createWebhookHandler({ upsert, secret: 'test-secret' })
    );

    const response = await app.fetch(
      new Request('http://localhost/webhooks/hocuspocus', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomId: 'abc', collectionKey: 'notes' }),
      })
    );

    expect(response.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('accepts request with valid HMAC signature', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const app = new Hono();
    const secret = 'test-secret';
    app.post('/webhooks/hocuspocus', createWebhookHandler({ upsert, secret }));

    const body = JSON.stringify({
      roomId: '9f9b7fd2-10da-4c55-bd58-19e3e92465b3',
      collectionKey: 'notes',
      documentData: { title: 'Draft' },
    });
    const sig =
      'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

    const response = await app.fetch(
      new Request('http://localhost/webhooks/hocuspocus', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-hocuspocus-signature-256': sig,
        },
        body,
      })
    );

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledOnce();
  });
});
