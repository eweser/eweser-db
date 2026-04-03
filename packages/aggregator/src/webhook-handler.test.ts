import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import {
  createWebhookHandler,
  extractIndexableEvent,
} from './webhook-handler.js';

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
});
