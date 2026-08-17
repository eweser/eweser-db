import {
  extractUnlinkedMentions,
  extractWikiLinkTargets,
  getNormalizedWikiTargetEntries,
  getNormalizedWikiTargetKeys,
  getSourcePathTargets,
  normalizeWikiTarget,
  type UnlinkedMention,
} from './note-links';
import type { Note } from './NotesContext';

export type LinkAnalysisNote = Pick<
  Note,
  'aliases' | 'content' | 'id' | 'sourcePath' | 'title'
>;

export type ResolvableTargetValue =
  | string
  | { noteId: string; mention: string };

export type ResolvableTargets = {
  candidates: Map<string, ResolvableTargetValue>;
  mentionsByNoteId: Map<string, Set<string>>;
};

export function toLinkAnalysisNotes(
  notes: readonly LinkAnalysisNote[]
): LinkAnalysisNote[] {
  return notes.map(({ aliases, content, id, sourcePath, title }) => ({
    aliases,
    content,
    id,
    sourcePath,
    title,
  }));
}

export function buildResolvableTargets(
  notes: readonly LinkAnalysisNote[]
): ResolvableTargets {
  const targets = new Map<string, { noteId: string; mention: string }>();
  const mentionsByNoteId = new Map<string, Set<string>>();

  for (const note of notes) {
    const noteMentions = mentionsByNoteId.get(note.id) ?? new Set<string>();
    const addTarget = (target: string, mention = target) => {
      for (const entry of getNormalizedWikiTargetEntries(target)) {
        const normalizedTarget = entry.key;
        noteMentions.add(normalizedTarget);
        if (!targets.has(normalizedTarget)) {
          targets.set(normalizedTarget, {
            noteId: note.id,
            mention: mention === target ? entry.mention : mention,
          });
        }
      }
    };

    addTarget(note.title, note.title);

    for (const sourcePathTarget of getSourcePathTargets(note.sourcePath)) {
      addTarget(sourcePathTarget, sourcePathTarget);
    }

    for (const alias of note.aliases) {
      addTarget(alias, alias);
    }

    mentionsByNoteId.set(note.id, noteMentions);
  }

  return { candidates: targets, mentionsByNoteId };
}

export function normalizeResolvableTargets(
  resolvableTargets:
    | ResolvableTargets['candidates']
    | Record<string, ResolvableTargetValue>
    | null
    | undefined
): Map<string, ResolvableTargetValue> {
  if (resolvableTargets instanceof Map) return resolvableTargets;

  if (
    !resolvableTargets ||
    typeof resolvableTargets !== 'object' ||
    Array.isArray(resolvableTargets)
  ) {
    return new Map();
  }

  return new Map<string, ResolvableTargetValue>(
    Object.entries(resolvableTargets as Record<string, ResolvableTargetValue>)
  );
}

function resolveTargetId(
  resolvableTargets: Map<string, ResolvableTargetValue>,
  target: string
) {
  for (const targetKey of getNormalizedWikiTargetKeys(target)) {
    const candidate = resolvableTargets.get(targetKey);
    if (typeof candidate === 'string') return candidate;
    if (candidate?.noteId) return candidate.noteId;
  }

  return null;
}

export function buildOutboundLinks(
  note: Pick<LinkAnalysisNote, 'content'>,
  resolvableTargets: Map<string, ResolvableTargetValue>
) {
  const raw = extractWikiLinkTargets(note.content);
  const seen = new Set<string>();

  const outgoingLinks = raw.map((entry) => ({
    ...entry,
    noteId: entry.noteId ?? resolveTargetId(resolvableTargets, entry.target),
    raw: entry.raw,
  }));

  const deduped = outgoingLinks.filter((link) => {
    const key = `${link.target}|${link.heading ?? ''}|${link.blockRef ?? ''}|${
      link.alias ?? ''
    }`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const linkedIds = deduped
    .map((link) => link.noteId)
    .filter(Boolean) as string[];

  return {
    outgoingLinks: deduped,
    linkedIds: Array.from(new Set(linkedIds)),
  };
}

function extractUnlinkedMentionsForNote(
  note: LinkAnalysisNote,
  resolvableTargets: Map<string, ResolvableTargetValue>,
  outgoingTargets: Set<string>
) {
  const normalizedTargets = normalizeResolvableTargets(resolvableTargets);
  const excluded = new Set([
    normalizeWikiTarget(note.title),
    ...note.aliases.map(normalizeWikiTarget),
    ...outgoingTargets,
  ]);

  const candidateEntries = Array.from(normalizedTargets.entries()).filter(
    ([, entry]) => {
      const targetNoteId =
        typeof entry === 'string' ? entry : (entry?.noteId ?? null);
      return targetNoteId !== note.id;
    }
  );
  return extractUnlinkedMentions(
    note.content,
    Object.fromEntries(candidateEntries),
    excluded
  );
}

export function deriveUnlinkedMentions(
  notes: readonly LinkAnalysisNote[],
  noteId: string
): UnlinkedMention[] {
  const note = notes.find((candidate) => candidate.id === noteId);
  if (!note) return [];

  const resolvableTargets = buildResolvableTargets(notes);
  const normalizedCandidates = normalizeResolvableTargets(
    resolvableTargets.candidates
  );
  const { linkedIds } = buildOutboundLinks(note, normalizedCandidates);
  const outgoingTargetSet = new Set<string>(
    linkedIds.flatMap((id) =>
      Array.from(resolvableTargets.mentionsByNoteId.get(id) ?? [])
    )
  );

  return extractUnlinkedMentionsForNote(
    note,
    normalizedCandidates,
    outgoingTargetSet
  );
}
