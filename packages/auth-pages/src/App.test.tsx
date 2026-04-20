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
    const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
    const signInButton = signInButtons[0];
    expect(signInButton).toBeDefined();
    if (!signInButton) {
      throw new Error('Expected sign-in submit button to exist');
    }
    await userEvent.click(signInButton);

    await waitFor(() => {
      expect(authMocks.signInEmail).toHaveBeenCalledOnce();
    });

    expect(
      await screen.findByRole('heading', { name: /grant permissions/i })
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
    const captchaButtons = screen.getAllByRole('button', {
      name: /complete captcha/i,
    });
    const captchaButton = captchaButtons[0];
    if (!captchaButton) {
      throw new Error('Expected captcha button to exist');
    }
    await userEvent.click(captchaButton);
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
    expect(String(call?.[0])).toContain('/api/auth/forget-password');
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
      await screen.findByRole('heading', { name: /account security/i })
    ).toBeInTheDocument();
  });
});
