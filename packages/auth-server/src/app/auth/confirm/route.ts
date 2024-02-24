'use server';
import { verifyOtp } from '../../../modules/account/verify-otp';
import { handleServerErrorRedirect } from '../../../shared/utils';
import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/home';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('type');

  const { error } = await verifyOtp({ token_hash, type });

  if (error) {
    return handleServerErrorRedirect(error, redirectTo);
  }
  redirectTo.searchParams.delete('next');
  return NextResponse.redirect(redirectTo);
}
