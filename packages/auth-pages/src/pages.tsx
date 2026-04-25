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
import { ConnectAiPage } from './components/connect-ai-page';
import { TurnstileCaptcha } from './components/turnstile';
import {
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
import { appAbsoluteUrl, authApiUrl, signUpCaptchaEnabled } from './lib/config';
import {
  buildPermissionPath,
  clearStoredLoginQuery,
  getLoginQueryFromSearch,
  getStoredLoginQuery,
  resolvePostAuthPath,
  setStoredLoginQuery,
  validateLoginQueryOptions,
} from './lib/login-query';

const signInBullets = [
  'Use one auth surface for notes, demos, and future apps.',
  'Per-app access grants instead of vendor lock-in.',
  'Offline-first account data with profile rooms.',
];

const signUpBullets = [
  'Email/password accounts are handled by the auth app.',
  'Profile rooms keep your account data portable and user-owned.',
  'Start with one identity, then reuse it across apps.',
];

const passwordResetRequestedMessage =
  'If an account exists, password reset instructions were sent.';
const authRequestTimeoutMs = 15_000;

const authFieldClass =
  '!h-12 !rounded-xl !border-border !bg-background/80 !px-4 !text-base !text-foreground placeholder:text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.03)] focus-visible:ring-emerald-400/40';

const authPrimaryButtonClass =
  '!h-12 !w-full !rounded-xl !bg-primary !px-6 !text-sm !font-semibold !text-primary-foreground shadow-[0_24px_48px_rgba(15,23,42,0.12)] transition-transform hover:-translate-y-0.5 hover:opacity-95';

const authOutlineButtonClass =
  '!h-12 !rounded-xl !border-border !bg-background/70 !text-foreground transition-colors hover:bg-accent';

const authLabelClass = 'text-foreground/90';

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
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link className="flex items-center gap-3 no-underline" to="/">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/80" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            EweserDB
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {session.data?.user ? (
            <>
              <Link
                className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                to="/home"
              >
                Home
              </Link>
              <Link
                className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                to="/sign-out"
              >
                Sign out
              </Link>
              <Link
                className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                to="/account/security"
              >
                Security
              </Link>
              <Link
                className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                to="/account/connect-ai"
              >
                Connect AI
              </Link>
            </>
          ) : (
            <>
              <Link
                className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                to="/sign-in"
              >
                Sign in
              </Link>
              <Link
                className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                to="/sign-up"
              >
                Sign up
              </Link>
            </>
          )}
          <a
            className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
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
  bullets,
  children,
  eyebrow,
  description,
  panelDescription,
  panelTitle,
  title,
}: {
  bullets: string[];
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  panelDescription: string;
  panelTitle: string;
  title: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  return (
    <div className="relative isolate min-h-[calc(100svh-5rem)] overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(circle at top, rgba(255,255,255,0.11), transparent 34%), radial-gradient(circle at 85% 78%, rgba(74,222,128,0.16), transparent 26%), radial-gradient(circle at 18% 86%, rgba(255,255,255,0.06), transparent 20%)'
            : 'radial-gradient(circle at top, rgba(255,255,255,0.95), transparent 32%), radial-gradient(circle at 85% 78%, rgba(74,222,128,0.12), transparent 24%), radial-gradient(circle at 18% 86%, rgba(148,163,184,0.14), transparent 20%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, rgba(74,222,128,0.08) 0%, rgba(5,5,5,0) 72%)'
            : 'linear-gradient(180deg, rgba(74,222,128,0.06) 0%, rgba(255,255,255,0) 72%)',
        }}
      />

      <main className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-10 lg:min-h-[calc(100svh-5rem)] lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-16">
        <section className="relative max-w-2xl">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.32em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="max-w-xl text-4xl font-bold tracking-tight leading-[1.02] text-foreground sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            {description}
          </p>

          <ul className="mt-8 space-y-4">
            {bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex gap-4 text-sm leading-7 text-muted-foreground sm:text-base"
              >
                <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative">
          <div
            aria-hidden="true"
            className="absolute -left-10 top-10 h-28 w-28 rounded-full bg-emerald-400/18 blur-3xl float-slow"
          />
          <div
            aria-hidden="true"
            className="absolute -right-4 bottom-12 h-32 w-32 rounded-full bg-foreground/10 blur-3xl float-fast"
          />

          <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card/95 shadow-2xl shadow-black/10">
            <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-foreground/20" />
              <span className="h-3 w-3 rounded-full bg-foreground/20" />
              <span className="h-3 w-3 rounded-full bg-foreground/20" />
            </div>

            <div className="p-6 sm:p-8">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {eyebrow}
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                  {panelTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {panelDescription}
                </p>
              </div>

              {children}
            </div>
          </div>
        </section>
      </main>
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

function withTimeout<T>(promise: Promise<T>, timeoutMs = authRequestTimeoutMs) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(
        new Error(
          'Authentication request timed out. Please try again in a moment.'
        )
      );
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

async function postAuthJson<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const base = authApiUrl.endsWith('/') ? authApiUrl : `${authApiUrl}/`;
  const response = await fetch(new URL(normalizedPath, base).toString(), {
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { error?: string; message?: string }).message ??
      (payload as { error?: string; message?: string }).error ??
      `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
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

    try {
      const nextPath = resolvePostAuthPath(persistedLoginQuery, returnTo);
      const result = await withTimeout(
        authClient.signIn.email({
          callbackURL: appAbsoluteUrl(nextPath),
          email,
          password,
          rememberMe: true,
        })
      );

      if (result.error) {
        setError(result.error.message ?? 'Unable to sign in.');
        return;
      }

      navigate(nextPath, { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to sign in.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSocial(provider: 'github' | 'google') {
    setLoading(true);
    setError(null);

    try {
      const nextPath = resolvePostAuthPath(persistedLoginQuery, returnTo);
      const result = await withTimeout(
        authClient.signIn.social({
          callbackURL: appAbsoluteUrl(nextPath),
          errorCallbackURL: appAbsoluteUrl('/sign-in'),
          newUserCallbackURL: appAbsoluteUrl(nextPath),
          provider,
        })
      );

      if (result.error) {
        setError(result.error.message ?? 'Unable to continue with OAuth.');
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to continue with OAuth.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      bullets={signInBullets}
      description="Sign in, approve app access, and manage your profile from a standalone auth app."
      eyebrow="User-owned auth"
      panelDescription="Use email/password or continue with an OAuth provider."
      panelTitle="Welcome back"
      title="Sign in to provision and manage your data"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className={authLabelClass} htmlFor="sign-in-email">
            Email
          </Label>
          <Input
            id="sign-in-email"
            className={authFieldClass}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            type="email"
            value={email}
          />
        </div>

        <div className="space-y-2">
          <Label className={authLabelClass} htmlFor="sign-in-password">
            Password
          </Label>
          <Input
            id="sign-in-password"
            className={authFieldClass}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            value={password}
          />
        </div>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <Button
          className={authPrimaryButtonClass}
          disabled={loading}
          type="submit"
        >
          {loading ? (
            <InlineSpinner className="text-primary-foreground" />
          ) : (
            'Sign in'
          )}
        </Button>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            className={authOutlineButtonClass}
            disabled={loading}
            tone="outline"
            type="button"
            onClick={() => void handleSocial('google')}
          >
            Google
          </Button>
          <Button
            className={authOutlineButtonClass}
            disabled={loading}
            tone="outline"
            type="button"
            onClick={() => void handleSocial('github')}
          >
            GitHub
          </Button>
        </div>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          Need an account?{' '}
          <Link
            className="text-emerald-500 hover:text-emerald-400"
            to="/sign-up"
          >
            Create one
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            className="text-foreground hover:text-foreground/80"
            to="/forgot-password"
          >
            Forgot your password?
          </Link>
        </p>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          By continuing, you agree to our{' '}
          <Link
            className="text-foreground hover:text-foreground/80"
            to="/statement/terms-of-service"
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            className="text-foreground hover:text-foreground/80"
            to="/statement/privacy"
          >
            Privacy
          </Link>{' '}
          policy.
        </p>
      </form>
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
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
    setError(null);

    if (signUpCaptchaEnabled && !captchaToken) {
      setError('Complete the captcha challenge before creating your account.');
      return;
    }

    setLoading(true);

    const nextPath = resolvePostAuthPath(persistedLoginQuery, returnTo);
    let result;

    try {
      result = await withTimeout(
        authClient.signUp.email({
          callbackURL: appAbsoluteUrl(nextPath),
          email,
          fetchOptions: captchaToken
            ? {
                headers: {
                  'x-captcha-response': captchaToken,
                  'x-auth-identifier': email,
                },
              }
            : {
                headers: {
                  'x-auth-identifier': email,
                },
              },
          name,
          password,
        })
      );
    } catch (requestError) {
      setLoading(false);
      if (signUpCaptchaEnabled) {
        setCaptchaToken(null);
        setCaptchaKey((current) => current + 1);
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create your account.'
      );
      return;
    }

    setLoading(false);

    if (signUpCaptchaEnabled) {
      setCaptchaToken(null);
      setCaptchaKey((current) => current + 1);
    }

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
    <AuthLayout
      bullets={signUpBullets}
      description="Email/password accounts are handled by the auth app."
      eyebrow="User-owned auth"
      panelDescription="Set up a shared identity for notes, demos, and future apps."
      panelTitle="Create an account"
      title="Create an account and take control of your data"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className={authLabelClass} htmlFor="sign-up-name">
            Name
          </Label>
          <Input
            id="sign-up-name"
            className={authFieldClass}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>

        <div className="space-y-2">
          <Label className={authLabelClass} htmlFor="sign-up-email">
            Email
          </Label>
          <Input
            id="sign-up-email"
            className={authFieldClass}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </div>

        <div className="space-y-2">
          <Label className={authLabelClass} htmlFor="sign-up-password">
            Password
          </Label>
          <Input
            id="sign-up-password"
            className={authFieldClass}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </div>

        {signUpCaptchaEnabled ? (
          <TurnstileCaptcha key={captchaKey} onTokenChange={setCaptchaToken} />
        ) : null}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <Button
          className={authPrimaryButtonClass}
          disabled={loading || (signUpCaptchaEnabled && !captchaToken)}
          type="submit"
        >
          {loading ? (
            <InlineSpinner className="text-primary-foreground" />
          ) : (
            'Create account'
          )}
        </Button>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            className="text-emerald-500 hover:text-emerald-400"
            to="/sign-in"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function AwaitConfirmPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  return (
    <AuthLayout
      bullets={[
        'Open the email we sent and follow the confirmation link.',
        'Once confirmed, return here to continue signing in.',
        'If the message does not arrive, check spam or try again.',
      ]}
      description={
        email
          ? `We sent a confirmation link to ${email}.`
          : 'We sent a confirmation link to your email address.'
      }
      eyebrow="User-owned auth"
      panelDescription={
        email
          ? `A verification link was sent to ${email}.`
          : 'A verification link was sent to your email address.'
      }
      panelTitle="Check your inbox"
      title="Confirm your email"
    >
      <div className="space-y-4 text-sm leading-6 text-slate-300">
        <p>
          We are waiting on your account confirmation before finishing the
          signup flow.
        </p>
        <p className="text-slate-400">
          You can close this tab after clicking the confirmation link and come
          back to sign in.
        </p>
      </div>
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
      <div className="mb-4 flex justify-end">
        <div className="flex gap-4">
          <Link
            className="text-sm text-slate-300 hover:text-white"
            to="/account/connect-ai"
          >
            Connect AI
          </Link>
          <Link
            className="text-sm text-slate-300 hover:text-white"
            to="/account/security"
          >
            Account security
          </Link>
        </div>
      </div>
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
    loginQuery ? [...loginQuery.collections] : ['all']
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
              onClick={() => {
                const denyUrl = new URL(loginQuery.redirect);
                denyUrl.searchParams.set('error', 'denied');
                window.location.assign(denyUrl.toString());
              }}
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

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await postAuthJson('/forget-password', {
        email,
        redirectTo: appAbsoluteUrl('/reset-password'),
      });
      setDone(true);
    } catch (requestError) {
      if (
        requestError instanceof Error &&
        requestError.message === passwordResetRequestedMessage
      ) {
        setDone(true);
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to request password reset.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      bullets={[
        'Use this to recover access without creating another account.',
        'We avoid disclosing whether an email exists.',
        'Recovery links expire automatically.',
      ]}
      description="Request a password reset link."
      eyebrow="Account recovery"
      panelDescription="Enter your account email and we will send reset instructions."
      panelTitle="Forgot password"
      title="Reset your password"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className="text-white/90" htmlFor="forgot-password-email">
            Email
          </Label>
          <Input
            id="forgot-password-email"
            className="!h-12 !rounded-xl !border-white/10 !bg-white/5 !px-4 !text-base !text-white"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {done ? (
          <p className="text-sm text-emerald-300">
            {passwordResetRequestedMessage}
          </p>
        ) : null}
        <Button
          className="!h-12 !w-full !rounded-xl"
          disabled={loading}
          type="submit"
        >
          {loading ? <InlineSpinner /> : 'Send reset link'}
        </Button>
      </form>
    </AuthLayout>
  );
}

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('Password reset token is missing.');
      return;
    }

    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await postAuthJson('/reset-password', {
        newPassword: password,
        token,
      });
      navigate('/sign-in', { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to reset password.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      bullets={[
        'Choose a strong password you do not reuse elsewhere.',
        'Existing sessions are revoked after reset.',
        'You can sign in again once this succeeds.',
      ]}
      description="Set a new password for your account."
      eyebrow="Account recovery"
      panelDescription="Enter and confirm your new password."
      panelTitle="Reset password"
      title="Set a new password"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className="text-white/90" htmlFor="reset-password-new">
            New password
          </Label>
          <Input
            id="reset-password-new"
            className="!h-12 !rounded-xl !border-white/10 !bg-white/5 !px-4 !text-base !text-white"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/90" htmlFor="reset-password-confirm">
            Confirm password
          </Label>
          <Input
            id="reset-password-confirm"
            className="!h-12 !rounded-xl !border-white/10 !bg-white/5 !px-4 !text-base !text-white"
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            value={confirmPassword}
          />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <Button
          className="!h-12 !w-full !rounded-xl"
          disabled={loading}
          type="submit"
        >
          {loading ? <InlineSpinner /> : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  );
}

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Verification token is missing.');
      return;
    }

    let active = true;
    void postAuthJson('/verify-email', {
      callbackURL: appAbsoluteUrl('/home'),
      token,
    })
      .then(() => {
        if (!active) return;
        setDone(true);
        setTimeout(() => navigate('/home', { replace: true }), 1200);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to verify email.'
        );
      });

    return () => {
      active = false;
    };
  }, [navigate, token]);

  return (
    <AuthLayout
      bullets={[
        'Verification unlocks sensitive account actions.',
        'Links are single-use and time-limited.',
        'You can request another link from account security.',
      ]}
      description="We are validating your verification token now."
      eyebrow="Email verification"
      panelDescription="This page will redirect once verification is complete."
      panelTitle="Verify email"
      title="Confirming your email address"
    >
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {done ? (
        <p className="text-sm text-emerald-300">Email verified.</p>
      ) : null}
      {!error && !done ? <InlineSpinner /> : null}
    </AuthLayout>
  );
}

function SecurityPage() {
  const [bootstrap, setBootstrap] = useState<AccountBootstrapResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    void getAccountBootstrap()
      .then(setBootstrap)
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  async function runAction(action: () => Promise<void>) {
    setError(null);
    setWorking(true);
    try {
      await action();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Security action failed.'
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="space-y-5 p-6">
        <h2 className="text-2xl font-semibold">Account security</h2>
        <p className="text-sm text-muted-foreground">
          Email verification and two-factor protection controls.
        </p>
        <p className="text-xs text-muted-foreground">
          Passkeys/WebAuthn are deferred for this launch because current
          `better-auth` workspace version does not expose stable passkey plugin
          support.
        </p>
        <p className="text-sm">
          Email verified:{' '}
          <span className="font-medium">
            {bootstrap?.user.emailVerified ? 'Yes' : 'No'}
          </span>
        </p>
        {!bootstrap?.user.emailVerified ? (
          <Button
            disabled={working}
            tone="outline"
            type="button"
            onClick={() =>
              void runAction(async () => {
                await postAuthJson('/send-verification-email', {
                  callbackURL: appAbsoluteUrl('/verify-email'),
                });
              })
            }
          >
            {working ? <InlineSpinner /> : 'Resend verification email'}
          </Button>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="security-password">Current password</Label>
          <Input
            id="security-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            disabled={working || password.length < 1}
            type="button"
            onClick={() =>
              void runAction(async () => {
                const result = await postAuthJson<{
                  backupCodes: string[];
                  totpURI: string;
                }>('/two-factor/enable', {
                  password,
                });
                setTotpUri(result.totpURI);
                setBackupCodes(result.backupCodes);
              })
            }
          >
            Enable 2FA
          </Button>
          <Button
            disabled={working || password.length < 1}
            tone="outline"
            type="button"
            onClick={() =>
              void runAction(async () => {
                await postAuthJson('/two-factor/disable', { password });
                setTotpUri(null);
              })
            }
          >
            Disable 2FA
          </Button>
          <Button
            disabled={working || password.length < 1}
            tone="outline"
            type="button"
            onClick={() =>
              void runAction(async () => {
                const result = await postAuthJson<{ backupCodes: string[] }>(
                  '/two-factor/generate-backup-codes',
                  { password }
                );
                setBackupCodes(result.backupCodes);
              })
            }
          >
            Regenerate backup codes
          </Button>
        </div>

        {totpUri ? (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">TOTP URI</p>
            <p className="break-all text-xs text-muted-foreground">{totpUri}</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter TOTP code"
                onChange={(event) => setTotpCode(event.target.value)}
                value={totpCode}
              />
              <Button
                disabled={working || totpCode.length < 6}
                type="button"
                onClick={() =>
                  void runAction(async () => {
                    await postAuthJson('/two-factor/verify-totp', {
                      code: totpCode,
                      trustDevice: true,
                    });
                  })
                }
              >
                Verify code
              </Button>
            </div>
          </div>
        ) : null}

        {backupCodes.length > 0 ? (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Backup codes</p>
            <ul className="grid grid-cols-2 gap-2 text-xs">
              {backupCodes.map((code) => (
                <li key={code} className="rounded bg-muted px-2 py-1 font-mono">
                  {code}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </Card>
    </div>
  );
}

function TwoFactorChallengePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setWorking(true);

    try {
      if (mode === 'totp') {
        await postAuthJson('/two-factor/verify-totp', {
          code,
          trustDevice: true,
        });
      } else {
        await postAuthJson('/two-factor/verify-backup-code', { code });
      }
      navigate('/home', { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to verify two-factor code.'
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <AuthLayout
      bullets={[
        'Enter a code from your authenticator app.',
        'Use a backup code if needed.',
        'Codes expire quickly for safety.',
      ]}
      description="Second-factor verification is required to finish sign-in."
      eyebrow="Two-factor authentication"
      panelDescription="Complete this step to continue to your account."
      panelTitle="Verify code"
      title="Confirm it is you"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className="text-white/90" htmlFor="two-factor-code">
            {mode === 'totp' ? 'Authenticator code' : 'Backup code'}
          </Label>
          <Input
            id="two-factor-code"
            className="!h-12 !rounded-xl !border-white/10 !bg-white/5 !px-4 !text-base !text-white"
            onChange={(event) => setCode(event.target.value)}
            value={code}
          />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <Button
          className="!h-12 !w-full !rounded-xl"
          disabled={working}
          type="submit"
        >
          {working ? <InlineSpinner /> : 'Verify'}
        </Button>
        <Button
          className="!h-12 !w-full !rounded-xl"
          disabled={working}
          tone="outline"
          type="button"
          onClick={() => setMode(mode === 'totp' ? 'backup' : 'totp')}
        >
          {mode === 'totp' ? 'Use backup code' : 'Use authenticator code'}
        </Button>
      </form>
    </AuthLayout>
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
      <Route element={<TwoFactorChallengePage />} path="/two-factor" />
      <Route element={<ForgotPasswordPage />} path="/forgot-password" />
      <Route element={<ResetPasswordPage />} path="/reset-password" />
      <Route element={<VerifyEmailPage />} path="/verify-email" />
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
      <Route
        element={
          <ProtectedRoute>
            <ConnectAiPage />
          </ProtectedRoute>
        }
        path="/account/connect-ai"
      />
      <Route
        element={
          <ProtectedRoute>
            <SecurityPage />
          </ProtectedRoute>
        }
        path="/account/security"
      />
      <Route element={<TermsPage />} path="/statement/terms-of-service" />
      <Route element={<PrivacyPage />} path="/statement/privacy" />
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}

export function AppShell() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="min-h-screen">
        <SiteHeader />
        <AppRoutes />
      </div>
    </ThemeProvider>
  );
}
