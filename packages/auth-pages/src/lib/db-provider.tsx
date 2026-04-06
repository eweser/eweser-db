import { Database } from '@eweser/db';
import type { ServerRoom } from '@eweser/shared';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authServerUrl } from './config';

const DatabaseContext = createContext<Database | null>(null);

export function DatabaseProvider({
  children,
  initialRooms,
  loadingComponent,
}: {
  children: ReactNode;
  initialRooms: ServerRoom[];
  loadingComponent?: ReactNode;
}) {
  const [loaded, setLoaded] = useState(initialRooms.length === 0);
  const [db] = useState(
    () =>
      new Database({
        authServer: authServerUrl,
        initialRooms,
        logLevel: 0,
        providers: ['IndexedDB', 'Hocuspocus'],
      })
  );

  useEffect(() => {
    function handleLoaded() {
      setLoaded(true);
    }

    db.on('roomsLoaded', handleLoaded);
    return () => {
      db.removeListener('roomsLoaded', handleLoaded);
      db.allRooms().forEach((room) => room.disconnect());
    };
  }, [db]);

  if (!loaded) {
    return <>{loadingComponent ?? null}</>;
  }

  return (
    <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return { db };
}
