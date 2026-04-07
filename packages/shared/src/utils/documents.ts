import type { YMapEvent, Transaction } from 'yjs';
import type * as Y from 'yjs';
import type { TypedMap } from 'yjs-types';
import type {
  CollectionKey,
  EweDocument,
  DocumentWithoutBase,
  DocumentBase,
} from '../collections';

/** Sets the metadata like created and updated for the doc */
export const newDocument = <T extends EweDocument>(
  _id: string,
  _ref: string,
  doc: DocumentWithoutBase<T>
): T => {
  const now = new Date().getTime();
  const base: DocumentBase = {
    _created: now,
    _id,
    _ref,
    _updated: now,
    _deleted: false,
  };
  return { ...base, ...doc } as T;
};

/**
 * @param collection e.g. `'flashcards'` "flashcards"
 * Params must be strings and cannot include `|`
 * @returns `${authServer}|${collectionKey}|${roomId}|${documentId}`
 * @example 'https://www.eweser.com|flashcards|room-id-uuid|doc-id-uuid'
 */
export const buildRef = (params: {
  collectionKey: CollectionKey;
  roomId: string;
  documentId: string | number;
  authServer: string;
}) => {
  Object.entries(params).forEach(([key, param]) => {
    if (!param) throw new Error(`${key} is required`);
    if (typeof param !== 'string') throw new Error(`${key} must be a string`);
    if (param.includes('|')) throw new Error(`${key} cannot include |`);
  });

  const { collectionKey, roomId, documentId, authServer } = params;
  return `${authServer}|${collectionKey}|${roomId}|${documentId}`;
};

export const randomString = (length: number) =>
  Math.random()
    .toString(36)
    .substring(2, length + 2);

export interface Documents<T extends EweDocument> {
  [documentId: string]: T;
}

export interface GetDocuments<T extends EweDocument> {
  documents: TypedMap<Documents<T>>;
  get: (id: string) => T | undefined;
  set: (doc: T) => T;
  new: (doc: DocumentWithoutBase<T>, id?: string) => T;
  delete: (id: string, timeToLiveMs?: number) => T;
  getAll: () => Documents<T>;
  getAllToArray: () => T[];
  getUndeleted: () => Documents<T>;
  getUndeletedToArray: () => T[];
  toArray: (docs: Documents<T>) => T[];
  onChange: (
    callback: (event: YMapEvent<Documents<T>>, transaction: Transaction) => void
  ) => void;
  sortByRecent: (docs: Documents<T>) => Documents<T>;
}

/**
 * Factory: returns document CRUD helpers scoped to a Y.Doc.
 * @param authServer - The auth server URL (used in buildRef)
 * @param collectionKey - The collection key for the room
 * @param roomId - The room ID
 */
export const getDocuments =
  (authServer: string, collectionKey: CollectionKey, roomId: string) =>
  <T extends EweDocument>(ydoc: Y.Doc): GetDocuments<T> => {
    const documents = ydoc.getMap('documents') as TypedMap<Documents<T>>;
    if (!documents) throw new Error('no documents');
    return {
      documents,
      get: (id: string) => {
        return documents.get(id);
      },
      set: (doc: T) => {
        const updated = { ...doc, _updated: Date.now() };
        return documents.set(doc._id, updated);
      },
      new: (doc: DocumentWithoutBase<T>, id?: string) => {
        if (id && documents.get(id)) {
          throw new Error('document already exists');
        }
        let documentId = id || randomString(24);
        if (documents.get(documentId)) {
          documentId = randomString(24);
          if (documents.get(documentId)) {
            throw new Error('document already exists');
          }
        }
        const ref = buildRef({ authServer, collectionKey, roomId, documentId });
        const newDoc = newDocument(documentId, ref, doc);
        documents.set(documentId, newDoc);
        return newDoc;
      },
      delete: (id: string, timeToLiveMs?: number) => {
        const doc = documents.get(id);
        if (!doc) throw new Error('document does not exist');
        const oneMonth = 1000 * 60 * 60 * 24 * 30;
        const updated = {
          ...doc,
          _deleted: true,
          _ttl: timeToLiveMs ?? new Date().getTime() + oneMonth,
        };
        return documents.set(id, updated);
      },
      getAll: () => {
        return documents.toJSON() as Documents<T>;
      },
      getAllToArray: () => {
        return Object.values(documents.toJSON());
      },
      getUndeleted: () => {
        const undeleted: Documents<T> = {};
        documents.forEach((doc) => {
          if (doc && !doc._deleted) {
            undeleted[doc._id] = doc;
          }
        });
        return undeleted;
      },
      getUndeletedToArray: () => {
        const undeleted: T[] = [];
        documents.forEach((doc) => {
          if (doc && !doc._deleted) {
            undeleted.push(doc);
          }
        });
        return undeleted;
      },
      toArray: (docs: Documents<T>) => {
        return Object.values(docs);
      },
      onChange: (
        callback: (
          event: YMapEvent<Documents<T>>,
          transaction: Transaction
        ) => void
      ) => {
        documents.observe(callback);
      },
      sortByRecent: (docs: Documents<T>): Documents<T> => {
        const sortedArray = Object.entries(docs).sort(
          (a, b) => b[1]._updated - a[1]._updated
        );
        return Object.fromEntries(sortedArray);
      },
    };
  };

export const getRoomDocuments = <T extends EweDocument>(
  ydoc: Y.Doc
): TypedMap<Documents<T>> => {
  return ydoc.getMap('documents') as TypedMap<Documents<T>>;
};
