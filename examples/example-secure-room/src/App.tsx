import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Database, RoomCrypto } from '@eweser/db';
import type { CollectionKey, Documents, Note, Room } from '@eweser/db';
import { styles } from '@eweser/examples-components';
import * as config from './config';

// ---------------------------------------------------------------------------
// Secure Room Example: demonstrates E2EE room lifecycle
// ---------------------------------------------------------------------------

const collectionKey: CollectionKey = 'notes';

const defaultRoomId =
  localStorage.getItem('secure-room-default-id') ?? crypto.randomUUID();
localStorage.setItem('secure-room-default-id', defaultRoomId);

const db = new Database({
  authServer: config.AUTH_SERVER,
  logLevel: 0,
  ...(config.WEB_RTC_PEERS ? { webRTCPeers: config.WEB_RTC_PEERS } : {}),
  initialRooms: [
    {
      collectionKey,
      id: defaultRoomId,
      name: 'Default Notes Room',
    },
  ],
});

const loginUrl = db.generateLoginUrl({ name: 'Secure Room Example' });

// ── Container styles ─────────────────────────────────────────────────────
const containerStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: '0 auto',
  padding: 16,
};

const sectionStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  background: '#fff',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 12,
  fontSize: '0.78em',
  fontWeight: 600,
  marginLeft: 8,
};

const encryptedBadge: React.CSSProperties = {
  ...badgeStyle,
  background: '#fef3c7',
  color: '#92400e',
};

const unlockedBadge: React.CSSProperties = {
  ...badgeStyle,
  background: '#d1fae5',
  color: '#065f46',
};

const lockedBadge: React.CSSProperties = {
  ...badgeStyle,
  background: '#fee2e2',
  color: '#991b1b',
};

const unavailableStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '0.85em',
  padding: '12px 16px',
  background: '#f9fafb',
  borderRadius: 6,
  border: '1px dashed #d1d5db',
  marginTop: 8,
};

const phraseBoxStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  background: '#f3f4f6',
  padding: '12px 16px',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  fontSize: '1.1em',
  lineHeight: 1.6,
  wordSpacing: '0.2em',
  margin: '8px 0',
};

// ══════════════════════════════════════════════════════════════════════════
// Main App
// ══════════════════════════════════════════════════════════════════════════
const App = () => {
  const [loaded, setLoaded] = useState(false);
  const [rooms, setRooms] = useState<Room<Note>[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState(defaultRoomId);

  // Secure room state
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [exportedKey, setExportedKey] = useState('');
  const [importKeyInput, setImportKeyInput] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [unlockPhraseInput, setUnlockPhraseInput] = useState('');
  const [showUnlockInput, setShowUnlockInput] = useState(false);
  const [message, setMessage] = useState('');
  const [creatingSecure, setCreatingSecure] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }, []);

  useEffect(() => {
    const refreshRooms = () => {
      const nextRooms = db.getRooms('notes');
      setRooms(nextRooms);
      if (!nextRooms.some((room) => room.id === selectedRoomId)) {
        setSelectedRoomId(nextRooms[0]?.id ?? defaultRoomId);
      }
    };

    db.on('roomsLoaded', () => {
      setLoaded(true);
      refreshRooms();
    });

    const timer = window.setInterval(refreshRooms, 1000);
    refreshRooms();

    return () => {
      window.clearInterval(timer);
    };
  }, [selectedRoomId]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  // ── Create secure room ──────────────────────────────────────────────
  const createSecureRoom = async () => {
    try {
      setCreatingSecure(true);
      // Generate encryption metadata + recovery phrase
      const { crypto: roomCrypto, recoveryPhrase: phrase } =
        await RoomCrypto.createEncrypted();

      if (!roomCrypto.metadata) {
        showMessage('Failed to create encryption metadata');
        return;
      }

      // Create the room with encryption metadata (starts locked)
      const room = db.newRoom<Note>({
        collectionKey,
        id: crypto.randomUUID(),
        name: '🔒 Secure Notes',
        encryption: roomCrypto.metadata,
      });

      // Unlock immediately so the creator can write
      await room.unlock(phrase);

      setRecoveryPhrase(phrase);
      setIsUnlocked(true);
      setSelectedRoomId(room.id);
      setRooms(db.getRooms('notes'));
      showMessage('Secure room created! Save your recovery phrase.');
    } catch (err) {
      showMessage(
        `Error creating secure room: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setCreatingSecure(false);
    }
  };

  // ── Lock / Unlock ────────────────────────────────────────────────────
  const handleLock = () => {
    if (!selectedRoom || !selectedRoom.encryption) return;
    try {
      selectedRoom.lock();
      setIsUnlocked(false);
      setShowUnlockInput(false);
      showMessage('Room locked. Content is now encrypted.');
    } catch (err) {
      showMessage(
        `Error locking: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleUnlock = async () => {
    if (!selectedRoom || !selectedRoom.encryption) return;
    const phrase = unlockPhraseInput.trim() || recoveryPhrase;
    if (!phrase) return;

    try {
      await selectedRoom.unlock(phrase);
      setIsUnlocked(true);
      setShowUnlockInput(false);
      setUnlockPhraseInput('');
      showMessage('Room unlocked. Content is now readable.');
    } catch (err) {
      showMessage(
        `Unlock failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  // ── Export / Import key ──────────────────────────────────────────────
  const handleExportKey = async () => {
    if (!selectedRoom || !selectedRoom.isUnlocked) {
      showMessage('Room must be unlocked to export the key.');
      return;
    }
    try {
      const rawKey = await selectedRoom.exportRawKeyBase64();
      setExportedKey(rawKey);
      showMessage('Key exported as base64.');
    } catch (err) {
      showMessage(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleImportKey = async () => {
    if (!selectedRoom || !importKeyInput.trim()) return;
    try {
      await selectedRoom.unlockWithRawKey(importKeyInput.trim());
      setIsUnlocked(true);
      setShowImport(false);
      setImportKeyInput('');
      showMessage('Key imported. Room unlocked.');
    } catch (err) {
      showMessage(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  // ── Encryption status badge ──────────────────────────────────────────
  const encryptionBadge = () => {
    if (!selectedRoom || !selectedRoom.encryption) return null;
    if (isUnlocked) {
      return <span style={unlockedBadge}>🔓 Unlocked</span>;
    }
    return <span style={lockedBadge}>🔒 Locked</span>;
  };

  return (
    <div style={{ ...styles.appRoot }} data-cy="secure-room-app-root">
      <div style={containerStyle}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          style={{ ...styles.statusBar, marginBottom: 16 }}
          data-cy="secure-room-header"
        >
          <h1 style={{ margin: 0, fontSize: '1.3em' }}>
            Secure Room Demo
          </h1>
          <div style={styles.logoutButtonsDiv}>
            <span style={{ fontSize: '0.85em', marginRight: 8 }}>
              {db.getToken() ? 'Logged In' : 'Logged Out'}
            </span>
            <a href={loginUrl} style={{ textDecoration: 'none' }}>
              <button style={styles.logoutButton} data-cy="secure-room-login-button">
                Login
              </button>
            </a>
            <button
              style={styles.logoutButton}
              onClick={() => {
                db.logoutAndClear();
                window.location.reload();
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* ── Message banner ────────────────────────────────────────── */}
        {message && (
          <div
            style={{
              padding: '8px 16px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: '0.9em',
            }}
            data-cy="secure-room-message"
          >
            {message}
          </div>
        )}

        {/* ── Room toolbar ──────────────────────────────────────────── */}
        <div
          style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          data-cy="secure-room-toolbar"
        >
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
            {rooms.map((room) => (
              <button
                key={room.id}
                data-cy={`secure-room-select-${room.id}`}
                onClick={() => {
                  setSelectedRoomId(room.id);
                  if (room.encryption) {
                    setIsUnlocked(room.isUnlocked);
                  } else {
                    setIsUnlocked(true);
                  }
                }}
                style={
                  room.id === selectedRoomId
                    ? styles.newNoteButton
                    : styles.shareButton
                }
              >
                {room.name}
              </button>
            ))}
          </div>

          <button
            data-cy="secure-room-create-button"
            onClick={() => void createSecureRoom()}
            disabled={creatingSecure}
            style={{
              ...styles.newNoteButton,
              background: creatingSecure ? '#93c5fd' : '#2563eb',
              color: 'white',
            }}
          >
            {creatingSecure ? 'Creating…' : '+ Secure Room'}
          </button>
        </div>

        {/* ── Main content ──────────────────────────────────────────── */}
        {loaded ? (
          selectedRoom ? (
            <>
              {/* Room panel */}
              <SecureRoomPanel
                room={selectedRoom}
                isUnlocked={
                  selectedRoom.encryption ? isUnlocked : true
                }
                recoveryPhrase={
                  selectedRoom.encryption ? recoveryPhrase : ''
                }
                exportedKey={exportedKey}
                importKeyInput={importKeyInput}
                showImport={showImport}
                showUnlockInput={showUnlockInput}
                unlockPhraseInput={unlockPhraseInput}
                encryptionBadge={encryptionBadge()}
                onLock={handleLock}
                onUnlock={() => setShowUnlockInput(true)}
                onUnlockConfirm={() => void handleUnlock()}
                onUnlockCancel={() => {
                  setShowUnlockInput(false);
                  setUnlockPhraseInput('');
                }}
                onUnlockPhraseChange={setUnlockPhraseInput}
                onExportKey={() => void handleExportKey()}
                onImportKey={() => setShowImport(true)}
                onImportConfirm={() => void handleImportKey()}
                onImportCancel={() => {
                  setShowImport(false);
                  setImportKeyInput('');
                }}
                onImportKeyInputChange={setImportKeyInput}
              />

              {/* Unavailable states section */}
              {selectedRoom.encryption && (
                <div
                  style={sectionStyle}
                  data-cy="secure-room-unavailable-states"
                >
                  <h3 style={{ margin: '0 0 8px', fontSize: '1em' }}>
                    Unavailable Features
                  </h3>
                  <p style={unavailableStyle} data-cy="secure-room-search-unavailable">
                    🔍 Server-side search: <strong>Unavailable</strong> — content
                    is encrypted end-to-end and cannot be indexed server-side.
                  </p>
                  <p style={unavailableStyle} data-cy="secure-room-mcp-unavailable">
                    🖥️ Remote MCP access: <strong>Unavailable</strong> — MCP tools
                    cannot read encrypted room content.
                  </p>
                  <p style={unavailableStyle} data-cy="secure-room-aggregator-unavailable">
                    🌐 Public aggregation: <strong>Not supported</strong> — encrypted
                    rooms cannot be published to the aggregator search index.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div data-cy="secure-room-empty-selection">
              <p style={{ color: '#6b7280' }}>
                Select a room or create a secure room to begin.
              </p>
            </div>
          )
        ) : (
          <div data-cy="secure-room-loading">Loading local database…</div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// Secure Room Panel
// ══════════════════════════════════════════════════════════════════════════
interface SecureRoomPanelProps {
  room: Room<Note>;
  isUnlocked: boolean;
  recoveryPhrase: string;
  exportedKey: string;
  importKeyInput: string;
  showImport: boolean;
  showUnlockInput: boolean;
  unlockPhraseInput: string;
  encryptionBadge: React.ReactNode;
  onLock: () => void;
  onUnlock: () => void;
  onUnlockConfirm: () => void;
  onUnlockCancel: () => void;
  onUnlockPhraseChange: (v: string) => void;
  onExportKey: () => void;
  onImportKey: () => void;
  onImportConfirm: () => void;
  onImportCancel: () => void;
  onImportKeyInputChange: (v: string) => void;
}

const SecureRoomPanel = ({
  room,
  isUnlocked,
  recoveryPhrase,
  exportedKey,
  importKeyInput,
  showImport,
  showUnlockInput,
  unlockPhraseInput,
  encryptionBadge,
  onLock,
  onUnlock,
  onUnlockConfirm,
  onUnlockCancel,
  onUnlockPhraseChange,
  onExportKey,
  onImportKey,
  onImportConfirm,
  onImportCancel,
  onImportKeyInputChange,
}: SecureRoomPanelProps) => {
  const notesApi = useMemo(() => db.getDocuments(room), [room]);
  const [notes, setNotes] = useState<Documents<Note>>(notesApi.getUndeleted());
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const isEncrypted = room.encryption !== null && room.encryption !== undefined;

  useEffect(() => {
    setNotes(notesApi.getUndeleted());
    setSelectedNoteId('');

    const handleDocumentsChange = () => {
      setNotes(notesApi.getUndeleted());
    };
    notesApi.onChange(handleDocumentsChange);

    return () => {
      notesApi.documents.unobserve(handleDocumentsChange);
    };
  }, [notesApi]);

  useEffect(() => {
    if (!editorRef.current || !selectedNoteId) return;
    editorRef.current.focus();
  }, [selectedNoteId]);

  const createNote = () => {
    const created = notesApi.new({
      text: `Note ${Object.keys(notesApi.getUndeleted()).length + 1}`,
    });
    setSelectedNoteId(created._id);
  };

  const updateNote = (note: Note, text: string) => {
    note.text = text;
    notesApi.set(note);
  };

  return (
    <div style={sectionStyle} data-cy={`secure-room-panel-${room.id}`}>
      {/* Room title bar */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1em' }}>
          {room.name}
        </h2>
        {encryptionBadge}

        {/* Lock / Unlock controls for encrypted rooms */}
        {isEncrypted && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {isUnlocked ? (
              <button
                data-cy="secure-room-lock-button"
                onClick={onLock}
                style={styles.shareButton}
              >
                🔒 Lock
              </button>
            ) : (
              <button
                data-cy="secure-room-unlock-button"
                onClick={onUnlock}
                style={{
                  ...styles.newNoteButton,
                  background: '#f59e0b',
                  color: 'white',
                }}
              >
                🔓 Unlock
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recovery phrase display */}
      {recoveryPhrase && isEncrypted && (
        <div
          style={{
            ...sectionStyle,
            background: '#fffbeb',
            borderColor: '#fde68a',
            marginBottom: 12,
          }}
          data-cy="secure-room-recovery-phrase"
        >
          <strong style={{ fontSize: '0.85em', color: '#92400e' }}>
            Recovery Phrase (save this securely!)
          </strong>
          <div style={phraseBoxStyle} data-cy="secure-room-phrase-text">{recoveryPhrase}</div>
        </div>
      )}

      {/* Unlock input */}
      {showUnlockInput && isEncrypted && (
        <div
          style={{ marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}
          data-cy="secure-room-unlock-input-area"
        >
          <input
            data-cy="secure-room-unlock-input"
            placeholder="Enter 12-word recovery phrase…"
            value={unlockPhraseInput}
            onChange={(e) => onUnlockPhraseChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onUnlockConfirm()}
            style={{ flex: 1, padding: '6px 10px', fontFamily: 'monospace' }}
          />
          <button
            data-cy="secure-room-unlock-confirm"
            onClick={onUnlockConfirm}
            style={styles.newNoteButton}
          >
            Unlock
          </button>
          <button
            data-cy="secure-room-unlock-cancel"
            onClick={onUnlockCancel}
            style={styles.shareButton}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Export / Import key */}
      {isEncrypted && isUnlocked && (
        <div
          style={{ marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <button
            data-cy="secure-room-export-key-button"
            onClick={onExportKey}
            style={styles.shareButton}
          >
            📤 Export Key
          </button>
          <button
            data-cy="secure-room-import-key-button"
            onClick={onImportKey}
            style={styles.shareButton}
          >
            📥 Import Key
          </button>
        </div>
      )}

      {/* Exported key display */}
      {exportedKey && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 6,
            fontSize: '0.8em',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
          data-cy="secure-room-exported-key"
        >
          <strong>Exported Key (base64):</strong>
          <div style={{ marginTop: 4 }}>{exportedKey}</div>
        </div>
      )}

      {/* Import input */}
      {showImport && isEncrypted && (
        <div
          style={{ marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}
          data-cy="secure-room-import-input-area"
        >
          <input
            data-cy="secure-room-import-input"
            placeholder="Paste base64 key…"
            value={importKeyInput}
            onChange={(e) => onImportKeyInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onImportConfirm()}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontFamily: 'monospace',
            }}
          />
          <button
            data-cy="secure-room-import-confirm"
            onClick={onImportConfirm}
            style={styles.newNoteButton}
          >
            Import
          </button>
          <button
            data-cy="secure-room-import-cancel"
            onClick={onImportCancel}
            style={styles.shareButton}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Notes area — show placeholder when locked */}
      {isEncrypted && !isUnlocked ? (
        <div
          style={{
            ...unavailableStyle,
            textAlign: 'center',
            padding: '40px 16px',
            fontSize: '1em',
          }}
          data-cy="secure-room-encrypted-placeholder"
        >
          <div style={{ fontSize: '2em', marginBottom: 8 }}>🔒</div>
          <strong>Content Encrypted</strong>
          <p style={{ margin: '4px 0 0', fontSize: '0.9em' }}>
            Unlock this room with the recovery phrase or imported key to read
            and write notes.
          </p>
        </div>
      ) : (
        <>
          {/* New note button */}
          <div style={{ marginBottom: 12 }}>
            <button
              data-cy={`secure-room-new-note-${room.id}`}
              onClick={createNote}
              style={styles.newNoteButton}
            >
              + New Note
            </button>
          </div>

          {/* Notes list */}
          <div data-cy={`secure-room-notes-${room.id}`}>
            {Object.values(notes).length === 0 && (
              <div
                data-cy={`secure-room-empty-${room.id}`}
                style={{ color: '#9ca3af', padding: 12 }}
              >
                No notes yet. Create one!
              </div>
            )}
            {Object.values(notes).map((note) => {
              if (note._deleted) return null;
              const isSelected = note._id === selectedNoteId;
              return (
                <div
                  key={note._id}
                  style={{
                    ...styles.card,
                    opacity: isUnlocked ? 1 : 0.5,
                  }}
                  data-cy={`secure-room-note-card-${note._id}`}
                  onClick={() => setSelectedNoteId(note._id)}
                >
                  <button
                    style={styles.deleteButton}
                    data-cy={`secure-room-delete-note-${note._id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      notesApi.delete(note._id);
                    }}
                  >
                    X
                  </button>
                  {isSelected ? (
                    <textarea
                      ref={editorRef}
                      style={{ ...styles.editor, minHeight: 60 }}
                      value={notes[selectedNoteId]?.text ?? ''}
                      data-cy={`secure-room-note-editor-${note._id}`}
                      onChange={(event) =>
                        updateNote(note, event.target.value)
                      }
                      onBlur={() => setSelectedNoteId('')}
                    />
                  ) : (
                    <p
                      style={styles.cardInner}
                      data-cy={`secure-room-note-text-${note._id}`}
                    >
                      {note.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default App;
