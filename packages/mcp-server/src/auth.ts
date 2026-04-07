/**
 * Auth module — all calls to the EweserDB auth server (agent endpoints).
 */

export interface AgentConfig {
  id: string;
  userId: string;
  name: string;
  type: 'mcp' | 'openclaw' | 'custom';
  allowedCollections: string[];
  allowedRooms: string[];
  permissions: 'read' | 'readwrite';
  isActive: boolean;
  tokenExpiresAt: string | null;
}

export interface AgentRoom {
  id: string;
  name: string;
  collectionKey: string;
  syncUrl: string | null;
  syncBaseUrl: string | null;
}

export interface SyncTokenResult {
  syncUrl: string;
  syncToken: string;
  tokenExpiry: string;
}

async function authFetch<T>(
  authUrl: string,
  path: string,
  token: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${authUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`[eweser-mcp] Auth request failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

/** Verify the agent token and return the agent config. */
export async function verifyAgentToken(
  token: string,
  authUrl: string
): Promise<AgentConfig> {
  const res = await fetch(`${authUrl}/api/agents/verify-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    throw new Error(`[eweser-mcp] Token verification failed: ${res.status}`);
  }
  const data = (await res.json()) as { agent: AgentConfig };
  return data.agent;
}

/** Fetch the rooms this agent is allowed to access. */
export async function fetchAgentRooms(
  token: string,
  authUrl: string
): Promise<AgentRoom[]> {
  const data = await authFetch<{ rooms: AgentRoom[] }>(
    authUrl,
    '/api/agents/me/rooms',
    token
  );
  return data.rooms;
}

/** Fetch a Hocuspocus sync token for a specific room. */
export async function fetchSyncToken(
  token: string,
  authUrl: string,
  roomId: string
): Promise<SyncTokenResult> {
  return authFetch<SyncTokenResult>(
    authUrl,
    '/api/agents/me/sync-token',
    token,
    { roomId }
  );
}

/** Log an access event to the audit log. */
export async function logAccess(
  token: string,
  authUrl: string,
  entry: {
    roomId: string;
    collectionKey: string;
    action: 'read' | 'write';
    documentCount?: number;
  }
): Promise<void> {
  await authFetch<{ ok: boolean }>(authUrl, '/api/agents/me/log', token, entry);
}
