import { backendSupabase } from '../../services/database/supabase/backend-client-init';
import { cookies } from 'next/headers';

export async function getSessionUser() {
  const supabase = backendSupabase(cookies());

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { error };
  }
  if (!data.user) {
    return { error: new Error('Could not find user') };
  }
  return { user: data.user };
}
