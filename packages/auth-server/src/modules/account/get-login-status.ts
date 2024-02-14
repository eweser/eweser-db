import { backendSupabase } from '@/services/database/supabase/backend-client-init';

/**
 * Can only be used backend
 */
export async function getLoginStatus() {
  try {
    const supabase = backendSupabase();
    const { data } = await supabase.auth.getSession();
    const loggedIn = !!data?.session?.user.id;
    return loggedIn;
  } catch (error) {
    return false;
  }
}
