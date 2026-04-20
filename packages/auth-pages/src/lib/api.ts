import type { ServerRoom } from '@eweser/shared';
import { authServerUrl } from './config';

export interface AuthPagesUser {
  id: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  name: string | null;
}

export interface AccountBootstrapResponse {
  user: AuthPagesUser;
  rooms: ServerRoom[];
  profileRooms: ServerRoom[];
  userCount: number;
}

export interface PermissionsRequestBody {
  domain: string;
  redirect: string;
  collections: string[];
  roomIds: string[];
  keepAliveDays: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(new URL(path, `${authServerUrl}/`).toString(), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data as { error?: string; message?: string } | null)?.error ??
      (data as { error?: string; message?: string } | null)?.message ??
      `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function getAccountBootstrap() {
  return request<AccountBootstrapResponse>('/api/account/bootstrap');
}

export function submitPermissions(body: PermissionsRequestBody) {
  return request<{ redirectUrl: string }>('/api/access-grant/permissions', {
    body: JSON.stringify(body),
    method: 'POST',
  });
}

export function acceptInvite(token: string) {
  return request<{ redirectUrl: string }>(
    '/api/access-grant/accept-room-invite',
    {
      body: JSON.stringify({ token }),
      method: 'POST',
    }
  );
}

export function requestPasswordReset(email: string, redirectTo: string) {
  return request<{ status: boolean }>('/api/auth/forget-password', {
    body: JSON.stringify({ email, redirectTo }),
    method: 'POST',
  });
}

export function resetPassword(token: string, newPassword: string) {
  return request<{ status: boolean }>('/api/auth/reset-password', {
    body: JSON.stringify({
      newPassword,
      token,
      revokeOtherSessions: true,
    }),
    method: 'POST',
  });
}

export function resendVerification(callbackURL: string) {
  return request<{ status: boolean }>('/api/auth/send-verification-email', {
    body: JSON.stringify({ callbackURL }),
    method: 'POST',
  });
}
