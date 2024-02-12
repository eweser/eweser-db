import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
} from '@/config/supabase';
import { handleServerErrorRedirect } from '@/lib/utils';

export async function GET(request: NextRequest) {
  console.dir(request, { depth: 10 });
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = '/home';
  const redirectTo = request.nextUrl.clone();
  console.dir(redirectTo, { depth: null });
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('code');

  if (!code) {
    return handleServerErrorRedirect(new Error('Invalid code'), redirectTo);
  }
  const cookieStore = cookies();
  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
