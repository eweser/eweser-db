import { beforeEach, describe, expect, it, vi } from 'vitest';

const betterAuth = vi.fn((config) => ({
  api: {},
  config,
  handler: vi.fn(),
}));
const drizzleAdapter = vi.fn(() => ({ adapter: true }));
const captcha = vi.fn((options) => ({ name: 'captcha', options }));
const twoFactor = vi.fn((options) => ({ name: 'twoFactor', options }));
const logSecurityEvent = vi.fn(async () => undefined);
const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

vi.mock('better-auth', () => ({
  betterAuth,
}));

vi.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter,
}));

vi.mock('better-auth/plugins', () => ({
  captcha,
  twoFactor,
}));

vi.mock('@eweser/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

vi.mock('./db/drizzle.js', () => ({
  db: {},
}));

vi.mock('./db/schema/index.js', () => ({
  accounts: {},
  sessions: {},
  twoFactor: {},
  user: {},
  users: {},
  verification: {},
  verifications: {},
}));

vi.mock('./env.js', () => ({
  env: {
    AUTH_DOMAIN: 'auth.example.com',
    AUTH_EMAIL_FROM: 'EweserDB <no-reply@example.com>',
    AUTH_EMAIL_PROVIDER: 'resend',
    AUTH_EMAIL_REPLY_TO: 'support@example.com',
    AUTH_ENABLE_2FA: true,
    AUTH_TRUSTED_ORIGINS: ['https://app.example.com'],
    BETTER_AUTH_BASE_URL: 'https://auth.example.com',
    BETTER_AUTH_SECRET: '12345678901234567890123456789012',
    GITHUB_CLIENT_ID: undefined,
    GITHUB_CLIENT_SECRET: undefined,
    GOOGLE_CLIENT_ID: undefined,
    GOOGLE_CLIENT_SECRET: undefined,
    NODE_ENV: 'production',
    RESEND_API_KEY: 're_test_key',
    TRUST_PROXY: true,
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
  },
}));

vi.mock('./model/security-events.js', () => ({
  logSecurityEvent,
}));

const { auth } = await import('./auth.js');
const config = betterAuth.mock.calls[0]?.[0] as {
  emailAndPassword: {
    sendResetPassword: (input: {
      token: string;
      url: string;
      user: { email: string; id: string };
    }) => Promise<void>;
  };
  emailVerification: {
    sendVerificationEmail: (input: {
      token: string;
      url: string;
      user: { email: string; id: string };
    }) => Promise<void>;
  };
  plugins: Array<{ name: string; options: { endpoints?: string[] } }>;
};

describe('auth email delivery', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    logSecurityEvent.mockClear();
  });

  it('sends password reset email through Resend', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await config.emailAndPassword.sendResetPassword({
      token: 'reset-token',
      url: 'https://auth.example.com/reset?token=reset-token',
      user: { email: 'user@example.com', id: 'user-1' },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string>; method: string },
    ];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    expect(init.body).toContain('Reset your EweserDB password');
    expect(init.body).toContain('user@example.com');
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'password.reset.requested',
        level: 'info',
        userId: 'user-1',
      })
    );
  });

  it('sends verification email through Resend', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await config.emailVerification.sendVerificationEmail({
      token: 'verify-token',
      url: 'https://auth.example.com/verify?token=verify-token',
      user: { email: 'user@example.com', id: 'user-1' },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(init.body).toContain('Verify your EweserDB email');
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'email.verification.sent',
        level: 'info',
        userId: 'user-1',
      })
    );
  });

  it('protects both reset request paths with captcha configuration', () => {
    const captchaPlugin = config.plugins.find(
      (plugin) => plugin.name === 'captcha'
    );
    expect(captchaPlugin?.options.endpoints).toEqual(
      expect.arrayContaining(['/forget-password', '/request-password-reset'])
    );
  });
});

void auth;
