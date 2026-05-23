import { Doc } from 'yjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AggregatorListener, observeRoomDocuments } from './listener.js';

vi.mock('@hocuspocus/provider', () => {
  const HocuspocusProvider = vi.fn(function (this: Record<string, unknown>) {
    this.on = vi.fn();
    this.destroy = vi.fn();
  });
  return { HocuspocusProvider };
});

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn().mockReturnValue('mock-token') },
}));

vi.mock('./env.js', () => ({
  env: {
    SYNC_SERVER_URL: 'ws://localhost:8080',
    SYNC_AUTH_SECRET: 'test-secret',
  },
}));

describe('observeRoomDocuments', () => {
  it('sends initial snapshot and update snapshots', () => {
    const onUpsert = vi.fn().mockResolvedValue(undefined);
    const doc = new Doc();

    const stopListening = observeRoomDocuments({
      roomId: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
      collectionKey: 'notes',
      userId: 'user-1',
      publicAccess: 'read',
      doc,
      onUpsert,
    });

    const documentsMap = doc.getMap('documents');
    documentsMap.set('draft', { title: 'Updated title' });

    expect(onUpsert).toHaveBeenCalledTimes(2);
    expect(onUpsert).toHaveBeenLastCalledWith({
      roomId: 'd7ea7353-f1fb-4af5-bc9c-37cfd9d6195b',
      collectionKey: 'notes',
      userId: 'user-1',
      publicAccess: 'read',
      documentData: { draft: { title: 'Updated title' } },
    });
    stopListening();
  });
});

describe('AggregatorListener', () => {
  let onUpsert: ReturnType<typeof vi.fn>;
  let listener: AggregatorListener;

  beforeEach(async () => {
    const { HocuspocusProvider } = await import('@hocuspocus/provider');
    vi.mocked(HocuspocusProvider).mockClear();
    onUpsert = vi.fn().mockResolvedValue(undefined);
    listener = new AggregatorListener({ onUpsert } as never);
  });

  it('creates a provider when listenToRoom is called', async () => {
    const { HocuspocusProvider } = await import('@hocuspocus/provider');

    listener.listenToRoom('room-1', 'notes');

    expect(HocuspocusProvider).toHaveBeenCalledOnce();
    expect(HocuspocusProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'ws://localhost:8080',
        name: 'room-1',
        token: 'mock-token',
      })
    );
  });

  it('does not create duplicate providers for the same room+collection', async () => {
    const { HocuspocusProvider } = await import('@hocuspocus/provider');

    listener.listenToRoom('room-1', 'notes');
    listener.listenToRoom('room-1', 'notes');

    expect(HocuspocusProvider).toHaveBeenCalledOnce();
  });

  it('creates separate providers for different rooms', async () => {
    const { HocuspocusProvider } = await import('@hocuspocus/provider');

    listener.listenToRoom('room-1', 'notes');
    listener.listenToRoom('room-2', 'notes');

    expect(HocuspocusProvider).toHaveBeenCalledTimes(2);
  });

  it('destroys the provider when stopListening is called', () => {
    listener.listenToRoom('room-1', 'notes');
    // grab the instance created by the constructor
    const instance = (
      listener as never as {
        providers: Map<string, { destroy: ReturnType<typeof vi.fn> }>;
      }
    ).providers.get('room-1:notes');
    listener.stopListening('room-1', 'notes');
    expect(instance?.destroy).toHaveBeenCalledOnce();
  });

  it('destroys all providers on destroy()', () => {
    listener.listenToRoom('room-1', 'notes');
    listener.listenToRoom('room-2', 'flashcards');
    const providers = (
      listener as never as {
        providers: Map<string, { destroy: ReturnType<typeof vi.fn> }>;
      }
    ).providers;
    const instances = [...providers.values()];
    listener.destroy();
    for (const inst of instances) {
      expect(inst.destroy).toHaveBeenCalledOnce();
    }
  });
});
