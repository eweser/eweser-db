import type { AuthError } from '@supabase/supabase-js';
import { type ClassValue, clsx } from 'clsx';
import { NextResponse } from 'next/server';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function logger(log: string | Error | any) {
  if (log instanceof Error) {
    // eslint-disable-next-line no-console
    console.error(log);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(log);
}

export function handleServerErrorRedirect(
  error: Error | AuthError,
  redirectTo: URL,
  fallbackMessage?: string
): NextResponse {
  logger(error);
  redirectTo.pathname = '/error';
  redirectTo.searchParams.set(
    'message',
    error.message?.toString() || fallbackMessage || 'An error occurred'
  );
  return NextResponse.redirect(redirectTo);
}
