import { useEffect, useRef, useState } from 'react';
import type { UnlinkedMention } from '@/app/contexts/note-links';
import {
  toLinkAnalysisNotes,
  type LinkAnalysisNote,
} from '@/app/contexts/note-analysis';
import type { Note } from '@/app/contexts/NotesContext';
import { getEweNoteComputeClient } from '@/workers/ewe-note-compute-client';

const notesVersions = new WeakMap<readonly Note[], number>();
let nextNotesVersion = 0;

function getNotesVersion(notes: readonly Note[]): number {
  const existing = notesVersions.get(notes);
  if (existing !== undefined) return existing;
  const version = ++nextNotesVersion;
  notesVersions.set(notes, version);
  return version;
}

type UnlinkedMentionsState = {
  mentions: UnlinkedMention[];
  noteId: string;
  version: number;
};

export function useUnlinkedMentions(
  notes: readonly Note[],
  noteId: string,
  enabled: boolean
): UnlinkedMention[] {
  const [state, setState] = useState<UnlinkedMentionsState | null>(null);
  const latestStateRef = useRef(state);
  latestStateRef.current = state;

  useEffect(() => {
    if (!enabled) return;
    const version = getNotesVersion(notes);
    if (
      latestStateRef.current?.noteId === noteId &&
      latestStateRef.current.version === version
    ) {
      return;
    }

    let active = true;
    const analysisNotes: LinkAnalysisNote[] = toLinkAnalysisNotes(notes);
    void getEweNoteComputeClient()
      .deriveUnlinkedMentions({
        notes: analysisNotes,
        noteId,
        scope: `unlinked-mentions:${noteId}`,
        version,
      })
      .then((response) => {
        if (!active || response.stale) return;
        setState({ mentions: response.result, noteId, version });
      });

    return () => {
      active = false;
    };
  }, [enabled, noteId, notes]);

  return state?.noteId === noteId ? state.mentions : [];
}
