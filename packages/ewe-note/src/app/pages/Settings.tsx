import {
  ArrowLeft,
  Download,
  HardDrive,
  LogIn,
  LogOut,
  Server,
  ShieldCheck,
  Smartphone,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useDb } from '@/db';
import { AUTH_PAGES_SERVER, AUTH_SERVER, env, routerBase } from '@/config';

export function Settings() {
  const navigate = useNavigate();
  const {
    allRooms,
    allRoomIds,
    hasToken,
    loaded,
    loggedIn,
    loginUrl,
    signOut,
    syncStatus,
    syncStatusDescription,
    syncStatusLabel,
    user,
  } = useDb();

  return (
    <div
      data-cy="ewe-note-settings-page"
      className="flex h-[100dvh] overflow-hidden"
    >
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="border-b border-border bg-card px-4 py-4 md:px-8 md:py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl tracking-tight">Settings</h1>
          </div>
        </header>

        <div className="w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {/* Account section */}
          <section
            id="account"
            data-cy="ewe-note-settings-account"
            className="mb-8"
          >
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Account
            </h2>
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  {loggedIn ? (
                    <>
                      <div className="font-medium">
                        {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
                          'Signed In'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.avatar ?? ''}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Not signed in</div>
                  )}
                </div>
              </div>

              {loggedIn ? (
                <button
                  data-cy="ewe-note-settings-signout"
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => {
                    window.location.href = loginUrl;
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in to sync
                </button>
              )}
            </div>
          </section>

          {/* Sync section */}
          <section className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Sync
            </h2>
            <div className="grid gap-3">
              <SettingsPanel icon={Server} title={syncStatusLabel}>
                <p
                  data-cy="ewe-note-settings-sync-status"
                  className="text-sm text-muted-foreground"
                >
                  {syncStatusDescription}
                </p>
                <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-foreground">Auth API</dt>
                    <dd
                      data-cy="ewe-note-settings-homeserver"
                      className="mt-1 break-all font-mono"
                    >
                      {AUTH_SERVER}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Auth pages</dt>
                    <dd className="mt-1 break-all font-mono">
                      {AUTH_PAGES_SERVER}
                    </dd>
                  </div>
                </dl>
              </SettingsPanel>

              <SettingsPanel icon={HardDrive} title="Local data">
                <p className="text-sm text-muted-foreground">
                  Notes load from IndexedDB first and remain editable without
                  signing in. Destructive local-data controls are not exposed in
                  this screen.
                </p>
              </SettingsPanel>

              <SettingsPanel icon={Smartphone} title="PWA and offline">
                <p className="text-sm text-muted-foreground">
                  Install support is available in production builds. Offline
                  writing is local-first; full offline app-shell reload depends
                  on the registered service worker.
                </p>
              </SettingsPanel>

              <SettingsPanel icon={Download} title="Import and export">
                <p className="text-sm text-muted-foreground">
                  Markdown import/export is handled by the vault tools and
                  editor source mode. UI-level vault import is still deferred.
                </p>
              </SettingsPanel>

              <SettingsPanel icon={ShieldCheck} title="Diagnostics">
                <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <DiagnosticRow label="Environment" value={env} />
                  <DiagnosticRow label="Route base" value={routerBase} />
                  <DiagnosticRow label="Loaded" value={String(loaded)} />
                  <DiagnosticRow label="Status" value={syncStatus} />
                  <DiagnosticRow label="Has token" value={String(hasToken)} />
                  <DiagnosticRow
                    label="Rooms"
                    value={`${allRooms.length} (${allRoomIds.join(', ') || 'none'})`}
                  />
                </dl>
              </SettingsPanel>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SettingsPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium mb-1">{title}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono">{value}</dd>
    </div>
  );
}
