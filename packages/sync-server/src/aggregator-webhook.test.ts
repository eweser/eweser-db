import type { onChangePayload } from '@hocuspocus/server';
import * as Y from 'yjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAggregatorWebhookExtension } from './aggregator-webhook.js';

describe('createAggregatorWebhookExtension', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('posts serialized EweserDB document state to the aggregator after debounce', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const extension = createAggregatorWebhookExtension({
      debounceMs: 10,
      secret: 'webhook-secret',
      url: 'http://aggregator.local/webhooks/hocuspocus',
    });
    const sourceDoc = new Y.Doc();
    sourceDoc.getMap('documents').set('note1', {
      text: 'searchable aggregator payload',
    });

    await extension.onChange?.({
      context: {
        collectionKey: 'notes',
        publicAccess: 'read',
      },
      document: new Y.Doc(),
      documentName: 'room-1',
      instance: {
        documents: new Map(),
      },
      requestHeaders: {},
      requestParameters: new URLSearchParams(),
      update: Y.encodeStateAsUpdate(sourceDoc),
    } as onChangePayload);

    await vi.advanceTimersByTimeAsync(10);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string>; method: string },
    ];
    expect(url).toBe('http://aggregator.local/webhooks/hocuspocus');
    expect(init.method).toBe('POST');
    expect(init.headers['x-hocuspocus-signature-256']).toMatch(/^sha256=/);
    expect(JSON.parse(init.body)).toEqual({
      event: 'change',
      payload: {
        context: {
          collectionKey: 'notes',
          publicAccess: 'read',
        },
        document: {
          documents: {
            note1: { text: 'searchable aggregator payload' },
          },
        },
        documentName: 'room-1',
        requestHeaders: {},
        requestParameters: {},
      },
    });
  });

  it('merges multiple updates for the same room before posting', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const extension = createAggregatorWebhookExtension({
      debounceMs: 10,
      url: 'http://aggregator.local/webhooks/hocuspocus',
    });
    const firstDoc = new Y.Doc();
    firstDoc.getMap('documents').set('note1', {
      text: 'first aggregator payload',
    });
    const secondDoc = new Y.Doc();
    secondDoc.getMap('documents').set('note2', {
      text: 'second aggregator payload',
    });

    await extension.onChange?.({
      context: {
        collectionKey: 'notes',
        publicAccess: 'read',
      },
      document: new Y.Doc(),
      documentName: 'room-1',
      instance: {
        documents: new Map(),
      },
      requestHeaders: {},
      requestParameters: new URLSearchParams(),
      update: Y.encodeStateAsUpdate(firstDoc),
    } as onChangePayload);
    await extension.onChange?.({
      context: {
        collectionKey: 'notes',
        publicAccess: 'read',
      },
      document: new Y.Doc(),
      documentName: 'room-1',
      instance: {
        documents: new Map(),
      },
      requestHeaders: {},
      requestParameters: new URLSearchParams(),
      update: Y.encodeStateAsUpdate(secondDoc),
    } as onChangePayload);

    await vi.advanceTimersByTimeAsync(10);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string>; method: string },
    ];
    expect(url).toBe('http://aggregator.local/webhooks/hocuspocus');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      event: 'change',
      payload: {
        context: {
          collectionKey: 'notes',
          publicAccess: 'read',
        },
        document: {
          documents: {
            note1: { text: 'first aggregator payload' },
            note2: { text: 'second aggregator payload' },
          },
        },
        documentName: 'room-1',
        requestHeaders: {},
        requestParameters: {},
      },
    });
  });

  it('reports failed webhook posts through onError', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const onError = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const extension = createAggregatorWebhookExtension({
      debounceMs: 0,
      onError,
      url: 'http://aggregator.local/webhooks/hocuspocus',
    });

    await extension.onChange?.({
      context: {},
      document: new Y.Doc(),
      documentName: 'room-1',
      instance: {
        documents: new Map(),
      },
      requestHeaders: {},
      requestParameters: new URLSearchParams(),
      update: Y.encodeStateAsUpdate(new Y.Doc()),
    } as onChangePayload);

    await vi.advanceTimersByTimeAsync(0);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Aggregator webhook failed with HTTP 500',
      })
    );
  });
});
