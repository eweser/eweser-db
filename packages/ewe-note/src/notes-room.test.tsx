// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import type { GetDocuments, Note, Room } from '@eweser/db';
import { describe, expect, it, vi } from 'vitest';
import { useNotesRoom } from './notes-room';

const mockUseDb = vi.fn();

vi.mock('./db', () => ({
  defaultNoteId: 'default-note',
  useDb: () => mockUseDb(),
}));

function buildNote(id: string): Note {
  const now = Date.now();
  return {
    _id: id,
    _ref: `local|notes|room-notes|${id}`,
    _created: now,
    _updated: now,
    _deleted: false,
    text: `# ${id}`,
  };
}

describe('useNotesRoom', () => {
  it('refreshes notes after subscribing so a creation during mount is not missed', async () => {
    const existingNote = buildNote('existing-note');
    const createdNote = buildNote('created-during-subscription');
    let records: Record<string, Note> = {
      [existingNote._id]: existingNote,
    };
    const unobserve = vi.fn();
    const documents = {
      unobserve,
    };
    const sortByRecent = vi.fn((notes: Record<string, Note>) => notes);

    const Notes = {
      documents,
      getUndeleted: () => records,
      sortByRecent,
      onChange: vi.fn(() => {
        records = { ...records, [createdNote._id]: createdNote };
      }),
    } as unknown as GetDocuments<Note>;
    const room = {
      id: 'room-notes',
      getDocuments: () => Notes,
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Room<Note>;

    mockUseDb.mockReturnValue({
      db: { getRoom: () => room },
      setSelectedNoteId: vi.fn(),
    });

    let visibleNotes: Record<string, Note> | null = null;
    function Probe() {
      visibleNotes = useNotesRoom(room.id).notes;
      return null;
    }

    const view = render(<Probe />);

    await waitFor(() => {
      expect(visibleNotes?.[createdNote._id]).toEqual(createdNote);
    });
    expect(sortByRecent).toHaveBeenLastCalledWith(records);

    view.unmount();
    expect(unobserve).toHaveBeenCalledOnce();
  });
});
