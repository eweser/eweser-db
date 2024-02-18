// import { COLLECTION_KEYS } from '@eweser/db';
/**
 * @todo fix library and import these from the library
 */
export const COLLECTION_KEYS = ['notes', 'flashcards', 'profiles'] as const;

export const PUBLIC_ACCESS_TYPES = ['private', 'read', 'write'] as const;

export const REQUESTER_TYPES = ['app', 'user'] as const;

export const AUTH_SERVER_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL ?? '';

if (!AUTH_SERVER_URL) {
  throw new Error('AUTH_SERVER_URL is not defined');
}
export const AUTH_SERVER_DOMAIN =
  process.env.NEXT_PUBLIC_AUTH_SERVER_DOMAIN ?? '';

if (!AUTH_SERVER_DOMAIN) {
  throw new Error('AUTH_SERVER_DOMAIN is not defined');
}
