export const DEFAULT_ROOM_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function generateTTLDate(ttlMs?: number): Date {
  return new Date(Date.now() + (ttlMs ?? DEFAULT_ROOM_TTL_MS));
}
