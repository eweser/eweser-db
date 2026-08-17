export const EWE_NOTE_PERFORMANCE_SPANS = {
  editorInputRules: 'editor.input-rules',
  editorSlashMenu: 'editor.slash-menu',
  editorSnapshot: 'editor.snapshot',
  editorSerializeMarkdown: 'editor.serialize-markdown',
  editorParseMarkdown: 'editor.parse-markdown',
  notesPersist: 'notes.persist',
  notesRoomRead: 'notes.room-read',
  notesProject: 'notes.project',
  notesLinks: 'notes.links',
  notesTasks: 'notes.tasks',
  notesVaultWriteback: 'notes.vault-writeback',
  notesOutline: 'notes.outline',
  notesUnlinkedMentions: 'notes.unlinked-mentions',
  workerPostMessage: 'worker.post-message',
  workerRoundtrip: 'worker.roundtrip',
  workerUnlinkedMentions: 'worker.unlinked-mentions',
} as const;

export type EweNotePerformanceSpanName =
  (typeof EWE_NOTE_PERFORMANCE_SPANS)[keyof typeof EWE_NOTE_PERFORMANCE_SPANS];

export type EweNotePerformanceThread = 'main' | 'worker';

export interface EweNotePerformanceMetadata {
  inputSize?: number;
  itemCount?: number;
  requestId?: number;
}

export interface EweNotePerformanceRecord extends EweNotePerformanceMetadata {
  blocking: boolean;
  name: EweNotePerformanceSpanName;
  startTime: number;
  duration: number;
  thread: EweNotePerformanceThread;
}

export interface EweNotePerformanceSummary {
  blocking: boolean;
  name: EweNotePerformanceSpanName;
  thread: EweNotePerformanceThread;
  count: number;
  median: number;
  p95: number;
  maximum: number;
}

export interface EweNotePerformanceProbe {
  enabled: boolean;
  records: EweNotePerformanceRecord[];
}

export interface EweNoteSyntheticCorpusOptions {
  targetCount: number;
  bodyParagraphs: number;
}

export interface EweNoteSyntheticCorpusResult extends EweNoteSyntheticCorpusOptions {
  analysisNoteId: string;
}

export interface EweNotePerformanceDriver {
  seedSyntheticCorpus: (
    options: EweNoteSyntheticCorpusOptions
  ) => EweNoteSyntheticCorpusResult;
}

declare global {
  interface Window {
    __EWE_NOTE_PERFORMANCE__?: EweNotePerformanceProbe;
    __EWE_NOTE_PERFORMANCE_DRIVER__?: EweNotePerformanceDriver;
  }
}

function activeProbe(): EweNotePerformanceProbe | null {
  if (typeof window === 'undefined') return null;
  const probe = window.__EWE_NOTE_PERFORMANCE__;
  return probe?.enabled ? probe : null;
}

export function isEweNotePerformanceEnabled(): boolean {
  return activeProbe() !== null;
}

export function recordEweNotePerformance(
  record: EweNotePerformanceRecord
): void {
  const probe = activeProbe();
  if (!probe) return;

  probe.records.push(record);
  try {
    performance.measure(record.name, {
      start: record.startTime,
      duration: record.duration,
      detail: {
        thread: record.thread,
        blocking: record.blocking,
        inputSize: record.inputSize,
        itemCount: record.itemCount,
        requestId: record.requestId,
      },
    });
  } catch {
    // The explicit probe remains authoritative in browsers without measure options.
  }
}

export function measureEweNotePerformance<T>(
  name: EweNotePerformanceSpanName,
  operation: () => T,
  metadata: EweNotePerformanceMetadata = {}
): T {
  if (!isEweNotePerformanceEnabled()) return operation();

  const startTime = performance.now();
  try {
    return operation();
  } finally {
    recordEweNotePerformance({
      name,
      startTime,
      duration: performance.now() - startTime,
      thread: 'main',
      blocking: true,
      ...metadata,
    });
  }
}

export async function measureEweNotePerformanceAsync<T>(
  name: EweNotePerformanceSpanName,
  operation: () => Promise<T>,
  metadata: EweNotePerformanceMetadata = {}
): Promise<T> {
  if (!isEweNotePerformanceEnabled()) return operation();

  const startTime = performance.now();
  try {
    return await operation();
  } finally {
    recordEweNotePerformance({
      name,
      startTime,
      duration: performance.now() - startTime,
      thread: 'main',
      blocking: false,
      ...metadata,
    });
  }
}

function percentile(sorted: readonly number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1)
  );
  return sorted[index] ?? 0;
}

export function summarizeEweNotePerformance(
  records: readonly EweNotePerformanceRecord[]
): EweNotePerformanceSummary[] {
  const groups = new Map<string, EweNotePerformanceRecord[]>();
  for (const record of records) {
    const key = `${record.thread}:${record.blocking}:${record.name}`;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((group) => {
      const first = group[0];
      if (!first) return null;
      const durations = group
        .map((record) => record.duration)
        .sort((a, b) => a - b);
      return {
        name: first.name,
        thread: first.thread,
        blocking: first.blocking,
        count: durations.length,
        median: percentile(durations, 0.5),
        p95: percentile(durations, 0.95),
        maximum: durations[durations.length - 1] ?? 0,
      };
    })
    .filter((summary): summary is EweNotePerformanceSummary => summary !== null)
    .sort((a, b) => b.maximum - a.maximum || a.name.localeCompare(b.name));
}
