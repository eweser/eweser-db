const fallbackOrigin = 'http://localhost';

export const APP_NAME = 'Ewe Note';
export const PWA_THEME_COLOR = '#e6b45c';
export const PWA_BACKGROUND_COLOR = '#fff7eb';

export function normalizeBase(base: string) {
  if (!base || base === '/') {
    return '/';
  }

  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`;

  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

export function resolveUrl(
  path: string,
  origin = typeof window === 'undefined'
    ? fallbackOrigin
    : window.location.origin
) {
  return new URL(path, origin).toString();
}

export function stripTrailingSlash(value: string) {
  return value.endsWith('/') && value !== '/' ? value.slice(0, -1) : value;
}

export function resolveAuthServerUrl(
  authServer = import.meta.env.VITE_AUTH_SERVER,
  origin?: string
) {
  const defaultAuthServer = import.meta.env.DEV
    ? 'http://localhost:38180'
    : '/';

  return stripTrailingSlash(
    authServer
      ? resolveUrl(authServer, origin)
      : resolveUrl(defaultAuthServer, origin)
  );
}

export function buildAppPath(base: string, path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBase = normalizeBase(base);

  if (normalizedBase === '/') {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
}

export const routerBase = normalizeBase(import.meta.env.BASE_URL ?? '/');

export const AUTH_SERVER = resolveAuthServerUrl();

export function appPath(path = '/') {
  return buildAppPath(routerBase, path);
}

export function appAbsoluteUrl(path = '/') {
  return resolveUrl(appPath(path));
}

export const env =
  import.meta.env.VITE_CI === 'true'
    ? 'ci'
    : import.meta.env.DEV
      ? 'dev'
      : 'prod';

export const dev = env === 'dev';
export const ci = env === 'ci';

export const showSignup = env !== 'prod';
