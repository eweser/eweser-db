/**
 * Purpose: Secure room controls for the Ewe Note sidebar.
 * Shows encryption badge with tooltip explaining unavailable server-side features,
 * lock/unlock controls, create secure room button, and recovery phrase display.
 * Touches: useDb for secure room state, Tooltip and Dialog for UI.
 * Read before editing: packages/ewe-note/src/INDEX.md and AGENTS.md.
 */
import { Lock, Unlock, Shield, ShieldAlert, ShieldCheck, Key, Download, Upload, Eye } from 'lucide-react';
import { useDb } from '../../db';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { useCallback, useState } from 'react';

export function SecureRoomControls() {
  const {
    selectedRoom,
    createSecureRoom,
    lockCurrentRoom,
    unlockCurrentRoom,
    recoveryPhrase,
    dismissRecoveryPhrase,
    showUnlockInput,
    setShowUnlockInput,
    unlockPhraseInput,
    setUnlockPhraseInput,
    showImport,
    setShowImport,
    importKeyInput,
    setImportKeyInput,
    exportRoomKey,
    importRoomKey,
    exportedKey,
    creatingSecure,
    secureRoomMessage,
    allRooms,
    setSelectedRoom,
  } = useDb();

  const isEncrypted = Boolean(selectedRoom?.encryption);
  const isUnlocked = selectedRoom?.isUnlocked ?? true;
  const secureCount = allRooms.filter((r) => r.encryption).length;
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleUnlockSubmit = useCallback(() => {
    if (unlockPhraseInput.trim()) {
      void unlockCurrentRoom(unlockPhraseInput.trim());
    }
  }, [unlockPhraseInput, unlockCurrentRoom]);

  const handleImportSubmit = useCallback(() => {
    if (importKeyInput.trim()) {
      void importRoomKey(importKeyInput.trim());
    }
  }, [importKeyInput, importRoomKey]);

  const handleExport = useCallback(() => {
    void exportRoomKey();
    setShowExportDialog(true);
  }, [exportRoomKey]);

  const handleCreateSecure = useCallback(() => {
    void createSecureRoom();
  }, [createSecureRoom]);

  return (
    <div data-cy="secure-room-controls" className="border-t border-sidebar-border px-3 py-3">
      {/* Room encryption status bar */}
      <div className="mb-2 flex items-center gap-2">
        {/* Encryption badge with tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              data-cy="secure-room-badge"
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                isEncrypted
                  ? isUnlocked
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isEncrypted ? (
                isUnlocked ? (
                  <><ShieldCheck className="h-3 w-3" /> E2EE</>
                ) : (
                  <><ShieldAlert className="h-3 w-3" /> Locked</>
                )
              ) : (
                <><Shield className="h-3 w-3" /> Standard</>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64 text-xs" data-cy="secure-room-badge-tooltip">
            {isEncrypted ? (
              <div className="space-y-1.5">
                <p className="font-medium">
                  {isUnlocked ? 'End-to-end encrypted' : 'End-to-end encrypted (locked)'}
                </p>
                <p>This room uses client-side encryption. Content is not readable by the server.</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  <li>Remote web MCP: Unavailable</li>
                  <li>Server-side search: Unavailable</li>
                  <li>Public aggregation: Not supported</li>
                </ul>
                <p className="text-muted-foreground">Keys stay on this device only.</p>
              </div>
            ) : (
              <p>This room is not encrypted. Content stored as plain text on the sync server.
              Ordinary hosted rooms are not end-to-end encrypted.</p>
            )}
          </TooltipContent>
        </Tooltip>

        {secureCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {secureCount} secure
          </span>
        )}
      </div>

      {/* Status message */}
      {secureRoomMessage && (
        <div
          data-cy="secure-room-message"
          className="mb-2 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
        >
          {secureRoomMessage}
        </div>
      )}

      {/* Recovery phrase display */}
      {recoveryPhrase && (
        <div
          data-cy="secure-room-recovery-phrase"
          className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950/30"
        >
          <p className="mb-1 text-xs font-medium text-amber-800 dark:text-amber-300">
            Recovery Phrase — Save this! It will not be shown again.
          </p>
          <p
            data-cy="secure-room-phrase-text"
            className="break-all rounded bg-white px-2 py-1 font-mono text-xs dark:bg-amber-950/50"
          >
            {recoveryPhrase}
          </p>
          <Button
            data-cy="secure-room-phrase-dismiss"
            variant="ghost"
            size="sm"
            className="mt-1 h-6 w-full text-xs"
            onClick={dismissRecoveryPhrase}
          >
            I've saved it
          </Button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1.5">
        {/* Create secure room */}
        <Button
          data-cy="secure-room-create-button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={creatingSecure}
          onClick={handleCreateSecure}
        >
          {creatingSecure ? 'Creating…' : '+ Secure'}
        </Button>

        {/* Lock/Unlock — only when current room is encrypted */}
        {isEncrypted && (
          <>
            {isUnlocked ? (
              <Button
                data-cy="secure-room-lock-button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={lockCurrentRoom}
              >
                <Lock className="h-3 w-3" />
                Lock
              </Button>
            ) : (
              <Button
                data-cy="secure-room-unlock-button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowUnlockInput(true)}
              >
                <Unlock className="h-3 w-3" />
                Unlock
              </Button>
            )}

            {/* Export/Import — only when unlocked */}
            {isUnlocked && (
              <>
                <Button
                  data-cy="secure-room-export-key-button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleExport}
                >
                  <Download className="h-3 w-3" />
                  Export
                </Button>
                <Button
                  data-cy="secure-room-import-key-button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowImport(true)}
                >
                  <Upload className="h-3 w-3" />
                  Import
                </Button>
              </>
            )}
          </>
        )}
      </div>

      {/* Unavailable states — shown when room is encrypted */}
      {isEncrypted && (
        <div
          data-cy="secure-room-unavailable-states"
          className="mt-2 space-y-1"
        >
          <p className="text-[11px] font-medium text-muted-foreground">
            Unavailable in secure rooms:
          </p>
          <div
            data-cy="secure-room-search-unavailable"
            className="rounded-md border border-dashed border-muted-foreground/30 px-2 py-1 text-[11px] text-muted-foreground"
          >
            🔍 Server-side search — disabled
          </div>
          <div
            data-cy="secure-room-mcp-unavailable"
            className="rounded-md border border-dashed border-muted-foreground/30 px-2 py-1 text-[11px] text-muted-foreground"
          >
            🖥 Remote MCP — disabled
          </div>
          <div
            data-cy="secure-room-aggregator-unavailable"
            className="rounded-md border border-dashed border-muted-foreground/30 px-2 py-1 text-[11px] text-muted-foreground"
          >
            🌐 Public aggregation — disabled
          </div>
        </div>
      )}

      {/* Unlock dialog */}
      <Dialog open={showUnlockInput} onOpenChange={setShowUnlockInput}>
        <DialogContent data-cy="secure-room-unlock-dialog">
          <DialogHeader>
            <DialogTitle>Unlock Secure Room</DialogTitle>
            <DialogDescription>
              Enter the recovery phrase or exported key to unlock this room.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              data-cy="secure-room-unlock-input"
              placeholder="Paste recovery phrase or key…"
              value={unlockPhraseInput}
              onChange={(e) => setUnlockPhraseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUnlockSubmit();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUnlockInput(false);
                setUnlockPhraseInput('');
              }}
            >
              Cancel
            </Button>
            <Button
              data-cy="secure-room-unlock-confirm"
              onClick={handleUnlockSubmit}
              disabled={!unlockPhraseInput.trim()}
            >
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import key dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent data-cy="secure-room-import-dialog">
          <DialogHeader>
            <DialogTitle>Import Room Key</DialogTitle>
            <DialogDescription>
              Paste an exported base64 key to unlock this room on another device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              data-cy="secure-room-import-input"
              placeholder="Base64 key…"
              value={importKeyInput}
              onChange={(e) => setImportKeyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImportSubmit();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImport(false);
                setImportKeyInput('');
              }}
            >
              Cancel
            </Button>
            <Button
              data-cy="secure-room-import-confirm"
              onClick={handleImportSubmit}
              disabled={!importKeyInput.trim()}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exported key dialog */}
      <Dialog open={showExportDialog && Boolean(exportedKey)} onOpenChange={setShowExportDialog}>
        <DialogContent data-cy="secure-room-export-dialog">
          <DialogHeader>
            <DialogTitle>Exported Room Key</DialogTitle>
            <DialogDescription>
              Share this key with another device to grant access. The key
              does not leave the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div
              data-cy="secure-room-exported-key"
              className="break-all rounded-md border bg-muted px-3 py-2 font-mono text-xs"
            >
              {exportedKey}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowExportDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
