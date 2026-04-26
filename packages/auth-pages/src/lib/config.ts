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

function defaultAuthServerUrl() {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'login.eweser.com'
  ) {
    return 'https://auth.eweser.com';
  }
  return '/';
}

function defaultAuthApiUrl() {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'login.eweser.com'
  ) {
    return 'https://auth.eweser.com/api/auth';
  }
  return '/api/auth';
}

function stripTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function normalizeAuthApiUrl(value: string) {
  const resolved = resolveUrl(value);
  try {
    const url = new URL(resolved);
    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/api/auth';
      return stripTrailingSlash(url.toString());
    }
  } catch {
    // Relative paths are resolved in browsers; server-side tests may pass them through.
  }
  return stripTrailingSlash(resolved);
}

export const routerBase = normalizeBase(import.meta.env.BASE_URL ?? '/');

export const authApiUrl = normalizeAuthApiUrl(
  import.meta.env.VITE_AUTH_API_URL ?? defaultAuthApiUrl()
);

export const authServerUrl = stripTrailingSlash(
  import.meta.env.VITE_AUTH_SERVER_URL
    ? resolveUrl(import.meta.env.VITE_AUTH_SERVER_URL)
    : resolveUrl(defaultAuthServerUrl())
);

export const turnstileSiteKey =
  import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? '';

export const signUpCaptchaEnabled = turnstileSiteKey.length > 0;

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
