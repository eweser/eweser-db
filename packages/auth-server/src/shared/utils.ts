import {
  collectionKeys,
  type LoginQueryOptions,
  type LoginQueryParams,
} from '@eweser/shared';
import type { AuthError } from '@supabase/supabase-js';
import { type ClassValue, clsx } from 'clsx';
import { NextResponse } from 'next/server';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function logger(...log: any[]) {
  if (log instanceof Error) {
    // eslint-disable-next-line no-console
    console.error(log);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(...log);
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

export function serverRouteError(message?: string, status = 500): Response {
  return new Response(
    JSON.stringify({ error: message || 'An error occurred' }),
    { status }
  );
}

export function authTokenFromHeaders(headers: Headers) {
  return headers.get('Authorization')?.replace('Bearer ', '');
}

export function validateLoginQueryOptions(
  queryOptions: Partial<LoginQueryParams>
): LoginQueryOptions | null {
  const { redirect, domain, name } = queryOptions;

  const validRedirect =
    typeof redirect === 'string' &&
    redirect.length > 0 &&
    redirect.startsWith('http') &&
    redirect.includes(domain ?? '');

  const validDomain = typeof domain === 'string' && domain.length > 0;

  const collections =
    queryOptions.collections === 'all'
      ? ['all']
      : queryOptions.collections?.split('|');
  const validCollections =
    Array.isArray(collections) &&
    collections.length > 0 &&
    collections.every((c) => c.length > 0) &&
    (collections[0] === 'all' ||
      collections.every((c) => collectionKeys.includes(c as any)));

  const nameValid = typeof name === 'string' && name.length > 0;

  if (validRedirect && validDomain && validCollections && nameValid) {
    return {
      redirect,
      domain,
      collections: collections as LoginQueryOptions['collections'],
      name,
    };
  }
  return null;
}
