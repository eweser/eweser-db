import { getOrCreateNewUsersProfileRooms } from '@/modules/rooms/create-new-user-profile-rooms';
import { SUPABASE_SERVICE_ROLE_KEY } from '@/services/database/supabase/backend-config';
import { NEXT_PUBLIC_SUPABASE_URL } from '@/services/database/supabase/frontend-config';

import type { CookieOptions } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
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

      await getOrCreateNewUsersProfileRooms(session.user.id);
    } catch (error: any) {
      return { error };
    }
  } else {
    return { error: new Error('Invalid session') };
  }
  return { session };
}
