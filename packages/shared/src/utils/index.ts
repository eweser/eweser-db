import type { LoginQueryOptions, LoginQueryParams } from '..';

export function loginOptionsToQueryParams({
  collections,
  ...rest
}: LoginQueryOptions) {
  const _collections =
    collections.length === 0
      ? 'all'
      : collections.length === 1
      ? collections[0]
      : collections.join('|');
  const params: LoginQueryParams = {
    collections: _collections,
    ...rest,
  };
  return params;
}

/** checks if the token is already expired or will be expired within the next (2) minutes */
export const isTokenExpired = (
  tokenExpiry: string,
  /* mark the token as expired even this many minutes before it actually expires */
  bufferMinutes = 2
) => {
  const expiry = new Date(tokenExpiry).getTime();
  const now = new Date().getTime() + bufferMinutes * 60 * 1000;
  return expiry < now;
};

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
