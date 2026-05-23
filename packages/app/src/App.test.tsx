import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

const authMocks = vi.hoisted(() => ({
  disable2fa: vi.fn(),
  enable2fa: vi.fn(),
  generateBackupCodes: vi.fn(),
  getTotpUri: vi.fn(),
  signInEmail: vi.fn(),
  signInSocial: vi.fn(),
  signOut: vi.fn(),
  signUpEmail: vi.fn(),
}));

const apiMocks = vi.hoisted(() => ({
  acceptInvite: vi.fn(),
  getAccountBootstrap: vi.fn(),
  getConnectedApps: vi.fn(),
  getConnectAiOverview: vi.fn(),
  revokeConnectedApp: vi.fn(),
  revokeConnectAi: vi.fn(),
  rotateConnectAiToken: vi.fn(),
  setupConnectAiToken: vi.fn(),
  submitPermissions: vi.fn(),
}));

const configMocks = vi.hoisted(() => ({
  signUpCaptchaEnabled: false,
  turnstileSiteKey: '',
}));

let sessionState: {
  data: null | { session: { id: string }; user: { email: string; id: string } };
  error: null;
  isPending: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
};

vi.mock('./lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: authMocks.signInEmail,
      social: authMocks.signInSocial,
    },
    signOut: authMocks.signOut,
    signUp: {
      email: authMocks.signUpEmail,
    },
    twoFactor: {
      disable: authMocks.disable2fa,
      enable: authMocks.enable2fa,
      generateBackupCodes: authMocks.generateBackupCodes,
      getTotpUri: authMocks.getTotpUri,
    },
    useSession: () => sessionState,
  },
}));

vi.mock('./lib/api', () => ({
  acceptInvite: apiMocks.acceptInvite,
  getAccountBootstrap: apiMocks.getAccountBootstrap,
  getConnectedApps: apiMocks.getConnectedApps,
  getConnectAiOverview: apiMocks.getConnectAiOverview,
  revokeConnectedApp: apiMocks.revokeConnectedApp,
  revokeConnectAi: apiMocks.revokeConnectAi,
  rotateConnectAiToken: apiMocks.rotateConnectAiToken,
  setupConnectAiToken: apiMocks.setupConnectAiToken,
  submitPermissions: apiMocks.submitPermissions,
}));

vi.mock('./lib/config', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return {
    ...actual,
    get signUpCaptchaEnabled() {
      return configMocks.signUpCaptchaEnabled;
    },
    get turnstileSiteKey() {
      return configMocks.turnstileSiteKey;
    },
  };
});

vi.mock('./components/turnstile', () => ({
  TurnstileCaptcha: ({
    onTokenChange,
  }: {
    onTokenChange: (token: string | null) => void;
  }) => (
    <button onClick={() => onTokenChange('captcha-token')} type="button">
      Complete captcha
    </button>
  ),
}));

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>
  );
}

function getRequiredInput(id: string) {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected input #${id} to exist`);
  }
  return element;
}

function defaultMemoryStrategy(roomIds: string[] = []) {
  const defaultWriteRoomId = roomIds[0];
  return {
    defaultStrategy: 'agent-journal' as const,
    defaultCaptureMode: 'manual' as const,
    scopes: [
      {
        scopeType: 'global' as const,
        scopeKey: 'default',
        label: 'Shared Agent Memory',
        strategy: 'agent-journal' as const,
        captureMode: 'manual' as const,
        ...(defaultWriteRoomId ? { defaultWriteRoomId } : {}),
        readableRoomIds: roomIds,
        writableRoomIds: roomIds,
      },
    ],
    choices: [
      {
        strategy: 'agent-journal' as const,
        label: 'Shared Agent Memory',
        description: 'Portable manual memory.',
        advanced: false,
      },
      {
        strategy: 'project-wiki' as const,
        label: 'Project Wiki',
        description: 'Deterministic project knowledge.',
        advanced: false,
      },
    ],
    captureModes: [
      {
        mode: 'manual' as const,
        label: 'Manual',
        description: 'Explicit saves only.',
        enabled: true,
      },
      {
        mode: 'suggest' as const,
        label: 'Suggest',
        description: 'Stage suggested memories.',
        enabled: true,
      },
      {
        mode: 'auto' as const,
        label: 'Auto',
        description: 'Planned.',
        enabled: false,
      },
    ],
  };
}

describe('auth-pages app', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    configMocks.signUpCaptchaEnabled = false;
    configMocks.turnstileSiteKey = '';
    sessionState = {
      data: null,
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ status: true }),
        ok: true,
      }))
    );
    Object.defineProperty(window, 'open', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    apiMocks.getAccountBootstrap.mockResolvedValue({
      profileRooms: [],
      rooms: [],
      user: {
        email: 'test@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        name: 'Test User',
      },
      userCount: 1,
    });
    apiMocks.getConnectedApps.mockResolvedValue({
      connectedApps: [],
    });
    apiMocks.revokeConnectedApp.mockResolvedValue({
      grantId: 'grant-1',
      status: 'revoked',
    });
    apiMocks.getConnectAiOverview.mockResolvedValue({
      clients: [],
      defaults: {
        allowedCollections: 'all-supported-collections',
        permissions: 'read',
        tokenTtlSeconds: 604800,
      },
      dynamicClientRegistrationUrl: 'https://eweser.com/oauth/register',
      mcpUrl: 'https://eweser.com/mcp',
      memoryStrategy: defaultMemoryStrategy(),
      oauthMetadataUrl:
        'https://eweser.com/.well-known/oauth-authorization-server',
      smartLinkRule:
        'Never place bearer tokens in URLs. All setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.',
      writableRooms: [],
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should redirect unauthenticated users away from the home route', async () => {
    renderApp('/home');

    expect(
      await screen.findByRole('heading', { name: /welcome back/i })
    ).toBeInTheDocument();
  });

  it('should redirect unauthenticated users away from the root app route', async () => {
    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: /welcome back/i })
    ).toBeInTheDocument();
  });

  it('renders the Personal Data Home route for signed-in users', async () => {
    sessionState = {
      data: {
        session: { id: 'session-1' },
        user: { email: 'test@example.com', id: 'user-1' },
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };

    renderApp('/');

    expect(
      await screen.findByRole('heading', {
        name: /everything your apps can touch/i,
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/connected apps/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ai grants/i).length).toBeGreaterThan(0);
  });

  it('uses local redirect query params after normal sign-in', async () => {
    authMocks.signInEmail.mockResolvedValue({
      data: {
        token: 'token-1',
        user: { email: 'test@example.com', id: 'user-1' },
      },
      error: null,
    });

    renderApp('/sign-in?redirect=/ai');

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(authMocks.signInEmail).toHaveBeenCalledOnce();
    });

    expect(authMocks.signInEmail.mock.calls[0]?.[0]).toMatchObject({
      callbackURL: 'http://localhost:3000/ai',
    });
  });

  it('accepts the legacy /auth/sign-in route', async () => {
    renderApp('/auth/sign-in?redirect=/ai');

    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^sign in$/i })
    ).toBeInTheDocument();
  });

  it('should sign in and redirect to the permission page when a login query is present', async () => {
    authMocks.signInEmail.mockImplementation(async () => {
      sessionState = {
        data: {
          session: { id: 'session-1' },
          user: { email: 'test@example.com', id: 'user-1' },
        },
        error: null,
        isPending: false,
        isRefetching: false,
        refetch: vi.fn().mockResolvedValue(undefined),
      };

      return {
        data: {
          token: 'token-1',
          user: { email: 'test@example.com', id: 'user-1' },
        },
        error: null,
      };
    });

    apiMocks.getAccountBootstrap.mockResolvedValue({
      profileRooms: [],
      rooms: [],
      user: {
        email: 'test@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        name: 'Test User',
      },
      userCount: 1,
    });

    renderApp(
      '/sign-in?redirect=https://example.com/callback&domain=example.com&collections=all&name=Example%20App'
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(authMocks.signInEmail).toHaveBeenCalledOnce();
    });

    expect(
      await screen.findByRole('heading', {
        name: /grant access to your data layer/i,
      })
    ).toBeInTheDocument();
    expect(authMocks.signInEmail.mock.calls[0]?.[0]).toMatchObject({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('requires captcha before submitting signup when captcha is enabled', async () => {
    configMocks.signUpCaptchaEnabled = true;
    configMocks.turnstileSiteKey = 'site-key';

    renderApp('/sign-up');

    await userEvent.type(getRequiredInput('sign-up-name'), 'Test User');
    await userEvent.type(getRequiredInput('sign-up-email'), 'test@example.com');
    await userEvent.type(getRequiredInput('sign-up-password'), 'password123');

    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeDisabled();

    expect(authMocks.signUpEmail).not.toHaveBeenCalled();
  });

  it('adds the captcha token to signup requests when captcha is enabled', async () => {
    configMocks.signUpCaptchaEnabled = true;
    configMocks.turnstileSiteKey = 'site-key';

    authMocks.signUpEmail.mockResolvedValue({
      data: {
        token: 'signup-token',
        user: { email: 'test@example.com', id: 'user-1' },
      },
      error: null,
    });

    renderApp('/sign-up');

    await userEvent.type(getRequiredInput('sign-up-name'), 'Test User');
    await userEvent.type(getRequiredInput('sign-up-email'), 'test@example.com');
    await userEvent.type(getRequiredInput('sign-up-password'), 'password123');
    await userEvent.click(
      screen.getByRole('button', {
        name: /complete captcha/i,
      })
    );
    await userEvent.click(
      screen.getByRole('button', { name: /create account/i })
    );

    await waitFor(() => {
      expect(authMocks.signUpEmail).toHaveBeenCalledOnce();
    });

    expect(authMocks.signUpEmail.mock.calls[0]?.[0]).toMatchObject({
      email: 'test@example.com',
      fetchOptions: {
        headers: {
          'x-captcha-response': 'captcha-token',
        },
      },
      name: 'Test User',
      password: 'password123',
    });
  });

  it('renders the Connect AI page for signed-in users', async () => {
    sessionState = {
      data: {
        session: { id: 'session-1' },
        user: { email: 'test@example.com', id: 'user-1' },
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };

    apiMocks.getConnectAiOverview.mockResolvedValue({
      clients: [
        {
          clientId: 'claude-desktop',
          connection: {
            expiresAt: null,
            lastUsedAt: null,
            permissions: 'read',
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
          clientId: 'openclaw',
          connection: null,
          description:
            'Remote HTTP MCP setup for OpenClaw using streamable-http and an explicit Authorization header.',
          fallbackReason:
            'OpenClaw stores outbound MCP servers under mcp.servers. Run openclaw mcp set eweser with the generated server JSON.',
          title: 'OpenClaw',
          type: 'token',
        },
      ],
      defaults: {
        allowedCollections: 'all-supported-collections',
        permissions: 'read',
        tokenTtlSeconds: 604800,
      },
      dynamicClientRegistrationUrl: 'https://eweser.com/oauth/register',
      mcpUrl: 'https://eweser.com/mcp',
      memoryStrategy: defaultMemoryStrategy(['room-conversations']),
      oauthMetadataUrl:
        'https://eweser.com/.well-known/oauth-authorization-server',
      smartLinkRule:
        'Never place bearer tokens in URLs. All setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.',
      writableRooms: [
        {
          id: 'room-conversations',
          name: 'Conversations',
          collectionKey: 'conversations',
          syncUrl: null,
          syncBaseUrl: null,
        },
        {
          id: 'room-ai',
          name: 'AI Notes',
          collectionKey: 'notes',
          syncUrl: null,
          syncBaseUrl: null,
        },
      ],
    });

    renderApp('/account/connect-ai');

    expect(
      await screen.findByRole('heading', { name: /connect ai/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText(/claude desktop/i)).toBeInTheDocument();
    expect(screen.getByText(/openclaw setup/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/openclaw mcp set eweser/i).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/shared agent memory/i).length).toBeGreaterThan(
      0
    );
    expect(
      screen.getByText(/a shared notebook for ai tools/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/read lets an agent/i)).toBeInTheDocument();
    expect(screen.getByText(/writable ai area/i)).toBeInTheDocument();
    expect(screen.getByText(/write scope: 1 room/i)).toBeInTheDocument();
  });

  it('creates a setup payload from the Connect AI page', async () => {
    sessionState = {
      data: {
        session: { id: 'session-1' },
        user: { email: 'test@example.com', id: 'user-1' },
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };

    apiMocks.getConnectAiOverview.mockResolvedValue({
      clients: [
        {
          clientId: 'claude-desktop',
          connection: null,
          description:
            'Local stdio setup with @eweser/mcp and a short-lived agent token.',
          fallbackReason: null,
          title: 'Claude Desktop',
          type: 'token',
        },
      ],
      defaults: {
        allowedCollections: 'all-supported-collections',
        permissions: 'read',
        tokenTtlSeconds: 604800,
      },
      dynamicClientRegistrationUrl: 'https://eweser.com/oauth/register',
      mcpUrl: 'https://eweser.com/mcp',
      memoryStrategy: defaultMemoryStrategy(['room-conversations']),
      oauthMetadataUrl:
        'https://eweser.com/.well-known/oauth-authorization-server',
      smartLinkRule:
        'Never place bearer tokens in URLs. All setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.',
      writableRooms: [
        {
          id: 'room-conversations',
          name: 'Conversations',
          collectionKey: 'conversations',
          syncUrl: null,
          syncBaseUrl: null,
        },
        {
          id: 'room-ai',
          name: 'AI Notes',
          collectionKey: 'notes',
          syncUrl: null,
          syncBaseUrl: null,
        },
      ],
    });
    apiMocks.setupConnectAiToken.mockResolvedValue({
      agent: { id: 'agent-1', permissions: 'read', tokenExpiresAt: null },
      clientId: 'claude-desktop',
      payload: {
        configFormat: 'json',
        instructions: 'Paste this into Claude Desktop config.',
        snippet: '{\n  "mcpServers": {}\n}',
      },
      token: 'raw-token',
      warning: 'This token is shown only on this authenticated page.',
    });

    renderApp('/account/connect-ai');

    const buttons = await screen.findAllByRole('button', {
      name: /prepare setup/i,
    });
    const button = buttons[0];
    if (!button) {
      throw new Error('Expected connect AI setup button to exist');
    }
    await userEvent.click(button);

    await waitFor(() => {
      expect(apiMocks.setupConnectAiToken).toHaveBeenCalledWith(
        'claude-desktop',
        {
          captureMode: 'manual',
          defaultWriteRoomId: 'room-conversations',
          memoryStrategy: 'agent-journal',
          readableRoomIds: ['room-conversations'],
          writableRoomIds: ['room-conversations'],
        }
      );
    });

    expect(
      await screen.findByText(/paste this into claude desktop config/i)
    ).toBeInTheDocument();
  });

  it('omits defaultWriteRoomId from project-wiki setup payloads', async () => {
    sessionState = {
      data: {
        session: { id: 'session-1' },
        user: { email: 'test@example.com', id: 'user-1' },
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };

    apiMocks.getConnectAiOverview.mockResolvedValue({
      clients: [
        {
          clientId: 'codex',
          connection: null,
          description:
            'Remote HTTP MCP config for Codex using bearer_token_env_var.',
          fallbackReason: null,
          title: 'Codex',
          type: 'token-fallback',
        },
      ],
      defaults: {
        allowedCollections: 'all-supported-collections',
        permissions: 'read',
        tokenTtlSeconds: 604800,
      },
      dynamicClientRegistrationUrl: 'https://eweser.com/oauth/register',
      mcpUrl: 'https://eweser.com/mcp',
      memoryStrategy: defaultMemoryStrategy(['room-source']),
      oauthMetadataUrl:
        'https://eweser.com/.well-known/oauth-authorization-server',
      smartLinkRule:
        'Never place bearer tokens in URLs. All setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.',
      writableRooms: [
        {
          id: 'room-source',
          name: 'Project Memory',
          collectionKey: 'conversations',
          syncUrl: null,
          syncBaseUrl: null,
        },
        {
          id: 'room-drafts',
          name: 'Wiki Drafts',
          collectionKey: 'projectWikiDrafts',
          syncUrl: null,
          syncBaseUrl: null,
        },
        {
          id: 'room-pages',
          name: 'Wiki Pages',
          collectionKey: 'projectWikiPages',
          syncUrl: null,
          syncBaseUrl: null,
        },
      ],
    });
    apiMocks.setupConnectAiToken.mockResolvedValue({
      agent: { id: 'agent-1', permissions: 'read', tokenExpiresAt: null },
      clientId: 'codex',
      payload: {
        configFormat: 'toml',
        instructions: 'Add this to ~/.codex/config.toml.',
        snippet: '[mcp_servers.eweser]',
      },
      token: 'raw-token',
    });

    renderApp('/account/connect-ai');

    await screen.findByRole('heading', { name: /connect ai/i, level: 2 });
    await userEvent.selectOptions(
      screen.getByLabelText(/strategy/i),
      'project-wiki'
    );
    const button = await screen.findByRole('button', {
      name: /prepare setup/i,
    });
    await userEvent.click(button);

    await waitFor(() => {
      expect(apiMocks.setupConnectAiToken).toHaveBeenCalledWith(
        'codex',
        expect.objectContaining({
          captureMode: 'manual',
          memoryStrategy: 'project-wiki',
        })
      );
    });
    expect(apiMocks.setupConnectAiToken).toHaveBeenCalledTimes(1);
    expect(apiMocks.setupConnectAiToken.mock.calls[0]?.[1]).not.toHaveProperty(
      'defaultWriteRoomId'
    );

    expect(
      screen.getByText(/Project Wiki is available for seeded project scopes/i)
    ).toBeInTheDocument();
  });

  it('launches OAuth setup from the Connect AI page', async () => {
    sessionState = {
      data: {
        session: { id: 'session-1' },
        user: { email: 'test@example.com', id: 'user-1' },
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };

    apiMocks.getConnectAiOverview.mockResolvedValue({
      clients: [
        {
          clientId: 'chatgpt-web',
          connection: null,
          description:
            'Remote HTTP MCP on /mcp with OAuth in ChatGPT developer mode.',
          fallbackReason: null,
          title: 'ChatGPT web',
          type: 'oauth',
        },
      ],
      defaults: {
        allowedCollections: 'all-supported-collections',
        permissions: 'read',
        tokenTtlSeconds: 604800,
      },
      dynamicClientRegistrationUrl: 'https://eweser.com/oauth/register',
      mcpUrl: 'https://eweser.com/mcp',
      memoryStrategy: defaultMemoryStrategy(),
      oauthMetadataUrl:
        'https://eweser.com/.well-known/oauth-authorization-server',
      smartLinkRule:
        'Never place bearer tokens in URLs. All setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.',
      writableRooms: [],
    });

    renderApp('/account/connect-ai');

    const buttons = await screen.findAllByRole('button', {
      name: /open connector flow/i,
    });
    const button = buttons[0];
    if (!button) {
      throw new Error('Expected OAuth connect button to exist');
    }
    await userEvent.click(button);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://eweser.com/mcp'
      );
      expect(window.open).toHaveBeenCalledWith(
        'https://chatgpt.com/',
        '_blank',
        'noopener,noreferrer'
      );
    });

    expect(
      await screen.findByText(/copied the eweser mcp url/i)
    ).toBeInTheDocument();
  });

  it('keeps OAuth setup usable when clipboard permission is denied', async () => {
    sessionState = {
      data: {
        session: { id: 'session-1' },
        user: { email: 'test@example.com', id: 'user-1' },
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new DOMException('Write permission denied.', 'NotAllowedError')
    );

    apiMocks.getConnectAiOverview.mockResolvedValue({
      clients: [
        {
          clientId: 'chatgpt-web',
          connection: null,
          description:
            'Remote HTTP MCP on /mcp with OAuth in ChatGPT developer mode.',
          fallbackReason: null,
          title: 'ChatGPT web',
          type: 'oauth',
        },
      ],
      defaults: {
        allowedCollections: 'all-supported-collections',
        permissions: 'read',
        tokenTtlSeconds: 604800,
      },
      dynamicClientRegistrationUrl: 'https://eweser.com/oauth/register',
      mcpUrl: 'https://eweser.com/mcp',
      memoryStrategy: defaultMemoryStrategy(),
      oauthMetadataUrl:
        'https://eweser.com/.well-known/oauth-authorization-server',
      smartLinkRule:
        'Never place bearer tokens in URLs. All setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.',
      writableRooms: [],
    });

    renderApp('/account/connect-ai');

    const buttons = await screen.findAllByRole('button', {
      name: /open connector flow/i,
    });
    const button = buttons[0];
    if (!button) {
      throw new Error('Expected OAuth connect button to exist');
    }
    await userEvent.click(button);

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        'https://chatgpt.com/',
        '_blank',
        'noopener,noreferrer'
      );
    });

    expect(
      await screen.findByText(/copy the eweser mcp url from this card/i)
    ).toBeInTheDocument();
    expect(screen.getByText('https://eweser.com/mcp')).toBeInTheDocument();
  });

  it('renders and revokes connected app grants', async () => {
    sessionState = {
      data: {
        session: { id: 'session-1' },
        user: { email: 'test@example.com', id: 'user-1' },
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };

    apiMocks.getAccountBootstrap.mockResolvedValue({
      profileRooms: [],
      rooms: [
        {
          id: 'room-notes',
          name: 'Personal Notes',
          collectionKey: 'notes',
          syncBaseUrl: null,
          syncUrl: null,
        },
      ],
      user: {
        email: 'test@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        name: 'Test User',
      },
      userCount: 1,
    });
    apiMocks.getConnectedApps
      .mockResolvedValueOnce({
        connectedApps: [
          {
            collections: ['notes'],
            createdAt: '2026-05-01T00:00:00.000Z',
            domain: 'note.eweser.com',
            id: 'user-1|note.eweser.com',
            keepAliveDays: 7,
            requesterType: 'app',
            roomIds: ['room-notes'],
            status: 'active',
            updatedAt: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        connectedApps: [
          {
            collections: ['notes'],
            createdAt: '2026-05-01T00:00:00.000Z',
            domain: 'note.eweser.com',
            id: 'user-1|note.eweser.com',
            keepAliveDays: 7,
            requesterType: 'app',
            roomIds: ['room-notes'],
            status: 'revoked',
            updatedAt: '2026-05-02T00:00:00.000Z',
          },
        ],
      });

    renderApp('/apps');

    expect(
      await screen.findByRole('heading', { name: /every app asks first/i })
    ).toBeInTheDocument();
    expect(screen.getByText('note.eweser.com')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /revoke/i }));

    await waitFor(() => {
      expect(apiMocks.revokeConnectedApp).toHaveBeenCalledWith(
        'user-1|note.eweser.com'
      );
    });

    expect(await screen.findByText(/revoked access/i)).toBeInTheDocument();
  });

  it('requests password reset from forgot-password page', async () => {
    (
      fetch as unknown as { mockResolvedValueOnce: (value: unknown) => void }
    ).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'If an account exists, password reset instructions were sent.',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    renderApp('/forgot-password');

    await userEvent.type(
      screen.getByLabelText(/email/i),
      'recover@example.com'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /send reset link/i })
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    const call = (fetch as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0];
    const requestUrl = new URL(String(call?.[0]), window.location.origin);
    const requestInit = call?.[1] as RequestInit | undefined;
    expect(requestUrl.pathname).toMatch(/\/forget-password$/);
    expect(requestInit?.method).toBe('POST');
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      email: 'recover@example.com',
    });
    expect(
      await screen.findByText(
        /if an account exists, password reset instructions were sent\./i
      )
    ).toBeInTheDocument();
  });

  it('renders the security page for authenticated sessions', async () => {
    sessionState = {
      data: {
        session: { id: 'session-1' },
        user: { email: 'test@example.com', id: 'user-1' },
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };

    apiMocks.getAccountBootstrap.mockResolvedValue({
      profileRooms: [],
      rooms: [],
      user: {
        email: 'test@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        name: 'Test User',
      },
      userCount: 1,
    });

    renderApp('/account/security');

    expect(
      await screen.findByRole('heading', { name: /keep your account tight/i })
    ).toBeInTheDocument();
  });
});
