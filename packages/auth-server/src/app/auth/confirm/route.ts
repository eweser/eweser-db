import { serverSupabase } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();

  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/home';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('type');

  if (!token_hash || !type) {
    // return the user to an error page with some instructions
    redirectTo.pathname = `/error?message=Invalid token_hash or type`;
    return NextResponse.redirect(redirectTo);
  }
  const supabase = serverSupabase(cookieStore);

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });
  if (error) {
    // return the user to an error page with some instructions
    redirectTo.pathname = `/error?message=${error.message?.toString()}`;
    return NextResponse.redirect(redirectTo);
  }
  redirectTo.searchParams.delete('next');
  return NextResponse.redirect(redirectTo);
}
