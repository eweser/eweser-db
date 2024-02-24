import { NEXT_PUBLIC_SUPABASE_URL } from '../../../services/database/supabase/frontend-config';
import { SUPABASE_SERVICE_ROLE_KEY } from '../../../services/database/supabase/backend-config';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { cookies } from 'next/headers';

export function backendSupabase(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value: '',
              ...options,
            });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
