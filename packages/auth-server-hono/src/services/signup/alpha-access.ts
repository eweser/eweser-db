/**
 * Purpose: Limit account creation to the alpha allowlist.
 * Exports: isSignupAllowed, recordAlphaAccessRequest, ALPHA_ACCESS_REQUIRED.
 * Touches: alpha_access_requests table.
 * Read before editing: packages/auth-server-hono/INDEX.md and AGENTS.md.
 */
import { sql } from 'drizzle-orm';
import { db } from '../../db/drizzle.js';
import { alphaAccessRequests } from '../../db/schema/index.js';

/** Error code the sign-up UI uses to show the "request received" state. */
export const ALPHA_ACCESS_REQUIRED = 'ALPHA_ACCESS_REQUIRED';

export function isSignupAllowed(
  email: string,
  config: { mode: 'open' | 'allowlist'; allowlist: readonly string[] }
): boolean {
  if (config.mode === 'open') return true;
  return config.allowlist.includes(email.trim().toLowerCase());
}

export async function recordAlphaAccessRequest(
  email: string,
  name?: string | null
): Promise<void> {
  await db
    .insert(alphaAccessRequests)
    .values({ email: email.trim().toLowerCase(), name: name || null })
    .onConflictDoUpdate({
      target: alphaAccessRequests.email,
      set: { lastRequestedAt: sql`now()` },
    });
}
