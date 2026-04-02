import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

const authMocks = vi.hoisted(() => ({
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
    useSession: () => sessionState,
  },
}));

vi.mock('./lib/api', () => ({
  acceptInvite: apiMocks.acceptInvite,
  getAccountBootstrap: apiMocks.getAccountBootstrap,
  submitPermissions: apiMocks.submitPermissions,
}));

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>
  );
}

describe('auth-pages app', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionState = {
      data: null,
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };
    vi.clearAllMocks();
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
    await userEvent.click(
      screen.getAllByRole('button', { name: /sign in/i })[0]
    );

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
});
