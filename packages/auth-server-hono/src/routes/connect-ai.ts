/**
 * Purpose: Signed-in Connect AI API for token and OAuth client setup.
 * Exports: connectAiRouter.
 * Touches: Agent configs, OAuth token revocation, room scopes, and rate limits.
 * Read before editing: packages/auth-server-hono/src/INDEX.md and AGENTS.md.
 */
import { Hono, type Context } from 'hono';
import {
  COLLECTION_KEYS,
  type MemoryCaptureMode,
  type MemoryStrategyKind,
  type MemoryStrategyScope,
} from '@eweser/shared';
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
const memoryCaptureModes = ['manual', 'suggest', 'auto'] as const;
const memoryStrategyKinds = [
  'agent-journal',
  'project-wiki',
  'auto-curated',
  'knowledge-graph',
  'workspace-intelligence',
  'custom',
] as const;

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
  captureMode: z.enum(memoryCaptureModes).optional(),
  defaultWriteRoomId: z.string().optional(),
  memoryScopeKey: z.string().optional(),
  memoryStrategy: z.enum(memoryStrategyKinds).optional(),
  readableRoomIds: z.array(z.string()).optional(),
  writableRoomIds: z.array(z.string()).optional(),
  writeRoomIds: z.array(z.string()).optional(),
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
          'Run openclaw mcp set eweser with this server definition, or add it under mcp.servers. Then use an OpenClaw coding or messaging profile with MCP tools enabled.',
        snippet: JSON.stringify(
          {
            url: getPublicMcpUrl(),
            transport: 'streamable-http',
            headers: {
              Authorization: `Bearer ${token}`,
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
        'Remote HTTP MCP setup for OpenClaw using streamable-http and an explicit Authorization header.',
      fallbackReason:
        'OpenClaw stores outbound MCP servers under mcp.servers. Run openclaw mcp set eweser with the generated server JSON.',
      title: 'OpenClaw',
      type: 'token',
    },
  ] as const;
}

function getRecommendedWriteRoomIds(
  writableRooms: Awaited<ReturnType<typeof getWritableRoomsByUserId>>
): string[] {
  return writableRooms
    .filter((room) => room.collectionKey === 'conversations')
    .map((room) => room.id);
}

function buildMemoryStrategyOverview(
  writableRooms: Awaited<ReturnType<typeof getWritableRoomsByUserId>>
) {
  const writableRoomIds = getRecommendedWriteRoomIds(writableRooms);
  const defaultWriteRoomId =
    writableRoomIds.length === 1 ? writableRoomIds[0] : undefined;
  const readableRoomIds = writableRoomIds;
  const defaultScope: MemoryStrategyScope = {
    scopeType: 'global',
    scopeKey: 'default',
    label: 'Shared Agent Memory',
    strategy: 'agent-journal',
    captureMode: 'manual',
    ...(defaultWriteRoomId ? { defaultWriteRoomId } : {}),
    readableRoomIds,
    writableRoomIds,
  };

  return {
    defaultStrategy: 'agent-journal' as const,
    defaultCaptureMode: 'manual' as const,
    scopes: [defaultScope],
    choices: [
      {
        strategy: 'agent-journal' as const,
        label: 'Shared Agent Memory',
        description:
          'Portable manual memory for coding agents, decisions, preferences, and session continuity.',
        advanced: false,
      },
      {
        strategy: 'project-wiki' as const,
        label: 'Project Wiki',
        description:
          'Deterministic project knowledge built from approved source rooms into reviewable drafts and canonical wiki pages.',
        advanced: false,
      },
      {
        strategy: 'auto-curated' as const,
        label: 'Auto-Curated Memory',
        description:
          'Automatic preference and fact extraction. Planned after capture controls.',
        advanced: true,
      },
      {
        strategy: 'knowledge-graph' as const,
        label: 'Knowledge Graph',
        description:
          'Temporal relationship memory. Planned after the Agent Journal baseline.',
        advanced: true,
      },
      {
        strategy: 'workspace-intelligence' as const,
        label: 'Workspace Intelligence',
        description:
          'Team docs, tables, and transcripts. Planned after workspace ingestion.',
        advanced: true,
      },
      {
        strategy: 'custom' as const,
        label: 'Custom',
        description: 'Bring your own strategy contract and processors.',
        advanced: true,
      },
    ],
    captureModes: [
      {
        mode: 'manual' as const,
        label: 'Manual',
        description: 'Agents save memory only when explicitly asked.',
        enabled: true,
      },
      {
        mode: 'suggest' as const,
        label: 'Suggest',
        description:
          'Agents can stage reviewable memory suggestions where supported.',
        enabled: true,
      },
      {
        mode: 'auto' as const,
        label: 'Auto',
        description:
          'Automatic capture is planned and disabled until capture hooks are implemented.',
        enabled: false,
      },
    ],
  };
}

async function buildTokenScope(
  userId: string,
  options: {
    captureMode?: MemoryCaptureMode | undefined;
    defaultWriteRoomId?: string | undefined;
    memoryScopeKey?: string | undefined;
    memoryStrategy?: MemoryStrategyKind | undefined;
    readableRoomIds?: string[] | undefined;
    writableRoomIds?: string[] | undefined;
    writeRoomIds?: string[] | undefined;
  } = {}
) {
  const writableRooms = await getWritableRoomsByUserId(userId);
  if (
    options.memoryStrategy &&
    options.memoryStrategy !== 'agent-journal' &&
    options.memoryStrategy !== 'project-wiki'
  ) {
    return { error: 'Unsupported memory strategy' as const };
  }
  if (options.captureMode === 'auto') {
    return { error: 'Automatic capture is not enabled yet' as const };
  }
  const writeRoomIds =
    options.writableRoomIds ??
    options.writeRoomIds ??
    getRecommendedWriteRoomIds(writableRooms);
  const readRoomIds = options.readableRoomIds ?? [];
  const writableRoomById = new Map(
    writableRooms.map((room) => [room.id, room])
  );
  const unauthorizedReadRoom = readRoomIds.find(
    (roomId) => !writableRoomById.has(roomId)
  );
  if (unauthorizedReadRoom) {
    return { error: 'Invalid readable room' as const };
  }
  const unauthorizedWriteRoom = writeRoomIds.find(
    (roomId) => !writableRoomById.has(roomId)
  );
  if (unauthorizedWriteRoom) {
    return { error: 'Invalid writable room' as const };
  }
  if (
    options.defaultWriteRoomId &&
    !writeRoomIds.includes(options.defaultWriteRoomId)
  ) {
    return { error: 'Invalid default write room' as const };
  }
  if (
    readRoomIds.length > 0 &&
    writeRoomIds.some((roomId) => !readRoomIds.includes(roomId))
  ) {
    return { error: 'Writable rooms must also be readable' as const };
  }

  const writeCollections = Array.from(
    new Set(
      writeRoomIds.map((roomId) => writableRoomById.get(roomId)?.collectionKey)
    )
  ).filter((collectionKey): collectionKey is string => Boolean(collectionKey));

  if (options.memoryStrategy === 'project-wiki') {
    if (readRoomIds.length === 0) {
      return { error: 'Project Wiki requires readable source rooms' as const };
    }
    if (!writeCollections.includes('projectWikiDrafts')) {
      return {
        error:
          'Project Wiki requires a writable projectWikiDrafts room' as const,
      };
    }
    if (!writeCollections.includes('projectWikiPages')) {
      return {
        error:
          'Project Wiki requires a writable projectWikiPages room' as const,
      };
    }
  }

  const writeAllowedCollections = Array.from(
    new Set(
      writeRoomIds.map((roomId) => writableRoomById.get(roomId)?.collectionKey)
    )
  ).filter((collectionKey): collectionKey is string => Boolean(collectionKey));

  const readAllowedCollections =
    readRoomIds.length > 0
      ? Array.from(
          new Set(
            readRoomIds.map(
              (roomId) => writableRoomById.get(roomId)?.collectionKey
            )
          )
        ).filter((collectionKey): collectionKey is string =>
          Boolean(collectionKey)
        )
      : [...COLLECTION_KEYS];

  return {
    allowedCollections: [...COLLECTION_KEYS],
    allowedRooms: [],
    permissions: 'read' as const,
    readAllowedCollections,
    readAllowedRooms: readRoomIds,
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
      writeScope: 'room',
      tokenTtlSeconds: Math.floor(onboardingTtlMs / 1000),
    },
    dynamicClientRegistrationUrl: `${getAuthServerBaseUrl()}/oauth/register`,
    mcpUrl: getPublicMcpUrl(),
    oauthMetadataUrl: `${getAuthServerBaseUrl()}/.well-known/oauth-authorization-server`,
    smartLinkRule:
      'Never place bearer tokens in URLs. All setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.',
    memoryStrategy: buildMemoryStrategyOverview(writableRooms),
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

    const { clientId, ...scopeOptions } = parsedBody.data;
    if (!isTokenClientId(clientId)) {
      return c.json({ error: 'This client uses OAuth onboarding' }, 400);
    }

    const scope = await buildTokenScope(user.id, scopeOptions);
    if ('error' in scope) {
      return c.json({ error: scope.error }, 403);
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

    const { clientId, ...scopeOptions } = parsedBody.data;
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

    const scope = await buildTokenScope(user.id, scopeOptions);
    if ('error' in scope) {
      return c.json({ error: scope.error }, 403);
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
