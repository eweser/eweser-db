import { collectionKeys, type LoginQueryParams } from '@eweser/shared';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  Database,
  Download,
  FileText,
  Github,
  LockKeyhole,
  Moon,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react';
import { ThemeProvider, useTheme } from 'next-themes';
import { useEffect, useState, type FormEvent } from 'react';
import heroPastureImage from './assets/hero-orbit-house.png';
import loginDarkImage from './assets/login-dark.png';
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
  ConnectAiPage,
  connectAiPreviewOverview,
} from './components/connect-ai-page';
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
  getBackupSnapshotDownloadUrl,
  getBackupSnapshots,
  getConnectAiOverview,
  getConnectedApps,
  submitPermissions,
  type AccountBootstrapResponse,
  type ConnectedAppGrant,
  type ConnectAiOverviewResponse,
  type RemoteSnapshotRecord,
  revokeConnectedApp,
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
  'auth-input-field !h-12 !rounded-xl !px-4 !text-base !text-foreground placeholder:text-muted-foreground';

const authPrimaryButtonClass =
  '!h-12 !w-full !rounded-xl !bg-primary !px-6 !text-sm !font-semibold !text-primary-foreground shadow-[0_20px_48px_oklch(0.1_0.025_175_/_0.2)] transition-transform hover:-translate-y-0.5 hover:opacity-95';

const authOutlineButtonClass =
  '!h-12 !rounded-xl !border-input !bg-background/55 !text-foreground transition-colors hover:bg-accent';

const authLabelClass = 'text-foreground/90';
const authFormClass = 'auth-form';
const authFieldGroupClass = 'auth-field-group';
const authSocialButtonGridClass = 'auth-social-grid';

const collectionCopy: Record<string, { description: string; label: string }> = {
  agentAccessLogs: {
    description: 'Records of agent reads and writes against your rooms.',
    label: 'Agent access logs',
  },
  agentConfigs: {
    description:
      'AI client setup, scope, status, expiry, and revocation state.',
    label: 'Agent configs',
  },
  conversations: {
    description:
      'AI conversation summaries, session notes, decisions, and memory entries.',
    label: 'Conversations',
  },
  fileAttachments: {
    description: 'Files and attachments stored against rooms you control.',
    label: 'File attachments',
  },
  flashcards: {
    description: 'Study material linked back to notes and source context.',
    label: 'Flashcards',
  },
  memoryStrategyConfigs: {
    description: 'Shared memory strategy settings for connected AI clients.',
    label: 'Memory strategies',
  },
  notes: {
    description: 'Notes, documents, links, and working context.',
    label: 'Notes',
  },
  profiles: {
    description: 'Portable identity and account data for Eweser apps.',
    label: 'Profiles',
  },
  projectWikiDrafts: {
    description: 'Draft project wiki pages staged by AI and apps.',
    label: 'Project wiki drafts',
  },
  projectWikiPages: {
    description: 'Accepted project wiki pages shared across tools.',
    label: 'Project wiki pages',
  },
};

const lastUpdatedLabel = 'Last updated: May 1, 2026';
const supportEmail = 'support@eweser.com';
const abuseEmail = 'abuse@eweser.com';
const privacyEmail = 'privacy@eweser.com';
const copyrightEmail = 'copyright@eweser.com';

function readAuthErrorMessage(result: unknown): string | null {
  if (!result || typeof result !== 'object' || !('error' in result)) {
    return null;
  }

  const error = result.error;
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return null;
  }

  return typeof error.message === 'string' ? error.message : null;
}

function readAuthDataToken(result: unknown): string | null {
  if (!result || typeof result !== 'object' || !('data' in result)) {
    return null;
  }

  const data = result.data;
  if (!data || typeof data !== 'object' || !('token' in data)) {
    return null;
  }

  return typeof data.token === 'string' ? data.token : null;
}

function formatCollectionKey(collectionKey: string) {
  return collectionCopy[collectionKey]?.label ?? collectionKey;
}

function getCollectionDescription(collectionKey: string) {
  return (
    collectionCopy[collectionKey]?.description ??
    'Records stored in an EweserDB collection.'
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getGrantLastActivity(grant: ConnectedAppGrant) {
  return grant.updatedAt ?? grant.createdAt;
}

function getGrantCollectionsLabel(grant: ConnectedAppGrant) {
  if (grant.collections.includes('all')) {
    return 'All requested collections';
  }
  if (grant.collections.length === 0) {
    return 'Specific rooms only';
  }
  return grant.collections.map(formatCollectionKey).join(', ');
}

function getRoomCollectionCounts(bootstrap: AccountBootstrapResponse) {
  const counts = new Map<string, number>();
  bootstrap.rooms.forEach((room) => {
    counts.set(room.collectionKey, (counts.get(room.collectionKey) ?? 0) + 1);
  });
  return counts;
}

function getConnectedClientCount(overview: ConnectAiOverviewResponse | null) {
  return (
    overview?.clients.filter(
      (client) => client.connection?.status === 'connected'
    ).length ?? 0
  );
}

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
                to="/"
              >
                Data Home
              </Link>
              <Link
                className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                to="/apps"
              >
                Apps
              </Link>
              <Link
                className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                to="/ai"
              >
                AI
              </Link>
              <Link
                className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                to="/sign-out"
              >
                Sign out
              </Link>
              <Link
                className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                to="/security"
              >
                Security
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

type AppConsoleSection = 'home' | 'apps' | 'ai' | 'account' | 'security';

function AppConsoleLayout({
  active,
  children,
  note,
}: {
  active: AppConsoleSection;
  children: React.ReactNode;
  note?: {
    body: string;
    title: string;
  };
}) {
  return (
    <div className="app-console">
      <aside className="app-sidebar" aria-label="Account sections">
        <div className="flex items-center gap-3">
          <span className="app-nav-icon" aria-hidden="true">
            <Database className="h-4 w-4" />
          </span>
          <div>
            <p className="brand-wordmark text-lg text-foreground">EweserDB</p>
            <p className="text-xs text-muted-foreground">Personal data home</p>
          </div>
        </div>

        <nav className="app-nav">
          <Link
            className="app-nav-link"
            data-active={active === 'home' ? 'true' : undefined}
            to="/"
          >
            <Database className="h-4 w-4" />
            Data Home
          </Link>
          <Link
            className="app-nav-link"
            data-active={active === 'apps' ? 'true' : undefined}
            to="/apps"
          >
            <PlugZap className="h-4 w-4" />
            Apps
          </Link>
          <Link
            className="app-nav-link"
            data-active={active === 'ai' ? 'true' : undefined}
            to="/ai"
          >
            <Bot className="h-4 w-4" />
            MCP clients
          </Link>
          <Link
            className="app-nav-link"
            data-active={active === 'account' ? 'true' : undefined}
            to="/home"
          >
            <UserRound className="h-4 w-4" />
            Account
          </Link>
          <Link
            className="app-nav-link"
            data-active={active === 'security' ? 'true' : undefined}
            to="/security"
          >
            <ShieldCheck className="h-4 w-4" />
            Security
          </Link>
        </nav>

        <div className="app-sidebar-card">
          <p className="app-sidebar-title">{note?.title ?? 'Scoped access'}</p>
          <p className="app-sidebar-copy">
            {note?.body ??
              'Apps and AI clients only appear here after they ask for access.'}
          </p>
        </div>
      </aside>

      <main className="app-page">{children}</main>
    </div>
  );
}

function AppPageHero({
  actions,
  body,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode;
  body: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="app-page-hero">
      <div>
        <p className="mcp-eyebrow">{eyebrow}</p>
        <h1 className="app-page-title">{title}</h1>
        <p className="app-page-copy">{body}</p>
      </div>
      {actions ? <div className="app-page-actions">{actions}</div> : null}
    </section>
  );
}

function AppStatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="app-stat-card">
      <span className="mcp-summary-icon" aria-hidden="true">
        {icon}
      </span>
      <p className="mcp-summary-label">{label}</p>
      <p className="mcp-summary-value">{value}</p>
    </div>
  );
}

function EmptyState({
  action,
  body,
  icon,
  title,
}: {
  action?: React.ReactNode;
  body: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="app-empty-state">
      <span className="app-empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
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
    <main className="auth-page text-foreground">
      <div className="auth-grid">
        <section className="auth-story" aria-labelledby="auth-title">
          <p className="auth-kicker">{eyebrow}</p>
          <h1 id="auth-title">{title}</h1>
          <p className="auth-story-copy">{description}</p>
        </section>

        <section
          className="auth-supporting"
          aria-label="Authentication benefits"
        >
          <div className="auth-visual-card">
            <div
              aria-label="Pastoral EweserDB data homestead illustration"
              className="auth-visual"
              role="img"
              style={{
                backgroundImage: `var(--auth-visual-overlay), url(${isDark ? loginDarkImage : heroPastureImage})`,
              }}
            />
            <div className="auth-orbit-note">
              <strong>
                {isDark
                  ? 'Private access in a quiet workspace.'
                  : 'Your data layer follows you in daylight.'}
              </strong>
              <span>
                Apps and AI agents connect through scoped grants. You can revoke
                access without moving your work.
              </span>
            </div>
          </div>

          <div className="auth-proof-list" aria-label="Authentication benefits">
            {bullets.map((bullet, index) => (
              <p key={bullet} className="auth-proof-item">
                <span className="auth-proof-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {bullet}
              </p>
            ))}
          </div>
        </section>

        <aside className="auth-panel" aria-label={panelTitle}>
          <div className="mb-6">
            <p className="auth-kicker">Eweser account</p>
            <h2 className="auth-panel-title">{panelTitle}</h2>
            <p className="auth-panel-copy">{panelDescription}</p>
          </div>
          {children}
        </aside>
      </div>
    </main>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();
  const location = useLocation();

  if (session.isPending) {
    return <LoadingPanel message="Checking your session..." title="Loading" />;
  }

  if (!session.data?.user) {
    const redirectPath = `${location.pathname}${location.search}`;
    return (
      <Navigate
        replace
        to={`/sign-in?redirect=${encodeURIComponent(redirectPath)}`}
      />
    );
  }

  return <>{children}</>;
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
  const returnTo = searchParams.get('returnTo') ?? searchParams.get('redirect');

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

      const errorMessage = readAuthErrorMessage(result);
      if (errorMessage) {
        setError(errorMessage);
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

      const errorMessage = readAuthErrorMessage(result);
      if (errorMessage) {
        setError(errorMessage);
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
      <form className={authFormClass} onSubmit={handleSubmit}>
        <div className={authFieldGroupClass}>
          <Label className={authLabelClass} htmlFor="sign-in-email">
            Email
          </Label>
          <Input
            id="sign-in-email"
            autoComplete="email"
            className={authFieldClass}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            type="email"
            value={email}
          />
        </div>

        <div className={authFieldGroupClass}>
          <Label className={authLabelClass} htmlFor="sign-in-password">
            Password
          </Label>
          <Input
            id="sign-in-password"
            autoComplete="current-password"
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

        <div className={authSocialButtonGridClass}>
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
  const returnTo = searchParams.get('returnTo') ?? searchParams.get('redirect');

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
    let result: unknown;

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

    const errorMessage = readAuthErrorMessage(result);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    if (readAuthDataToken(result)) {
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
      <form className={authFormClass} onSubmit={handleSubmit}>
        <div className={authFieldGroupClass}>
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

        <div className={authFieldGroupClass}>
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

        <div className={authFieldGroupClass}>
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

function PersonalDataHomePage() {
  const session = authClient.useSession();
  const [bootstrap, setBootstrap] = useState<AccountBootstrapResponse | null>(
    null
  );
  const [connectedApps, setConnectedApps] = useState<ConnectedAppGrant[]>([]);
  const [aiOverview, setAiOverview] =
    useState<ConnectAiOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void Promise.all([
      getAccountBootstrap(),
      getConnectedApps().catch(() => ({ connectedApps: [] })),
      getConnectAiOverview().catch(() => null),
    ])
      .then(([bootstrapResult, connectedAppsResult, aiResult]) => {
        if (!active) return;
        setBootstrap(bootstrapResult);
        setConnectedApps(connectedAppsResult.connectedApps);
        setAiOverview(aiResult);
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

  if (loading) {
    return (
      <LoadingPanel message="Loading your data layer..." title="Data Home" />
    );
  }

  if (error || !bootstrap) {
    return (
      <AppConsoleLayout active="home">
        <AppPageHero
          body="We could not load your account data. Your local rooms remain untouched."
          eyebrow="Your data layer"
          title="Data Home unavailable"
        />
        <Card className="app-panel p-6">
          <p className="text-sm text-destructive">
            {error ?? 'Unable to load your account.'}
          </p>
        </Card>
      </AppConsoleLayout>
    );
  }

  const roomCounts = getRoomCollectionCounts(bootstrap);
  const populatedCollections = collectionKeys.filter(
    (collectionKey) => roomCounts.get(collectionKey) ?? 0
  );
  const collectionRows =
    populatedCollections.length > 0 ? populatedCollections : collectionKeys;
  const activeApps = connectedApps.filter((grant) => grant.status === 'active');
  const connectedAiClients = getConnectedClientCount(aiOverview);
  const lastGrantActivity = activeApps.map(getGrantLastActivity).sort().at(-1);

  return (
    <AppConsoleLayout
      active="home"
      note={{
        body: 'Nothing shares your rooms without creating a visible grant.',
        title: 'Visible grants',
      }}
    >
      <AppPageHero
        actions={
          <>
            <Link className="app-primary-action" to="/ai">
              <Bot className="h-4 w-4" />
              Connect AI
            </Link>
            <Link className="app-secondary-action" to="/apps">
              Review apps <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
        body="Collections, rooms, connected apps, AI grants, and sync state, all visible from one place. Nothing shares your data without appearing here first."
        eyebrow="Your data layer"
        title="Everything your apps can touch."
      />

      {session.data?.user.email ? (
        <p className="app-signed-in">Signed in as {session.data.user.email}</p>
      ) : null}

      <section className="app-stats-grid" aria-label="Data layer summary">
        <AppStatCard
          icon={<FileText className="h-5 w-5" />}
          label="Collections"
          value={String(collectionRows.length)}
        />
        <AppStatCard
          icon={<Database className="h-5 w-5" />}
          label="Rooms"
          value={String(bootstrap.rooms.length)}
        />
        <AppStatCard
          icon={<PlugZap className="h-5 w-5" />}
          label="Connected apps"
          value={String(activeApps.length)}
        />
        <AppStatCard
          icon={<Bot className="h-5 w-5" />}
          label="AI grants"
          value={String(connectedAiClients)}
        />
        <AppStatCard
          icon={<LockKeyhole className="h-5 w-5" />}
          label="Storage"
          value="Local-first"
        />
        <AppStatCard
          icon={<RefreshCw className="h-5 w-5" />}
          label="Last synced"
          value={formatDate(lastGrantActivity)}
        />
      </section>

      <div className="app-two-column">
        <section className="app-panel">
          <div className="app-panel-header">
            <div>
              <h2>Your collections</h2>
              <p>
                Your data is organised into collections. Apps and AI agents
                connect to rooms inside a collection, not the whole database.
              </p>
            </div>
            <span className="mcp-chip">{collectionRows.length} visible</span>
          </div>

          <div className="app-list">
            {collectionRows.map((collectionKey) => (
              <div key={collectionKey} className="app-list-row">
                <div>
                  <strong>{formatCollectionKey(collectionKey)}</strong>
                  <p>{getCollectionDescription(collectionKey)}</p>
                </div>
                <span className="app-row-meta">
                  {roomCounts.get(collectionKey) ?? 0} room
                  {(roomCounts.get(collectionKey) ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="app-panel">
          <div className="app-panel-header">
            <div>
              <h2>Where your data lives</h2>
              <p>
                Each room is a sync and permission boundary. Granting access to
                one room does not expose the rest.
              </p>
            </div>
            <span className="mcp-chip">{bootstrap.rooms.length} rooms</span>
          </div>

          {bootstrap.rooms.length > 0 ? (
            <div className="app-table" role="table">
              <div className="app-table-row app-table-head" role="row">
                <span role="columnheader">Room name</span>
                <span role="columnheader">Collection</span>
                <span role="columnheader">Sharing</span>
                <span role="columnheader">Action</span>
              </div>
              {bootstrap.rooms.slice(0, 8).map((room) => (
                <div key={room.id} className="app-table-row" role="row">
                  <span role="cell">{room.name}</span>
                  <span role="cell">
                    {formatCollectionKey(room.collectionKey)}
                  </span>
                  <span role="cell">Scoped grants</span>
                  <Link role="cell" to="/apps">
                    Review
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              body="Rooms are created when you connect an app or sign in to Ewe Note."
              icon={<Database className="h-5 w-5" />}
              title="No rooms yet"
            />
          )}
        </section>
      </div>

      <div className="app-two-column">
        <section className="app-panel">
          <div className="app-panel-header">
            <div>
              <h2>Apps with access</h2>
              <p>Review app grants and revoke access from the apps page.</p>
            </div>
            <Link className="app-panel-link" to="/apps">
              Open apps <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {activeApps.length > 0 ? (
            <div className="app-list">
              {activeApps.slice(0, 4).map((grant) => (
                <div key={grant.id} className="app-list-row">
                  <div>
                    <strong>{grant.domain}</strong>
                    <p>{getGrantCollectionsLabel(grant)}</p>
                  </div>
                  <span className="app-status-pill">Active</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              body="When an app requests access to your data, the request appears before anything is shared."
              icon={<PlugZap className="h-5 w-5" />}
              title="No apps connected yet"
            />
          )}
        </section>

        <section className="app-panel">
          <div className="app-panel-header">
            <div>
              <h2>AI clients with access</h2>
              <p>Every MCP client connected through Eweser appears here.</p>
            </div>
            <Link className="app-panel-link" to="/ai">
              Open AI <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {aiOverview && connectedAiClients > 0 ? (
            <div className="app-list">
              {aiOverview.clients
                .filter((client) => client.connection?.status === 'connected')
                .map((client) => (
                  <div key={client.clientId} className="app-list-row">
                    <div>
                      <strong>{client.title}</strong>
                      <p>{client.type === 'oauth' ? 'OAuth' : 'Token'}</p>
                    </div>
                    <span className="app-status-pill">Connected</span>
                  </div>
                ))}
            </div>
          ) : (
            <EmptyState
              action={
                <Link className="app-panel-link" to="/ai">
                  Connect a client <ArrowRight className="h-4 w-4" />
                </Link>
              }
              body="Connect Claude, ChatGPT, Copilot, Codex, or another MCP client when you are ready."
              icon={<Bot className="h-5 w-5" />}
              title="No AI clients connected yet"
            />
          )}
        </section>
      </div>
    </AppConsoleLayout>
  );
}

function ConnectedAppsPage() {
  const [bootstrap, setBootstrap] = useState<AccountBootstrapResponse | null>(
    null
  );
  const [connectedApps, setConnectedApps] = useState<ConnectedAppGrant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revokingGrantId, setRevokingGrantId] = useState<string | null>(null);

  async function refreshConnectedApps() {
    const [bootstrapResult, connectedAppsResult] = await Promise.all([
      getAccountBootstrap(),
      getConnectedApps(),
    ]);
    setBootstrap(bootstrapResult);
    setConnectedApps(connectedAppsResult.connectedApps);
  }

  useEffect(() => {
    let active = true;

    void refreshConnectedApps()
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

  async function handleRevoke(grantId: string) {
    setRevokingGrantId(grantId);
    setError(null);
    try {
      await revokeConnectedApp(grantId);
      await refreshConnectedApps();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to revoke app access.'
      );
    } finally {
      setRevokingGrantId(null);
    }
  }

  if (loading) {
    return (
      <LoadingPanel
        message="Loading connected apps..."
        title="Connected apps"
      />
    );
  }

  const roomsById = new Map(bootstrap?.rooms.map((room) => [room.id, room]));
  const activeGrants = connectedApps.filter(
    (grant) => grant.status === 'active'
  );
  const revokedGrants = connectedApps.filter(
    (grant) => grant.status === 'revoked'
  );

  return (
    <AppConsoleLayout
      active="apps"
      note={{
        body: 'Revoke removes the app grant. The app must ask again before it can sync.',
        title: 'Apps ask first',
      }}
    >
      <AppPageHero
        body="Review which apps can access your data, what scopes they have, when they last connected, and what you want to revoke. Nothing is shared without showing up here."
        eyebrow="Connected apps"
        title="Every app asks first."
      />

      {error ? <p className="app-error">{error}</p> : null}

      {activeGrants.length > 0 ? (
        <section className="app-panel">
          <div className="app-panel-header">
            <div>
              <h2>Active grants</h2>
              <p>
                These apps can access the collections or rooms listed here until
                you revoke them.
              </p>
            </div>
            <span className="mcp-chip">{activeGrants.length} active</span>
          </div>

          <div className="app-table app-connected-table" role="table">
            <div className="app-table-row app-table-head" role="row">
              <span role="columnheader">App</span>
              <span role="columnheader">Collections</span>
              <span role="columnheader">Rooms</span>
              <span role="columnheader">Last access</span>
              <span role="columnheader">Actions</span>
            </div>
            {activeGrants.map((grant) => (
              <div key={grant.id} className="app-table-row" role="row">
                <span role="cell">
                  <strong>{grant.domain}</strong>
                  <small>{grant.requesterType}</small>
                </span>
                <span role="cell">{getGrantCollectionsLabel(grant)}</span>
                <span role="cell">
                  {grant.roomIds.length > 0
                    ? grant.roomIds
                        .map((roomId) => roomsById.get(roomId)?.name ?? roomId)
                        .join(', ')
                    : 'Collection-level'}
                </span>
                <span role="cell">
                  {formatDate(getGrantLastActivity(grant))}
                </span>
                <span role="cell">
                  <Button
                    disabled={revokingGrantId === grant.id}
                    tone="outline"
                    type="button"
                    onClick={() => void handleRevoke(grant.id)}
                  >
                    {revokingGrantId === grant.id ? (
                      <InlineSpinner />
                    ) : (
                      'Revoke'
                    )}
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          action={
            <Link className="app-panel-link" to="/ai">
              Connect AI instead <ArrowRight className="h-4 w-4" />
            </Link>
          }
          body="When an app requests access to your data, the request appears here before anything is shared."
          icon={<PlugZap className="h-5 w-5" />}
          title="No apps connected yet"
        />
      )}

      <section className="app-panel">
        <div className="app-panel-header">
          <div>
            <h2>Waiting for your approval</h2>
            <p>
              New app requests arrive through the permission prompt. Review the
              domain, collections, rooms, and expiry before approving.
            </p>
          </div>
          <span className="mcp-chip">0 pending</span>
        </div>
        <div className="app-request-preview">
          <span className="app-empty-icon" aria-hidden="true">
            <CircleAlert className="h-5 w-5" />
          </span>
          <div>
            <strong>No pending requests</strong>
            <p>
              You will land on the access request screen when an app asks for a
              grant.
            </p>
          </div>
        </div>
      </section>

      {revokedGrants.length > 0 ? (
        <section className="app-panel">
          <div className="app-panel-header">
            <div>
              <h2>Revoked access</h2>
              <p>These apps must request a new grant before they can sync.</p>
            </div>
            <span className="mcp-chip">{revokedGrants.length} revoked</span>
          </div>
          <div className="app-list">
            {revokedGrants.map((grant) => (
              <div key={grant.id} className="app-list-row">
                <div>
                  <strong>{grant.domain}</strong>
                  <p>{getGrantCollectionsLabel(grant)}</p>
                </div>
                <span className="app-status-pill app-status-muted">
                  Revoked
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </AppConsoleLayout>
  );
}

function AccountHomePage() {
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
      <AppConsoleLayout active="account">
        <AppPageHero
          body="We could not load your account profile rooms."
          eyebrow="Account"
          title="Your identity, your profile."
        />
        <Card className="app-panel p-6">
          <p className="mt-3 text-sm text-destructive">
            {error ?? 'Unable to load your account.'}
          </p>
        </Card>
      </AppConsoleLayout>
    );
  }

  return (
    <AppConsoleLayout
      active="account"
      note={{
        body: 'Profile room data is portable across Eweser apps.',
        title: 'Portable identity',
      }}
    >
      <AppPageHero
        actions={
          <>
            <Link className="app-secondary-action" to="/ai">
              Connect AI <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="app-secondary-action" to="/security">
              Account security <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
        body="Manage the account identity your apps use and inspect profile room data that can move with you."
        eyebrow="Account"
        title="Your identity, your profile."
      />
      {bootstrap.profileRooms.length >= 2 ? (
        <ProfileEditor
          email={bootstrap.user.email}
          profileRooms={bootstrap.profileRooms}
          userCount={bootstrap.userCount}
        />
      ) : (
        <section className="app-panel">
          <div className="app-panel-header">
            <div>
              <h2>Profile</h2>
              <p>Profile rooms will appear here after account bootstrap.</p>
            </div>
            <span className="mcp-chip">Signed in</span>
          </div>
          <div className="app-list-row">
            <div>
              <strong>{bootstrap.user.email}</strong>
              <p>Current email</p>
            </div>
            <span className="app-status-pill">
              {bootstrap.user.emailVerified ? 'Verified' : 'Unverified'}
            </span>
          </div>
        </section>
      )}
      <StorageProviderStatus profile={bootstrap.storageProviderProfile} />
      <SnapshotBackupsStatus />
    </AppConsoleLayout>
  );
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function SnapshotBackupsStatus() {
  const [snapshots, setSnapshots] = useState<RemoteSnapshotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getBackupSnapshots()
      .then((result) => {
        if (active) {
          setSnapshots(result.snapshots);
          setError(null);
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

  async function downloadSnapshot(snapshotId: string) {
    setDownloadingId(snapshotId);
    setError(null);
    try {
      const result = await getBackupSnapshotDownloadUrl(snapshotId);
      window.location.href = result.url;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to download snapshot.'
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Database snapshots</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading
              ? 'Loading snapshots...'
              : `${snapshots.length} saved snapshot${
                  snapshots.length === 1 ? '' : 's'
                }`}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          User-owned
        </span>
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      {!loading && snapshots.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No snapshots have been uploaded yet.
        </p>
      ) : null}
      {snapshots.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Snapshot</th>
                <th className="py-2 pr-4 font-medium">Rooms</th>
                <th className="py-2 pr-4 font-medium">Documents</th>
                <th className="py-2 pr-4 font-medium">Size</th>
                <th className="py-2 pr-4 font-medium">Retention</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snapshot) => (
                <tr className="border-b last:border-0" key={snapshot.id}>
                  <td className="py-3 pr-4">
                    <div className="font-medium">{snapshot.filename}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(snapshot.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="py-3 pr-4">{snapshot.roomCount}</td>
                  <td className="py-3 pr-4">{snapshot.documentCount}</td>
                  <td className="py-3 pr-4">
                    {formatBytes(snapshot.sizeBytes)}
                  </td>
                  <td className="py-3 pr-4">
                    {snapshot.retentionExpiresAt
                      ? new Date(
                          snapshot.retentionExpiresAt
                        ).toLocaleDateString()
                      : 'Manual'}
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      aria-label={`Download ${snapshot.filename}`}
                      className="gap-2"
                      disabled={downloadingId === snapshot.id}
                      tone="outline"
                      type="button"
                      onClick={() => void downloadSnapshot(snapshot.id)}
                    >
                      {downloadingId === snapshot.id ? (
                        <InlineSpinner />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
}

function StorageProviderStatus({
  profile,
}: {
  profile: AccountBootstrapResponse['storageProviderProfile'];
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">File storage</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile?.label ?? 'No storage profile'}
          </p>
        </div>
        <span
          className={
            profile?.configured
              ? 'rounded-full bg-emerald-950 px-3 py-1 text-xs font-medium text-emerald-200'
              : 'rounded-full bg-amber-950 px-3 py-1 text-xs font-medium text-amber-200'
          }
        >
          {profile?.configured ? 'Configured' : 'Not configured'}
        </span>
      </div>
      {profile ? (
        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Profile</dt>
            <dd className="mt-1 font-medium">{profile.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Provider</dt>
            <dd className="mt-1 font-medium">{profile.kind}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Limit</dt>
            <dd className="mt-1 font-medium">{profile.maxFileSizeMb} MB</dd>
          </div>
        </dl>
      ) : null}
    </Card>
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
      <AppConsoleLayout active="apps">
        <AppPageHero
          body="The app request URL is missing required information."
          eyebrow="Access request"
          title="Grant access to your data layer."
        />
        <Card className="app-panel p-6">
          <p className="mt-3 text-sm text-destructive">
            The access request is invalid.
          </p>
        </Card>
      </AppConsoleLayout>
    );
  }

  if (loading) {
    return (
      <LoadingPanel message="Loading your rooms..." title="Grant permissions" />
    );
  }

  if (error || !bootstrap) {
    return (
      <AppConsoleLayout active="apps">
        <AppPageHero
          body="We could not load the rooms needed to review this access request."
          eyebrow="Access request"
          title="Grant access to your data layer."
        />
        <Card className="app-panel p-6">
          <p className="mt-3 text-sm text-destructive">
            {error ?? 'Unable to load your rooms.'}
          </p>
        </Card>
      </AppConsoleLayout>
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
    <AppConsoleLayout
      active="apps"
      note={{
        body: 'The app cannot access anything not listed in this review.',
        title: 'Review first',
      }}
    >
      <AppPageHero
        body="Review the app, domain, requested collections, and scope before approving access. You can revoke this any time from connected apps."
        eyebrow="Access request"
        title="Grant access to your data layer."
      />

      <section className="app-panel permission-panel">
        <div className="permission-summary">
          <div>
            <span className="mcp-chip">App</span>
            <strong>{loginQuery.name}</strong>
            <p>{loginQuery.domain}</p>
          </div>
          <div>
            <span className="mcp-chip">Requested access</span>
            <strong>
              {allowAll ? 'All requested collections' : 'Selected scope'}
            </strong>
            <p>
              {allowAll
                ? 'Read all collections and rooms this account can grant.'
                : `${selectedCollections.length} collections, ${selectedRoomIds.length} rooms`}
            </p>
          </div>
          <div>
            <span className="mcp-chip">Cannot access</span>
            <strong>Everything else</strong>
            <p>Unlisted rooms and future grants remain private.</p>
          </div>
        </div>

        <div className="permission-control">
          <label className="permission-check">
            <input
              checked={allowAll}
              className="mcp-checkbox"
              onChange={(event) => {
                const checked = event.target.checked;
                setAllowAll(checked);
                setSelectedCollections(checked ? ['all'] : []);
              }}
              type="checkbox"
            />
            <span>
              <strong>All accessible data</strong>
              <small>
                Use this only when you trust the app with every requested
                collection.
              </small>
            </span>
          </label>
        </div>

        {!allowAll ? (
          <div className="app-two-column">
            <section className="permission-choice-panel">
              <h2>Collections</h2>
              <p>Choose the record types this app may read.</p>
              <div className="app-list">
                {availableCollections.map((collectionKey) => (
                  <label key={collectionKey} className="permission-check">
                    <input
                      checked={selectedCollections.includes(collectionKey)}
                      className="mcp-checkbox"
                      onChange={(event) =>
                        toggleCollection(collectionKey, event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>
                      <strong>{formatCollectionKey(collectionKey)}</strong>
                      <small>{getCollectionDescription(collectionKey)}</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="permission-choice-panel">
              <h2>Specific rooms</h2>
              <p>Limit the grant to room boundaries where possible.</p>
              <div className="app-list">
                {bootstrap.rooms.map((room) => (
                  <label key={room.id} className="permission-check">
                    <input
                      checked={selectedRoomIds.includes(room.id)}
                      className="mcp-checkbox"
                      onChange={(event) =>
                        toggleRoom(room.id, event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>
                      <strong>{room.name}</strong>
                      <small>{formatCollectionKey(room.collectionKey)}</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        <div className="permission-footer">
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="keep-alive-days">Cancel if inactive for</Label>
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
      </section>
    </AppConsoleLayout>
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
      const errorMessage = readAuthErrorMessage(result);
      if (errorMessage) {
        if (active) {
          setError(errorMessage);
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
      <form className={authFormClass} onSubmit={handleSubmit}>
        <div className={authFieldGroupClass}>
          <Label className={authLabelClass} htmlFor="forgot-password-email">
            Email
          </Label>
          <Input
            id="forgot-password-email"
            className={authFieldClass}
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
          className={authPrimaryButtonClass}
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
      <form className={authFormClass} onSubmit={handleSubmit}>
        <div className={authFieldGroupClass}>
          <Label className={authLabelClass} htmlFor="reset-password-new">
            New password
          </Label>
          <Input
            id="reset-password-new"
            className={authFieldClass}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </div>
        <div className={authFieldGroupClass}>
          <Label className={authLabelClass} htmlFor="reset-password-confirm">
            Confirm password
          </Label>
          <Input
            id="reset-password-confirm"
            className={authFieldClass}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            value={confirmPassword}
          />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <Button
          className={authPrimaryButtonClass}
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
      callbackURL: appAbsoluteUrl('/'),
      token,
    })
      .then(() => {
        if (!active) return;
        setDone(true);
        setTimeout(() => navigate('/', { replace: true }), 1200);
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
    <AppConsoleLayout
      active="security"
      note={{
        body: 'Email verification and 2FA protect grants, tokens, and account changes.',
        title: 'Account boundary',
      }}
    >
      <AppPageHero
        body="Email verification, password, two-factor controls, and active session management live here."
        eyebrow="Security"
        title="Keep your account tight."
      />

      <div className="app-two-column">
        <section className="app-panel">
          <div className="app-panel-header">
            <div>
              <h2>Email verification</h2>
              <p>Verification is required for sensitive account actions.</p>
            </div>
            <span className="app-status-pill">
              {bootstrap?.user.emailVerified ? 'Verified' : 'Unverified'}
            </span>
          </div>
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
          ) : (
            <div className="app-request-preview">
              <span className="app-empty-icon" aria-hidden="true">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <strong>Email verified</strong>
                <p>Your email can be used for account recovery and alerts.</p>
              </div>
            </div>
          )}
        </section>

        <section className="app-panel">
          <div className="app-panel-header">
            <div>
              <h2>Passkeys</h2>
              <p>
                WebAuthn is deferred until this better-auth version exposes a
                stable passkey plugin.
              </p>
            </div>
            <span className="mcp-chip">Planned</span>
          </div>
        </section>
      </div>

      <section className="app-panel">
        <div className="app-panel-header">
          <div>
            <h2>Two-factor authentication</h2>
            <p>
              Use your current password to enable, disable, or refresh TOTP.
            </p>
          </div>
          <span className="mcp-chip">TOTP</span>
        </div>

        <div className="app-form-grid">
          <div className="space-y-2">
            <Label htmlFor="security-password">Current password</Label>
            <Input
              id="security-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>

          <div className="app-button-cluster">
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
        </div>

        {totpUri ? (
          <div className="app-code-panel">
            <p className="text-sm font-medium">TOTP URI</p>
            <p className="break-all text-xs text-muted-foreground">{totpUri}</p>
            <div className="mt-3 flex gap-2">
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
          <div className="app-code-panel">
            <p className="text-sm font-medium">Backup codes</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {backupCodes.map((code) => (
                <li key={code} className="rounded bg-muted px-2 py-1 font-mono">
                  {code}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        ) : null}
      </section>
    </AppConsoleLayout>
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
      navigate('/', { replace: true });
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
      <form className={authFormClass} onSubmit={handleSubmit}>
        <div className={authFieldGroupClass}>
          <Label className={authLabelClass} htmlFor="two-factor-code">
            {mode === 'totp' ? 'Authenticator code' : 'Backup code'}
          </Label>
          <Input
            id="two-factor-code"
            className={authFieldClass}
            onChange={(event) => setCode(event.target.value)}
            value={code}
          />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <Button
          className={authPrimaryButtonClass}
          disabled={working}
          type="submit"
        >
          {working ? <InlineSpinner /> : 'Verify'}
        </Button>
        <Button
          className={authOutlineButtonClass}
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card className="space-y-8 p-6 text-sm leading-6 sm:p-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {lastUpdatedLabel}
          </p>
          <h2 className="text-3xl font-semibold">Terms of Service</h2>
          <p className="text-muted-foreground">
            These terms govern use of the hosted EweserDB service at eweser.com
            and app.eweser.com. Self-hosted deployments are governed by the
            open-source license and by the operator of that deployment.
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Account and Service Use</h3>
          <p>
            You must provide accurate account information, keep your credentials
            secure, and remain responsible for activity under your account. You
            may not use EweserDB to break the law, attack the service, bypass
            access controls, interfere with other users, or reverse engineer
            hosted infrastructure except where allowed by law or the open-source
            license.
          </p>
          <p>
            We may suspend or terminate accounts, revoke sessions or agent
            tokens, remove hosted content, or limit access when we reasonably
            believe these terms, law, platform security, or another user's
            rights are at risk.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Your Data and Permissions</h3>
          <p>
            You retain ownership of content you store in EweserDB. You grant us
            the limited rights needed to host, sync, back up, secure, debug, and
            operate the service. EweserDB is local-first, but synced rooms are
            stored server-side in readable form unless a future end-to-end
            encrypted mode is explicitly enabled.
          </p>
          <p>
            You control app and AI agent access through scoped grants and
            revocable tokens. You are responsible for tools you connect and for
            content those tools write into your rooms.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Prohibited Content</h3>
          <p>
            You may not store, sync, publish, or distribute content that is
            illegal, exploitative, abusive, or harmful. This includes child
            sexual abuse material or child exploitation content, non-consensual
            intimate imagery, credible threats, targeted harassment, malware,
            phishing, spam, copyright-infringing material, or content that
            violates another person's rights.
          </p>
          <p>
            Report abuse to{' '}
            <a className="underline" href={`mailto:${abuseEmail}`}>
              {abuseEmail}
            </a>
            . We may preserve and disclose information when required to comply
            with law, protect users, investigate abuse, or report suspected
            child exploitation to the appropriate authorities.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Copyright and DMCA Notices</h3>
          <p>
            If you believe hosted content infringes your copyright, send a
            notice to{' '}
            <a className="underline" href={`mailto:${copyrightEmail}`}>
              {copyrightEmail}
            </a>
            . Include your contact information, identification of the
            copyrighted work, the allegedly infringing material and its
            location, a statement that you have a good-faith belief the use is
            not authorized, a statement that the notice is accurate under
            penalty of perjury, and a physical or electronic signature.
          </p>
          <p>
            Users may send counter-notices to the same address. Repeat
            infringers may have accounts terminated. Safe-harbor eligibility
            also requires keeping the service's designated agent information
            current with the U.S. Copyright Office.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">
            Service Changes and Availability
          </h3>
          <p>
            The hosted service is provided on a best-effort basis while the
            platform evolves. We may change, suspend, or discontinue parts of
            the service. We will try to give reasonable notice for changes that
            materially affect user data, export, or paid features.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Disclaimers and Liability</h3>
          <p>
            The service is provided "as is" without warranties to the maximum
            extent allowed by law. We are not liable for indirect, incidental,
            consequential, special, exemplary, or punitive damages. Our total
            liability for claims relating to the hosted service is limited to
            the greater of the amount you paid for the service in the prior
            twelve months or 100 USD, except where law does not allow that
            limitation.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Contact</h3>
          <p>
            For account or service questions, contact{' '}
            <a className="underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            . For privacy requests, contact{' '}
            <a className="underline" href={`mailto:${privacyEmail}`}>
              {privacyEmail}
            </a>
            .
          </p>
        </section>
      </Card>
    </div>
  );
}

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card className="space-y-8 p-6 text-sm leading-6 sm:p-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {lastUpdatedLabel}
          </p>
          <h2 className="text-3xl font-semibold">Privacy Policy</h2>
          <p className="text-muted-foreground">
            This policy explains what the hosted EweserDB service collects, why
            it is collected, and how to request access, export, correction, or
            deletion. It does not cover independently operated self-hosted
            deployments.
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Information We Collect</h3>
          <p>
            We collect account information such as email address, name, password
            authentication metadata, session identifiers, email verification
            state, two-factor settings, and security event metadata. We also
            collect operational data such as IP address, user agent, request
            timestamps, rate-limit events, error logs, and abuse-prevention
            signals.
          </p>
          <p>
            When you sync rooms through eweser.com, hosted services store Yjs
            room state, room metadata, access grants, agent tokens, OAuth client
            records, public indexing metadata, and audit-style access logs
            needed to provide sync, search, app access, and MCP/AI agent access.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">How We Use Information</h3>
          <p>
            We use information to operate accounts, authenticate users, sync and
            restore data, issue and revoke access grants, route MCP requests,
            secure the service, investigate abuse, improve reliability, respond
            to support requests, and comply with legal obligations. We do not
            sell user data or use synced room content to train AI models.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Service Providers</h3>
          <p>
            The hosted service may rely on infrastructure, database, email,
            logging, deployment, and security providers. These providers process
            data only as needed to deliver their services to EweserDB. Specific
            providers may change as the hosted service matures.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Retention</h3>
          <p>
            Account records are retained while your account is active. Synced
            room content is retained while you keep it in the hosted service or
            until deletion is processed. Security logs, rate-limit events, and
            operational logs are retained for a limited period needed for
            security, debugging, abuse response, and legal compliance. Backups
            may retain deleted data for a short operational window before
            rotation.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Your Choices and Rights</h3>
          <p>
            You can review and change account settings in the app. You can
            revoke connected apps and agent tokens where those controls are
            available. You can request access, export, correction, deletion, or
            restriction of personal data by contacting{' '}
            <a className="underline" href={`mailto:${privacyEmail}`}>
              {privacyEmail}
            </a>
            .
          </p>
          <p>
            If you are in a jurisdiction with specific privacy rights, including
            the European Economic Area, United Kingdom, California, or other
            U.S. states with privacy laws, you may have additional rights to
            know, access, delete, correct, port, or object to certain
            processing. We will respond to verifiable requests as required by
            applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Security and Limits</h3>
          <p>
            EweserDB uses local-first architecture, scoped access grants,
            revocable tokens, rate limits, security logging, and transport
            encryption. Hosted synced room content is not currently end-to-end
            encrypted against the server. For an adversarial threat model,
            self-hosting gives you control over the infrastructure that stores
            synced room state.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Children</h3>
          <p>
            The hosted service is not intended for children. Do not use the
            service to store or distribute content involving child exploitation.
            Reports of suspected exploitation should be sent to{' '}
            <a className="underline" href={`mailto:${abuseEmail}`}>
              {abuseEmail}
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Contact</h3>
          <p>
            Privacy requests:{' '}
            <a className="underline" href={`mailto:${privacyEmail}`}>
              {privacyEmail}
            </a>
            . Abuse reports:{' '}
            <a className="underline" href={`mailto:${abuseEmail}`}>
              {abuseEmail}
            </a>
            . Copyright notices:{' '}
            <a className="underline" href={`mailto:${copyrightEmail}`}>
              {copyrightEmail}
            </a>
            .
          </p>
        </section>
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
          The route you requested is not part of this app.
        </p>
      </Card>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute>
            <PersonalDataHomePage />
          </ProtectedRoute>
        }
        path="/"
      />
      <Route element={<SignInPage />} path="/sign-in" />
      <Route element={<SignInPage />} path="/auth/sign-in" />
      <Route element={<SignUpPage />} path="/sign-up" />
      <Route element={<TwoFactorChallengePage />} path="/two-factor" />
      <Route element={<ForgotPasswordPage />} path="/forgot-password" />
      <Route element={<ResetPasswordPage />} path="/reset-password" />
      <Route element={<VerifyEmailPage />} path="/verify-email" />
      <Route element={<AwaitConfirmPage />} path="/await-confirm" />
      <Route
        element={
          <ProtectedRoute>
            <AccountHomePage />
          </ProtectedRoute>
        }
        path="/home"
      />
      <Route
        element={
          <ProtectedRoute>
            <ConnectedAppsPage />
          </ProtectedRoute>
        }
        path="/apps"
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
        path="/ai"
      />
      <Route
        element={
          <ProtectedRoute>
            <ConnectAiPage />
          </ProtectedRoute>
        }
        path="/account/connect-ai"
      />
      {import.meta.env.DEV ? (
        <Route
          element={<ConnectAiPage previewOverview={connectAiPreviewOverview} />}
          path="/design/mcp-preview"
        />
      ) : null}
      <Route
        element={
          <ProtectedRoute>
            <SecurityPage />
          </ProtectedRoute>
        }
        path="/security"
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
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <AppRoutes />
      </div>
    </ThemeProvider>
  );
}
