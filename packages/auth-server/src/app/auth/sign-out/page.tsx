'use client';
import { useState, useEffect } from 'react';
import { Icons } from '../../../frontend/components/library/icons';
import { frontendSupabase } from '../../../services/database/supabase/frontend-client-init';

export default function SignOutPage() {
  const supabase = frontendSupabase();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const signOut = async () => {
      setIsLoading(true);
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
