import type { Doc, YMapEvent } from 'yjs';
import type { IndexedDocumentInput } from './db/upsert.js';

type ObserveDocumentsOptions = {
  roomId: string;
  collectionKey: string;
  userId?: string;
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
