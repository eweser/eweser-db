import type { Note as DbNote, Room } from '@eweser/db';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import removeMarkdown from 'markdown-to-text';
import { useDb } from '@/db';
import { useFolders } from '@/notes-room';

export interface Note {
  id: string;
  roomId: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  properties: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  links: string[];
  backlinks: string[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  expanded: boolean;
  kind?: 'folder' | 'shared-room' | 'system';
  roomId?: string;
}

export interface Task {
  id: string;
  noteId: string;
  text: string;
  completed: boolean;
  dueDate?: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  properties: Record<string, string>;
  tags: string[];
}

interface NotesContextType {
  notes: Note[];
  folders: Folder[];
  tasks: Task[];
  templates: Template[];
  currentNoteId: string | null;
  setCurrentNoteId: (id: string | null) => void;
  addNote: (note: Partial<Note>) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  moveNote: (noteId: string, targetFolder: string) => void;
  addFolder: (name: string, parentId?: string | null) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addTemplate: (template: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  getTodayNote: () => Note;
  searchNotes: (query: string) => Note[];
  getNotesInFolder: (folderId: string) => Note[];
  getRecentNotes: (limit?: number) => Note[];
  getPinnedNotes: () => Note[];
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const PINNED_STORAGE_KEY = 'ewe-note-redesign-pinned';
const TEMPLATES_STORAGE_KEY = 'ewe-note-redesign-templates';

const defaultTemplates: Template[] = [
  {
    id: 'meeting',
    name: 'Meeting Notes',
    content:
      '# Meeting Notes\n\n## Attendees\n- \n\n## Agenda\n- \n\n## Discussion\n\n## Action Items\n- [ ] \n',
    properties: { type: 'meeting' },
    tags: ['meeting'],
  },
  {
    id: 'daily',
    name: 'Daily Note',
    content:
      '# Daily Note\n\n## Focus\n- \n\n## Tasks\n- [ ] \n\n## Notes\n\n## Reflection\n',
    properties: { type: 'daily' },
    tags: ['daily'],
  },
];

type InternalNote = Note & {
  source: DbNote;
};

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function deriveTitle(note: DbNote) {
  const fmTitle = note.frontmatter?.title;
  if (typeof fmTitle === 'string' && fmTitle.trim()) {
    return fmTitle.trim();
  }

  const headingMatch = note.text.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  const plain = removeMarkdown(note.text).trim();
  return plain.split('\n').find(Boolean)?.trim() || 'Untitled';
}

function stringifyProperties(frontmatter?: Record<string, unknown>) {
  const entries = Object.entries(frontmatter ?? {}).filter(
    ([key]) => !['title', 'tags', 'aliases'].includes(key)
  );

  return Object.fromEntries(
    entries.map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(', ') : String(value),
    ])
  );
}

function extractWikiLinks(markdown: string) {
  const matches = markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  return Array.from(matches, (match) => match[1]?.trim()).filter(Boolean) as string[];
}

function loadPinnedIds() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(PINNED_STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set<string>();
  }
}

function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Template[]) : defaultTemplates;
  } catch {
    return defaultTemplates;
  }
}

function extractTasksFromMarkdown(noteId: string, markdown: string) {
  const tasks: Task[] = [];
  const lines = markdown.split('\n');
  let index = 0;

  for (const line of lines) {
    const match = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/);
    if (!match) continue;
    index += 1;
    tasks.push({
      id: `${noteId}:${index}`,
      noteId,
      text: match[2].trim(),
      completed: match[1].toLowerCase() === 'x',
    });
  }

  return tasks;
}

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const {
    allRooms,
    selectedRoom,
    selectedNoteId,
    setSelectedNoteId,
    setSelectedRoom,
  } = useDb();
  const canonicalRoom =
    allRooms.find((room) => room.name === 'Notes') ?? allRooms[0] ?? null;
  const { folders: roomFolders, createFolder, renameFolder, deleteFolder } =
    useFolders(canonicalRoom);
  const [notesByRoomId, setNotesByRoomId] = useState<Record<string, DbNote[]>>({});
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(loadPinnedIds);
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [manualTasks, setManualTasks] = useState<Task[]>([]);

  useEffect(() => {
    localStorage.setItem(
      PINNED_STORAGE_KEY,
      JSON.stringify(Array.from(pinnedIds.values()))
    );
  }, [pinnedIds]);

  useEffect(() => {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    const getNotes = (room: Room<DbNote>) => {
      try {
        const docs = room.getDocuments();
        return docs.toArray(docs.sortByRecent(docs.getUndeleted()));
      } catch {
        return [];
      }
    };

    const handlers: Array<{ room: Room<DbNote>; handler: () => void }> = [];

    allRooms.forEach((room) => {
      const typedRoom = room as Room<DbNote>;
      try {
        const docs = typedRoom.getDocuments();
        const handler = () => {
          setNotesByRoomId((prev) => ({
            ...prev,
            [typedRoom.id]: getNotes(typedRoom),
          }));
        };
        docs.onChange(handler);
        handlers.push({ room: typedRoom, handler });
        handler();
      } catch {
        setNotesByRoomId((prev) => ({ ...prev, [typedRoom.id]: [] }));
      }
    });

    return () => {
      handlers.forEach(({ room, handler }) => {
        try {
          room.getDocuments().documents.unobserve(handler);
        } catch {
          // ignore
        }
      });
    };
  }, [allRooms]);

  const folders = useMemo<Folder[]>(() => {
    const baseFolders = roomFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentFolderId ?? null,
      expanded: true,
      kind: 'folder' as const,
      roomId: canonicalRoom?.id,
    }));

    const sharedRoomFolders = allRooms
      .filter((room) => canonicalRoom && room.id !== canonicalRoom.id)
      .map((room) => ({
        id: `room:${room.id}`,
        name: room.name,
        parentId: null,
        expanded: true,
        kind: 'shared-room' as const,
        roomId: room.id,
      }));

    return [...baseFolders, ...sharedRoomFolders];
  }, [allRooms, canonicalRoom, roomFolders]);

  const notes = useMemo<Note[]>(() => {
    const internal: InternalNote[] = [];

    const titleIndex = new Map<string, string>();

    for (const room of allRooms) {
      const docs = notesByRoomId[room.id] ?? [];
      for (const source of docs) {
        const title = deriveTitle(source);
        const aliases = source.aliases ?? [];
        const folderId =
          canonicalRoom && room.id !== canonicalRoom.id
            ? `room:${room.id}`
            : source.folderIds?.[0] ?? '';

        const note: InternalNote = {
          id: source._id,
          roomId: room.id,
          title,
          content: source.text,
          folder: folderId,
          tags: source.tags ?? [],
          properties: stringifyProperties(source.frontmatter),
          createdAt: new Date(source._created).toISOString(),
          updatedAt: new Date(source._updated).toISOString(),
          pinned: pinnedIds.has(source._id),
          links: [],
          backlinks: [],
          source,
        };

        internal.push(note);
        titleIndex.set(normalize(title), source._id);
        aliases.forEach((alias) => titleIndex.set(normalize(alias), source._id));
      }
    }

    const backlinksById = new Map<string, string[]>();

    for (const note of internal) {
      const linkedIds = extractWikiLinks(note.content)
        .map((linkText) => titleIndex.get(normalize(linkText)))
        .filter(Boolean) as string[];

      note.links = Array.from(new Set(linkedIds));

      note.links.forEach((linkedId) => {
        const current = backlinksById.get(linkedId) ?? [];
        current.push(note.id);
        backlinksById.set(linkedId, current);
      });
    }

    return internal.map(({ source: _source, ...note }) => ({
      ...note,
      backlinks: Array.from(new Set(backlinksById.get(note.id) ?? [])),
    }));
  }, [allRooms, canonicalRoom, notesByRoomId, pinnedIds]);

  const tasks = useMemo(() => {
    const extracted = notes.flatMap((note) =>
      extractTasksFromMarkdown(note.id, note.content)
    );
    return extracted.concat(manualTasks);
  }, [manualTasks, notes]);

  const getRoomAndSource = (noteId: string) => {
    for (const room of allRooms) {
      try {
        const docs = room.getDocuments();
        const source = docs.get(noteId);
        if (source) return { room: room as Room<DbNote>, docs, source };
      } catch {
        // ignore unloaded room
      }
    }
    return null;
  };

  const adaptNote = (room: Room<DbNote>, source: DbNote): Note => {
    const note = notes.find((item) => item.id === source._id);
    if (note) return note;
    return {
      id: source._id,
      roomId: room.id,
      title: deriveTitle(source),
      content: source.text,
      folder:
        canonicalRoom && room.id !== canonicalRoom.id
          ? `room:${room.id}`
          : source.folderIds?.[0] ?? '',
      tags: source.tags ?? [],
      properties: stringifyProperties(source.frontmatter),
      createdAt: new Date(source._created).toISOString(),
      updatedAt: new Date(source._updated).toISOString(),
      pinned: pinnedIds.has(source._id),
      links: [],
      backlinks: [],
    };
  };

  const setCurrentNoteId = (id: string | null) => {
    if (!id) {
      setSelectedNoteId(null);
      return;
    }
    const found = getRoomAndSource(id);
    if (!found) return;
    setSelectedRoom(found.room);
    setSelectedNoteId(id);
  };

  const addNote = (note: Partial<Note>) => {
    const targetRoom =
      (note.folder?.startsWith('room:')
        ? allRooms.find((room) => room.id === note.folder?.replace('room:', ''))
        : canonicalRoom) ??
      selectedRoom ??
      canonicalRoom ??
      allRooms[0];

    if (!targetRoom) {
      throw new Error('No available room to create a note');
    }

    const frontmatter: Record<string, unknown> = {};
    if (note.title && note.title !== 'Untitled') frontmatter.title = note.title;
    if (note.tags?.length) frontmatter.tags = note.tags;
    Object.entries(note.properties ?? {}).forEach(([key, value]) => {
      frontmatter[key] = value;
    });

    const created = targetRoom.getDocuments().new({
      text:
        note.content ||
        `# ${note.title?.trim() || 'Untitled'}\n\n`,
      ...(Object.keys(frontmatter).length ? { frontmatter } : {}),
      ...(note.tags?.length ? { tags: note.tags } : {}),
      ...(note.folder &&
      !note.folder.startsWith('room:') &&
      note.folder.trim().length > 0
        ? { folderIds: [note.folder] }
        : {}),
    });

    setSelectedRoom(targetRoom);
    setSelectedNoteId(created._id);
    return adaptNote(targetRoom as Room<DbNote>, created);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    const found = getRoomAndSource(id);
    if (!found) return;

    const next: DbNote = { ...found.source };
    const nextFrontmatter = { ...(found.source.frontmatter ?? {}) };

    if (updates.content !== undefined) {
      next.text = updates.content;
    }

    if (updates.title !== undefined) {
      nextFrontmatter.title = updates.title;
    }

    if (updates.tags !== undefined) {
      next.tags = updates.tags;
      nextFrontmatter.tags = updates.tags;
    }

    if (updates.properties !== undefined) {
      Object.keys(nextFrontmatter).forEach((key) => {
        if (!['title', 'tags', 'aliases'].includes(key)) {
          delete nextFrontmatter[key];
        }
      });
      Object.entries(updates.properties).forEach(([key, value]) => {
        nextFrontmatter[key] = value;
      });
    }

    if (updates.folder !== undefined) {
      if (updates.folder.startsWith('room:')) {
        return;
      }
      next.folderIds = updates.folder ? [updates.folder] : [];
    }

    next.frontmatter = nextFrontmatter;
    found.docs.set(next);
  };

  const deleteNote = (id: string) => {
    const found = getRoomAndSource(id);
    if (!found) return;
    found.docs.delete(id);
  };

  const togglePinNote = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moveNote = (noteId: string, targetFolder: string) => {
    const found = getRoomAndSource(noteId);
    if (!found) return;

    if (targetFolder.startsWith('room:')) {
      return;
    }

    const next: DbNote = {
      ...found.source,
      folderIds: targetFolder ? [targetFolder] : [],
    };
    found.docs.set(next);
  };

  const addFolder = (name: string, parentId?: string | null) => {
    createFolder(name, parentId ?? undefined);
  };

  const updateFolder = (id: string, updates: Partial<Folder>) => {
    if (updates.name) renameFolder(id, updates.name);
  };

  const getNotesInFolder = (folderId: string) =>
    notes.filter((note) => note.folder === folderId);

  const getRecentNotes = (limit = 10) =>
    [...notes]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, limit);

  const getPinnedNotes = () => notes.filter((note) => note.pinned);

  const addTask = (task: Partial<Task>) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      noteId: task.noteId ?? '',
      text: task.text ?? '',
      completed: task.completed ?? false,
      ...(task.dueDate ? { dueDate: task.dueDate } : {}),
    };
    setManualTasks((prev) => [...prev, newTask]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setManualTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  };

  const deleteTask = (id: string) => {
    setManualTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const addTemplate = (template: Partial<Template>) => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: template.name ?? 'Untitled Template',
      content: template.content ?? '',
      properties: template.properties ?? {},
      tags: template.tags ?? [],
    };
    setTemplates((prev) => [...prev, newTemplate]);
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((template) => template.id !== id));
  };

  const getTodayNote = () => {
    const today = new Date().toISOString().slice(0, 10);
    const existing = notes.find((note) => note.properties.date === today);
    if (existing) return existing;
    const dailyFolderId = folders.find(
      (folder) => normalize(folder.name) === 'daily notes'
    )?.id;
    return addNote({
      title: `Daily Note ${today}`,
      properties: { date: today, type: 'daily' },
      ...(dailyFolderId ? { folder: dailyFolderId } : {}),
    });
  };

  const searchNotes = (query: string) => {
    const lowered = normalize(query);
    return notes.filter((note) => {
      const propertyText = Object.values(note.properties).join(' ');
      return (
        normalize(note.title).includes(lowered) ||
        normalize(note.content).includes(lowered) ||
        normalize(note.tags.join(' ')).includes(lowered) ||
        normalize(propertyText).includes(lowered)
      );
    });
  };

  const contextValue = useMemo<NotesContextType>(
    () => ({
      notes,
      folders,
      tasks,
      templates,
      currentNoteId: selectedNoteId,
      setCurrentNoteId,
      addNote,
      updateNote,
      deleteNote,
      togglePinNote,
      moveNote,
      addFolder,
      updateFolder,
      deleteFolder,
      addTask,
      updateTask,
      deleteTask,
      addTemplate,
      deleteTemplate,
      getTodayNote,
      searchNotes,
      getNotesInFolder,
      getRecentNotes,
      getPinnedNotes,
    }),
    [notes, folders, tasks, templates, selectedNoteId]
  );

  return (
    <NotesContext.Provider value={contextValue}>{children}</NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
