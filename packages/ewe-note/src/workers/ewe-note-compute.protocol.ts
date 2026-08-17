import type { UnlinkedMention } from '@/app/contexts/note-links';
import type { LinkAnalysisNote } from '@/app/contexts/note-analysis';

export interface DeriveUnlinkedMentionsRequest {
  kind: 'derive-unlinked-mentions';
  requestId: number;
  scope: string;
  version: number;
  notes: LinkAnalysisNote[];
  noteId: string;
}

export type EweNoteComputeRequest = DeriveUnlinkedMentionsRequest;

export interface EweNoteComputeSuccess {
  kind: EweNoteComputeRequest['kind'];
  ok: true;
  requestId: number;
  scope: string;
  version: number;
  result: UnlinkedMention[];
  workerDuration: number;
}

export interface EweNoteComputeFailure {
  kind: EweNoteComputeRequest['kind'];
  ok: false;
  requestId: number;
  scope: string;
  version: number;
  error: string;
  workerDuration: number;
}

export type EweNoteComputeResponse =
  | EweNoteComputeSuccess
  | EweNoteComputeFailure;

export interface EweNoteComputeResult {
  requestId: number;
  result: UnlinkedMention[];
  stale: boolean;
  usedFallback: boolean;
}

export function serializeEweNoteWorkerError(error: unknown): string {
  return error instanceof Error ? error.message : 'Worker task failed';
}
