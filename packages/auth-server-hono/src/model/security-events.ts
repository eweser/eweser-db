import { db } from '../db/drizzle.js';
import { securityEvents } from '../db/schema/security_events.js';

export type SecurityEventLevel = 'info' | 'warn' | 'error';

export async function logSecurityEvent(input: {
  action: string;
  userId?: string | null;
  level?: SecurityEventLevel;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(securityEvents).values({
    action: input.action,
    ipAddress: input.ipAddress ?? null,
    level: input.level ?? 'info',
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    userAgent: input.userAgent ?? null,
    userId: input.userId ?? null,
  });
}
