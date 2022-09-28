import { createContext, FC, ReactNode } from 'react';

import { CollectionKey, DocumentBase } from '@eweser/db';
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
  newDocument: <T>(doc: T, id?: string | undefined) => DocumentBase<T>;
}

const initialCollection: CollectionContext = {
  store: { documents: {} },
  newDocument: (() => {}) as any,
};

export const CollectionContext = createContext<CollectionContext>(initialCollection);

/** Don't call `useSyncedStore` until the store is ready */
const WithSyncedStore = ({
  children,
  store,
  newDocument,
}: CollectionContext & { children: ReactNode }) => {
  const syncedStore = useSyncedStore(store);
  return (
    <CollectionContext.Provider value={{ store: syncedStore, newDocument }}>
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
  const { store, connectStatus, newDocument } = useCollection(db, {
    collectionKey,
    name,
    aliasKey,
  });

  if (connectStatus === 'failed')
    return FailComponent ? <FailComponent /> : <div>Failed to connect</div>;
  else if (!store)
    return LoadingComponent ? <LoadingComponent /> : <div>Connecting collection...</div>;
  else
    return (
      <WithSyncedStore store={store} newDocument={newDocument}>
        {children}
      </WithSyncedStore>
    );
};
