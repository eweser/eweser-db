import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, InlineSpinner, LoadingPanel } from './ui';
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

export function ConnectAiPage() {
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

  async function refreshOverview() {
    const result = await getConnectAiOverview();
    setOverview(result);
  }

  useEffect(() => {
    let active = true;

    void getConnectAiOverview()
      .then((result) => {
        if (active) {
          setOverview(result);
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
  }, []);

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

  async function launchOAuthSetup(clientId: 'claude-web' | 'chatgpt-web') {
    const mcpUrl = overview?.mcpUrl;
    if (!mcpUrl) {
      throw new Error('Missing MCP URL for OAuth setup.');
    }

    const clipboard = window.navigator.clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(mcpUrl);
      setOauthNotices((current) => ({
        ...current,
        [clientId]:
          'Copied the Eweser MCP URL. Paste it into the client connector flow that opened in a new tab.',
      }));
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
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Connect AI</h2>
          <p className="mt-3 text-sm text-destructive">
            {error ?? 'Unable to load AI connection options.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
            Account
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">Connect AI</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Use the auth path each client actually supports today. OAuth stays
            on remote HTTP clients. Token bootstrap stays on local or fallback
            clients. {overview.smartLinkRule}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            className="text-emerald-500 hover:text-emerald-400"
            to="/account/security"
          >
            Account security
          </Link>
          <a
            className="text-foreground hover:text-foreground/80"
            href={overview.oauthMetadataUrl}
            rel="noreferrer"
            target="_blank"
          >
            OAuth metadata
          </a>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {overview.clients.map((client) => {
          const setup = setupPayloads[client.clientId];
          const working = activeClient === client.clientId;
          const oauthSteps =
            client.clientId === 'claude-web' ||
            client.clientId === 'chatgpt-web'
              ? oauthClientHelp[client.clientId]
              : null;
          const oauthNoticeProps =
            client.clientId === 'claude-web' ||
            client.clientId === 'chatgpt-web'
              ? oauthNotices[client.clientId]
                ? { oauthNotice: oauthNotices[client.clientId] }
                : {}
              : {};
          const rotateProps =
            client.type === 'oauth'
              ? {}
              : {
                  onRotate: () =>
                    void withClientAction(client.clientId, async () => {
                      const result = await rotateConnectAiToken(
                        client.clientId
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
                  const result = await setupConnectAiToken(client.clientId);
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
              {...oauthNoticeProps}
              {...setupProps}
              {...rotateProps}
            />
          );
        })}
      </div>
    </div>
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
  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">{client.title}</h3>
          <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {client.type === 'oauth' ? 'OAuth' : 'Token'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{client.description}</p>
        {client.fallbackReason ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {client.fallbackReason}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-sm">
        <p>
          Status:{' '}
          <span className="font-medium">
            {client.connection?.status === 'connected'
              ? 'Connected'
              : 'Not connected'}
          </span>
        </p>
        <p className="mt-2 text-muted-foreground">
          Permission: {client.connection?.permissions ?? 'Not issued'}
        </p>
        <p className="mt-2 text-muted-foreground">
          Expires: {formatDate(client.connection?.expiresAt ?? null)}
        </p>
        <p className="mt-2 text-muted-foreground">
          Last used: {formatDate(client.connection?.lastUsedAt ?? null)}
        </p>
      </div>

      {client.type === 'oauth' ? (
        <div className="rounded-xl border border-border/80 bg-background/40 p-4 text-sm">
          <p className="font-medium">Remote MCP URL</p>
          <p className="mt-2 break-all text-muted-foreground">{mcpUrl}</p>
          {oauthSteps ? (
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-muted-foreground">
              {oauthSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          {oauthNotice ? (
            <p className="mt-4 text-xs text-emerald-600">{oauthNotice}</p>
          ) : null}
        </div>
      ) : null}

      {setup ? (
        <div className="space-y-3 rounded-xl border border-border/80 bg-background/40 p-4">
          <p className="text-sm font-medium">{setup.payload.instructions}</p>
          <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
            <code>{setup.payload.snippet}</code>
          </pre>
          {setup.warning ? (
            <p className="text-xs text-muted-foreground">{setup.warning}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-3">
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
    </Card>
  );
}
