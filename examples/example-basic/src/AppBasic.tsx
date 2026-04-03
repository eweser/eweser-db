import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Database } from '@eweser/db';
import type {
  CollectionKey,
  Documents,
  EweDocument,
  Flashcard,
  Note,
  Profile,
  Room,
} from '@eweser/db';
import * as config from './config';
import { styles } from '@eweser/examples-components';

// ---------------------------------------------------------------------------
// Kitchen-sink example: demonstrates ALL core EweserDB features in one app
// ---------------------------------------------------------------------------

// Persist room IDs across reloads so we don't create duplicates
const defaultNotesRoomId =
  localStorage.getItem('ks-notes-room-id') ?? crypto.randomUUID();
localStorage.setItem('ks-notes-room-id', defaultNotesRoomId);

const flashcardsRoomId =
  localStorage.getItem('ks-flashcards-room-id') ?? crypto.randomUUID();
localStorage.setItem('ks-flashcards-room-id', flashcardsRoomId);

const profileRoomId =
  localStorage.getItem('ks-profile-room-id') ?? crypto.randomUUID();
localStorage.setItem('ks-profile-room-id', profileRoomId);

const deviceType = /iPhone/.test(navigator.userAgent)
  ? 'iPhone'
  : /Android/.test(navigator.userAgent)
    ? 'Android'
    : /Windows/.test(navigator.userAgent)
      ? 'Windows'
      : /Macintosh/.test(navigator.userAgent)
        ? 'Mac'
        : 'Device';

const db = new Database({
  authServer: config.AUTH_SERVER,
  logLevel: 0,
  ...(config.WEB_RTC_PEERS ? { webRTCPeers: config.WEB_RTC_PEERS } : {}),
  initialRooms: [
    {
      collectionKey: 'notes' as CollectionKey,
      id: defaultNotesRoomId,
      name: `Notes — ${deviceType}`,
    },
    {
      collectionKey: 'flashcards' as CollectionKey,
      id: flashcardsRoomId,
      name: 'My Flashcards',
    },
    {
      collectionKey: 'profiles' as CollectionKey,
      id: profileRoomId,
      name: 'My Profile',
    },
  ],
});

const loginUrl = db.generateLoginUrl({ name: 'EweserDB Kitchen Sink' });

// ── Tab type ──────────────────────────────────────────────────────────────
type Tab = 'notes' | 'flashcards' | 'profile' | 'status';

// ══════════════════════════════════════════════════════════════════════════
// Root App
// ══════════════════════════════════════════════════════════════════════════
const App = () => {
  const [loaded, setLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('notes');

  // ── Auth flow ────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasToken) return;
    if (db.getToken()) setHasToken(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, window.location.search]);

  useEffect(() => {
    if (loggedIn || !hasToken) return;
    db.login({ loadAllRooms: true }).then((ok) => {
      if (ok) setLoggedIn(true);
    });
  }, [loggedIn, hasToken]);

  useEffect(() => {
    const onLoaded = () => setLoaded(true);
    db.on('roomsLoaded', onLoaded);
    return () => {
      db.off('roomsLoaded', onLoaded);
    };
  }, []);

  return (
    <div style={styles.appRoot} data-cy="basic-app-root">
      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {loaded ? (
        <>
          {activeTab === 'notes' && <NotesTab />}
          {activeTab === 'flashcards' && <FlashcardsTab />}
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'status' && <StatusTab />}
        </>
      ) : (
        <div data-cy="basic-loading">
          <p>Loading local database…</p>
          <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            EweserDB is offline-first — data loads from IndexedDB instantly,
            even without an internet connection.
          </p>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// Header with tabs + auth controls
// ══════════════════════════════════════════════════════════════════════════
const tabList: { key: Tab; label: string }[] = [
  { key: 'notes', label: 'Notes' },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'profile', label: 'Profile' },
  { key: 'status', label: 'Status' },
];

const AppHeader = ({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}) => {
  return (
    <div style={styles.statusBar} data-cy="basic-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {tabList.map((t) => (
          <button
            key={t.key}
            data-cy={`basic-tab-${t.key}`}
            onClick={() => onTabChange(t.key)}
            style={{
              ...styles.logoutButton,
              fontWeight: activeTab === t.key ? 'bold' : 'normal',
              textDecoration: activeTab === t.key ? 'none' : 'underline',
              borderBottom:
                activeTab === t.key
                  ? '2px solid green'
                  : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={styles.statusBarMessageDiv}>
          <pre style={styles.statusBarMessage}>
            {db.getToken() ? '● Logged In' : '○ Logged Out'}
          </pre>
          <pre style={styles.statusBarMessage}>
            {db.online ? '● Online' : '○ Offline'}
          </pre>
        </div>
        <div style={styles.logoutButtonsDiv}>
          <a href={loginUrl} style={{ textDecoration: 'none' }}>
            <button style={styles.logoutButton} data-cy="basic-login-button">
              Login
            </button>
          </a>
          <button
            style={styles.logoutButton}
            data-cy="basic-clear-button"
            onClick={() => {
              db.logoutAndClear();
              window.location.reload();
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// Notes tab — multi-room with CRUD, rename, share, connection status
// ══════════════════════════════════════════════════════════════════════════
const NotesTab = () => {
  const [rooms, setRooms] = useState<Room<Note>[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState(defaultNotesRoomId);
  const [newRoomName, setNewRoomName] = useState('');

  const refreshRooms = useCallback(() => {
    setRooms(db.getRooms('notes'));
  }, []);

  useEffect(() => {
    refreshRooms();
    const timer = window.setInterval(refreshRooms, 2000);
    return () => window.clearInterval(timer);
  }, [refreshRooms]);

  const createRoom = () => {
    const name = newRoomName.trim();
    if (!name) return;
    const room = db.newRoom<Note>({
      collectionKey: 'notes',
      id: crypto.randomUUID(),
      name,
    });
    setNewRoomName('');
    setSelectedRoomId(room.id);
    refreshRooms();
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div data-cy="basic-notes-tab" style={{ width: '100%' }}>
      {/* Room selector bar */}
      <div style={styles.roomBar} data-cy="basic-room-bar">
        <h2 style={{ margin: 0, marginRight: 'auto' }}>Rooms</h2>
        <input
          data-cy="basic-new-room-input"
          placeholder="New room name…"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createRoom()}
          style={{ padding: '0.5em' }}
        />
        <button
          data-cy="basic-create-room-button"
          onClick={createRoom}
          style={styles.newNoteButton}
        >
          + Room
        </button>
      </div>

      {/* Room tabs */}
      <div
        style={{ ...styles.flexWrap, gap: '0.25rem', margin: '0.5rem 0' }}
        data-cy="basic-room-list"
      >
        {rooms.map((room) => (
          <button
            key={room.id}
            data-cy={`basic-room-select-${room.id}`}
            onClick={() => setSelectedRoomId(room.id)}
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

      {/* Active room content */}
      {selectedRoom?.ydoc ? (
        <NotesRoom notesRoom={selectedRoom} />
      ) : selectedRoom ? (
        <p>Room initializing…</p>
      ) : (
        <p data-cy="basic-no-room-selected">Select or create a room</p>
      )}
    </div>
  );
};

// ── Single room panel ─────────────────────────────────────────────────────
const NotesRoom = ({ notesRoom }: { notesRoom: Room<Note> }) => {
  const Notes = useMemo(() => db.getDocuments(notesRoom), [notesRoom]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [notes, setNotes] = useState<Documents<Note>>(
    Notes.sortByRecent(Notes.getUndeleted())
  );
  const [selectedNote, setSelectedNote] = useState('');
  const newNoteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    notesRoom.on('roomConnectionChange', setConnectionStatus);
    return () => {
      notesRoom.off('roomConnectionChange', setConnectionStatus);
    };
  }, [notesRoom]);

  useEffect(() => {
    const handler = () => setNotes(Notes.sortByRecent(Notes.getUndeleted()));
    handler();
    Notes.onChange(handler);
    return () => {
      Notes.documents.unobserve(handler);
    };
  }, [Notes]);

  useEffect(() => {
    if (newNoteRef.current && selectedNote) {
      newNoteRef.current.focus();
      const len = newNoteRef.current.value.length;
      newNoteRef.current.selectionStart = len;
      newNoteRef.current.selectionEnd = len;
    }
  }, [selectedNote]);

  const createNote = () => {
    const n = Notes.new({
      text: `New note ${Object.keys(Notes.getUndeleted()).length + 1}`,
    });
    setSelectedNote(n._id);
  };

  return (
    <>
      <div style={styles.roomBar} data-cy={`basic-room-${notesRoom.id}`}>
        <RoomName db={db} room={notesRoom as unknown as Room<EweDocument>} />
        <button
          style={styles.newNoteButton}
          onClick={createNote}
          data-cy={`basic-new-note-${notesRoom.id}`}
        >
          New note
        </button>
        <ShareButton db={db} room={notesRoom as unknown as Room<EweDocument>} />
        <span
          data-cy={`basic-connection-status-${notesRoom.id}`}
          style={{
            marginLeft: '0.5rem',
            fontSize: '0.8rem',
            color:
              connectionStatus === 'connected'
                ? '#0f0'
                : connectionStatus === 'connecting'
                  ? '#ff0'
                  : '#f66',
          }}
        >
          ● {connectionStatus}
        </span>
      </div>

      <div style={styles.flexWrap} data-cy={`basic-notes-grid-${notesRoom.id}`}>
        {Object.keys(notes).length === 0 && (
          <div data-cy={`basic-empty-state-${notesRoom.id}`}>
            No notes found. Create one!
          </div>
        )}
        {Object.keys(notes).map((id) => {
          const note = notes[id];
          if (!note || note._deleted) return null;
          return (
            <NoteCard
              key={note._id}
              note={note}
              isSelected={id === selectedNote}
              onSelect={() => setSelectedNote(note._id)}
              onDeselect={() => setSelectedNote('')}
              onUpdate={(text) => {
                note.text = text;
                Notes.set(note);
              }}
              onDelete={() => Notes.delete(note._id)}
              onLinkFlashcard={() => {
                const fcRoom = db.getRoom<Flashcard>(
                  'flashcards',
                  flashcardsRoomId
                );
                if (!fcRoom) return;
                const FCards = db.getDocuments(fcRoom);
                const fc = FCards.new({
                  frontText: `Q: ${note.text.slice(0, 30)}…`,
                  backText: 'Answer here',
                  noteRefs: [note._ref],
                });
                note.flashcardRefs = (note.flashcardRefs ?? []).concat(fc._ref);
                Notes.set(note);
              }}
              editorRef={id === selectedNote ? newNoteRef : undefined}
            />
          );
        })}
      </div>
    </>
  );
};

// ── Note card ─────────────────────────────────────────────────────────────
const NoteCard = ({
  note,
  isSelected,
  onSelect,
  onDeselect,
  onUpdate,
  onDelete,
  onLinkFlashcard,
  editorRef,
}: {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  onLinkFlashcard: () => void;
  editorRef?: React.Ref<HTMLTextAreaElement> | undefined;
}) => (
  <div
    onClick={onSelect}
    style={styles.card}
    data-cy={`basic-note-card-${note._id}`}
  >
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      style={styles.deleteButton}
      data-cy={`basic-delete-note-${note._id}`}
    >
      X
    </button>
    {isSelected ? (
      <textarea
        style={styles.editor}
        onBlur={onDeselect}
        ref={editorRef}
        value={note.text}
        onChange={(e) => onUpdate(e.target.value)}
        data-cy={`basic-note-editor-${note._id}`}
      />
    ) : (
      <p style={styles.cardInner} data-cy={`basic-note-text-${note._id}`}>
        {note.text}
      </p>
    )}
    <div style={{ padding: '0 1rem 0.5rem', display: 'flex', gap: '0.5rem' }}>
      <button
        data-cy={`basic-link-flashcard-${note._id}`}
        onClick={(e) => {
          e.stopPropagation();
          onLinkFlashcard();
        }}
        style={{ fontSize: '0.75rem' }}
      >
        🔗 Create flashcard
      </button>
      {(note.flashcardRefs ?? []).length > 0 && (
        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
          {(note.flashcardRefs ?? []).length} linked
        </span>
      )}
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════
// Flashcards tab — CRUD + cross-collection refs
// ══════════════════════════════════════════════════════════════════════════
const getDocIdFromRef = (ref: string) => ref.split('|')[3] ?? '';

const FlashcardsTab = () => {
  const room = db.getRoom<Flashcard>('flashcards', flashcardsRoomId);
  const notesRoom = db.getRoom<Note>('notes', defaultNotesRoomId);

  const FCards = useMemo(() => (room ? db.getDocuments(room) : null), [room]);
  const NotesApi = useMemo(
    () => (notesRoom ? db.getDocuments(notesRoom) : null),
    [notesRoom]
  );

  const [flashcards, setFlashcards] = useState<Documents<Flashcard>>({});
  const [notes, setNotes] = useState<Documents<Note>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (!room) return;
    room.on('roomConnectionChange', setConnectionStatus);
    return () => {
      room.off('roomConnectionChange', setConnectionStatus);
    };
  }, [room]);

  useEffect(() => {
    if (!FCards) return;
    const handler = () => setFlashcards(FCards.getUndeleted());
    handler();
    FCards.onChange(handler);
    return () => {
      FCards.documents.unobserve(handler);
    };
  }, [FCards]);

  useEffect(() => {
    if (!NotesApi) return;
    const handler = () => setNotes(NotesApi.getUndeleted());
    handler();
    NotesApi.onChange(handler);
    return () => {
      NotesApi.documents.unobserve(handler);
    };
  }, [NotesApi]);

  const createFlashcard = () => {
    if (!FCards) return;
    FCards.new({
      frontText: `Flashcard ${Object.keys(FCards.getUndeleted()).length + 1}`,
      backText: 'Type your answer here',
    });
  };

  if (!FCards) return <p>Flashcards room not loaded</p>;

  return (
    <div data-cy="basic-flashcards-tab" style={{ width: '100%' }}>
      <div style={styles.roomBar}>
        <h2 style={{ margin: 0, marginRight: 'auto' }}>Flashcards</h2>
        <span
          style={{
            fontSize: '0.8rem',
            color: connectionStatus === 'connected' ? '#0f0' : '#f66',
          }}
        >
          ● {connectionStatus}
        </span>
        <button
          data-cy="basic-new-flashcard"
          onClick={createFlashcard}
          style={styles.newNoteButton}
        >
          + Flashcard
        </button>
      </div>

      <div style={styles.flexWrap} data-cy="basic-flashcards-grid">
        {Object.values(flashcards).length === 0 && (
          <div data-cy="basic-flashcards-empty">
            No flashcards yet. Create one, or link from a note!
          </div>
        )}
        {Object.values(flashcards).map((fc) => {
          if (fc._deleted) return null;
          const linkedNotes = (fc.noteRefs ?? [])
            .map((ref) => notes[getDocIdFromRef(ref)])
            .filter(Boolean) as Note[];

          return (
            <div
              key={fc._id}
              style={styles.card}
              data-cy={`basic-flashcard-card-${fc._id}`}
            >
              <button
                style={styles.deleteButton}
                data-cy={`basic-flashcard-delete-${fc._id}`}
                onClick={() => FCards.delete(fc._id)}
              >
                X
              </button>
              <div style={styles.borderedCard}>
                <p data-cy={`basic-flashcard-front-${fc._id}`}>
                  {fc.frontText}
                </p>
                {revealed[fc._id] ? (
                  <p data-cy={`basic-flashcard-back-${fc._id}`}>
                    {fc.backText}
                  </p>
                ) : (
                  <button
                    data-cy={`basic-flashcard-reveal-${fc._id}`}
                    onClick={() =>
                      setRevealed((prev) => ({
                        ...prev,
                        [fc._id]: true,
                      }))
                    }
                  >
                    Show answer
                  </button>
                )}
              </div>
              {linkedNotes.length > 0 && (
                <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                  <strong>Linked notes:</strong>
                  {linkedNotes.map((n) => (
                    <p key={n._id}>{n.text.slice(0, 60)}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// Profile tab — demonstrates the profiles collection
// ══════════════════════════════════════════════════════════════════════════
const ProfileTab = () => {
  const room = db.getRoom<Profile>('profiles', profileRoomId);
  const ProfileApi = useMemo(
    () => (room ? db.getDocuments(room) : null),
    [room]
  );

  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (!ProfileApi) return;
    const load = () => {
      const all = ProfileApi.getUndeletedToArray();
      const first = all[0];
      if (first) {
        setProfile(first);
        setFirstName(first.firstName ?? '');
        setLastName(first.lastName ?? '');
      }
    };
    load();
    ProfileApi.onChange(load);
    return () => {
      ProfileApi.documents.unobserve(load);
    };
  }, [ProfileApi]);

  const save = () => {
    if (!ProfileApi) return;
    if (profile) {
      profile.firstName = firstName;
      profile.lastName = lastName;
      ProfileApi.set(profile);
    } else {
      const p = ProfileApi.new({ firstName, lastName });
      setProfile(p);
    }
  };

  return (
    <div data-cy="basic-profile-tab" style={{ width: '100%', maxWidth: 500 }}>
      <h2>User Profile</h2>
      <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
        Profile data syncs across all apps that use the same EweserDB account.
        Any app can read your profile — you own it, not the app.
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <label>
          First name
          <input
            data-cy="basic-profile-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '0.5em' }}
          />
        </label>
        <label>
          Last name
          <input
            data-cy="basic-profile-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '0.5em' }}
          />
        </label>
        <button
          data-cy="basic-profile-save"
          onClick={save}
          style={styles.newNoteButton}
        >
          Save profile
        </button>
        {profile && (
          <p data-cy="basic-profile-saved" style={{ color: '#0f0' }}>
            Profile saved: {profile.firstName} {profile.lastName}
          </p>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// Status tab — connection info, room list, sync state
// ══════════════════════════════════════════════════════════════════════════
const StatusTab = () => {
  const [allRooms, setAllRooms] = useState<Room<EweDocument>[]>([]);
  const [roomStatuses, setRoomStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    const refresh = () => {
      const rooms = db.allRooms();
      setAllRooms(rooms);
      const statuses: Record<string, string> = {};
      for (const r of rooms) {
        statuses[r.id] = r.connectionStatus ?? 'unknown';
      }
      setRoomStatuses(statuses);
    };
    refresh();
    const timer = window.setInterval(refresh, 2000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div data-cy="basic-status-tab" style={{ width: '100%' }}>
      <h2>System Status</h2>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.85rem',
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Property</th>
            <th style={thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Auth server</td>
            <td style={tdStyle}>{config.AUTH_SERVER}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Logged in</td>
            <td style={tdStyle}>{db.getToken() ? 'Yes' : 'No'}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Online</td>
            <td style={tdStyle}>{db.online ? 'Yes' : 'No'}</td>
          </tr>
          <tr>
            <td style={tdStyle}>User ID</td>
            <td style={tdStyle}>{db.userId || '(not logged in)'}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Total rooms</td>
            <td style={tdStyle}>{allRooms.length}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ marginTop: '1.5rem' }}>Rooms</h3>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.8rem',
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Collection</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Docs</th>
          </tr>
        </thead>
        <tbody>
          {allRooms.map((r) => (
            <tr key={r.id} data-cy={`basic-status-room-${r.id}`}>
              <td style={tdStyle}>{r.name}</td>
              <td style={tdStyle}>{r.collectionKey}</td>
              <td style={tdStyle}>
                <span
                  style={{
                    color: roomStatuses[r.id] === 'connected' ? '#0f0' : '#f66',
                  }}
                >
                  ● {roomStatuses[r.id]}
                </span>
              </td>
              <td style={tdStyle}>
                {r.ydoc
                  ? Object.keys(
                      (
                        r.ydoc.getMap('documents') as unknown as {
                          toJSON: () => Record<string, unknown>;
                        }
                      ).toJSON()
                    ).length
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: '1.5rem' }}>Feature Checklist</h3>
      <ul style={{ lineHeight: '1.8', fontSize: '0.85rem' }}>
        <li>
          ✅ <strong>Offline-first:</strong> Data loads from IndexedDB before
          any network call
        </li>
        <li>
          ✅ <strong>Multi-room:</strong> Create rooms, switch between them
          (Notes tab)
        </li>
        <li>
          ✅ <strong>CRUD:</strong> Create, edit, delete documents with Yjs
          CRDTs
        </li>
        <li>
          ✅ <strong>Cross-collection refs:</strong> Link notes ↔ flashcards
        </li>
        <li>
          ✅ <strong>Profiles:</strong> User profile data shared across apps
        </li>
        <li>
          ✅ <strong>Sharing:</strong> Generate invite links for rooms
        </li>
        <li>
          ✅ <strong>Room rename:</strong> Click room name to rename
        </li>
        <li>
          ✅ <strong>Connection status:</strong> Per-room sync indicators
        </li>
        <li>
          ✅ <strong>Auth:</strong> Login → redirect → token handoff → sync
        </li>
        <li>
          ⬜ <strong>Federation:</strong> Cross-server sharing (not yet
          implemented in SDK)
        </li>
        <li>
          ⬜ <strong>Real-time collab:</strong> Awareness cursors (SDK supports,
          not yet demoed)
        </li>
      </ul>
    </div>
  );
};

const thStyle = {
  borderBottom: '1px solid #555',
  textAlign: 'left' as const,
  padding: '0.5rem',
};
const tdStyle = {
  borderBottom: '1px solid #333',
  padding: '0.5rem',
};

// ── Shared components ────────────────────────────────────────────────────
const RoomName = ({ db, room }: { db: Database; room: Room<EweDocument> }) => {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(room.name);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    await db.renameRoom(room, newName);
    setSubmitting(false);
    setEditing(false);
  };
  return editing ? (
    <input
      value={newName}
      onChange={(e) => setNewName(e.target.value)}
      onBlur={submit}
      autoFocus
      disabled={submitting}
      data-cy={`basic-room-name-input-${room.id}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit();
      }}
    />
  ) : (
    <h2
      style={{ cursor: 'pointer', margin: 0 }}
      onClick={() => setEditing(true)}
      data-cy={`basic-room-name-${room.id}`}
    >
      {room.name}
    </h2>
  );
};

const ShareButton = ({
  db,
  room,
}: {
  db: Database;
  room: Room<EweDocument>;
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (showShareModal) {
      db.generateShareRoomLink({
        roomId: room.id,
        accessType: 'write',
        appName: 'EweserDB Kitchen Sink',
      })
        .then((link) => setShareLink(link))
        // eslint-disable-next-line no-console
        .catch((e) => console.error(e));
    } else {
      setShareLink('');
    }
  }, [db, room, showShareModal]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <>
      {showShareModal && (
        <div
          onClick={() => setShowShareModal(false)}
          style={styles.modal}
          data-cy={`basic-share-modal-${room.id}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={styles.modalContent}
            data-cy={`basic-share-modal-content-${room.id}`}
          >
            <button
              onClick={() => setShowShareModal(false)}
              style={styles.modalCloseButton}
              data-cy={`basic-share-close-${room.id}`}
            >
              X
            </button>
            <div>
              <p>
                Anyone with this link will have edit permissions for this folder
              </p>
              <div>
                <span
                  onClick={handleCopy}
                  title={shareLink}
                  style={{ cursor: 'pointer' }}
                  data-cy={`basic-share-link-${room.id}`}
                >
                  {shareLink
                    ? `${shareLink.slice(0, 10)}...${shareLink.slice(-10)}`
                    : 'Generating link…'}
                </span>
                <button
                  onClick={handleCopy}
                  disabled={!shareLink}
                  style={styles.shareButton}
                  data-cy={`basic-share-copy-${room.id}`}
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setShowShareModal(true)}
        style={styles.shareButton}
        data-cy={`basic-share-button-${room.id}`}
      >
        Share
      </button>
    </>
  );
};

export default App;
