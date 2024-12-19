import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CollectionKey,
  Database,
  Documents,
  Note,
  Registry,
  Room,
} from '@eweser/db';
import * as config from './config';
import { Button, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { localStoragePolyfill } from '../polyfills';
import styles from './styles';
import { StatusBar } from './StatusBar';
import uuid from 'react-native-uuid';
// This example shows how to implement a basic login/signup form and a basic note-taking app using @eweser/db
// The CRUD operations are all done directly on the yjs ydoc using the `Documents` object and its methods returned from `db.getDocuments()`

/** to make sure that we only have one default room created, make a new uuid v4 for the default room, but if there is already one in localStorage use that*/
console.log(localStoragePolyfill.getItem('roomId'));
console.log();
const roomId = localStoragePolyfill.getItem('roomId') || uuid.v4().toString();
localStoragePolyfill.setItem('roomId', roomId);
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

const collectionKey: CollectionKey = 'notes';
/** A room is a group of documents that all share a common `Collection` type, like Note. Sharing and view permissions can be set on a per room basis */
const initialRooms = [
  {
    collectionKey,
    id: roomId,
    // add something to the room name that will be unique to this device
    name: `Notes from my ${deviceType} Device, ${new Date().toLocaleString(
      'en-US',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    )}`,
  },
];

const db = new Database({
  authServer: config.AUTH_SERVER,
  // set `logLevel` to 0 to see debug messages in the console
  logLevel: 0,
  // use this to sync webRTC locally with the test-rpc-server started with `npm run start-test-rpc-server`
  webRTCPeers: config.WEB_RTC_PEERS,
  initialRooms,
  localStoragePolyfill,
});
const loginUrl = db.generateLoginUrl({ name: 'Basic Example App' });

const App = () => {
  const [loaded, setLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (hasToken) {
      return;
    }
    const foundToken = db.getToken(); // will pull token from the query string or from localStorage
    if (foundToken) {
      setHasToken(true);
    }
    // eslint-disable-next-line react-hooks/exhausViewe-deps
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
    });

    return () => {
      db.off('roomsLoaded', () => {
        setLoaded(true);
      });
    };
  }, []);
  const defaultNotesRoom = db.getRoom<Note>(collectionKey, roomId);
  const allNotes = db.getRooms('notes').filter((room) => room.id !== roomId);

  return (
    <View style={styles.appRoot}>
      <StatusBar db={db} loginUrl={loginUrl} />

      {/* You can check that the ydoc exists to make sure the room is connected */}
      {loaded && defaultNotesRoom?.ydoc ? (
        <View>
          <NotesRoom notesRoom={defaultNotesRoom} />
          {allNotes.map((notesRoom) => (
            <NotesRoom key={notesRoom.id} notesRoom={notesRoom} />
          ))}
        </View>
      ) : (
        // usually loads almost instantaneously, but we need to make sure a yDoc is ready before we can use it
        <Text>loading...</Text>
      )}
    </View>
  );
};

const NotesRoom = ({ notesRoom }: { notesRoom: Room<Note> }) => {
  // This Notes object provides a set of methods for easily updating the documents in the room. It is a wrapper around the ydoc that is provided by the room.
  const Notes = useMemo(() => db.getDocuments(notesRoom), [notesRoom]);

  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    notesRoom.on('roomConnectionChange', setConnectionStatus);
    return () => {
      notesRoom.off('roomConnectionChange', setConnectionStatus);
    };
  }, [notesRoom, setConnectionStatus]);

  const [notes, setNotes] = useState<Documents<Note>>(
    Notes.sortByRecent(Notes.getUndeleted())
  );

  const [selectedNote, setSelectedNote] = useState('');

  const newNoteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    // focus cursor at end of the line when selected
    if (newNoteRef.current && selectedNote) {
      newNoteRef.current.focus();
      const len = newNoteRef.current.value.length;
      newNoteRef.current.selectionStart = len;
      newNoteRef.current.selectionEnd = len;
    }
  }, [selectedNote]);

  // listen for changes to the ydoc and update the state
  Notes.onChange((_event) => {
    setNotes(Notes.getUndeleted());
  });

  const createNote = () => {
    // Notes.new will fill in the metadata for you, including _id with a random string and _updated with the current timestamp
    const newNote = Notes.new({
      text: `New note: ${Object.keys(Notes.getUndeleted()).length + 1}`,
    });
    setSelectedNote(newNote._id);
  };

  const updateNoteText = (text: string, note?: Note) => {
    if (!note) return;
    note.text = text;
    // Notes.set will update _updated with the current timestamp
    Notes.set(note);
  };

  const deleteNote = (note: Note) => {
    Notes.delete(note._id);
  };

  return (
    <>
      <View style={styles.roomBar}>
        <RoomName db={db} room={notesRoom} />{' '}
        <Button
          title="New note"
          //  style={styles.newNoteButton}
          onPress={() => createNote()}
        />
        <ShareButton db={db} room={notesRoom} />
        <Text>{connectionStatus}</Text>
      </View>

      <View style={styles.flexWrap}>
        {Object.keys(notes)?.length === 0 && (
          <View>
            <Text>No notes found. Please create one</Text>
          </View>
        )}
        {Object.keys(notes).map((id) => {
          const note = notes[id];
          if (note && !notes[id]?._deleted)
            return (
              <TouchableOpacity
                onPress={() => setSelectedNote(note._id)}
                style={styles.card}
                key={note._id}
              >
                <View style={styles.deleteButton}>
                  <Button
                    title="X"
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteNote(note);
                    }}
                  />
                </View>
                {id === selectedNote ? (
                  <textarea
                    style={styles.editor}
                    onBlur={() => setSelectedNote('')}
                    ref={newNoteRef}
                    name="main-card-editor"
                    value={notes[selectedNote]?.text ?? ''}
                    onChange={(e) => {
                      updateNoteText(e.target.value, notes[selectedNote]);
                    }}
                  />
                ) : (
                  <Text style={styles.cardInner}>{note.text}</Text>
                )}
              </TouchableOpacity>
            );
        })}
      </View>
    </>
  );
};

const RoomName = ({ db, room }: { db: Database; room: Room<any> }) => {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(room.name);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    await db.renameRoom(room, newName);
    setSubmitting(false);
    setEditing(false);
  };
  return (
    <>
      {editing ? (
        <TextInput
          value={newName}
          onChangeText={(text) => setNewName(text)} // use onChangeText instead of onChange
          onBlur={submit}
          autoFocus
          editable={!submitting}
          onSubmitEditing={submit}
        />
      ) : (
        <Text onPress={() => setEditing(true)}>{room.name}</Text>
      )}
    </>
  );
};

const ShareButton = ({ db, room }: { db: Database; room: Room<any> }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (showShareModal) {
      db.generateShareRoomLink({
        roomId: room.id,
        accessType: 'write',
        appName: 'Basic Example App',
      })
        .then((link) => setShareLink(link))
        // eslint-disable-next-line no-console
        .catch((e) => console.error(e));
    } else {
      setShareLink('Unable to get share link');
    }
  }, [db, room, showShareModal]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000); // Reset copied state after 3 seconds
  };

  return (
    <>
      {showShareModal && (
        <TouchableOpacity
          onPress={() => setShowShareModal(false)}
          style={styles.modal}
        >
          <TouchableOpacity
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            <Button
              onPress={() => setShowShareModal(false)}
              // style={styles.modalCloseButton}
              title="X"
            />
            <View>
              <Text>
                Anyone with this link will have edit permissions for this folder
              </Text>
              <View>
                <TouchableOpacity onPress={handleCopy}>
                  <Text> {shareLink}</Text>
                  {shareLink.slice(0, 10)}...{shareLink.slice(-10)}
                </TouchableOpacity>
                <Button
                  onPress={handleCopy}
                  color="green"
                  title={copied ? 'Copied!' : 'Copy Link'}
                />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      <Button
        onPress={() => setShowShareModal(true)}
        // style={styles.shareButton}
        title="Share"
      />
    </>
  );
};

export default App;
