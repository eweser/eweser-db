import type { AuthError } from '@supabase/supabase-js';
import { type ClassValue, clsx } from 'clsx';
import { NextResponse } from 'next/server';
import { twMerge } from 'tailwind-merge';
import { AUTH_SERVER_URL } from './constants';

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

/**
 * @param authId UUID - the authId from the auth.users table.
 * @returns userId string - the internal user id. includes the authserver url <authserver-url>|<uuid>
 * @example authIdToUserId('123e4567-e89b-12d3-a456-426614174000') // 'https://auth.eweser.com|123e4567-e89b-12d3-a456-426614174000'
 */
export function authIdToUserId(authId: string) {
  return `${AUTH_SERVER_URL}|${authId}`;
}

/**
 *
 * @param userId string - the internal user id. includes the authserver url <authserver-url>|<uuid>
 * @returns authId UUID - the authId from the auth.users table.
 * @example userIdToAuthId('https://auth.eweser.com|123e4567-e89b-12d3-a456-426614174000') // '123e4567-e89b-12d3-a456-426614174000'
 */
export function userIdToAuthId(userId: string) {
  return userId.split('|')[1];
}
