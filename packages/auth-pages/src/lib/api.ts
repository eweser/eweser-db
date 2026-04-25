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

export type ConnectAiClientId =
  | 'claude-desktop'
  | 'claude-web'
  | 'chatgpt-web'
  | 'copilot'
  | 'codex'
  | 'openclaw';

export interface ConnectAiConnection {
  expiresAt: string | null;
  id?: string;
  lastUsedAt: string | null;
  permissions: 'read' | 'readwrite';
  status: 'connected' | 'revoked';
}

export interface ConnectAiClientOverview {
  clientId: ConnectAiClientId;
  connection: ConnectAiConnection | null;
  description: string;
  fallbackReason: string | null;
  title: string;
  type: 'oauth' | 'token' | 'token-fallback';
}

export interface ConnectAiOverviewResponse {
  clients: ConnectAiClientOverview[];
  defaults: {
    allowedCollections: string;
    permissions: 'read' | 'readwrite';
    tokenTtlSeconds: number;
  };
  dynamicClientRegistrationUrl: string;
  mcpUrl: string;
  oauthMetadataUrl: string;
  smartLinkRule: string;
}

export interface ConnectAiSetupResponse {
  agent: {
    expiresAt?: string;
    id: string;
    permissions: 'read' | 'readwrite';
    tokenExpiresAt?: string | null;
  };
  clientId: ConnectAiClientId;
  payload: {
    configFormat: 'json' | 'toml';
    instructions: string;
    snippet: string;
  };
  token: string;
  warning?: string;
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

export function getConnectAiOverview() {
  return request<ConnectAiOverviewResponse>('/api/account/connect-ai');
}

export function setupConnectAiToken(clientId: ConnectAiClientId) {
  return request<ConnectAiSetupResponse>(
    '/api/account/connect-ai/setup-token',
    {
      body: JSON.stringify({ clientId }),
      method: 'POST',
    }
  );
}

export function rotateConnectAiToken(clientId: ConnectAiClientId) {
  return request<ConnectAiSetupResponse>(
    '/api/account/connect-ai/rotate-token',
    {
      body: JSON.stringify({ clientId }),
      method: 'POST',
    }
  );
}

export function revokeConnectAi(clientId: ConnectAiClientId) {
  return request<{ clientId: ConnectAiClientId; status: 'revoked' }>(
    '/api/account/connect-ai/revoke',
    {
      body: JSON.stringify({ clientId }),
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
