import { createAuthClient } from 'better-auth/react';
import { authApiUrl } from './config';

export const authClient = createAuthClient({
  baseURL: authApiUrl,
  fetchOptions: {
    credentials: 'include',
  },
});
