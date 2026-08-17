import { deriveUnlinkedMentions } from '@/app/contexts/note-analysis';
import type { UnlinkedMention } from '@/app/contexts/note-links';
import type { EweNoteComputeRequest } from './ewe-note-compute.protocol';

export function executeEweNoteComputeTask(
  request: EweNoteComputeRequest
): UnlinkedMention[] {
  switch (request.kind) {
    case 'derive-unlinked-mentions':
      return deriveUnlinkedMentions(request.notes, request.noteId);
    default:
      throw new Error('Unsupported Ewe Note compute task');
  }
}
