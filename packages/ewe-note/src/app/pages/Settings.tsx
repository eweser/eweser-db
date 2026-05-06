import {
  ArrowLeft,
  ChevronRight,
  Download,
  HardDrive,
  Hand,
  LogIn,
  LogOut,
  Moon,
  Palette,
  Server,
  Smartphone,
  Sun,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ThemeSettingsPanelContent } from '../../components/theme-settings-dialog';
import { useDb } from '../../db';
import { AUTH_PAGES_SERVER, AUTH_SERVER, env, routerBase } from '../../config';
import { useTheme } from '../components/ThemeProvider';
import { Switch } from '../components/ui/switch';
import { useWorkspaceInteractionPreferences } from '../components/workspace-interaction-settings';
import {
  importVaultFromFiles,
  type BrowserVaultImportProgress,
  type BrowserVaultImportResult,
} from '../lib/browser-vault-import';

const SETTINGS_SECTIONS = [
  { id: 'account', label: 'Account' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'interaction', label: 'Interaction' },
  { id: 'sync', label: 'Sync' },
  { id: 'developer', label: 'Developer' },
] as const;

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

export function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>('account');
  const vaultInputRef = useRef<HTMLInputElement | null>(null);
  const [vaultImportProgress, setVaultImportProgress] =
    useState<BrowserVaultImportProgress | null>(null);
  const [vaultImportResult, setVaultImportResult] =
    useState<BrowserVaultImportResult | null>(null);
  const [vaultImportError, setVaultImportError] = useState<string | null>(null);
  const { mode, theme, setMode } = useTheme();
  const { preferences, updatePreference } =
    useWorkspaceInteractionPreferences();
  const {
    allRooms,
    allRoomIds,
    db,
    hasToken,
    loaded,
    loggedIn,
    loginUrl,
    selectedRoom,
    setSelectedRoom,
    signOut,
    syncStatus,
    syncStatusDescription,
    syncStatusLabel,
    user,
  } = useDb();

  const importingVault = vaultImportProgress !== null;
  const canSyncRemotely = loggedIn || hasToken;

  useEffect(() => {
    const input = vaultInputRef.current;
    if (!input) return;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
  }, []);

  useEffect(() => {
    const hash = location.hash.replace('#', '').trim();
    const container = contentRef.current;
    if (!container) return;

    if (!hash) {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        container.scrollTop = 0;
      }
      return;
    }

    const target = container.querySelector<HTMLElement>(`#${hash}`);
    if (!target) return;

    setActiveSection(hash as SettingsSectionId);
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [location.hash]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const onScroll = () => {
      const sections = SETTINGS_SECTIONS.map(({ id }) => ({
        id,
        element: container.querySelector<HTMLElement>(`#${id}`),
      })).filter(
        (entry): entry is { id: SettingsSectionId; element: HTMLElement } =>
          Boolean(entry.element)
      );

      const nextActive =
        sections.find(
          ({ element }) => element.offsetTop - container.scrollTop > -120
        )?.id ?? sections.at(-1)?.id;

      if (nextActive) {
        setActiveSection(nextActive);
      }
    };

    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const jumpToSection = (sectionId: SettingsSectionId) => {
    const container = contentRef.current;
    if (!container) return;

    const target = container.querySelector<HTMLElement>(`#${sectionId}`);
    if (!target) return;

    setActiveSection(sectionId);
    window.history.replaceState(null, '', `#${sectionId}`);
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const openVaultPicker = () => {
    vaultInputRef.current?.click();
  };

  const handleVaultInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.currentTarget.files;
    event.currentTarget.value = '';
    if (!files || files.length === 0) return;

    setVaultImportError(null);
    setVaultImportResult(null);
    try {
      const result = await importVaultFromFiles({
        db,
        files,
        onProgress: setVaultImportProgress,
        remoteSyncEnabled: canSyncRemotely,
        setSelectedRoom,
      });
      setVaultImportResult(result);
    } catch (error) {
      setVaultImportError(
        error instanceof Error ? error.message : 'Vault import failed.'
      );
    } finally {
      setVaultImportProgress(null);
    }
  };

  const importedRoom =
    vaultImportResult?.noteRoomId != null
      ? (allRooms.find((room) => room.id === vaultImportResult.noteRoomId) ??
        null)
      : null;

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

        <div className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 justify-center gap-10 px-4 py-6 md:px-8 md:py-8">
          <aside className="sticky top-0 hidden w-48 shrink-0 self-start pt-2 lg:block">
            <nav aria-label="Settings sections" className="space-y-1">
              {SETTINGS_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => jumpToSection(section.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`}
                >
                  <span>{section.label}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
            </nav>
          </aside>

          <div
            ref={contentRef}
            className="min-h-0 w-full max-w-3xl flex-1 overflow-y-auto scroll-smooth"
          >
            <section
              id="account"
              data-cy="ewe-note-settings-account"
              className="mb-8 scroll-mt-6"
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

            <section id="appearance" className="mb-8 scroll-mt-6">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Appearance
              </h2>
              <div className="grid gap-3">
                <SettingsPanel
                  icon={theme === 'light' ? Sun : Moon}
                  title="Theme"
                >
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Palette className="h-3.5 w-3.5" />
                        Color mode
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'light', label: 'Light' },
                          { id: 'dark', label: 'Dark' },
                          { id: 'system', label: 'System' },
                        ].map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              setMode(option.id as 'light' | 'dark' | 'system')
                            }
                            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                              mode === option.id
                                ? 'border-foreground bg-accent text-foreground'
                                : 'border-border text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pick one of the four built-in palettes below, or
                        customize the selected palette for light and dark mode
                        separately.
                      </p>
                    </div>
                    <ThemeSettingsPanelContent />
                  </div>
                </SettingsPanel>
              </div>
            </section>

            <section id="interaction" className="mb-8 scroll-mt-6">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Interaction
              </h2>
              <div className="grid gap-3">
                <SettingsPanel icon={Hand} title="Gestures and swipe effects">
                  <div className="space-y-3">
                    <SettingsToggleRow
                      id="ewe-note-settings-mobile-swipe-effects"
                      title="Use swipe effects on mobile"
                      description="Swipe left and right between folders, file previews, and notes on mobile."
                      checked={preferences.mobileSwipeEffects}
                      onCheckedChange={(checked) =>
                        updatePreference('mobileSwipeEffects', checked)
                      }
                    />
                    <SettingsToggleRow
                      id="ewe-note-settings-desktop-swipe-effects"
                      title="Use swipe effects in desktop view"
                      description="Click, hold, and drag left or right across the workspace to shift between desktop panel layouts."
                      checked={preferences.desktopSwipeEffects}
                      onCheckedChange={(checked) =>
                        updatePreference('desktopSwipeEffects', checked)
                      }
                    />
                    <SettingsToggleRow
                      id="ewe-note-settings-mobile-pulldown-search"
                      title="Use pull-down search on mobile"
                      description="Pull down from the top of the mobile workspace to open search."
                      checked={preferences.mobilePullDownSearch}
                      onCheckedChange={(checked) =>
                        updatePreference('mobilePullDownSearch', checked)
                      }
                    />
                    <SettingsToggleRow
                      id="ewe-note-settings-desktop-pulldown-search"
                      title="Use pull-down search on desktop"
                      description="Click, hold, and drag downward in the desktop workspace to open search."
                      checked={preferences.desktopPullDownSearch}
                      onCheckedChange={(checked) =>
                        updatePreference('desktopPullDownSearch', checked)
                      }
                    />
                  </div>
                </SettingsPanel>
              </div>
            </section>

            <section id="sync" className="mb-8 scroll-mt-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Sync
              </h2>
              <SettingsPanel icon={Server} title="Local-first sync">
                <div className="space-y-5">
                  <input
                    ref={vaultInputRef}
                    className="hidden"
                    multiple
                    onChange={handleVaultInputChange}
                    type="file"
                  />
                  <div>
                    <p
                      data-cy="ewe-note-settings-sync-status"
                      className="text-sm font-medium text-foreground"
                    >
                      {syncStatusLabel}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {loggedIn
                        ? syncStatusDescription
                        : 'Your notes stay local and editable. Sign in only when you want sync across devices.'}
                    </p>
                  </div>

                  <div className="grid gap-4 rounded-lg border border-border/70 px-4 py-4 sm:grid-cols-2">
                    <InfoBlock
                      icon={HardDrive}
                      title="Local data"
                      description="Notes load from IndexedDB first and remain editable without signing in. Destructive local-data controls are not exposed in this screen."
                    />
                    <InfoBlock
                      icon={Smartphone}
                      title="PWA and offline"
                      description="Install support is available in production builds. Offline writing is local-first; full offline app-shell reload depends on the registered service worker."
                    />
                    <InfoBlock
                      icon={Download}
                      title="Obsidian vault import"
                      description={
                        canSyncRemotely
                          ? 'Choose an Obsidian vault folder to create synced notes and attachment rooms from the browser.'
                          : 'Choose an Obsidian vault folder to import markdown locally. Sign in first if you want attachments uploaded and synced across devices.'
                      }
                    />
                    <div className="space-y-2 rounded-lg bg-accent/35 px-4 py-4">
                      <div className="text-sm font-medium text-foreground">
                        Endpoints
                      </div>
                      <dl className="grid gap-3 text-xs text-muted-foreground">
                        <div>
                          <dt className="font-medium text-foreground">
                            Auth API
                          </dt>
                          <dd
                            data-cy="ewe-note-settings-homeserver"
                            className="mt-1 break-all font-mono"
                          >
                            {AUTH_SERVER}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-foreground">
                            Auth pages
                          </dt>
                          <dd className="mt-1 break-all font-mono">
                            {AUTH_PAGES_SERVER}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border border-border/70 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">
                          Import an Obsidian vault
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {canSyncRemotely
                            ? 'This creates a notes room plus a paired attachment room, then uploads files through the auth API.'
                            : 'This creates a local notes room immediately. Attachments stay out until sync is enabled.'}
                        </p>
                      </div>
                      <button
                        data-cy="ewe-note-settings-import-vault"
                        disabled={importingVault}
                        onClick={openVaultPicker}
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Download className="h-4 w-4" />
                        {importingVault
                          ? 'Importing vault...'
                          : 'Choose vault folder'}
                      </button>
                    </div>

                    {vaultImportProgress ? (
                      <div
                        data-cy="ewe-note-settings-import-progress"
                        className="rounded-lg border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground"
                      >
                        <div className="font-medium text-foreground">
                          {vaultImportProgress.message}
                        </div>
                        <div className="mt-1">
                          {vaultImportProgress.phase}{' '}
                          {vaultImportProgress.current}
                          {' / '}
                          {vaultImportProgress.total}
                        </div>
                      </div>
                    ) : null}

                    {vaultImportError ? (
                      <div
                        data-cy="ewe-note-settings-import-error"
                        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive"
                      >
                        {vaultImportError}
                      </div>
                    ) : null}

                    {vaultImportResult ? (
                      <div
                        data-cy="ewe-note-settings-import-result"
                        className="space-y-3 rounded-lg border border-border/70 bg-background/70 px-3 py-3 text-sm"
                      >
                        <div className="font-medium text-foreground">
                          Vault imported
                        </div>
                        <div className="text-muted-foreground">
                          {vaultImportResult.notesImported} notes imported into{' '}
                          {importedRoom?.name ?? 'a new room'}.{' '}
                          {vaultImportResult.remoteSyncEnabled
                            ? `${vaultImportResult.attachmentsUploaded} attachments uploaded`
                            : 'Attachment upload skipped until sync is active'}
                          {vaultImportResult.attachmentsSkipped > 0
                            ? `, ${vaultImportResult.attachmentsSkipped} skipped.`
                            : '.'}
                        </div>
                        {vaultImportResult.warnings.length > 0 ? (
                          <div className="space-y-1 text-muted-foreground">
                            {vaultImportResult.warnings
                              .slice(0, 3)
                              .map((warning) => (
                                <p key={warning}>{warning}</p>
                              ))}
                            {vaultImportResult.warnings.length > 3 ? (
                              <p>
                                {vaultImportResult.warnings.length - 3} more
                                warning(s) hidden.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              if (!importedRoom) return;
                              setSelectedRoom(importedRoom);
                              navigate('/');
                            }}
                            type="button"
                            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent/60"
                          >
                            Open imported room
                          </button>
                          {selectedRoom?.id === importedRoom?.id ? (
                            <span className="inline-flex items-center rounded-lg bg-accent px-3 py-2 text-sm text-foreground">
                              Active room
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </SettingsPanel>
            </section>

            <section id="developer" className="pb-8 scroll-mt-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Developer
              </h2>
              <SettingsPanel icon={Wrench} title="Diagnostics">
                <dl className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
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
            </section>
          </div>
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

function InfoBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2 rounded-lg bg-accent/35 px-4 py-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SettingsToggleRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start justify-between gap-4 rounded-lg border border-border/70 px-4 py-3"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      />
    </label>
  );
}
