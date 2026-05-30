/**
 * Purpose: Federated search panel for the Ewe Note sidebar.
 * Uses useFederatedSearch to query the aggregator and display
 * local and federated results with origin peer labels.
 * Touches: useFederatedSearch for search state and actions.
 * Read before editing: packages/ewe-note/src/INDEX.md and AGENTS.md.
 */
import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import {
  useFederatedSearch,
  getDocumentTitle,
  getDocumentSnippet,
} from '../../hooks/use-federated-search';

export function FederatedSearchPanel() {
  const {
    localResults,
    federatedResults,
    loading,
    error,
    searched,
    search,
    clear,
  } = useFederatedSearch();
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      search(inputValue);
    },
    [inputValue, search]
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    clear();
  }, [clear]);

  return (
    <div className="border-t border-sidebar-border px-3 py-2">
      <form
        data-cy="ewe-note-search-form"
        onSubmit={handleSubmit}
        className="relative"
      >
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-cy="ewe-note-search-input"
              placeholder="Search notes…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-8 pl-7 pr-2 text-xs"
            />
          </div>
          {searched && (
            <button
              type="button"
              data-cy="ewe-note-search-clear"
              onClick={handleClear}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Loading indicator */}
      {loading && (
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Searching…
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && !error && (
        <div
          data-cy="ewe-note-search-results"
          className="mt-2 max-h-60 space-y-2 overflow-y-auto"
        >
          {localResults.length === 0 && federatedResults.length === 0 ? (
            <div
              data-cy="ewe-note-search-no-results"
              className="text-center text-xs text-muted-foreground"
            >
              No results
            </div>
          ) : (
            <>
              {/* Local results */}
              {localResults.length > 0 && (
                <div>
                  <div
                    data-cy="ewe-note-search-local-label"
                    className="mb-1 text-[11px] font-medium text-muted-foreground"
                  >
                    Local Results ({localResults.length})
                  </div>
                  <div
                    data-cy="ewe-note-search-results-local"
                    className="space-y-1"
                  >
                    {localResults.map((result) => (
                      <div
                        key={result.id}
                        data-cy={`ewe-note-result-item-${result.id}`}
                        className="rounded-md border border-sidebar-border bg-sidebar-background px-2 py-1.5"
                      >
                        <div className="truncate text-xs font-medium text-sidebar-foreground">
                          {getDocumentTitle(result)}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                          {getDocumentSnippet(result)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Federated results */}
              {federatedResults.length > 0 && (
                <div>
                  {federatedResults.map((peer) => {
                    const peerLabel = peer.peer.replace(/\./g, '-');
                    return (
                      <div key={peer.peer} className="mb-2">
                        <div
                          data-cy={`ewe-note-search-federated-label-${peerLabel}`}
                          className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
                        >
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                          {peer.peer}
                        </div>
                        {peer.error && (
                          <div
                            data-cy="ewe-note-search-peer-error"
                            className="mb-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                          >
                            {peer.error}
                          </div>
                        )}
                        <div
                          data-cy="ewe-note-search-results-federated"
                          className="space-y-1"
                        >
                          {peer.results.map((result) => (
                            <div
                              key={result.id}
                              data-cy={`ewe-note-result-item-${result.id}`}
                              className="rounded-md border border-sidebar-border bg-sidebar-background px-2 py-1.5"
                            >
                              <div className="truncate text-xs font-medium text-sidebar-foreground">
                                {getDocumentTitle(result)}
                              </div>
                              <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                                {getDocumentSnippet(result)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
