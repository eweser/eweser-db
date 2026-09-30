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

// The production nginx container proxies /api to the auth service. Keep
// browser requests on this origin so login works even when the auth service's
// public hostname is unreachable from the browser.
export function getAuthEndpoints({
  origin,
  production,
  configuredApiUrl,
  configuredServerUrl,
}: {
  origin: string;
  production: boolean;
  configuredApiUrl?: string;
  configuredServerUrl?: string;
}) {
  return {
    authApiUrl: new URL(
      production ? '/api/auth' : (configuredApiUrl ?? '/api/auth'),
      origin
    ).toString(),
    authServerUrl: stripTrailingSlash(
      new URL(configuredServerUrl ?? '/', origin).toString()
    ),
    authApiServerUrl: stripTrailingSlash(
      new URL(
        production ? '/' : (configuredServerUrl ?? '/'),
        origin
      ).toString()
    ),
  };
}

export const { authApiUrl, authServerUrl, authApiServerUrl } = getAuthEndpoints(
  {
    origin:
      typeof window === 'undefined'
        ? 'http://localhost'
        : window.location.origin,
    production: import.meta.env.PROD,
    configuredApiUrl: import.meta.env.VITE_AUTH_API_URL,
    configuredServerUrl: import.meta.env.VITE_AUTH_SERVER_URL,
  }
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
