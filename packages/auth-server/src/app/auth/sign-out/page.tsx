'use client';
import { useState, useEffect } from 'react';
import { Icons } from '../../../frontend/components/library/icons';
import { frontendSupabase } from '../../../services/database/supabase/frontend-client-init';
import { clearLocalStorageLoginQuery } from '../../../frontend/utils/local-storage';
import { logger } from '../../../shared/utils';

export default function SignOutPage() {
  const supabase = frontendSupabase();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const signOut = async () => {
      setIsLoading(true);
      clearLocalStorageLoginQuery();
      // clear indexedDb
      try {
        // I'm not using indexedDB for anything else here, so this is more convenient, but if you wan tto only delete EweserDB indexedDB databases, instead use the logoutAndClear() method, of call room.indexedDBProvider?.destroy(); on each room
        const dbs = await window.indexedDB.databases();
        dbs.forEach((db) => {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        });
      } catch (error) {
        logger(error);
      }
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error);
      } else {
        window.stop();
        window.location.href = '/';
      }
      setIsLoading(false);
    };
    signOut();
  }, [supabase]);

  return (
    <div className="max-w-lg self-center pt-10">
      <h1 className="text-2xl font-bold mb-4">Signing out</h1>
      {error && <p>{error.message}</p>}
      {isLoading && (
        <p>
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Signing out...
        </p>
      )}
    </div>
  );
}
