import { ArrowLeft, User, Server, LogOut, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useDb } from '@/db';

export function Settings() {
  const navigate = useNavigate();
  const { loggedIn, loginUrl, signOut, user } = useDb();

  return (
    <div
      data-cy="ewe-note-settings-page"
      className="flex h-screen overflow-hidden"
    >
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="px-8 py-5 border-b border-border bg-card">
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

        <div className="flex-1 overflow-y-auto px-8 py-8 max-w-2xl">
          {/* Account section */}
          <section className="mb-8">
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
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Server className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium mb-1">Homeserver</div>
                  <div
                    data-cy="ewe-note-settings-homeserver"
                    className="text-sm text-muted-foreground font-mono break-all"
                  >
                    {import.meta.env.VITE_AUTH_SERVER ?? 'Not configured'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Notes are stored locally first and synced when connected.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
