function normalizeBase(base: string) {
  if (!base || base === '/') {
    return '/';
  }
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`;
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function resolveUrl(path: string) {
  if (typeof window === 'undefined') {
    return path;
  }
  return new URL(path, window.location.origin).toString();
}

function stripTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export const routerBase = normalizeBase(import.meta.env.BASE_URL ?? '/');

export const authApiUrl = resolveUrl(
  import.meta.env.VITE_AUTH_API_URL ?? '/api/auth'
);

export const authServerUrl = stripTrailingSlash(
  import.meta.env.VITE_AUTH_SERVER_URL
    ? resolveUrl(import.meta.env.VITE_AUTH_SERVER_URL)
    : resolveUrl('/')
);

export function appPath(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (routerBase === '/') {
    return normalizedPath;
  }
  return `${routerBase}${normalizedPath}`;
}

export function appAbsoluteUrl(path = '/') {
  return resolveUrl(appPath(path));
}
