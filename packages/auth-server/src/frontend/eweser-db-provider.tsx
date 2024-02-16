'use client';
import type { Room } from '@/model/rooms/schema';

import { Database } from '@eweser/db';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { Icons } from './components/library/icons';

const DatabaseContext = createContext({ db: {} } as { db: Database });

export const DatabaseProvider = ({
  children,
  initialRooms,
}: {
  children: React.ReactNode;
  initialRooms?: Room[];
}) => {
  const [loaded, setLoaded] = useState(false);

  // const [syncing, setSyncing] = useState(false)

  const eweserDB = useMemo(() => {
    return new Database({
      authServer: 'http://localhost:3000',
      logLevel: 0, // log debug events
      initialRooms: initialRooms
        ? initialRooms.map(({ id, collectionKey, token, ySweetUrl, name }) => ({
            roomId: id,
            collectionKey,
            ySweetToken: token || '',
            ySweetUrl: ySweetUrl || '',
            name,
          }))
        : undefined,
    }).on('roomsLoaded', (_rooms) => {
      // could also add check that rooms are correct rooms
      setLoaded(true);
    });
  }, [initialRooms]);

  return (
    <DatabaseContext.Provider value={{ db: eweserDB }}>
      {loaded ? children : <Icons.spinner />}
    </DatabaseContext.Provider>
  );
};

// Create a custom hook to use the database context
export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === null) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};