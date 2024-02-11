import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
} from '@/config/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { next: string } }
) {
  const { searchParams, origin } = new URL(request.url);
  const requestUrl = new URL(request.url);
  console.log({ requestUrl });
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = params.next ?? 'dashboard';

  console.log({ code, next, origin });

  if (code) {
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
    if (data.session) {
      try {
        await supabase.auth.setSession(data.session);
      } catch (error) {
        console.log('setsession error', error);
      }
    }
    console.log({ error, data });
    if (!error) {
      return NextResponse.redirect(`${origin}/${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
