import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, InlineSpinner, LoadingPanel } from './ui';
import {
  getConnectAiOverview,
  revokeConnectAi,
  rotateConnectAiToken,
  setupConnectAiToken,
  type ConnectAiClientId,
  type ConnectAiClientOverview,
  type ConnectAiOverviewResponse,
  type ConnectAiSetupResponse,
} from '../lib/api';

const oauthClientHelp: Record<'claude-web' | 'chatgpt-web', string[]> = {
  'claude-web': [
    'Open Claude.ai connectors and add the Eweser MCP URL.',
    'Use the Eweser OAuth flow when Claude prompts for sign-in.',
    'Return here to revoke access if you want Claude to disconnect.',
  ],
  'chatgpt-web': [
    'Enable ChatGPT developer mode in Settings before importing the MCP URL.',
    'Add the Eweser MCP URL as a custom connector and complete the OAuth prompt.',
    'Return here to revoke access or inspect the OAuth metadata endpoint.',
  ],
};

const oauthLaunchUrls: Record<'claude-web' | 'chatgpt-web', string> = {
  'claude-web': 'https://claude.ai/',
  'chatgpt-web': 'https://chatgpt.com/',
};

function formatDate(value: string | null) {
  if (!value) return 'Not yet used';
  return new Date(value).toLocaleString();
}

type WritableRoom = NonNullable<
  ConnectAiOverviewResponse['writableRooms']
>[number];

export const connectAiPreviewOverview: ConnectAiOverviewResponse = {
  clients: [
    {
      clientId: 'claude-desktop',
      connection: {
        expiresAt: '2026-06-20T12:00:00.000Z',
        lastUsedAt: '2026-05-20T08:41:00.000Z',
        permissions: 'readwrite',
        status: 'connected',
        writeRoomCount: 1,
      },
      description:
        'Local stdio setup with @eweser/mcp and a short-lived agent token.',
      fallbackReason: null,
      title: 'Claude Desktop',
      type: 'token',
    },
    {
      clientId: 'chatgpt-web',
      connection: {
        expiresAt: null,
        lastUsedAt: '2026-05-20T07:18:00.000Z',
        permissions: 'read',
        status: 'connected',
      },
      description:
        'Remote HTTP MCP on /mcp with OAuth in ChatGPT developer mode.',
      fallbackReason: null,
      title: 'ChatGPT',
      type: 'oauth',
    },
    {
      clientId: 'codex',
      connection: null,
      description:
        'Remote HTTP MCP config for Codex using bearer_token_env_var.',
      fallbackReason:
        'Use token fallback when the local client cannot complete OAuth yet.',
      title: 'Codex CLI',
      type: 'token-fallback',
    },
    {
      clientId: 'claude-web',
      connection: null,
      description: 'Remote MCP connector setup for Claude web clients.',
      fallbackReason: null,
      title: 'Claude web',
      type: 'oauth',
    },
  ],
  defaults: {
    allowedCollections: 'all',
    permissions: 'readwrite',
    recommendedWritableTarget: 'dedicated-ai-room',
    tokenTtlSeconds: 2592000,
    writeScope: 'room',
  },
  dynamicClientRegistrationUrl: 'https://eweser.com/oauth/register',
  mcpUrl: 'https://eweser.com/mcp',
  memoryStrategy: {
    captureModes: [
      {
        description: 'Agents save memories only when you ask them to.',
        enabled: true,
        label: 'Manual',
        mode: 'manual',
      },
      {
        description: 'Agents suggest memories for later approval.',
        enabled: true,
        label: 'Suggest',
        mode: 'suggest',
      },
      {
        description: 'Automatic memory capture is planned for trusted agents.',
        enabled: false,
        label: 'Auto',
        mode: 'auto',
      },
    ],
    choices: [
      {
        advanced: false,
        description: 'General durable notes, preferences, and decisions.',
        label: 'Agent Journal',
        strategy: 'agent-journal',
      },
      {
        advanced: false,
        description:
          'Source-backed project pages, drafts, and accepted wiki output.',
        label: 'Project Wiki',
        strategy: 'project-wiki',
      },
      {
        advanced: true,
        description: 'Future automatic memory curation.',
        label: 'Auto Curated',
        strategy: 'auto-curated',
      },
    ],
    defaultCaptureMode: 'manual',
    defaultStrategy: 'agent-journal',
    scopes: [
      {
        captureMode: 'manual',
        defaultWriteRoomId: 'room-conversations',
        label: 'Global agent memory',
        readableRoomIds: ['room-conversations', 'room-notes', 'room-projects'],
        scopeKey: 'global',
        scopeType: 'global',
        strategy: 'agent-journal',
        writableRoomIds: ['room-conversations'],
      },
    ],
  },
  oauthMetadataUrl: 'https://eweser.com/.well-known/oauth-authorization-server',
  smartLinkRule:
    'Never place bearer tokens in URLs. All setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.',
  writableRooms: [
    {
      collectionKey: 'conversations',
      id: 'room-conversations',
      name: 'Shared Agent Memory',
      syncBaseUrl: 'https://sync.eweser.com',
      syncUrl: 'wss://sync.eweser.com/rooms/room-conversations',
    },
    {
      collectionKey: 'notes',
      id: 'room-notes',
      name: 'Personal Notes',
      syncBaseUrl: 'https://sync.eweser.com',
      syncUrl: 'wss://sync.eweser.com/rooms/room-notes',
    },
    {
      collectionKey: 'projectWikiDrafts',
      id: 'room-projects',
      name: 'Project Wiki Drafts',
      syncBaseUrl: 'https://sync.eweser.com',
      syncUrl: 'wss://sync.eweser.com/rooms/room-projects',
    },
  ],
};

export function ConnectAiPage({
  previewOverview,
}: {
  previewOverview?: ConnectAiOverviewResponse;
} = {}) {
  const [overview, setOverview] = useState<ConnectAiOverviewResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClient, setActiveClient] = useState<ConnectAiClientId | null>(
    null
  );
  const [setupPayloads, setSetupPayloads] = useState<
    Partial<Record<ConnectAiClientId, ConnectAiSetupResponse>>
  >({});
  const [oauthNotices, setOauthNotices] = useState<
    Partial<Record<'claude-web' | 'chatgpt-web', string>>
  >({});
  const [selectedWriteRoomIds, setSelectedWriteRoomIds] = useState<string[]>(
    []
  );
  const [selectedReadRoomIds, setSelectedReadRoomIds] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState('agent-journal');
  const [selectedCaptureMode, setSelectedCaptureMode] = useState('manual');
  const [defaultWriteRoomId, setDefaultWriteRoomId] = useState<
    string | undefined
  >(undefined);

  function applyOverviewDefaults(result: ConnectAiOverviewResponse) {
    setOverview(result);
    setSelectedWriteRoomIds(getRecommendedWriteRoomIds(result));
    setSelectedReadRoomIds(
      result.memoryStrategy.scopes[0]?.readableRoomIds ?? []
    );
    setDefaultWriteRoomId(result.memoryStrategy.scopes[0]?.defaultWriteRoomId);
    setSelectedStrategy(result.memoryStrategy.defaultStrategy);
    setSelectedCaptureMode(result.memoryStrategy.defaultCaptureMode);
  }

  async function refreshOverview() {
    if (previewOverview) {
      applyOverviewDefaults(previewOverview);
      return;
    }

    const result = await getConnectAiOverview();
    setOverview(result);
  }

  useEffect(() => {
    if (previewOverview) {
      applyOverviewDefaults(previewOverview);
      setLoading(false);
      return;
    }

    let active = true;

    void getConnectAiOverview()
      .then((result) => {
        if (active) {
          applyOverviewDefaults(result);
        }
      })
      .catch((requestError: Error) => {
        if (active) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [previewOverview]);

  async function withClientAction(
    clientId: ConnectAiClientId,
    action: () => Promise<void>
  ) {
    setActiveClient(clientId);
    setError(null);
    try {
      await action();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Connect AI action failed.'
      );
    } finally {
      setActiveClient(null);
    }
  }

  function toggleWriteRoom(roomId: string, checked: boolean) {
    setSelectedWriteRoomIds((current) => {
      if (checked) {
        setSelectedReadRoomIds((readRooms) =>
          readRooms.includes(roomId) ? readRooms : readRooms.concat(roomId)
        );
        setDefaultWriteRoomId((currentDefault) => currentDefault ?? roomId);
        return Array.from(new Set(current.concat(roomId)));
      }
      if (defaultWriteRoomId === roomId) {
        setDefaultWriteRoomId(undefined);
      }
      return current.filter((id) => id !== roomId);
    });
  }

  function toggleReadRoom(roomId: string, checked: boolean) {
    setSelectedReadRoomIds((current) => {
      if (checked) return Array.from(new Set(current.concat(roomId)));
      setSelectedWriteRoomIds((writeRooms) =>
        writeRooms.filter((id) => id !== roomId)
      );
      if (defaultWriteRoomId === roomId) {
        setDefaultWriteRoomId(undefined);
      }
      return current.filter((id) => id !== roomId);
    });
  }

  function handleStrategyChange(nextStrategy: string) {
    setSelectedStrategy(nextStrategy);
    if (nextStrategy !== 'project-wiki') {
      return;
    }

    const projectWikiWriteRoomIds = (overview?.writableRooms ?? [])
      .filter(
        (room) =>
          room.collectionKey === 'projectWikiDrafts' ||
          room.collectionKey === 'projectWikiPages'
      )
      .map((room) => room.id);

    setDefaultWriteRoomId(undefined);
    setSelectedWriteRoomIds((current) =>
      current.filter((roomId) => projectWikiWriteRoomIds.includes(roomId))
    );
    setSelectedReadRoomIds((current) =>
      Array.from(new Set(current.concat(projectWikiWriteRoomIds)))
    );
  }

  function buildSetupOptions() {
    return {
      captureMode: selectedCaptureMode as 'manual' | 'suggest' | 'auto',
      ...(selectedStrategy === 'agent-journal' ? { defaultWriteRoomId } : {}),
      memoryStrategy: selectedStrategy as
        | 'agent-journal'
        | 'project-wiki'
        | 'auto-curated'
        | 'knowledge-graph'
        | 'workspace-intelligence'
        | 'custom',
      readableRoomIds: selectedReadRoomIds,
      writableRoomIds: selectedWriteRoomIds,
    };
  }

  async function launchOAuthSetup(clientId: 'claude-web' | 'chatgpt-web') {
    const mcpUrl = overview?.mcpUrl;
    if (!mcpUrl) {
      throw new Error('Missing MCP URL for OAuth setup.');
    }

    const clipboard = window.navigator.clipboard;
    if (clipboard?.writeText) {
      try {
        await clipboard.writeText(mcpUrl);
        setOauthNotices((current) => ({
          ...current,
          [clientId]:
            'Copied the Eweser MCP URL. Paste it into the client connector flow that opened in a new tab.',
        }));
      } catch {
        setOauthNotices((current) => ({
          ...current,
          [clientId]:
            'Your browser did not allow clipboard access. Copy the Eweser MCP URL from this card and paste it into the client connector flow.',
        }));
      }
    } else {
      setOauthNotices((current) => ({
        ...current,
        [clientId]:
          'Your browser did not allow clipboard access. Copy the Eweser MCP URL from this card and paste it into the client connector flow.',
      }));
    }

    window.open(oauthLaunchUrls[clientId], '_blank', 'noopener,noreferrer');
  }

  if (loading) {
    return (
      <LoadingPanel
        message="Loading your AI connection options..."
        title="Connect AI"
      />
    );
  }

  if (error || !overview) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <section className="mcp-panel">
          <h2 className="mcp-panel-title">Connect AI</h2>
          <p className="mt-3 text-sm text-destructive">
            {error ?? 'Unable to load AI connection options.'}
          </p>
        </section>
      </div>
    );
  }

  const connectedClients = overview.clients.filter(
    (client) => client.connection?.status === 'connected'
  ).length;
  const oauthClients = overview.clients.filter(
    (client) => client.type === 'oauth'
  ).length;
  const tokenClients = overview.clients.length - oauthClients;
  const writableRooms = overview.writableRooms ?? [];

  return (
    <div className="app-console">
      <aside className="app-sidebar" aria-label="Account sections">
        <div className="flex items-center gap-3">
          <span className="app-nav-icon" aria-hidden="true">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <p className="brand-wordmark text-lg text-foreground">EweserDB</p>
            <p className="text-xs text-muted-foreground">Personal data home</p>
          </div>
        </div>
        <nav className="app-nav">
          <Link className="app-nav-link" to="/home">
            <Database className="h-4 w-4" />
            Overview
          </Link>
          <Link className="app-nav-link" to="/apps">
            <PlugZap className="h-4 w-4" />
            Apps
          </Link>
          <Link className="app-nav-link" data-active="true" to="/ai">
            <Bot className="h-4 w-4" />
            MCP clients
          </Link>
          <Link className="app-nav-link" to="/security">
            <ShieldCheck className="h-4 w-4" />
            Security
          </Link>
        </nav>
        <div className="app-sidebar-card">
          <p className="app-sidebar-title">Scoped by default</p>
          <p className="app-sidebar-copy">
            AI clients receive only the rooms and write behavior you choose on
            this page.
          </p>
        </div>
      </aside>

      <main className="mcp-page">
        <h2 className="sr-only">Connect AI</h2>
        <section className="mcp-hero">
          <div className="mcp-hero-copy">
            <p className="mcp-eyebrow">Account / MCP clients</p>
            <h1 className="mcp-hero-title">
              Connect AI without surrendering the pasture.
            </h1>
            <p>
              Use the auth path each client actually supports today. OAuth stays
              on remote HTTP clients. Token bootstrap stays on local or fallback
              clients. {overview.smartLinkRule}
            </p>
          </div>
          <div className="mcp-command-card">
            <div>
              <span className="mcp-chip">
                <Copy className="h-3.5 w-3.5" /> MCP endpoint
              </span>
              <div className="mcp-code-line" aria-label={overview.mcpUrl}>
                Remote MCP endpoint ready
              </div>
            </div>
            <div className="mcp-meta-links">
              <a
                className="inline-flex items-center gap-1 no-underline"
                href={overview.oauthMetadataUrl}
                rel="noreferrer"
                target="_blank"
              >
                OAuth metadata <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Link
                className="inline-flex items-center gap-1 no-underline"
                to="/account/security"
              >
                Account security <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <p className="my-4 text-sm text-destructive">{error}</p>
        ) : null}

        <div className="mcp-summary-grid" aria-label="MCP overview metrics">
          <SummaryCard
            icon={<PlugZap className="h-5 w-5" />}
            label="Connected clients"
            value={`${connectedClients}/${overview.clients.length}`}
          />
          <SummaryCard
            icon={<KeyRound className="h-5 w-5" />}
            label="Token clients"
            value={String(tokenClients)}
          />
          <SummaryCard
            icon={<LockKeyhole className="h-5 w-5" />}
            label="Writable rooms"
            value={String(selectedWriteRoomIds.length)}
          />
          <SummaryCard
            icon={<RefreshCw className="h-5 w-5" />}
            label="OAuth clients"
            value={String(oauthClients)}
          />
        </div>

        <div className="mcp-layout-grid">
          <MemoryStrategySettings
            captureMode={selectedCaptureMode}
            defaultWriteRoomId={defaultWriteRoomId}
            memoryStrategy={overview.memoryStrategy}
            rooms={writableRooms}
            selectedReadRoomIds={selectedReadRoomIds}
            selectedStrategy={selectedStrategy}
            selectedWriteRoomIds={selectedWriteRoomIds}
            onCaptureModeChange={setSelectedCaptureMode}
            onDefaultWriteRoomChange={setDefaultWriteRoomId}
            onReadRoomToggle={toggleReadRoom}
            onStrategyChange={handleStrategyChange}
            onWriteRoomToggle={toggleWriteRoom}
          />

          <WritableRoomSelector
            rooms={writableRooms}
            selectedRoomIds={selectedWriteRoomIds}
            onToggleRoom={toggleWriteRoom}
          />
        </div>

        <section className="mcp-panel mcp-clients-section">
          <div className="mcp-panel-header">
            <div>
              <h2 className="mcp-panel-title">Client setup</h2>
              <p className="mcp-panel-copy">
                Prepare local tokens, launch OAuth clients, rotate credentials,
                or revoke a client from the same permission surface.
              </p>
            </div>
            <span className="mcp-chip">{overview.clients.length} clients</span>
          </div>

          <div className="mcp-client-grid">
            {overview.clients.map((client) => {
              const setup = setupPayloads[client.clientId];
              const working = activeClient === client.clientId;
              const oauthSteps =
                client.clientId === 'claude-web' ||
                client.clientId === 'chatgpt-web'
                  ? oauthClientHelp[client.clientId]
                  : null;
              const rotateProps =
                client.type === 'oauth'
                  ? {}
                  : {
                      onRotate: () =>
                        void withClientAction(client.clientId, async () => {
                          const result = await rotateConnectAiToken(
                            client.clientId,
                            buildSetupOptions()
                          );
                          setSetupPayloads((current) => ({
                            ...current,
                            [client.clientId]: result,
                          }));
                          await refreshOverview();
                        }),
                    };
              const setupProps = setup ? { setup } : {};

              return (
                <ClientCard
                  key={client.clientId}
                  client={client}
                  mcpUrl={overview.mcpUrl}
                  oauthSteps={oauthSteps}
                  oauthNotice={
                    client.clientId === 'claude-web' ||
                    client.clientId === 'chatgpt-web'
                      ? oauthNotices[client.clientId]
                      : undefined
                  }
                  working={working}
                  onConnect={() =>
                    void withClientAction(client.clientId, async () => {
                      if (
                        client.clientId === 'claude-web' ||
                        client.clientId === 'chatgpt-web'
                      ) {
                        await launchOAuthSetup(client.clientId);
                        return;
                      }
                      const result = await setupConnectAiToken(
                        client.clientId,
                        {
                          ...buildSetupOptions(),
                        }
                      );
                      setSetupPayloads((current) => ({
                        ...current,
                        [client.clientId]: result,
                      }));
                      await refreshOverview();
                    })
                  }
                  onRevoke={() =>
                    void withClientAction(client.clientId, async () => {
                      await revokeConnectAi(client.clientId);
                      setSetupPayloads((current) => ({
                        ...current,
                        [client.clientId]: undefined,
                      }));
                      await refreshOverview();
                    })
                  }
                  {...setupProps}
                  {...rotateProps}
                />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="mcp-summary-card">
      <span className="mcp-summary-icon" aria-hidden="true">
        {icon}
      </span>
      <p className="mcp-summary-label">{label}</p>
      <p className="mcp-summary-value">{value}</p>
    </div>
  );
}

function MemoryStrategySettings({
  captureMode,
  defaultWriteRoomId,
  memoryStrategy,
  rooms,
  selectedReadRoomIds,
  selectedStrategy,
  selectedWriteRoomIds,
  onCaptureModeChange,
  onDefaultWriteRoomChange,
  onReadRoomToggle,
  onStrategyChange,
  onWriteRoomToggle,
}: {
  captureMode: string;
  defaultWriteRoomId?: string | undefined;
  memoryStrategy: ConnectAiOverviewResponse['memoryStrategy'];
  rooms: WritableRoom[];
  selectedReadRoomIds: string[];
  selectedStrategy: string;
  selectedWriteRoomIds: string[];
  onCaptureModeChange: (mode: string) => void;
  onDefaultWriteRoomChange: (roomId: string | undefined) => void;
  onReadRoomToggle: (roomId: string, checked: boolean) => void;
  onStrategyChange: (strategy: string) => void;
  onWriteRoomToggle: (roomId: string, checked: boolean) => void;
}) {
  return (
    <section className="mcp-panel">
      <div className="mcp-panel-header">
        <div>
          <h2 className="mcp-panel-title">Memory strategy</h2>
          <p className="mcp-panel-copy">
            Choose the memory strategy, capture mode, and room boundaries that
            token clients receive. Personal rooms stay read-only or off unless
            you explicitly select them.
          </p>
        </div>
        <span className="mcp-chip">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {selectedStrategy === 'project-wiki'
            ? 'Project Wiki'
            : 'Agent Journal'}
        </span>
      </div>

      <div className="mcp-primer-grid">
        <div className="mcp-primer-item">
          <strong>Shared Agent Memory</strong>
          <p>
            A shared notebook for AI tools to remember durable decisions,
            preferences, project context, and follow-ups.
          </p>
        </div>
        <div className="mcp-primer-item">
          <strong>Recommended setup</strong>
          <p>
            Keep one writable Conversations room selected. Leave personal notes
            read-only or off unless you want agents to use them.
          </p>
        </div>
        <div className="mcp-primer-item">
          <strong>Read and write</strong>
          <p>
            Read lets an agent use a room as context. Write lets it save new
            memory there.
          </p>
        </div>
      </div>

      <div className="mcp-field-grid">
        <label className="mcp-field">
          <span>Strategy</span>
          <select
            value={selectedStrategy}
            onChange={(event) => onStrategyChange(event.target.value)}
          >
            {memoryStrategy.choices.map((choice) => (
              <option
                key={choice.strategy}
                disabled={
                  choice.strategy !== 'agent-journal' &&
                  choice.strategy !== 'project-wiki'
                }
                value={choice.strategy}
              >
                {choice.label}
                {choice.advanced ? ' (advanced)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="mcp-field">
          <span>Capture mode</span>
          <select
            value={captureMode}
            onChange={(event) => onCaptureModeChange(event.target.value)}
          >
            {memoryStrategy.captureModes.map((mode) => (
              <option
                key={mode.mode}
                disabled={!mode.enabled}
                value={mode.mode}
              >
                {mode.label}
                {mode.enabled ? '' : ' (planned)'}
              </option>
            ))}
          </select>
        </label>

        <label className="mcp-field">
          <span>Default write room</span>
          <select
            disabled={selectedStrategy === 'project-wiki'}
            value={defaultWriteRoomId ?? ''}
            onChange={(event) =>
              onDefaultWriteRoomChange(event.target.value || undefined)
            }
          >
            <option value="">None</option>
            {rooms
              .filter((room) => selectedWriteRoomIds.includes(room.id))
              .map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
          </select>
          <small>
            {selectedStrategy === 'project-wiki'
              ? 'Project Wiki writes drafts and accepted pages to dedicated wiki rooms. Default write room is not used there.'
              : 'Agent Journal can infer the write target only when exactly one writable conversations room is selected.'}
          </small>
        </label>
      </div>

      {selectedStrategy === 'project-wiki' ? (
        <div className="mcp-project-note mt-4 text-sm text-muted-foreground">
          Project Wiki is available for seeded project scopes. Select readable
          source rooms plus writable `projectWikiDrafts` and `projectWikiPages`
          rooms. The canonical strategy config still lives in
          `memoryStrategyConfigs`; this screen only scopes the token.
        </div>
      ) : null}

      <div className="mcp-room-grid">
        {rooms.map((room) => (
          <div key={room.id} className="mcp-room-card">
            <div className="mcp-row-header">
              <span className="min-w-0">
                <span className="mcp-room-title block truncate">
                  {room.name}
                </span>
                <span className="mcp-room-meta block truncate">
                  {room.collectionKey}
                </span>
              </span>
              <span className="mcp-chip">Scope</span>
            </div>
            <div className="mcp-room-actions">
              <label className="flex items-center gap-2">
                <input
                  checked={selectedReadRoomIds.includes(room.id)}
                  className="mcp-checkbox"
                  type="checkbox"
                  onChange={(event) =>
                    onReadRoomToggle(room.id, event.target.checked)
                  }
                />
                Read
              </label>
              <label className="flex items-center gap-2">
                <input
                  checked={selectedWriteRoomIds.includes(room.id)}
                  className="mcp-checkbox"
                  disabled={!selectedReadRoomIds.includes(room.id)}
                  type="checkbox"
                  onChange={(event) =>
                    onWriteRoomToggle(room.id, event.target.checked)
                  }
                />
                Write
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function getRecommendedWriteRoomIds(
  overview: ConnectAiOverviewResponse
): string[] {
  const writableRooms = overview.writableRooms ?? [];
  return writableRooms
    .filter((room) => room.collectionKey === 'conversations')
    .map((room) => room.id);
}

function WritableRoomSelector({
  rooms,
  selectedRoomIds,
  onToggleRoom,
}: {
  rooms: WritableRoom[];
  selectedRoomIds: string[];
  onToggleRoom: (roomId: string, checked: boolean) => void;
}) {
  return (
    <section className="mcp-panel">
      <div className="mcp-panel-header">
        <div>
          <h2 className="mcp-panel-title">Writable AI area</h2>
          <p className="mcp-panel-copy">
            Token clients can read your allowed database by default. Select only
            the rooms where they may save memories, session summaries, or draft
            notes.
          </p>
        </div>
        <span className="mcp-chip">Recommended</span>
      </div>

      {rooms.length > 0 ? (
        <div className="mcp-writable-list">
          {rooms.map((room) => (
            <label key={room.id} className="mcp-writable-room">
              <span className="min-w-0">
                <span className="mcp-room-title block truncate">
                  {room.name}
                </span>
                <span className="mcp-room-meta block truncate">
                  {room.collectionKey}
                </span>
              </span>
              <input
                checked={selectedRoomIds.includes(room.id)}
                className="mcp-checkbox"
                onChange={(event) =>
                  onToggleRoom(room.id, event.target.checked)
                }
                type="checkbox"
              />
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Create a Conversations room or a dedicated AI Notes room in Eweser,
          then return here and select it as a writable room for token clients.
        </p>
      )}
    </section>
  );
}

function ClientCard({
  client,
  mcpUrl,
  oauthSteps,
  oauthNotice,
  onConnect,
  onRevoke,
  onRotate,
  setup,
  working,
}: {
  client: ConnectAiClientOverview;
  mcpUrl: string;
  oauthSteps: string[] | null;
  oauthNotice?: string | undefined;
  onConnect: () => void;
  onRevoke: () => void;
  onRotate?: () => void;
  setup?: ConnectAiSetupResponse;
  working: boolean;
}) {
  const connected = client.connection?.status === 'connected';

  return (
    <article className="mcp-client-card">
      <div className="mcp-client-head">
        <div className="flex items-start gap-3">
          <span className="mcp-client-icon" aria-hidden="true">
            {client.type === 'oauth' ? (
              <PlugZap className="h-5 w-5" />
            ) : (
              <KeyRound className="h-5 w-5" />
            )}
          </span>
          <div>
            <h3 className="mcp-client-title">{client.title}</h3>
            <p className="mcp-client-copy">{client.description}</p>
          </div>
        </div>
        <span className="mcp-chip">
          {client.type === 'oauth' ? 'OAuth' : 'Token'}
        </span>
      </div>

      {client.fallbackReason ? (
        <p className="mcp-client-muted">{client.fallbackReason}</p>
      ) : null}

      <div className="mcp-status-table">
        <div className="mcp-status-row">
          <span>Status:</span>
          <strong className="inline-flex items-center gap-1">
            {connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            {connected ? 'Connected' : 'Not connected'}
          </strong>
        </div>
        <div className="mcp-status-row">
          <span>Permission:</span>
          <strong>{client.connection?.permissions ?? 'Not issued'}</strong>
        </div>
        {client.type !== 'oauth' ? (
          <div className="mcp-status-row">
            <span>Write scope:</span>
            <strong>
              {client.connection
                ? formatWriteScope(client.connection.writeRoomCount)
                : 'Not issued'}
            </strong>
            <span className="sr-only">
              Write scope:{' '}
              {client.connection
                ? formatWriteScope(client.connection.writeRoomCount)
                : 'Not issued'}
            </span>
          </div>
        ) : null}
        <div className="mcp-status-row">
          <span>Expires:</span>
          <strong>{formatDate(client.connection?.expiresAt ?? null)}</strong>
        </div>
        <div className="mcp-status-row">
          <span>Last used:</span>
          <strong>{formatDate(client.connection?.lastUsedAt ?? null)}</strong>
        </div>
      </div>

      {client.type === 'oauth' ? (
        <div className="mcp-oauth-box text-sm">
          <p className="font-medium text-foreground">Remote MCP URL</p>
          <p className="mt-2 break-all text-muted-foreground">{mcpUrl}</p>
          {oauthSteps ? (
            <ol className="mcp-step-list">
              {oauthSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          {oauthNotice ? (
            <p className="mt-4 text-xs text-primary">{oauthNotice}</p>
          ) : null}
        </div>
      ) : null}

      {setup ? (
        <div className="mcp-setup-box space-y-3">
          <p className="text-sm font-medium text-foreground">
            {setup.payload.instructions}
          </p>
          <pre className="mcp-setup-code">
            <code>{setup.payload.snippet}</code>
          </pre>
          {setup.warning ? (
            <p className="text-xs text-muted-foreground">{setup.warning}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mcp-client-actions">
        <Button disabled={working} type="button" onClick={onConnect}>
          {working ? (
            <InlineSpinner />
          ) : client.type === 'oauth' ? (
            'Open connector flow'
          ) : (
            'Prepare setup'
          )}
        </Button>
        {onRotate ? (
          <Button
            disabled={working || !client.connection}
            tone="outline"
            type="button"
            onClick={onRotate}
          >
            Rotate
          </Button>
        ) : null}
        <Button
          disabled={working || !client.connection}
          tone="outline"
          type="button"
          onClick={onRevoke}
        >
          Revoke
        </Button>
      </div>
    </article>
  );
}

function formatWriteScope(writeRoomCount?: number): string {
  if (!writeRoomCount) return 'None';
  return `${writeRoomCount} room${writeRoomCount === 1 ? '' : 's'}`;
}
