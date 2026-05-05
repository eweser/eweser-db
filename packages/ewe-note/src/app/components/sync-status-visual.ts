type EweNoteSyncStatus =
  | 'local-only'
  | 'signed-out'
  | 'connecting'
  | 'synced'
  | 'offline'
  | 'auth-unreachable'
  | 'sync-error';

export function getSyncStatusDotClass(status: EweNoteSyncStatus) {
  switch (status) {
    case 'synced':
      return 'bg-emerald-400';
    case 'connecting':
      return 'bg-sky-400';
    case 'offline':
      return 'bg-zinc-500';
    case 'auth-unreachable':
    case 'sync-error':
      return 'bg-destructive';
    case 'local-only':
      return 'bg-amber-400';
    case 'signed-out':
      return 'bg-muted-foreground';
  }
}
