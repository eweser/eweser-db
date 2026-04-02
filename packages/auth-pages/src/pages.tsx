import { collectionKeys, type LoginQueryParams } from '@eweser/shared';
import { Github, Moon, Sun } from 'lucide-react';
import { ThemeProvider, useTheme } from 'next-themes';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { ProfileEditor } from './components/profile-editor';
import {
  Badge,
  Button,
  Card,
  InlineSpinner,
  Input,
  Label,
  LoadingPanel,
} from './components/ui';
import {
  acceptInvite,
  getAccountBootstrap,
  submitPermissions,
  type AccountBootstrapResponse,
} from './lib/api';
import { authClient } from './lib/auth-client';
import { appAbsoluteUrl } from './lib/config';
import {
  buildPermissionPath,
  clearStoredLoginQuery,
  getLoginQueryFromSearch,
  getStoredLoginQuery,
  resolvePostAuthPath,
  setStoredLoginQuery,
  validateLoginQueryOptions,
} from './lib/login-query';

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      aria-label="Toggle theme"
      tone="ghost"
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function SiteHeader() {
  const session = authClient.useSession();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link className="font-semibold text-foreground no-underline" to="/">
          Eweser DB
        </Link>

        <nav className="flex items-center gap-2">
          {session.data?.user ? (
            <>
              <Link
                className="text-sm text-muted-foreground no-underline hover:text-foreground"
                to="/home"
              >
                Home
              </Link>
              <Link
                className="text-sm text-muted-foreground no-underline hover:text-foreground"
                to="/sign-out"
              >
                Sign out
              </Link>
            </>
          ) : (
            <>
              <Link
                className="text-sm text-muted-foreground no-underline hover:text-foreground"
                to="/sign-in"
              >
                Sign in
              </Link>
              <Link
                className="text-sm text-muted-foreground no-underline hover:text-foreground"
                to="/sign-up"
              >
                Sign up
              </Link>
            </>
          )}
          <a
            className="text-sm text-muted-foreground no-underline hover:text-foreground"
            href="https://github.com/eweser/eweser-db"
            rel="noreferrer"
            target="_blank"
          >
            <Github className="h-4 w-4" />
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function AuthLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside className="order-2 flex items-center justify-center bg-primary px-8 py-12 text-primary-foreground lg:order-1 lg:w-1/2">
        <div className="max-w-lg space-y-5">
          <Badge
            tone="outline"
            className="border-primary-foreground/20 text-primary-foreground"
          >
            User-owned auth
          </Badge>
          <h1 className="text-4xl font-semibold leading-tight">{title}</h1>
          <p className="text-sm leading-6 text-primary-foreground/80">
            Sign in, approve app access, and manage your profile from a
            standalone SPA that talks directly to the Hono auth API.
          </p>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>Offline-first account data with profile rooms.</li>
            <li>Per-app access grants instead of vendor lock-in.</li>
            <li>One auth surface for notes, demos, and future apps.</li>
          </ul>
        </div>
      </aside>

      <section className="order-1 flex flex-1 items-center justify-center px-4 py-10 lg:order-2 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}

function usePersistedLoginQuery() {
  const [searchParams] = useSearchParams();
  const loginQuery = getLoginQueryFromSearch(searchParams);

  useEffect(() => {
    if (loginQuery) {
      setStoredLoginQuery(loginQuery);
    }
  }, [loginQuery]);

  return loginQuery;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();
  const location = useLocation();

  if (session.isPending) {
    return <LoadingPanel message="Checking your session..." title="Loading" />;
  }

  if (!session.data?.user) {
    return (
      <Navigate
        replace
        to={`/sign-in?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
      />
    );
  }

  return <>{children}</>;
}

function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginQuery = usePersistedLoginQuery();
  const persistedLoginQuery = loginQuery ?? getStoredLoginQuery();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const session = authClient.useSession();
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    if (!session.data?.user) {
      return;
    }

    navigate(resolvePostAuthPath(persistedLoginQuery, returnTo), {
      replace: true,
    });
  }, [navigate, persistedLoginQuery, returnTo, session.data?.user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const nextPath = resolvePostAuthPath(persistedLoginQuery, returnTo);
    const result = await authClient.signIn.email({
      callbackURL: appAbsoluteUrl(nextPath),
      email,
      password,
      rememberMe: true,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? 'Unable to sign in.');
      return;
    }

    navigate(nextPath, { replace: true });
  }

  async function handleSocial(provider: 'github' | 'google') {
    setLoading(true);
    setError(null);

    const nextPath = resolvePostAuthPath(persistedLoginQuery, returnTo);
    const result = await authClient.signIn.social({
      callbackURL: appAbsoluteUrl(nextPath),
      errorCallbackURL: appAbsoluteUrl('/sign-in'),
      newUserCallbackURL: appAbsoluteUrl(nextPath),
      provider,
    });

    if (result.error) {
      setLoading(false);
      setError(result.error.message ?? 'Unable to continue with OAuth.');
    }
  }

  return (
    <AuthLayout title="Sign in to provision and manage your data">
      <Card className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use email/password or continue with an OAuth provider.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-in-email">Email</Label>
            <Input
              id="sign-in-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-in-password">Password</Label>
            <Input
              id="sign-in-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              value={password}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? <InlineSpinner /> : 'Sign in'}
          </Button>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              disabled={loading}
              tone="outline"
              type="button"
              onClick={() => void handleSocial('google')}
            >
              Google
            </Button>
            <Button
              disabled={loading}
              tone="outline"
              type="button"
              onClick={() => void handleSocial('github')}
            >
              GitHub
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Need an account? <Link to="/sign-up">Create one</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link to="/statement/terms-of-service">Terms</Link> and{' '}
            <Link to="/statement/privacy">Privacy</Link> policy.
          </p>
        </form>
      </Card>
    </AuthLayout>
  );
}

function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginQuery = usePersistedLoginQuery();
  const persistedLoginQuery = loginQuery ?? getStoredLoginQuery();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const session = authClient.useSession();
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    if (!session.data?.user) {
      return;
    }

    navigate(resolvePostAuthPath(persistedLoginQuery, returnTo), {
      replace: true,
    });
  }, [navigate, persistedLoginQuery, returnTo, session.data?.user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const nextPath = resolvePostAuthPath(persistedLoginQuery, returnTo);
    const result = await authClient.signUp.email({
      callbackURL: appAbsoluteUrl(nextPath),
      email,
      name,
      password,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? 'Unable to create your account.');
      return;
    }

    if (result.data?.token) {
      navigate(nextPath, { replace: true });
      return;
    }

    navigate(`/await-confirm?email=${encodeURIComponent(email)}`, {
      replace: true,
    });
  }

  return (
    <AuthLayout title="Create an account and take control of your data">
      <Card className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <h2 className="text-2xl font-semibold">Create an account</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Email/password accounts are now handled by better-auth on the Hono
              API.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-name">Name</Label>
            <Input
              id="sign-up-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-email">Email</Label>
            <Input
              id="sign-up-email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-up-password">Password</Label>
            <Input
              id="sign-up-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? <InlineSpinner /> : 'Create account'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/sign-in">Sign in</Link>
          </p>
        </form>
      </Card>
    </AuthLayout>
  );
}

function AwaitConfirmPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  return (
    <AuthLayout title="Confirm your email">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold">Check your inbox</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {email
            ? `We sent a confirmation link to ${email}.`
            : 'We sent a confirmation link to your email address.'}
        </p>
      </Card>
    </AuthLayout>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [bootstrap, setBootstrap] = useState<AccountBootstrapResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedLoginQuery = getStoredLoginQuery();
    if (storedLoginQuery) {
      clearStoredLoginQuery();
      navigate(buildPermissionPath(storedLoginQuery), { replace: true });
      return;
    }

    let active = true;

    void getAccountBootstrap()
      .then((result) => {
        if (active) {
          setBootstrap(result);
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
  }, [navigate]);

  if (loading) {
    return <LoadingPanel message="Loading your account..." title="Account" />;
  }

  if (error || !bootstrap) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Account</h2>
          <p className="mt-3 text-sm text-destructive">
            {error ?? 'Unable to load your account.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {bootstrap.profileRooms.length >= 2 ? (
        <ProfileEditor
          email={bootstrap.user.email}
          profileRooms={bootstrap.profileRooms}
          userCount={bootstrap.userCount}
        />
      ) : (
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Account</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Signed in as {bootstrap.user.email}
          </p>
        </Card>
      )}
    </div>
  );
}

function PermissionPage() {
  const [searchParams] = useSearchParams();
  const loginQueryParams: Partial<LoginQueryParams> = {};
  const collections = searchParams.get('collections');
  const domain = searchParams.get('domain');
  const name = searchParams.get('name');
  const redirect = searchParams.get('redirect');

  if (collections) loginQueryParams.collections = collections;
  if (domain) loginQueryParams.domain = domain;
  if (name) loginQueryParams.name = name;
  if (redirect) loginQueryParams.redirect = redirect;

  const loginQuery = validateLoginQueryOptions(loginQueryParams);
  const [bootstrap, setBootstrap] = useState<AccountBootstrapResponse | null>(
    null
  );
  const [allowAll, setAllowAll] = useState(
    loginQuery?.collections.includes('all') ?? true
  );
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    loginQuery?.collections ?? ['all']
  );
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [keepAliveDays, setKeepAliveDays] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    void getAccountBootstrap()
      .then((result) => {
        if (active) {
          setBootstrap(result);
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

  if (!loginQuery) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Grant permissions</h2>
          <p className="mt-3 text-sm text-destructive">
            The access request is invalid.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <LoadingPanel message="Loading your rooms..." title="Grant permissions" />
    );
  }

  if (error || !bootstrap) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Grant permissions</h2>
          <p className="mt-3 text-sm text-destructive">
            {error ?? 'Unable to load your rooms.'}
          </p>
        </Card>
      </div>
    );
  }

  const availableCollections = Array.from(
    new Set(
      bootstrap.rooms.map((room) => room.collectionKey).concat(collectionKeys)
    )
  );

  async function handleAllow() {
    if (!loginQuery) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      clearStoredLoginQuery();
      const result = await submitPermissions({
        collections: allowAll ? ['all'] : selectedCollections,
        domain: loginQuery.domain,
        keepAliveDays,
        redirect: loginQuery.redirect,
        roomIds: selectedRoomIds,
      });
      window.location.assign(result.redirectUrl);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save permissions.'
      );
      setSubmitting(false);
    }
  }

  function toggleCollection(collectionKey: string, checked: boolean) {
    setSelectedCollections((current) => {
      if (checked) {
        return Array.from(new Set(current.concat(collectionKey)));
      }
      return current.filter((item) => item !== collectionKey);
    });
  }

  function toggleRoom(roomId: string, checked: boolean) {
    setSelectedRoomIds((current) => {
      if (checked) {
        return Array.from(new Set(current.concat(roomId)));
      }
      return current.filter((item) => item !== roomId);
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Grant permissions</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {loginQuery.name} at {loginQuery.domain} is requesting access to
            your database.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border p-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                checked={allowAll}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setAllowAll(checked);
                  setSelectedCollections(checked ? ['all'] : []);
                }}
                type="checkbox"
              />
              All folders
            </label>
          </div>

          {!allowAll ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Collections</h3>
                <div className="mt-4 space-y-3">
                  {availableCollections.map((collectionKey) => (
                    <label
                      key={collectionKey}
                      className="flex items-center gap-3 text-sm"
                    >
                      <input
                        checked={selectedCollections.includes(collectionKey)}
                        onChange={(event) =>
                          toggleCollection(collectionKey, event.target.checked)
                        }
                        type="checkbox"
                      />
                      {collectionKey}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Specific rooms</h3>
                <div className="mt-4 space-y-3">
                  {bootstrap.rooms.map((room) => (
                    <label
                      key={room.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{room.name}</span>
                        <span className="ml-2 text-muted-foreground">
                          {room.collectionKey}
                        </span>
                      </span>
                      <input
                        checked={selectedRoomIds.includes(room.id)}
                        onChange={(event) =>
                          toggleRoom(room.id, event.target.checked)
                        }
                        type="checkbox"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="keep-alive-days">
              Cancel grant if inactive for
            </Label>
            <Input
              id="keep-alive-days"
              className="w-24"
              min={1}
              onChange={(event) =>
                setKeepAliveDays(Number(event.target.value) || 1)
              }
              type="number"
              value={keepAliveDays}
            />
            <span className="text-sm text-muted-foreground">day(s)</span>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              tone="ghost"
              type="button"
              onClick={() =>
                window.location.assign(`${loginQuery.redirect}?error=denied`)
              }
            >
              Deny
            </Button>
            <Button
              disabled={submitting}
              type="button"
              onClick={() => void handleAllow()}
            >
              {submitting ? <InlineSpinner /> : 'Allow access'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AcceptRoomInvitePage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No token provided.');
      return;
    }

    let active = true;

    void acceptInvite(token)
      .then((result) => {
        if (active) {
          window.location.assign(result.redirectUrl);
        }
      })
      .catch((requestError: Error) => {
        if (active) {
          setError(requestError.message);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Error accepting invite</h2>
          <p className="mt-3 text-sm text-destructive">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <LoadingPanel
      message="Updating room access and redirecting you back to the requesting app."
      title="Accepting invite"
    />
  );
}

function SignOutPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      clearStoredLoginQuery();

      try {
        if ('indexedDB' in window && 'databases' in window.indexedDB) {
          const databases = await window.indexedDB.databases();
          databases.forEach((database) => {
            if (database.name) {
              window.indexedDB.deleteDatabase(database.name);
            }
          });
        }
      } catch {
        // ignore indexedDB cleanup errors
      }

      const result = await authClient.signOut();
      if (result.error) {
        if (active) {
          setError(result.error.message ?? 'Unable to sign out.');
        }
        return;
      }

      if (active) {
        navigate('/sign-in', { replace: true });
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">Signing out</h2>
          <p className="mt-3 text-sm text-destructive">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <LoadingPanel
      message="Clearing your local data and ending the session..."
      title="Signing out"
    />
  );
}

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="space-y-4 p-6 text-sm leading-6">
        <h2 className="text-2xl font-semibold">Terms of Service</h2>
        <p>
          You must provide accurate account information and are responsible for
          activity under your account.
        </p>
        <p>
          You retain ownership of your stored data. We only process and host it
          to provide the service.
        </p>
        <p>
          Service availability is best-effort and may change as the platform
          evolves.
        </p>
      </Card>
    </div>
  );
}

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="space-y-4 p-6 text-sm leading-6">
        <h2 className="text-2xl font-semibold">Privacy</h2>
        <p>
          We collect the account information and app metadata needed to
          authenticate users and manage access grants.
        </p>
        <p>
          Your data is used to operate the service, secure access, and improve
          reliability. We do not sell it.
        </p>
        <p>
          You can access, update, or delete your account data according to the
          capabilities of the deployed auth server.
        </p>
      </Card>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold">Page not found</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          The route you requested is not part of the auth-pages SPA.
        </p>
      </Card>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<SignInPage />} path="/" />
      <Route element={<SignInPage />} path="/sign-in" />
      <Route element={<SignUpPage />} path="/sign-up" />
      <Route element={<AwaitConfirmPage />} path="/await-confirm" />
      <Route
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
        path="/home"
      />
      <Route
        element={
          <ProtectedRoute>
            <PermissionPage />
          </ProtectedRoute>
        }
        path="/access-grant/permission"
      />
      <Route
        element={
          <ProtectedRoute>
            <AcceptRoomInvitePage />
          </ProtectedRoute>
        }
        path="/access-grant/accept-room-invite"
      />
      <Route element={<SignOutPage />} path="/sign-out" />
      <Route element={<TermsPage />} path="/statement/terms-of-service" />
      <Route element={<PrivacyPage />} path="/statement/privacy" />
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}

export function AppShell() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen">
        <SiteHeader />
        <AppRoutes />
      </div>
    </ThemeProvider>
  );
}
