import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { captcha, twoFactor } from 'better-auth/plugins';
import { randomUUID } from 'crypto';
import { createLogger } from '@eweser/logger';
import { db } from './db/drizzle.js';
import * as schema from './db/schema/index.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './email.js';
import { env } from './env.js';
import { logSecurityEvent } from './model/security-events.js';

const log = createLogger('auth-config');

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_BASE_URL,
  trustedOrigins: env.AUTH_TRUSTED_ORIGINS,

  advanced: {
    trustedProxyHeaders: env.TRUST_PROXY,
    useSecureCookies: env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
      ...(env.NODE_ENV === 'production' ? { domain: env.AUTH_DOMAIN } : {}),
    },
    database: {
      generateId: () => randomUUID(),
    },
  },

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      twoFactor: schema.twoFactor,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    async onPasswordReset({ user }) {
      await logSecurityEvent({
        action: 'password.reset.completed',
        userId: user.id,
        level: 'info',
      });
    },
    async sendResetPassword({ token, url, user }) {
      try {
        await sendPasswordResetEmail({ to: user.email, url });
        await logSecurityEvent({
          action: 'password.reset.requested',
          userId: user.id,
          level: 'info',
          metadata: {
            emailProvider: env.AUTH_EMAIL_PROVIDER,
            hasResetToken: Boolean(token),
          },
        });
      } catch (error) {
        log.error(
          {
            error,
            userId: user.id,
            email: user.email,
            hasResetToken: Boolean(token),
          },
          'Failed to deliver password reset email.'
        );
        await logSecurityEvent({
          action: 'password.reset.delivery_failed',
          userId: user.id,
          level: 'error',
          metadata: {
            emailProvider: env.AUTH_EMAIL_PROVIDER,
          },
        });
        throw error;
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ token, url, user }) {
      try {
        await sendVerificationEmail({ to: user.email, url });
        await logSecurityEvent({
          action: 'email.verification.sent',
          userId: user.id,
          level: 'info',
          metadata: {
            emailProvider: env.AUTH_EMAIL_PROVIDER,
            hasVerificationToken: Boolean(token),
          },
        });
      } catch (error) {
        log.error(
          {
            error,
            userId: user.id,
            email: user.email,
            hasVerificationToken: Boolean(token),
          },
          'Failed to deliver verification email.'
        );
        await logSecurityEvent({
          action: 'email.verification.delivery_failed',
          userId: user.id,
          level: 'error',
          metadata: {
            emailProvider: env.AUTH_EMAIL_PROVIDER,
          },
        });
        throw error;
      }
    },
    async afterEmailVerification(user) {
      await logSecurityEvent({
        action: 'email.verified',
        userId: user.id,
        level: 'info',
      });
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 6,
    freshAge: 60 * 15,
  },

  plugins: [
    ...(env.AUTH_ENABLE_2FA
      ? [
          twoFactor({
            issuer: `EweserDB (${env.AUTH_DOMAIN})`,
          }),
        ]
      : []),
    ...(env.TURNSTILE_SECRET_KEY
      ? [
          captcha({
            endpoints: [
              '/sign-up/email',
              '/sign-in/email',
              '/forget-password',
              '/request-password-reset',
            ],
            provider: 'cloudflare-turnstile',
            secretKey: env.TURNSTILE_SECRET_KEY,
          }),
        ]
      : []),
  ],

  socialProviders: {
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
});

export type Auth = typeof auth;
