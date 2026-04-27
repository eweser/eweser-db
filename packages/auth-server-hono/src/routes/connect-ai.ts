import { Hono, type Context } from 'hono';
import { COLLECTION_KEYS } from '@eweser/shared';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rate-limit.js';
import { requireVerifiedEmail } from '../middleware/verified-email.js';
import {
  createAgentConfig,
  getAgentConfigsByUserId,
  revokeAgentConfig,
  rotateAgentToken,
  updateAgentConfigScope,
} from '../model/agents.js';
import { getWritableRoomsByUserId } from '../model/rooms/calls.js';
import {
  getOAuthAccessTokensByUserId,
  revokeOAuthAccessTokensForUserClient,
} from '../model/oauth.js';
import { env } from '../env.js';

export const connectAiRouter = new Hono();

const tokenSetupRateLimit = createRateLimit({
  key: 'connect-ai-token-setup',
  max: 20,
  windowMs: 60_000,
});

const tokenClientIds = [
  'claude-desktop',
  'copilot',
  'codex',
  'openclaw',
] as const;
const oauthClientIds = ['claude-web', 'chatgpt-web'] as const;

type ConnectAiClientId =
  | (typeof tokenClientIds)[number]
  | (typeof oauthClientIds)[number];

const tokenClientIdSet = new Set<ConnectAiClientId>(tokenClientIds);
const oauthClientIdSet = new Set<ConnectAiClientId>(oauthClientIds);
const onboardingTtlMs = 7 * 24 * 60 * 60 * 1000;

function isTokenClientId(
  clientId: ConnectAiClientId
): clientId is (typeof tokenClientIds)[number] {
  return tokenClientIdSet.has(clientId);
}

function noStoreJson(c: Context, body: unknown) {
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
  return c.json(body);
}

function getAuthServerBaseUrl() {
  const candidate = env.AUTH_SERVER_URL || env.BETTER_AUTH_BASE_URL;
  return candidate.replace(/\/+$/, '');
}

function getPublicMcpUrl() {
  return `${getAuthServerBaseUrl()}/mcp`;
}

const connectAiClientSchema = z.enum([
  'claude-desktop',
  'claude-web',
  'chatgpt-web',
  'copilot',
  'codex',
  'openclaw',
]);

const setupBodySchema = z.object({
  clientId: connectAiClientSchema,
  writeRoomIds: z.array(z.string()).optional().default([]),
});

function getAgentName(clientId: (typeof tokenClientIds)[number]): string {
  switch (clientId) {
    case 'claude-desktop':
      return 'Connect AI: Claude Desktop';
    case 'copilot':
      return 'Connect AI: GitHub Copilot';
    case 'codex':
      return 'Connect AI: Codex';
    case 'openclaw':
      return 'Connect AI: OpenClaw';
  }
}

function buildTokenSnippet(
  clientId: (typeof tokenClientIds)[number],
  token: string
) {
  switch (clientId) {
    case 'claude-desktop':
      return {
        configFormat: 'json',
        instructions:
          'Paste this into Claude Desktop config, then restart Claude Desktop.',
        snippet: JSON.stringify(
          {
            mcpServers: {
              eweser: {
                command: 'npx',
                args: ['-y', '@eweser/mcp'],
                env: {
                  EWESER_AGENT_TOKEN: token,
                  EWESER_AUTH_URL: getAuthServerBaseUrl(),
                },
              },
            },
          },
          null,
          2
        ),
      };
    case 'copilot':
      return {
        configFormat: 'json',
        instructions:
          'Use this as a remote HTTP MCP fallback until verified Copilot OAuth client metadata is shipped for Eweser.',
        snippet: JSON.stringify(
          {
            servers: {
              eweser: {
                type: 'http',
                url: getPublicMcpUrl(),
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                tools: ['*'],
              },
            },
          },
          null,
          2
        ),
      };
    case 'codex':
      return {
        configFormat: 'toml',
        instructions:
          'Add this to ~/.codex/config.toml, set EWESER_MCP_TOKEN in the environment that launches Codex, then fully restart Codex. A repo .env file alone is not enough for native MCP startup.',
        snippet: [
          '[mcp_servers.eweser]',
          `url = "${getPublicMcpUrl()}"`,
          'bearer_token_env_var = "EWESER_MCP_TOKEN"',
          '',
          '# shell',
          `export EWESER_MCP_TOKEN="${token}"`,
        ].join('\n'),
      };
    case 'openclaw':
      return {
        configFormat: 'json',
        instructions:
          'Use this remote HTTP MCP definition in OpenClaw with an explicit Authorization header.',
        snippet: JSON.stringify(
          {
            mcpServers: {
              eweser: {
                type: 'http',
                url: getPublicMcpUrl(),
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            },
          },
          null,
          2
        ),
      };
  }
}

function getClientCatalog() {
  return [
    {
      clientId: 'claude-desktop',
      description:
        'Local stdio setup with @eweser/mcp and a short-lived agent token.',
      fallbackReason: null,
      title: 'Claude Desktop',
      type: 'token',
    },
    {
      clientId: 'claude-web',
      description:
        'Remote HTTP MCP on /mcp with OAuth in Claude.ai connectors.',
      fallbackReason: null,
      title: 'Claude web',
      type: 'oauth',
    },
    {
      clientId: 'chatgpt-web',
      description:
        'Remote HTTP MCP on /mcp with OAuth in ChatGPT developer mode.',
      fallbackReason: null,
      title: 'ChatGPT web',
      type: 'oauth',
    },
    {
      clientId: 'copilot',
      description:
        'Remote HTTP MCP config for Copilot using a bearer token fallback.',
      fallbackReason:
        'Copilot cloud agent docs currently call out that remote OAuth-backed MCP servers are not supported there, so this launch ships the explicit token path.',
      title: 'GitHub Copilot',
      type: 'token-fallback',
    },
    {
      clientId: 'codex',
      description:
        'Remote HTTP MCP config for Codex using bearer_token_env_var.',
      fallbackReason:
        'Codex remote MCP config is supported, but Eweser is not shipping verified first-party OAuth client metadata for Codex in this pass.',
      title: 'Codex',
      type: 'token-fallback',
    },
    {
      clientId: 'openclaw',
      description:
        'Remote HTTP MCP config with an explicit Authorization header.',
      fallbackReason:
        'OpenClaw docs currently document remote HTTP headers, not a verified remote OAuth flow worth launching here.',
      title: 'OpenClaw',
      type: 'token',
    },
  ] as const;
}

async function buildTokenScope(userId: string, writeRoomIds: string[]) {
  const writableRooms = await getWritableRoomsByUserId(userId);
  const writableRoomById = new Map(
    writableRooms.map((room) => [room.id, room])
  );
  const unauthorizedWriteRoom = writeRoomIds.find(
    (roomId) => !writableRoomById.has(roomId)
  );
  if (unauthorizedWriteRoom) {
    return null;
  }

  const writeAllowedCollections = Array.from(
    new Set(
      writeRoomIds.map((roomId) => writableRoomById.get(roomId)?.collectionKey)
    )
  ).filter((collectionKey): collectionKey is string => Boolean(collectionKey));

  return {
    allowedCollections: [...COLLECTION_KEYS],
    allowedRooms: [],
    permissions: 'read' as const,
    readAllowedCollections: [...COLLECTION_KEYS],
    readAllowedRooms: [],
    writeAllowedCollections,
    writeAllowedFolderIds: [],
    writeAllowedPathPrefixes: [],
    writeAllowedRooms: writeRoomIds,
  };
}

connectAiRouter.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const [agentConfigs, oauthTokens, writableRooms] = await Promise.all([
    getAgentConfigsByUserId(user.id),
    getOAuthAccessTokensByUserId(user.id, [...oauthClientIds]),
    getWritableRoomsByUserId(user.id),
  ]);

  const tokenConnections = new Map(
    tokenClientIds.map((clientId) => {
      const agent = agentConfigs.find(
        (candidate) => candidate.name === getAgentName(clientId)
      );
      return [
        clientId,
        agent
          ? {
              expiresAt: agent.tokenExpiresAt?.toISOString() ?? null,
              id: agent.id,
              lastUsedAt: agent.lastAccessAt?.toISOString() ?? null,
              permissions: agent.permissions,
              status: agent.isActive ? 'connected' : 'revoked',
              writeRoomCount: agent.writeAllowedRooms.length,
            }
          : null,
      ];
    })
  );

  const oauthConnections = new Map(
    oauthClientIds.map((clientId) => {
      const token = oauthTokens.find(
        (candidate) => candidate.clientId === clientId
      );
      return [
        clientId,
        token
          ? {
              expiresAt: token.expiresAt?.toISOString() ?? null,
              lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
              permissions: token.scopes.includes('readwrite')
                ? 'readwrite'
                : 'read',
              status: 'connected',
            }
          : null,
      ];
    })
  );

  return c.json({
    defaults: {
      allowedCollections: 'all-supported-collections',
      permissions: 'read',
      recommendedWritableTarget: 'dedicated-ai-room',
      writeScope: 'none',
      tokenTtlSeconds: Math.floor(onboardingTtlMs / 1000),
    },
    dynamicClientRegistrationUrl: `${getAuthServerBaseUrl()}/oauth/register`,
    mcpUrl: getPublicMcpUrl(),
    oauthMetadataUrl: `${getAuthServerBaseUrl()}/.well-known/oauth-authorization-server`,
    smartLinkRule:
      'Never place bearer tokens in URLs. All setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.',
    writableRooms: writableRooms.map(
      ({ id, name, collectionKey, syncUrl, syncBaseUrl }) => ({
        id,
        name,
        collectionKey,
        syncUrl,
        syncBaseUrl,
      })
    ),
    clients: getClientCatalog().map((client) => ({
      ...client,
      connection:
        tokenConnections.get(
          client.clientId as (typeof tokenClientIds)[number]
        ) ??
        oauthConnections.get(
          client.clientId as (typeof oauthClientIds)[number]
        ) ??
        null,
    })),
  });
});

connectAiRouter.post(
  '/setup-token',
  requireAuth,
  requireVerifiedEmail,
  tokenSetupRateLimit,
  async (c) => {
    const user = c.get('user');
    const parsedBody = setupBodySchema.safeParse(
      await c.req.json().catch(() => null)
    );
    if (!parsedBody.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const { clientId, writeRoomIds } = parsedBody.data;
    if (!isTokenClientId(clientId)) {
      return c.json({ error: 'This client uses OAuth onboarding' }, 400);
    }

    const scope = await buildTokenScope(user.id, writeRoomIds);
    if (!scope) {
      return c.json({ error: 'Invalid writable room' }, 403);
    }

    const agentName = getAgentName(clientId);
    const existingAgents = await getAgentConfigsByUserId(user.id);
    const existing = existingAgents.find(
      (candidate) => candidate.name === agentName
    );

    const result = existing
      ? await updateAgentConfigScope(existing.id, user.id, scope).then(
          (updated) => (updated ? rotateAgentToken(existing.id, user.id) : null)
        )
      : await createAgentConfig({
          ...scope,
          allowedCollections: [...COLLECTION_KEYS],
          endpoint:
            clientId === 'claude-desktop'
              ? getAuthServerBaseUrl()
              : getPublicMcpUrl(),
          name: agentName,
          tokenExpiresAt: new Date(Date.now() + onboardingTtlMs),
          type: clientId === 'openclaw' ? 'openclaw' : 'mcp',
          userId: user.id,
        });

    if (!result) {
      return c.json({ error: 'Unable to create setup payload' }, 500);
    }

    const { tokenHash: _tokenHash, ...agent } = result.agentConfig;
    return noStoreJson(c, {
      agent,
      clientId,
      payload: buildTokenSnippet(clientId, result.token),
      token: result.token,
      warning:
        'This token is shown only on this authenticated page. Revoke or rotate it here if the client is lost or misconfigured.',
    });
  }
);

connectAiRouter.post(
  '/rotate-token',
  requireAuth,
  requireVerifiedEmail,
  tokenSetupRateLimit,
  async (c) => {
    const user = c.get('user');
    const parsedBody = setupBodySchema.safeParse(
      await c.req.json().catch(() => null)
    );
    if (!parsedBody.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const { clientId, writeRoomIds } = parsedBody.data;
    if (!isTokenClientId(clientId)) {
      return c.json({ error: 'This client uses OAuth onboarding' }, 400);
    }

    const existingAgents = await getAgentConfigsByUserId(user.id);
    const existing = existingAgents.find(
      (candidate) => candidate.name === getAgentName(clientId)
    );

    if (!existing) {
      return c.json({ error: 'Connection not found' }, 404);
    }

    const scope = await buildTokenScope(user.id, writeRoomIds);
    if (!scope) {
      return c.json({ error: 'Invalid writable room' }, 403);
    }

    const updated = await updateAgentConfigScope(existing.id, user.id, scope);
    if (!updated) {
      return c.json({ error: 'Connection not found' }, 404);
    }

    const rotated = await rotateAgentToken(existing.id, user.id);
    if (!rotated) {
      return c.json({ error: 'Connection not found' }, 404);
    }

    const { tokenHash: _tokenHash, ...agent } = rotated.agentConfig;
    return noStoreJson(c, {
      agent,
      clientId,
      payload: buildTokenSnippet(clientId, rotated.token),
      token: rotated.token,
    });
  }
);

connectAiRouter.post(
  '/revoke',
  requireAuth,
  requireVerifiedEmail,
  async (c) => {
    const user = c.get('user');
    const parsedBody = setupBodySchema.safeParse(
      await c.req.json().catch(() => null)
    );
    if (!parsedBody.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const { clientId } = parsedBody.data;
    if (oauthClientIdSet.has(clientId)) {
      await revokeOAuthAccessTokensForUserClient(user.id, clientId);
      return c.json({ clientId, status: 'revoked' });
    }

    if (isTokenClientId(clientId)) {
      const existingAgents = await getAgentConfigsByUserId(user.id);
      const existing = existingAgents.find(
        (candidate) => candidate.name === getAgentName(clientId)
      );

      if (!existing) {
        return c.json({ error: 'Connection not found' }, 404);
      }

      await revokeAgentConfig(existing.id, user.id);
      return c.json({ clientId, status: 'revoked' });
    }

    return c.json({ error: 'Unsupported client' }, 400);
  }
);
