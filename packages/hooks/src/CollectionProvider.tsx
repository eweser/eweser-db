import { createContext, FC, ReactNode } from 'react';

import { CollectionKey, DocumentBase, Document } from '@eweser/db';
import type { IDatabase } from '@eweser/db/types/types';
import useCollection from './useCollection';
import { useSyncedStore } from '@syncedstore/react';
// import * as Y from 'yjs';
type CollectionData = {
  collectionKey: CollectionKey;
  aliasKey: string;
  name?: string;
};

type CollectionProviderProps = CollectionData & {
  children: ReactNode;
  db: IDatabase;
  FailComponent?: () => JSX.Element;
  LoadingComponent?: () => JSX.Element;
};

interface CollectionContext {
  store: {
    documents: any;
  };
  /** if not provided an id, uses the length of the collection's documents */
  newDocument: <T>(doc: T, id?: string | undefined) => DocumentBase<T>;
  /** only updates the document to the db, and updates the document's `_updated` field if changes are detected */
  updateDocument: <T = Document>(fields: Partial<T>, docId: string) => void;
}

const initialCollection: CollectionContext = {
  store: { documents: {} },
  newDocument: (() => {}) as any,
  updateDocument: (() => {}) as any,
};

export const CollectionContext = createContext<CollectionContext>(initialCollection);

/** Don't call `useSyncedStore` until the store is ready */
const WithSyncedStore = ({
  children,
  store,
  ...props
}: CollectionContext & { children: ReactNode }) => {
  const syncedStore = useSyncedStore(store);
  return (
    <CollectionContext.Provider value={{ store: syncedStore, ...props }}>
      {children}
    </CollectionContext.Provider>
  );
};

export default WithSyncedStore;

export const CollectionProvider: FC<CollectionProviderProps> = ({
  children,
  collectionKey,
  name,
  aliasKey,
  db,
  FailComponent,
  LoadingComponent,
}) => {
  const { store, connectStatus, newDocument, updateDocument } = useCollection(db, {
    collectionKey,
    name,
    aliasKey,
  });

  if (connectStatus === 'failed')
    return FailComponent ? <FailComponent /> : <div>Failed to connect</div>;
  else if (connectStatus !== 'ok' || !store)
    return LoadingComponent ? <LoadingComponent /> : <div>Connecting collection...</div>;
  else
    return (
      <WithSyncedStore store={store} newDocument={newDocument} updateDocument={updateDocument}>
        {children}
      </WithSyncedStore>
    );
};
