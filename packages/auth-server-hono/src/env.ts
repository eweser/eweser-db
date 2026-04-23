import { logger } from '@eweser/logger';
import { z } from 'zod';

const defaultAuthApiPort = Number(process.env.AUTH_API_PORT ?? '38101');

const secretSchema = z.string().min(32);
const urlSchema = z.string().url();

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    DATABASE_URL: z.string().min(1),
    SERVER_SECRET: secretSchema,
    PORT: z.coerce.number().default(defaultAuthApiPort),

    /** better-auth secret — must be a long random string in production */
    BETTER_AUTH_SECRET: secretSchema.default(
      'change-me-in-production-secret-value'
    ),
    /** Public base URL of this server, e.g. https://auth.example.com */
    BETTER_AUTH_BASE_URL: urlSchema.default(
      `http://localhost:${defaultAuthApiPort}`
    ),

    /** Optional OAuth providers */
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    AUTH_EMAIL_PROVIDER: z.enum(['disabled', 'resend']).default('disabled'),
    AUTH_EMAIL_FROM: z.string().optional(),
    AUTH_EMAIL_REPLY_TO: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),

    /** Domain of this auth server, e.g. "auth.example.com" */
    AUTH_SERVER_DOMAIN: z
      .string()
      .min(1)
      .default(`localhost:${defaultAuthApiPort}`),
    /** Full URL of this auth server, e.g. "https://auth.example.com" */
    AUTH_SERVER_URL: urlSchema.default(
      `http://localhost:${defaultAuthApiPort}`
    ),
    /** WebSocket URL of the Hocuspocus sync server, e.g. "ws://localhost:8080" */
    SYNC_SERVER_URL: z.string().url().default('ws://localhost:8080'),
    /** Secret for signing Hocuspocus auth JWTs — defaults to SERVER_SECRET if not set */
    SYNC_AUTH_SECRET: z.string().optional(),
    /** Aggregator URL for MCP search tool */
    AGGREGATOR_URL: z.string().url().optional(),

    /** Comma-separated list of browser origins allowed to call auth APIs */
    AUTH_TRUSTED_ORIGINS: z.string().optional(),
    /** Explicit OAuth/public auth domain shown to users and used by cookie policy */
    AUTH_DOMAIN: z.string().optional(),

    /** Reverse proxy trust toggle. Keep false unless requests come through Caddy/known proxy */
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    /** Comma-separated browser origins allowed for MCP CORS responses */
    MCP_ALLOWED_ORIGINS: z.string().optional(),
    /** Session-store mode for MCP transport: single-process cache or redis-backed */
    MCP_SESSION_MODE: z.enum(['single', 'redis']).default('single'),
    /** Required when MCP_SESSION_MODE=redis */
    MCP_REDIS_URL: z.string().url().optional(),
    /** Default/max TTL for newly issued agent tokens */
    AGENT_TOKEN_DEFAULT_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(2_592_000),
    AGENT_TOKEN_MAX_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(7_776_000),
    /** Feature flag: enable Better Auth two-factor plugin */
    AUTH_ENABLE_2FA: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
  })
  .superRefine((value, ctx) => {
    const isProduction = value.NODE_ENV === 'production';
    const normalizedAuthDomain = value.AUTH_DOMAIN ?? value.AUTH_SERVER_DOMAIN;
    const authServerUrl = new URL(value.AUTH_SERVER_URL);
    const authBaseUrl = new URL(value.BETTER_AUTH_BASE_URL);
    const trustedOrigins = (value.AUTH_TRUSTED_ORIGINS ?? authServerUrl.origin)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const mcpAllowedOrigins = (value.MCP_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!trustedOrigins.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AUTH_TRUSTED_ORIGINS must include at least one origin',
        path: ['AUTH_TRUSTED_ORIGINS'],
      });
    }

    if (isProduction) {
      const placeholderRegex =
        /(changeme|change-me|replace(?:-with-random)?|example|test-secret|dev-secret)/i;
      for (const [key, secret] of [
        ['SERVER_SECRET', value.SERVER_SECRET],
        ['BETTER_AUTH_SECRET', value.BETTER_AUTH_SECRET],
        ['SYNC_AUTH_SECRET', value.SYNC_AUTH_SECRET ?? value.SERVER_SECRET],
      ] as const) {
        if (placeholderRegex.test(secret)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} looks like a placeholder secret`,
            path: [key],
          });
        }
      }
    }

    if (normalizedAuthDomain !== authServerUrl.host) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'AUTH_SERVER_DOMAIN/AUTH_DOMAIN must match AUTH_SERVER_URL host',
        path: ['AUTH_SERVER_DOMAIN'],
      });
    }

    for (const origin of trustedOrigins) {
      try {
        const parsedOrigin = new URL(origin);
        if (isProduction && parsedOrigin.protocol !== 'https:') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'AUTH_TRUSTED_ORIGINS must use HTTPS in production environments',
            path: ['AUTH_TRUSTED_ORIGINS'],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid trusted origin URL: ${origin}`,
          path: ['AUTH_TRUSTED_ORIGINS'],
        });
      }
    }

    if (isProduction) {
      if (authServerUrl.protocol !== 'https:') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'AUTH_SERVER_URL must use HTTPS in production',
          path: ['AUTH_SERVER_URL'],
        });
      }

      if (authBaseUrl.protocol !== 'https:') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'BETTER_AUTH_BASE_URL must use HTTPS in production',
          path: ['BETTER_AUTH_BASE_URL'],
        });
      }

      if (mcpAllowedOrigins.some((origin) => !origin.startsWith('https://'))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MCP_ALLOWED_ORIGINS must use HTTPS in production',
          path: ['MCP_ALLOWED_ORIGINS'],
        });
      }
    }

    if (value.MCP_SESSION_MODE === 'redis' && !value.MCP_REDIS_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MCP_REDIS_URL is required when MCP_SESSION_MODE=redis',
        path: ['MCP_REDIS_URL'],
      });
    }

    if (
      value.AGENT_TOKEN_DEFAULT_TTL_SECONDS > value.AGENT_TOKEN_MAX_TTL_SECONDS
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'AGENT_TOKEN_DEFAULT_TTL_SECONDS cannot be greater than AGENT_TOKEN_MAX_TTL_SECONDS',
        path: ['AGENT_TOKEN_DEFAULT_TTL_SECONDS'],
      });
    }

    if (value.AUTH_EMAIL_PROVIDER === 'resend') {
      if (!value.AUTH_EMAIL_FROM) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'AUTH_EMAIL_FROM is required when AUTH_EMAIL_PROVIDER=resend',
          path: ['AUTH_EMAIL_FROM'],
        });
      }

      if (!value.RESEND_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RESEND_API_KEY is required when AUTH_EMAIL_PROVIDER=resend',
          path: ['RESEND_API_KEY'],
        });
      }
    }

    if (isProduction && value.AUTH_EMAIL_PROVIDER === 'disabled') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'AUTH_EMAIL_PROVIDER must be configured in production so recovery emails can be delivered',
        path: ['AUTH_EMAIL_PROVIDER'],
      });
    }
  })
  .transform((value) => ({
    ...value,
    AUTH_DOMAIN: value.AUTH_DOMAIN ?? value.AUTH_SERVER_DOMAIN,
    AUTH_TRUSTED_ORIGINS: (value.AUTH_TRUSTED_ORIGINS ?? value.AUTH_SERVER_URL)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => new URL(origin).origin),
    MCP_ALLOWED_ORIGINS: (value.MCP_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  }));

export type ParsedEnv = z.infer<typeof envSchema>;

export function parseEnv(input: Record<string, string | undefined>): ParsedEnv {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

let parsedEnv: ParsedEnv;
try {
  parsedEnv = parseEnv(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error(
      { errors: error.flatten().fieldErrors },
      'Invalid environment variables:'
    );
  } else {
    logger.error({ error }, 'Unexpected env parsing error');
  }
  process.exit(1);
}

export const env = parsedEnv;
