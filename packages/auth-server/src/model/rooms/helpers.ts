export const DEFAULT_ROOM_TTL_PERIOD = 1000 * 60 * 60 * 24 * 30; // 30 days
export const generateTTLDate: (ttlMs?: number) => string = (ttlMs) =>
  new Date(
    new Date().getTime() + (ttlMs || DEFAULT_ROOM_TTL_PERIOD)
  ).toISOString();
