import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { NEXT_PUBLIC_SUPABASE_URL } from '@/config/supabase';
import { handleServerErrorRedirect } from '@/lib/utils';
import { SUPABASE_SERVICE_ROLE_KEY } from '@/config/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = '/home';
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('code');

  if (!code) {
    return handleServerErrorRedirect(new Error('Invalid code'), redirectTo);
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
    return handleServerErrorRedirect(error, redirectTo);
  }
  if (data.session) {
    try {
      await supabase.auth.setSession(data.session);
    } catch (error: any) {
      return handleServerErrorRedirect(error, redirectTo);
    }
  }
  return NextResponse.redirect(redirectTo);
}
