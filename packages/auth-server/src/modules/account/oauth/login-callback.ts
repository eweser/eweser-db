import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_SERVICE_ROLE_KEY } from '../../../services/database/supabase/backend-config';
import { NEXT_PUBLIC_SUPABASE_URL } from '../../../services/database/supabase/frontend-config';
import { createNewUserRoomsAndAuthServerAccess } from '../create-new-user-rooms-and-auth-server-access';

export async function oAuthLoginCallback({ code }: { code?: string | null }) {
  if (!code) {
    return { error: new Error('Invalid code') };
  }
  const cookieStore = cookies();
  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set({ name, value, ...options })
          );
        },
      },
    }
  );
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return { error };
  }
  const session = data?.session;
  if (session) {
    try {
      await supabase.auth.setSession(session);

      await createNewUserRoomsAndAuthServerAccess(session.user.id);
    } catch (error: any) {
      return { error };
    }
  } else {
    return { error: new Error('Invalid session') };
  }
  return { session };
}
