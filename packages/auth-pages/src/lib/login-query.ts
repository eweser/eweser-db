import {
  collectionKeys,
  loginOptionsToQueryParams,
  type LoginQueryOptions,
  type LoginQueryParams,
} from '@eweser/shared';

const LOGIN_QUERY_KEY = 'eweser.auth.login-query';

export function validateLoginQueryOptions(
  queryOptions: Partial<LoginQueryParams> | null
): LoginQueryOptions | null {
  if (!queryOptions) {
    return null;
  }

  const { redirect, domain, name } = queryOptions;
  const validRedirect =
    typeof redirect === 'string' &&
    redirect.length > 0 &&
    redirect.startsWith('http') &&
    redirect.includes(domain ?? '');
  const validDomain = typeof domain === 'string' && domain.length > 0;
  const collections = !queryOptions.collections
    ? ['all']
    : queryOptions.collections === 'all'
      ? ['all']
      : queryOptions.collections.split('|');
  const validCollections =
    Array.isArray(collections) &&
    collections.length > 0 &&
    collections.every((collection) => collection.length > 0) &&
    (collections[0] === 'all' ||
      collections.every((collection) =>
        collectionKeys.includes(collection as (typeof collectionKeys)[number])
      ));
  const validName = typeof name === 'string' && name.length > 0;

  if (!validRedirect || !validDomain || !validCollections || !validName) {
    return null;
  }

  return {
    collections: collections as LoginQueryOptions['collections'],
    domain,
    name,
    redirect,
  };
}

export function getLoginQueryFromSearch(searchParams: URLSearchParams) {
  const params: Partial<LoginQueryParams> = {};
  const collections = searchParams.get('collections');
  const domain = searchParams.get('domain');
  const name = searchParams.get('name');
  const redirect = searchParams.get('redirect');

  if (collections) params.collections = collections;
  if (domain) params.domain = domain;
  if (name) params.name = name;
  if (redirect) params.redirect = redirect;

  return validateLoginQueryOptions(params);
}

export function setStoredLoginQuery(query: LoginQueryOptions) {
  localStorage.setItem(
    LOGIN_QUERY_KEY,
    JSON.stringify(loginOptionsToQueryParams(query))
  );
}

export function getStoredLoginQuery() {
  const stored = localStorage.getItem(LOGIN_QUERY_KEY);
  if (!stored) {
    return null;
  }

  return validateLoginQueryOptions(
    JSON.parse(stored) as Partial<LoginQueryParams>
  );
}

export function clearStoredLoginQuery() {
  localStorage.removeItem(LOGIN_QUERY_KEY);
}

export function buildPermissionPath(query: LoginQueryOptions) {
  const params = loginOptionsToQueryParams(query);
  return `/access-grant/permission?${new URLSearchParams(params).toString()}`;
}

export function resolvePostAuthPath(
  loginQuery: LoginQueryOptions | null,
  returnTo: string | null
) {
  if (loginQuery) {
    return buildPermissionPath(loginQuery);
  }

  if (returnTo?.startsWith('/')) {
    return returnTo;
  }

  return '/home';
}
