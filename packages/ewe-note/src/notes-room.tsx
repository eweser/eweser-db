import type { Room, Note, Documents } from '@eweser/db';
import { useState, useEffect, useMemo } from 'react';
import { useDb } from './db';
import type { GetDocuments } from '@eweser/db';

export type NotesRoomType = {
  room: Room<Note> | null;
  roomId: string;
  connectionStatus: string;
  notes: Documents<Note> | null;
  Notes: GetDocuments<Note> | null;
  createNote: () => void;
  updateNoteText: (text: string, note?: Note) => void;
  deleteNote: (note: Note) => void;
};

export const useNotesRoom = (
  roomId: string,
  withAwareness = false
): NotesRoomType => {
  const { db, setSelectedNoteId } = useDb();
  const room = db.getRoom<Note>('notes', roomId);
  if (withAwareness) {
    room.addAwareness();
  }
  if (!room) {
    throw new Error(
      `Room with id ${roomId} not found. rooms: ${db
        .getRooms('notes')
        .map((r) => r.id)}`
    );
  }
  const Notes = useMemo(() => room.getDocuments(), [room]);

  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    room.on('roomConnectionChange', setConnectionStatus);
    return () => {
      room.off('roomConnectionChange', setConnectionStatus);
    };
  }, [room, setConnectionStatus]);

  const [notes, setNotes] = useState<Documents<Note>>(
    Notes.sortByRecent(Notes.getUndeleted())
  );

  // listen for changes to the ydoc and update the state
  useEffect(() => {
    const handleNotesChange = () => {
      setNotes(Notes.getUndeleted());
    };
    Notes.onChange(handleNotesChange);
    return () => {
      Notes.onChange(handleNotesChange);
    };
  }, [Notes]);

  const createNote = () => {
    const newNote = Notes.new({
      text: `New note: ${Object.keys(Notes.getUndeleted()).length + 1}`,
    });
    setSelectedNoteId(newNote._id);
  };

  const updateNoteText = (text: string, note?: Note) => {
    if (!note) return;
    note.text = text;
    Notes.set(note);
  };

  const deleteNote = (note: Note) => {
    Notes.delete(note._id);
  };

  return {
    room,
    roomId,
    connectionStatus,
    notes,
    Notes,
    createNote,
    updateNoteText,
    deleteNote,
  };
};
