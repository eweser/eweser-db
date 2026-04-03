import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchRouter } from './search.js';

describe('createSearchRouter', () => {
  const searchDocuments = vi.fn();
  const getDocumentsByRoom = vi.fn();
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route(
      '/api',
      createSearchRouter({
        searchDocuments,
        getDocumentsByRoom,
      })
    );
    vi.clearAllMocks();
  });

  it('returns validation error when q is missing', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/search')
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Missing required query parameter: q',
    });
  });

  it('returns search results for full-text query', async () => {
    searchDocuments.mockResolvedValueOnce([
      {
        id: '1',
        roomId: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
        collectionKey: 'notes',
        userId: 'user-1',
        documentData: { title: 'hello world' },
        updatedAt: new Date('2026-04-03T10:00:00.000Z'),
      },
    ]);

    const response = await app.fetch(
      new Request('http://localhost/api/search?q=hello&collection=notes')
    );

    expect(searchDocuments).toHaveBeenCalledWith({
      query: 'hello',
      collectionKey: 'notes',
    });
    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      results: [
        {
          id: '1',
          roomId: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
          collectionKey: 'notes',
          userId: 'user-1',
          documentData: { title: 'hello world' },
          updatedAt: '2026-04-03T10:00:00.000Z',
        },
      ],
    });
  });

  it('returns all documents by room id', async () => {
    getDocumentsByRoom.mockResolvedValueOnce([
      {
        id: '1',
        roomId: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
        collectionKey: 'notes',
        userId: 'user-1',
        documentData: { title: 'hello world' },
        updatedAt: new Date('2026-04-03T10:00:00.000Z'),
      },
    ]);

    const response = await app.fetch(
      new Request(
        'http://localhost/api/documents/d7ea7353-f1fb-4af5-bc9c-37cfd9d6195b'
      )
    );

    expect(getDocumentsByRoom).toHaveBeenCalledWith(
      'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b'
    );
    expect(response.status).toBe(200);
  });
});
