import { HocuspocusProvider } from '@hocuspocus/provider';
import jwt from 'jsonwebtoken';
import type { Doc, YMapEvent } from 'yjs';
import * as Y from 'yjs';
import type { IndexedDocumentInput } from './db/upsert.js';
import { env } from './env.js';

type ObserveDocumentsOptions = {
  roomId: string;
  collectionKey: string;
  userId?: string;
  publicAccess: 'read' | 'write';
  doc: Doc;
  onUpsert: (input: IndexedDocumentInput) => Promise<void>;
};

export function observeRoomDocuments(options: ObserveDocumentsOptions) {
  const documentsMap = options.doc.getMap('documents');

  const sendSnapshot = async () => {
    await options.onUpsert({
      roomId: options.roomId,
      collectionKey: options.collectionKey,
      userId: options.userId,
      publicAccess: options.publicAccess,
      documentData: documentsMap.toJSON(),
    });
  };

  const observer = (_event: YMapEvent<unknown>) => {
    void sendSnapshot();
  };

  void sendSnapshot();
  documentsMap.observe(observer);

  return () => {
    documentsMap.unobserve(observer);
  };
}

export class AggregatorListener {
  private providers = new Map<string, HocuspocusProvider>();

  constructor(
    private deps: {
      onUpsert: (input: IndexedDocumentInput) => Promise<void>;
    }
  ) {}

  public listenToRoom(roomId: string, collectionKey: string, userId?: string) {
    const key = `${roomId}:${collectionKey}`;
    if (this.providers.has(key)) return;

    const doc = new Y.Doc();
    const token = jwt.sign(
      {
        roomId,
        collectionKey,
        publicAccess: 'read',
        ...(userId !== undefined ? { userId } : {}),
      },
      env.SYNC_AUTH_SECRET,
      { expiresIn: '1h' }
    );
    const provider = new HocuspocusProvider({
      url: env.SYNC_SERVER_URL,
      name: roomId,
      document: doc,
      token,
    });

    const cleanup = observeRoomDocuments({
      roomId,
      collectionKey,
      ...(userId !== undefined ? { userId } : {}),
      publicAccess: 'read',
      doc,
      onUpsert: this.deps.onUpsert,
    });

    provider.on('destroy', () => {
      cleanup();
    });

    this.providers.set(key, provider);
  }

  public stopListening(roomId: string, collectionKey: string) {
    const key = `${roomId}:${collectionKey}`;
    const provider = this.providers.get(key);
    if (provider) {
      provider.destroy();
      this.providers.delete(key);
    }
  }

  public destroy() {
    for (const provider of this.providers.values()) {
      provider.destroy();
    }
    this.providers.clear();
  }
}
