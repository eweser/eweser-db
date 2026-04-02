import { useEffect, useMemo, useRef, useState } from 'react';
import { Database } from '@eweser/db';
import type { CollectionKey, Documents, Note, Room } from '@eweser/db';
import { styles } from '@eweser/examples-components';
import * as config from './config';

const collectionKey: CollectionKey = 'notes';
const defaultRoomId =
  localStorage.getItem('multi-room-default-id') ?? crypto.randomUUID();
localStorage.setItem('multi-room-default-id', defaultRoomId);

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

const loginUrl = db.generateLoginUrl({ name: 'Multi Room Example App' });

const App = () => {
  const [loaded, setLoaded] = useState(false);
  const [rooms, setRooms] = useState<Room<Note>[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState(defaultRoomId);
  const [newRoomName, setNewRoomName] = useState('');

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

  const createRoom = () => {
    const name = newRoomName.trim();
    if (!name) {
      return;
    }
    const room = db.newRoom<Note>({
      collectionKey,
      id: crypto.randomUUID(),
      name,
    });
    setNewRoomName('');
    setSelectedRoomId(room.id);
    setRooms(db.getRooms('notes'));
  };

  return (
    <div style={styles.appRoot} data-cy="multi-room-app-root">
      <AppHeader />
      {loaded ? (
        <>
          <div style={styles.roomBar} data-cy="multi-room-toolbar">
            <h1 style={{ margin: 0 }}>Multi-Room Notes</h1>
            <input
              data-cy="multi-room-name-input"
              placeholder="New room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
            />
            <button data-cy="multi-room-create-button" onClick={createRoom}>
              Create room
            </button>
          </div>

          <div style={styles.flexWrap} data-cy="multi-room-room-list">
            {rooms.map((room) => (
              <button
                key={room.id}
                data-cy={`multi-room-select-${room.id}`}
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

          {selectedRoom ? (
            <NotesPanel room={selectedRoom} />
          ) : (
            <div data-cy="multi-room-empty-selection">No room selected</div>
          )}
        </>
      ) : (
        <div data-cy="multi-room-loading">loading...</div>
      )}
    </div>
  );
};

const AppHeader = () => {
  return (
    <div style={styles.statusBar} data-cy="multi-room-header">
      <div style={styles.logoutButtonsDiv}>
        <a href={loginUrl} style={{ textDecoration: 'none' }}>
          <button style={styles.logoutButton}>Login</button>
        </a>
        <button
          style={styles.logoutButton}
          onClick={() => {
            db.logoutAndClear();
            window.location.reload();
          }}
        >
          Clear storage
        </button>
      </div>
      <div style={styles.statusBarMessageDiv}>
        <pre style={styles.statusBarMessage}>
          {db.getToken() ? 'Logged In' : 'Logged Out'}
        </pre>
      </div>
    </div>
  );
};

const NotesPanel = ({ room }: { room: Room<Note> }) => {
  const notesApi = useMemo(() => db.getDocuments(room), [room]);
  const [notes, setNotes] = useState<Documents<Note>>(notesApi.getUndeleted());
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);

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
    if (!editorRef.current || !selectedNoteId) {
      return;
    }
    editorRef.current.focus();
  }, [selectedNoteId]);

  const createNote = () => {
    const created = notesApi.new({
      text: `Room ${room.name} note ${Object.keys(notesApi.getUndeleted()).length + 1}`,
    });
    setSelectedNoteId(created._id);
  };

  const updateNote = (note: Note, text: string) => {
    note.text = text;
    notesApi.set(note);
  };

  return (
    <div data-cy={`multi-room-panel-${room.id}`}>
      <div style={styles.roomBar}>
        <h2 data-cy={`multi-room-title-${room.id}`}>{room.name}</h2>
        <button data-cy={`multi-room-new-note-${room.id}`} onClick={createNote}>
          New note
        </button>
      </div>
      <div style={styles.flexWrap} data-cy={`multi-room-notes-${room.id}`}>
        {Object.values(notes).length === 0 && (
          <div data-cy={`multi-room-empty-${room.id}`}>No notes yet</div>
        )}
        {Object.values(notes).map((note) => {
          if (note._deleted) {
            return null;
          }

          const isSelected = note._id === selectedNoteId;
          return (
            <div
              key={note._id}
              style={styles.card}
              data-cy={`multi-room-note-card-${note._id}`}
              onClick={() => setSelectedNoteId(note._id)}
            >
              <button
                style={styles.deleteButton}
                data-cy={`multi-room-delete-note-${note._id}`}
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
                  style={styles.editor}
                  value={notes[selectedNoteId]?.text ?? ''}
                  data-cy={`multi-room-note-editor-${note._id}`}
                  onChange={(event) => updateNote(note, event.target.value)}
                  onBlur={() => setSelectedNoteId('')}
                />
              ) : (
                <p
                  style={styles.cardInner}
                  data-cy={`multi-room-note-text-${note._id}`}
                >
                  {note.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default App;
