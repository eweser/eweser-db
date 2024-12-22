import { backendSupabase } from '../../services/database/supabase/backend-client-init';

/**
 * Can only be used backend
 */
export async function getLoginStatus() {
  try {
    const supabase = await backendSupabase();
    const { data } = await supabase.auth.getUser();
    const loggedIn = !!data?.user?.id;
    return loggedIn;
  } catch (error) {
    return false;
  }
}
