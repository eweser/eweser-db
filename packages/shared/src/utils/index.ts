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
