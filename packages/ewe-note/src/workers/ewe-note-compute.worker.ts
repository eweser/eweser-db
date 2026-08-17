import { executeEweNoteComputeTask } from './ewe-note-compute-tasks';
import type {
  EweNoteComputeRequest,
  EweNoteComputeResponse,
} from './ewe-note-compute.protocol';
import { serializeEweNoteWorkerError } from './ewe-note-compute.protocol';

interface EweNoteWorkerScope {
  onmessage: ((event: MessageEvent<EweNoteComputeRequest>) => void) | null;
  postMessage: (message: EweNoteComputeResponse) => void;
}

const workerScope = self as unknown as EweNoteWorkerScope;

workerScope.onmessage = (event) => {
  const request = event.data;
  const startedAt = performance.now();
  try {
    const result = executeEweNoteComputeTask(request);
    workerScope.postMessage({
      kind: request.kind,
      ok: true,
      requestId: request.requestId,
      scope: request.scope,
      version: request.version,
      result,
      workerDuration: performance.now() - startedAt,
    });
  } catch (error) {
    workerScope.postMessage({
      kind: request.kind,
      ok: false,
      requestId: request.requestId,
      scope: request.scope,
      version: request.version,
      error: serializeEweNoteWorkerError(error),
      workerDuration: performance.now() - startedAt,
    });
  }
};
