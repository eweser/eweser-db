import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { authApiUrl } from './config';

export const authClient = createAuthClient({
  baseURL: authApiUrl,
  plugins: [twoFactorClient({ twoFactorPage: '/two-factor' })],
  fetchOptions: {
    credentials: 'include',
  },
});
