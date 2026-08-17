// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Note } from '@/app/contexts/NotesContext';
import type { EweNoteComputeResult } from '@/workers/ewe-note-compute.protocol';
import { useUnlinkedMentions } from './use-unlinked-mentions';

const mockDeriveUnlinkedMentions = vi.hoisted(() => vi.fn());

vi.mock('@/workers/ewe-note-compute-client', () => ({
  getEweNoteComputeClient: () => ({
    deriveUnlinkedMentions: mockDeriveUnlinkedMentions,
  }),
}));

function deferredResult() {
  let resolve!: (value: EweNoteComputeResult) => void;
  const promise = new Promise<EweNoteComputeResult>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function notes(content: string) {
  return [
    {
      id: 'current',
      title: 'Current',
      aliases: [],
      sourcePath: 'Current.md',
      content,
    },
    {
      id: 'target',
      title: 'Target note',
      aliases: [],
      sourcePath: 'Target note.md',
      content: '',
    },
  ] as unknown as Note[];
}

const firstMention = {
  noteId: 'target',
  mention: 'Target note',
  start: 0,
  end: 11,
};

describe('useUnlinkedMentions', () => {
  afterEach(() => {
    cleanup();
    mockDeriveUnlinkedMentions.mockReset();
  });

  it('retains the last valid result and ignores a stale replacement', async () => {
    const first = deferredResult();
    const second = deferredResult();
    const stale = deferredResult();
    mockDeriveUnlinkedMentions
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(stale.promise);

    const initialNotes = notes('Target note');
    const { result, rerender } = renderHook(
      ({ currentNotes }) => useUnlinkedMentions(currentNotes, 'current', true),
      { initialProps: { currentNotes: initialNotes } }
    );

    await act(async () => {
      first.resolve({
        requestId: 1,
        result: [firstMention],
        stale: false,
        usedFallback: false,
      });
      await first.promise;
    });
    await waitFor(() => expect(result.current).toEqual([firstMention]));

    rerender({ currentNotes: notes('Target note changed') });
    expect(result.current).toEqual([firstMention]);
    await act(async () => {
      second.resolve({
        requestId: 2,
        result: [{ ...firstMention, mention: 'Target note changed' }],
        stale: false,
        usedFallback: false,
      });
      await second.promise;
    });
    await waitFor(() =>
      expect(result.current[0]?.mention).toBe('Target note changed')
    );

    rerender({ currentNotes: notes('obsolete') });
    await act(async () => {
      stale.resolve({
        requestId: 3,
        result: [{ ...firstMention, mention: 'obsolete' }],
        stale: true,
        usedFallback: false,
      });
      await stale.promise;
    });
    expect(result.current[0]?.mention).toBe('Target note changed');
  });
});
