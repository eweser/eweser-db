export type EweNoteSyncStatus =
  | 'local-only'
  | 'signed-out'
  | 'connecting'
  | 'synced'
  | 'offline'
  | 'auth-unreachable'
  | 'sync-error';

export type DbStatusSnapshot = {
  online: boolean;
  hasToken: boolean;
  connectedRoomsCount: number;
  connectingRoomsCount: number;
};

export function deriveSyncStatus({
  loaded,
  loggedIn,
  hasToken,
  browserOnline,
  dbStatus,
}: {
  loaded: boolean;
  loggedIn: boolean;
  hasToken: boolean;
  browserOnline: boolean;
  dbStatus: DbStatusSnapshot | null;
}): EweNoteSyncStatus {
  if (!browserOnline) return 'offline';
  if (!hasToken && !loggedIn) return loaded ? 'signed-out' : 'local-only';
  if (dbStatus?.online === false) return 'auth-unreachable';
  if (dbStatus?.connectedRoomsCount) return 'synced';
  if (dbStatus?.connectingRoomsCount) return 'connecting';
  if (hasToken && !loggedIn) return 'auth-unreachable';
  return 'local-only';
}
