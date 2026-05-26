// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import type { Note as DbNote, Room } from '@eweser/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { processNoteFile } from '../../cli/import-vault';
import {
  getFeatureVaultFixturePath,
  readFeatureVaultFixture,
} from '../../editor/obsidian-feature-fixtures';
import { NotesProvider, useNotes, type Template } from './NotesContext';

type DocumentsLike = {
  toArray: (notes: DbNote[]) => DbNote[];
  sortByRecent: (notes: DbNote[]) => DbNote[];
  getUndeleted: () => DbNote[];
  onChange: (handler: () => void) => void;
  documents: { unobserve: (handler: () => void) => void };
  get: (id: string) => DbNote | undefined;
  new: (note: TestDbNoteInput, id?: string) => DbNote;
  set: (note: DbNote) => void;
  delete: (id: string) => void;
};

type TestDbNoteInput = Partial<DbNote> & {
  _ref?: string;
  frontmatter?: Record<string, unknown>;
  tags?: string[];
  aliases?: string[];
  folderIds?: string[];
  wikiLinks?: Array<{
    target: string;
    heading?: string;
    alias?: string;
    isEmbed: boolean;
  }>;
  attachmentRefs?: string[];
  sourcePath?: string;
  sourceVault?: string;
};

const mockUseDb = vi.fn();
const mockUseFolders = vi.fn();

vi.mock('../../db', () => ({
  useDb: () => mockUseDb(),
}));

vi.mock('../../notes-room', () => ({
  useFolders: (...args: unknown[]) => mockUseFolders(...args),
}));

class FakeDocuments implements DocumentsLike {
  private readonly records = new Map<string, DbNote>();
  private readonly listeners = new Set<() => void>();

  documents = {
    unobserve: (handler: () => void) => {
      this.listeners.delete(handler);
    },
  };

  constructor(notes: DbNote[]) {
    notes.forEach((note) => this.records.set(note._id, note));
  }

  toArray(notes: DbNote[]) {
    return [...notes];
  }

  sortByRecent(notes: DbNote[]) {
    return [...notes].sort((a, b) => b._updated - a._updated);
  }

  getUndeleted() {
    return Array.from(this.records.values());
  }

  onChange(handler: () => void) {
    this.listeners.add(handler);
  }

  get(id: string) {
    return this.records.get(id);
  }

  new(note: TestDbNoteInput, id?: string) {
    const noteId = id ?? crypto.randomUUID();
    const now = Date.now();
    const created = {
      _id: noteId,
      _ref: note._ref ?? `local|notes|room-notes|${noteId}`,
      _created: now,
      _updated: now,
      text: note.text ?? '',
      frontmatter: note.frontmatter ?? {},
      tags: note.tags ?? [],
      aliases: note.aliases ?? [],
      folderIds: note.folderIds ?? [],
      wikiLinks: note.wikiLinks ?? [],
      attachmentRefs: note.attachmentRefs ?? [],
      sourcePath: note.sourcePath ?? `${noteId}.md`,
      sourceVault: note.sourceVault ?? 'feature-vault',
    } as unknown as DbNote;

    this.records.set(created._id, created);
    this.emit();
    return created;
  }

  set(note: DbNote) {
    this.records.set(note._id, {
      ...note,
      _updated: Date.now(),
    });
    this.emit();
  }

  delete(id: string) {
    this.records.delete(id);
    this.emit();
  }

  private emit() {
    this.listeners.forEach((handler) => handler());
  }
}

type DbState = ReturnType<typeof createDbState>;
type NotesContextValue = ReturnType<typeof useNotes>;

function createRoom(
  id: string,
  name: string,
  docs: FakeDocuments
): Room<DbNote> {
  return {
    id,
    name,
    getDocuments: () => docs,
  } as unknown as Room<DbNote>;
}

function createDbState(room: Room<DbNote>) {
  return {
    db: {} as never,
    loginUrl: '',
    loaded: true,
    loggedIn: false,
    hasToken: false,
    syncStatus: 'local-only' as const,
    syncStatusLabel: 'Local only',
    syncStatusDescription: 'Local notes only',
    selectedRoom: room as Room<DbNote> | null,
    setSelectedRoom: vi.fn((next: Room<DbNote> | null) => {
      dbState.selectedRoom = next;
    }),
    selectedNoteId: '',
    setSelectedNoteId: vi.fn((noteId: string | null) => {
      dbState.selectedNoteId = noteId ?? '';
    }),
    allRooms: [room],
    allRoomIds: [room.id],
    user: {
      firstName: 'Test',
      lastName: 'User',
      avatar: '',
    },
    signOut: vi.fn(),
  };
}

const folderFixtures = [
  {
    id: 'daily-folder',
    name: 'Daily Notes',
    parentFolderId: undefined,
  },
  {
    id: 'projects-folder',
    name: 'Projects',
    parentFolderId: undefined,
  },
];

let dbState: DbState;
let latestContext: NotesContextValue | undefined;

function Probe() {
  latestContext = useNotes();
  return null;
}

async function loadFixtureNotes(relativePaths: string[]) {
  const vaultRoot = getFeatureVaultFixturePath('.');

  return Promise.all(
    relativePaths.map(async (relativePath) => {
      const note = await processNoteFile(
        getFeatureVaultFixturePath(relativePath),
        vaultRoot,
        'feature-vault'
      );
      const maybeTimedNote = note as unknown as DbNote & {
        _created?: string | number;
        _updated?: string | number;
      };
      const now = Date.now();
      const createdAt =
        maybeTimedNote._created !== undefined
          ? new Date(maybeTimedNote._created).getTime()
          : now;
      const updatedAt =
        maybeTimedNote._updated !== undefined
          ? new Date(maybeTimedNote._updated).getTime()
          : now;

      return {
        ...note,
        _ref: `local|notes|room-notes|${note._id}`,
        _created: Number.isFinite(createdAt) ? createdAt : now,
        _updated: Number.isFinite(updatedAt) ? updatedAt : now,
      } as unknown as DbNote;
    })
  );
}

async function renderProviderWithFixtures(relativePaths: string[]) {
  latestContext = undefined;
  const notes = await loadFixtureNotes(relativePaths);
  const docs = new FakeDocuments(notes);
  const room = createRoom('room-notes', 'Notes', docs);

  dbState = createDbState(room);
  mockUseDb.mockImplementation(() => dbState);
  mockUseFolders.mockReturnValue({
    folders: folderFixtures,
    createFolder: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
  });

  render(
    <NotesProvider>
      <Probe />
    </NotesProvider>
  );

  await waitFor(() => {
    expect(latestContext?.notes.length).toBe(notes.length);
  });

  return { docs, room, notes };
}

describe('NotesContext parity behavior', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    mockUseDb.mockReset();
    mockUseFolders.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('derives fixture note metadata, search results, and markdown tasks', async () => {
    await renderProviderWithFixtures([
      '01 Markdown Syntax.md',
      '04 Properties and Tags.md',
      '08 Search and Discovery.md',
    ]);

    const propertiesNote = latestContext?.notes.find(
      (note) => note.title === 'Properties and Tags Coverage'
    );
    expect(propertiesNote?.aliases).toContain('Properties Guide');
    expect(propertiesNote?.tags).toEqual(
      expect.arrayContaining(['parity', 'metadata', 'project/alpha'])
    );
    expect(propertiesNote?.properties).toMatchObject({
      owner: 'jacob',
      status: 'active',
      related_people: 'Alex, Feature Vault',
    });

    expect(
      latestContext
        ?.searchNotes('quick-switcher-token-4827')
        .map((note) => note.title)
    ).toContain('Search and Discovery');
    expect(
      latestContext?.searchNotes('jacob').map((note) => note.title)
    ).toContain('Properties and Tags Coverage');

    expect(
      latestContext?.tasks.map((task) => ({
        text: task.text,
        completed: task.completed,
      }))
    ).toEqual(
      expect.arrayContaining([
        {
          text: 'Follow up on [[05 Link Targets]]',
          completed: false,
        },
        {
          text: 'Confirm [[07 Embeds and Media]] references',
          completed: true,
        },
      ])
    );
  });

  it('resolves fixture links, backlinks, title derivation, and unlinked mention conversion', async () => {
    await renderProviderWithFixtures([
      '01 Markdown Syntax.md',
      '04 Properties and Tags.md',
      '05 Link Targets.md',
      '06 Links Navigation Edge Cases.md',
      'Projects/Overview.md',
      'Areas/Overview.md',
      'People/Alex.md',
      'Folder Cases/Alias Collision.md',
      'References/Case Sensitive.md',
    ]);

    const propertiesNote = latestContext?.notes.find(
      (note) => note.title === 'Properties and Tags Coverage'
    );
    const linkTargetNote = latestContext?.notes.find(
      (note) => note.title === 'Link Targets'
    );
    const edgeCasesNote = latestContext?.notes.find(
      (note) => note.title === 'Links Navigation Edge Cases'
    );
    const alexNote = latestContext?.notes.find((note) => note.title === 'Alex');
    const projectOverviewNote = latestContext?.notes.find(
      (note) => note.sourcePath === 'Projects/Overview.md'
    );

    expect(propertiesNote).toBeDefined();
    expect(linkTargetNote).toBeDefined();
    expect(edgeCasesNote).toBeDefined();
    expect(alexNote).toBeDefined();
    expect(projectOverviewNote).toMatchObject({
      title: 'Overview',
      sourcePath: 'Projects/Overview.md',
      sourceVault: 'feature-vault',
      sourceDirectory: 'Projects',
      sourceBreadcrumb: ['Projects', 'Overview.md'],
    });

    expect(
      latestContext?.searchNotes('Projects/Overview').map((note) => note.id)
    ).toContain(projectOverviewNote?.id);

    expect(latestContext?.resolveWikiLink('Properties Guide')).toBe(
      propertiesNote?.id
    );
    expect(latestContext?.resolveWikiLink('A. Example')).toBe(alexNote?.id);

    expect(edgeCasesNote?.outgoingLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: 'Projects/Overview',
        }),
        expect.objectContaining({
          target: '05 Link Targets',
          heading: 'Canonical Heading Target',
          noteId: linkTargetNote?.id,
        }),
        expect.objectContaining({
          target: '05 Link Targets',
          blockRef: 'addressable-block',
          noteId: linkTargetNote?.id,
        }),
        expect.objectContaining({
          target: 'Missing Feature Note',
          noteId: null,
        }),
      ])
    );
    expect(linkTargetNote?.backlinks).toEqual(
      expect.arrayContaining([edgeCasesNote?.id ?? ''])
    );
    expect(propertiesNote?.backlinks).toContain(edgeCasesNote?.id ?? '');

    latestContext?.addNote({
      title: 'Heading Derived',
      content: '# Heading Derived\n\nAlpha body',
    });
    latestContext?.addNote({
      title: 'Plain fallback only',
      content: 'Plain fallback only',
    });
    latestContext?.addNote({
      content: 'Alex should become linked here.',
    });

    await waitFor(() => {
      expect(
        latestContext?.notes.some((note) => note.title === 'Heading Derived')
      ).toBe(true);
      expect(
        latestContext?.notes.some(
          (note) => note.title === 'Plain fallback only'
        )
      ).toBe(true);
    });

    const mentionNote = latestContext?.notes.find(
      (note) => note.content === 'Alex should become linked here.'
    );
    expect(mentionNote?.unlinkedMentions).toEqual([
      expect.objectContaining({
        noteId: alexNote?.id,
        mention: 'Alex',
      }),
    ]);

    latestContext?.convertUnlinkedMentionToLink(
      mentionNote?.id ?? '',
      alexNote?.id ?? '',
      'Alex'
    );

    await waitFor(() => {
      expect(
        latestContext?.notes.find((note) => note.id === mentionNote?.id)
          ?.content
      ).toContain('[[Alex]] should become linked here.');
    });
  });

  it('uses normalized source paths when resolving outgoing links and backlinks', async () => {
    latestContext = undefined;
    const now = Date.now();
    const overviewNote = {
      _id: 'note-overview',
      _ref: 'local|notes|room-notes|note-overview',
      _created: now,
      _updated: now,
      text: '# Overview\n\nImported overview.',
      frontmatter: {},
      tags: [],
      aliases: [],
      folderIds: [],
      wikiLinks: [],
      attachmentRefs: [],
      sourcePath: '  .\\Projects\\Overview.md  ',
      sourceVault: 'feature-vault',
    } as unknown as DbNote;
    const linkingNote = {
      _id: 'note-linking',
      _ref: 'local|notes|room-notes|note-linking',
      _created: now + 1,
      _updated: now + 1,
      text: 'Read [[Projects/Overview]] for details.',
      frontmatter: {},
      tags: [],
      aliases: [],
      folderIds: [],
      wikiLinks: [],
      attachmentRefs: [],
      sourcePath: 'Linking.md',
      sourceVault: 'feature-vault',
    } as unknown as DbNote;
    const docs = new FakeDocuments([overviewNote, linkingNote]);
    const room = createRoom('room-notes', 'Notes', docs);

    dbState = createDbState(room);
    mockUseDb.mockImplementation(() => dbState);
    mockUseFolders.mockReturnValue({
      folders: [],
      createFolder: vi.fn(),
      renameFolder: vi.fn(),
      deleteFolder: vi.fn(),
    });

    render(
      <NotesProvider>
        <Probe />
      </NotesProvider>
    );

    await waitFor(() => {
      expect(latestContext?.notes.length).toBe(2);
    });

    const overview = latestContext?.notes.find(
      (note) => note.id === 'note-overview'
    );
    const linking = latestContext?.notes.find(
      (note) => note.id === 'note-linking'
    );

    expect(overview?.sourcePath).toBe('Projects/Overview.md');
    expect(latestContext?.resolveWikiLink('Projects/Overview')).toBe(
      overview?.id
    );
    expect(linking?.outgoingLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: 'Projects/Overview',
          noteId: overview?.id,
        }),
      ])
    );
    expect(overview?.backlinks).toContain(linking?.id);
  });

  it('keeps templates available and creates today notes in the Daily Notes folder', async () => {
    await renderProviderWithFixtures([
      '09 Daily Notes and Templates.md',
      'Daily Notes/2026-05-04.md',
      'Templates/Daily Review Template.md',
      'Templates/Meeting Template.md',
    ]);

    expect(latestContext?.templates.map((template) => template.name)).toEqual(
      expect.arrayContaining(['Meeting Notes', 'Daily Note'])
    );

    const importedTemplate = {
      name: 'Fixture Meeting Template',
      content: readFeatureVaultFixture('Templates/Meeting Template.md'),
      properties: { source: 'fixture' },
      tags: ['template', 'fixture'],
    } satisfies Partial<Template>;

    latestContext?.addTemplate(importedTemplate);

    await waitFor(() => {
      expect(
        latestContext?.templates.some(
          (template) => template.name === 'Fixture Meeting Template'
        )
      ).toBe(true);
    });

    const today = new Date().toISOString().slice(0, 10);
    const todayNote = latestContext?.getTodayNote();

    await waitFor(() => {
      const created = latestContext?.notes.find(
        (note) => note.id === todayNote?.id
      );
      expect(created?.folder).toBe('daily-folder');
      expect(created?.properties).toMatchObject({
        date: today,
        type: 'daily',
      });
    });
  });
});
