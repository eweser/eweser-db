/**
 * Note index hook for wiki-link resolution.
 *
 * Builds and maintains a Map<noteName → noteId> from notes in EweserDB,
 * including aliases from frontmatter. Used by wiki-link click handlers
 * to navigate to linked notes.
 */

import { useMemo } from 'react';
import type { Note } from '@eweser/db';

export interface NoteIndexEntry {
  noteId: string;
  noteName: string;
  sourcePath?: string;
  aliases: string[];
}

export type NoteIndex = Map<string, string>; // normalized name → noteId

/**
 * Build a note resolution index from a notes record.
 * Maps both the note title (from frontmatter or filename) and all aliases to noteId.
 */
export function buildNoteIndex(notes: Record<string, Note>): NoteIndex {
  const index = new Map<string, string>();

  for (const [noteId, note] of Object.entries(notes)) {
    if (!note || note._deleted) continue;

    // Index by sourcePath stem (filename without extension)
    if (note.sourcePath) {
      const stem = note.sourcePath.replace(/\.md$/i, '').split('/').pop();
      if (stem) {
        index.set(normalizeKey(stem), noteId);
        // Also index by full path without extension
        index.set(normalizeKey(note.sourcePath.replace(/\.md$/i, '')), noteId);
      }
    }

    // Index by frontmatter title
    const title = note.frontmatter?.['title'];
    if (typeof title === 'string') {
      index.set(normalizeKey(title), noteId);
    }

    // Index by all aliases
    if (note.aliases) {
      for (const alias of note.aliases) {
        index.set(normalizeKey(alias), noteId);
      }
    }
  }

  return index;
}

/**
 * Normalize a note name for index lookup.
 * Case-insensitive, trimmed.
 */
function normalizeKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Look up a wiki-link target in the note index.
 * Returns the noteId or null if not found.
 */
export function resolveWikiLink(
  index: NoteIndex,
  target: string
): string | null {
  return index.get(normalizeKey(target)) ?? null;
}

/**
 * React hook that maintains a note index from the current notes record.
 */
export function useNoteIndex(notes: Record<string, Note> | null): NoteIndex {
  return useMemo(() => {
    if (!notes) return new Map();
    return buildNoteIndex(notes);
  }, [notes]);
}
