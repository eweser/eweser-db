import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import 'yjs';
import { Database } from '@eweser/db';
import type { CollectionKey, Note, Room } from '@eweser/db';
import * as config from './config';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { logger } from './utils';
import { useGetUserFromDb } from './user';

/** to make sure that we only have one default room created, make a new uuid v4 for the default room, but if there is already one in localStorage use that*/
const randomRoomId = crypto.randomUUID();
const defaultRoomId = localStorage.getItem('roomId') || randomRoomId;
const randomNoteId = crypto.randomUUID();
const defaultNoteId = localStorage.getItem('noteId') || randomNoteId;
localStorage.setItem('roomId', defaultRoomId);
localStorage.setItem('noteId', defaultNoteId);

const defaultNoteText = `# Welcome to EweNote! 🐑`;

export function getDeviceType() {
  const userAgent = navigator.userAgent;
  let deviceType = 'Unknown';

  if (userAgent.includes('iPhone')) {
    deviceType = 'iPhone';
  } else if (userAgent.includes('Android')) {
    deviceType = 'Android';
  } else if (userAgent.includes('Windows')) {
    deviceType = 'Windows';
  } else if (userAgent.includes('Macintosh')) {
    deviceType = 'Macintosh';
  }
  return deviceType;
}

export const collectionKey: CollectionKey = 'notes';
const defaultRoomName = `Notes from my ${getDeviceType()} Device, ${new Date().toLocaleString(
  'en-US',
  {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }
)}`; // add something to the room name that will be unique to this device

const initialRooms = [
  {
    collectionKey,
    id: defaultRoomId,
    name: defaultRoomName,
  },
];

export const db = new Database({
  authServer: config.AUTH_SERVER,
  // set `logLevel` to 0 to see debug messages in the console
  logLevel: 0,
  initialRooms,
  pollForStatus: true,
});
// run the rolling sync on the notes collection. This will cycle through all the rooms in the collectionKeysForRollingSync array and sync them for one second each.
db.collectionKeysForRollingSync = [collectionKey];

export const loginUrl = db.generateLoginUrl({ name: 'EweNote' });

export type DbContextType = {
  db: Database;
  loginUrl: string;
  loaded: boolean;
  loggedIn: boolean;
  hasToken: boolean;
  selectedRoom: Room<Note> | null;
  setSelectedRoom: (room: Room<Note> | null) => void;
  selectedNoteId: string;
  setSelectedNoteId: (noteId: string | null) => void;
  allRooms: Room<Note>[];
  allRoomIds: string[];
  user: {
    firstName: string;
    lastName: string;
    avatar: string;
  };
  signOut: () => void;
};

export const DbContext = createContext<DbContextType | null>(null);

export function useDb() {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error('useDb must be used within a DbContextProvider');
  }

  return context;
}

const signOut = () => {
  db.logoutAndClear();
  localStorage.removeItem('roomId');
  localStorage.removeItem('noteId');
  window.document.location.reload();
};
// for detailed debugging
// db.on('status', (status) => console.log(status));

export const DbProvider = ({ children }: { children: ReactNode }) => {
  const [loaded, setLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room<Note> | null>(null);

  const defaultNotesRoom = db.getRoom<Note>(collectionKey, defaultRoomId);

  const [defaultNote, setDefaultNote] = useState<Note | null>(null);

  const [allRooms, setAllRooms] = useState<Room<Note>[]>([]);
  const allRoomIds = allRooms.map((room) => room.id);

  useEffect(() => {
    if (!selectedRoom && defaultNotesRoom) {
      setSelectedRoom(defaultNotesRoom);
    }
  }, [selectedRoom, defaultNotesRoom]);

  useEffect(() => {
    if (defaultNote || !defaultNotesRoom?.ydoc) return;

    try {
      let note = db.getDocuments(defaultNotesRoom).getUndeleted()[0];
      if (!note) {
        note =
          defaultNotesRoom.getDocuments().get(defaultNoteId) ??
          defaultNotesRoom
            .getDocuments()
            .new({ text: defaultNoteText }, defaultNoteId);
      }
      setDefaultNote(note);
    } catch (error) {
      logger('Error creating default note', error);
    }
  }, [defaultNote, defaultNotesRoom, defaultNotesRoom?.ydoc]);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (hasToken) {
      return;
    }
    const foundToken = db.getToken(); // will pull token from the query string or from localStorage
    if (foundToken) {
      setHasToken(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, window.location.search]); // token will be in the query string after login redirect

  useEffect(() => {
    if (loggedIn || !hasToken) {
      return;
    }
    async function login() {
      const loginRes = await db.login({ loadAllRooms: true }); // beware this could be way too many if you have a lot of rooms. Better to call db.loadRooms() on the ones you actually need.
      if (loginRes) {
        setLoggedIn(true);
      }
    }
    login();
  }, [loggedIn, hasToken]);

  useEffect(() => {
    db.on('roomsLoaded', () => {
      setLoaded(true);
      setAllRooms(db.getRooms('notes'));
    });
    db.on('registrySync', (status) => {
      if (status === 'success') setAllRooms(db.getRooms('notes'));
    });

    return () => {
      db.off('roomsLoaded', () => {
        setLoaded(true);
        setAllRooms(db.getRooms('notes'));
      });
      db.off('registrySync', (status) => {
        if (status === 'success') setAllRooms(db.getRooms('notes'));
      });
    };
  }, []);

  const user = useGetUserFromDb(db);

  const contextValue = useMemo(
    () => ({
      db,
      loginUrl,
      loaded,
      loggedIn,
      hasToken,
      selectedRoom: selectedRoom ?? defaultNotesRoom,
      setSelectedRoom,
      selectedNoteId: selectedNoteId ?? defaultNote?._id ?? defaultNoteId,
      allRooms,
      allRoomIds,
      setSelectedNoteId,
      user,
      signOut,
    }),
    [
      loaded,
      loggedIn,
      hasToken,
      selectedRoom,
      defaultNotesRoom,
      setSelectedRoom,
      selectedNoteId,
      defaultNote,
      allRooms,
      allRoomIds,
      setSelectedNoteId,
      user,
    ]
  );

  return (
    <DbContext.Provider value={contextValue}>{children}</DbContext.Provider>
  );
};
