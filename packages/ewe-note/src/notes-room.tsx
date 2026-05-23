/**
 * Purpose: React hook for note room state, CRUD, awareness, and folder maps.
 * Exports: NotesRoomType and useNotesRoom.
 * Touches: @eweser/db room documents, Yjs folder maps, and selected note state.
 * Read before editing: packages/ewe-note/src/INDEX.md and AGENTS.md.
 */
import type { Room, Note, Documents } from '@eweser/db';
import { useState, useEffect, useMemo } from 'react';
import { defaultNoteId, useDb } from './db';
import type { GetDocuments } from '@eweser/db';
import type { FolderBase } from '@eweser/shared';
import type { Map as YMap } from 'yjs';
import {
  DEFAULT_NOTE_AFTER_TUTORIAL_DISMISS_TEXT,
  isDefaultTutorialDismissalChecked,
  markDefaultTutorialDismissed,
} from './default-tutorial';

export type NotesRoomType = {
  room: Room<Note> | null;
  roomId: string;
  connectionStatus: string;
  notes: Documents<Note> | null;
  Notes: GetDocuments<Note> | null;
  createNote: () => void;
  updateNoteText: (text: string, note?: Note) => void;
  updateNoteFrontmatter: (
    frontmatter: Record<string, unknown>,
    note?: Note
  ) => void;
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
      Notes.documents.unobserve(handleNotesChange);
    };
  }, [Notes]);

  const createNote = () => {
    const newNote = Notes.new({
      text: `New note: ${Object.keys(Notes.getUndeleted()).length + 1}`,
    });
    setSelectedNoteId(newNote._id);
  };

  const dismissDefaultTutorialIfChecked = (text: string, note: Note) => {
    if (
      note._id !== defaultNoteId ||
      !isDefaultTutorialDismissalChecked(text)
    ) {
      return false;
    }
    if (!room.ydoc) return false;

    let nextNoteId: string | null = null;
    room.ydoc.transact(() => {
      const existingNotes = Notes.toArray(
        Notes.sortByRecent(Notes.getUndeleted())
      );
      const nextNote =
        existingNotes.find((candidate) => candidate._id !== note._id) ??
        Notes.new({ text: DEFAULT_NOTE_AFTER_TUTORIAL_DISMISS_TEXT });
      Notes.delete(note._id, 0);
      nextNoteId = nextNote._id;
    });

    markDefaultTutorialDismissed();

    if (nextNoteId) {
      setSelectedNoteId(nextNoteId);
    }

    return true;
  };

  const updateNoteText = (text: string, note?: Note) => {
    if (!note) return;
    if (dismissDefaultTutorialIfChecked(text, note)) return;

    note.text = text;
    Notes.set(note);
  };

  const updateNoteFrontmatter = (
    frontmatter: Record<string, unknown>,
    note?: Note
  ) => {
    if (!note) return;
    note.frontmatter = frontmatter;
    // Re-extract aliases and tags from updated frontmatter
    const aliases = frontmatter['aliases'];
    if (Array.isArray(aliases)) {
      note.aliases = aliases.filter((a): a is string => typeof a === 'string');
    }
    const tags = frontmatter['tags'];
    if (Array.isArray(tags)) {
      note.tags = tags.filter((t): t is string => typeof t === 'string');
    } else {
      note.tags = [];
    }
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
    updateNoteFrontmatter,
    deleteNote,
  };
};

// ---------------------------------------------------------------------------
// Folder storage: a Y.Map('folders') on the room's ydoc.
// Key = folderId (string), value = JSON-stringified FolderBase.
// ---------------------------------------------------------------------------

export type FolderRecord = FolderBase & { id: string };

export type UseFoldersResult = {
  folders: FolderRecord[];
  createFolder: (name: string, parentFolderId?: string) => string;
  updateFolder: (id: string, updates: Partial<FolderBase>) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  getFolderMap: () => YMap<string> | null;
};

export function useFolders(room: Room<Note> | null): UseFoldersResult {
  const getFolderMap = (): YMap<string> | null => {
    if (!room?.ydoc) return null;
    // Cast through unknown because YDoc<T> is a typed wrapper but the
    // underlying Yjs Doc has the standard getMap() API.
    return (
      room.ydoc as unknown as { getMap: (name: string) => YMap<string> }
    ).getMap('folders');
  };

  const readFolders = (): FolderRecord[] => {
    const map = getFolderMap();
    if (!map) return [];
    const result: FolderRecord[] = [];
    map.forEach((json, id) => {
      try {
        const base = JSON.parse(json) as FolderBase;
        result.push({ ...base, id });
      } catch {
        // skip malformed entry
      }
    });
    return result;
  };

  const [folders, setFolders] = useState<FolderRecord[]>(readFolders);

  useEffect(() => {
    const map = getFolderMap();
    if (!map) return;
    const handler = () => setFolders(readFolders());
    map.observe(handler);
    return () => map.unobserve(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.ydoc]);

  const createFolder = (name: string, parentFolderId?: string): string => {
    const map = getFolderMap();
    if (!map) throw new Error('Room ydoc not available');
    const id = crypto.randomUUID();
    const base: FolderBase = {
      name,
      ...(parentFolderId ? { parentFolderId } : {}),
    };
    room?.ydoc?.transact(() => {
      map.set(id, JSON.stringify(base));
    });
    return id;
  };

  const updateFolder = (id: string, updates: Partial<FolderBase>) => {
    const map = getFolderMap();
    if (!map) return;
    const existing = map.get(id);
    if (!existing) return;
    const base = JSON.parse(existing) as FolderBase;
    const next = {
      ...base,
      ...updates,
    } as FolderBase & { parentFolderId?: string };

    if (!next.parentFolderId) {
      delete next.parentFolderId;
    }

    room?.ydoc?.transact(() => {
      map.set(id, JSON.stringify(next));
    });
  };

  const deleteFolder = (id: string) => {
    const map = getFolderMap();
    if (!map) return;
    room?.ydoc?.transact(() => {
      map.delete(id);
    });
  };

  const renameFolder = (id: string, name: string) => {
    updateFolder(id, { name });
  };

  return {
    folders,
    createFolder,
    updateFolder,
    renameFolder,
    deleteFolder,
    getFolderMap,
  };
}
