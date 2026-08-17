import { deriveUnlinkedMentions } from '@/app/contexts/note-analysis';
import type { EweNoteComputeRequest } from './ewe-note-compute.protocol';

export function executeEweNoteComputeTask(request: EweNoteComputeRequest) {
  switch (request.kind) {
    case 'derive-unlinked-mentions':
      return deriveUnlinkedMentions(request.notes, request.noteId);
  }
}
