import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
} from '@/config/supabase';
import { logger } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { next?: string } }
) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = params.next ?? 'dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/error?message=Invalid code`);
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
    logger(error);
    return NextResponse.redirect(
      `${origin}/error?message=${error.message?.toString()}`
    );
  }
  if (data.session) {
    try {
      await supabase.auth.setSession(data.session);
    } catch (error: any) {
      logger(error);
      return NextResponse.redirect(
        `${origin}/error?message=${error.message?.toString()}`
      );
    }
  }
  return NextResponse.redirect(`${origin}/${next}`);
}
