import type { LinkAnalysisNote } from '@/app/contexts/note-analysis';
import {
  EWE_NOTE_PERFORMANCE_SPANS,
  isEweNotePerformanceEnabled,
  measureEweNotePerformance,
  recordEweNotePerformance,
} from '@/performance/ewe-note-performance';
import { executeEweNoteComputeTask } from './ewe-note-compute-tasks';
import type {
  DeriveUnlinkedMentionsRequest,
  EweNoteComputeRequest,
  EweNoteComputeResponse,
  EweNoteComputeResult,
} from './ewe-note-compute.protocol';

export interface EweNoteWorkerPort {
  onerror: ((event: ErrorEvent) => void) | null;
  onmessage: ((event: MessageEvent<EweNoteComputeResponse>) => void) | null;
  postMessage: (message: EweNoteComputeRequest) => void;
  terminate: () => void;
}

type WorkerFactory = () => EweNoteWorkerPort | null;

type PendingRequest = {
  key: string;
  request: EweNoteComputeRequest;
  resolve: (result: EweNoteComputeResult) => void;
  startedAt: number;
};

export interface DeriveUnlinkedMentionsOptions {
  notes: LinkAnalysisNote[];
  noteId: string;
  scope: string;
  version: number;
}

function createEweNoteWorker(): EweNoteWorkerPort | null {
  if (typeof Worker === 'undefined') return null;
  return new Worker(new URL('./ewe-note-compute.worker.ts', import.meta.url), {
    type: 'module',
  });
}

export class EweNoteComputeClient {
  private worker: EweNoteWorkerPort | null = null;
  private workerCreationFailed = false;
  private requestCounter = 0;
  private readonly pendingById = new Map<number, PendingRequest>();
  private readonly inflightByKey = new Map<
    string,
    Promise<EweNoteComputeResult>
  >();
  private readonly latestVersionByScope = new Map<string, number>();

  constructor(
    private readonly workerFactory: WorkerFactory = createEweNoteWorker
  ) {}

  deriveUnlinkedMentions(
    options: DeriveUnlinkedMentionsOptions
  ): Promise<EweNoteComputeResult> {
    const key = `${options.scope}:${options.version}`;
    const existing = this.inflightByKey.get(key);
    if (existing) return existing;

    this.latestVersionByScope.set(options.scope, options.version);
    const request: DeriveUnlinkedMentionsRequest = {
      kind: 'derive-unlinked-mentions',
      requestId: ++this.requestCounter,
      ...options,
    };
    const worker = this.ensureWorker();
    if (!worker) return Promise.resolve(this.executeFallback(request));

    const promise = new Promise<EweNoteComputeResult>((resolve) => {
      this.pendingById.set(request.requestId, {
        key,
        request,
        resolve,
        startedAt: performance.now(),
      });
      try {
        const inputSize = isEweNotePerformanceEnabled()
          ? request.notes.reduce((size, note) => size + note.content.length, 0)
          : undefined;
        measureEweNotePerformance(
          EWE_NOTE_PERFORMANCE_SPANS.workerPostMessage,
          () => worker.postMessage(request),
          {
            inputSize,
            itemCount: request.notes.length,
            requestId: request.requestId,
          }
        );
      } catch {
        const pending = this.pendingById.get(request.requestId);
        this.pendingById.delete(request.requestId);
        this.resetWorker();
        if (pending) pending.resolve(this.executeFallback(request));
      }
    });

    this.inflightByKey.set(key, promise);
    void promise.then(() => {
      if (this.inflightByKey.get(key) === promise) {
        this.inflightByKey.delete(key);
      }
    });
    return promise;
  }

  terminate(): void {
    const pending = Array.from(this.pendingById.values());
    this.pendingById.clear();
    pending.forEach(({ key }) => this.inflightByKey.delete(key));
    this.resetWorker();
    pending.forEach(({ request, resolve }) =>
      resolve(this.executeFallback(request))
    );
  }

  private ensureWorker(): EweNoteWorkerPort | null {
    if (this.worker) return this.worker;
    if (this.workerCreationFailed) return null;

    try {
      this.worker = this.workerFactory();
      if (!this.worker) {
        this.workerCreationFailed = true;
        return null;
      }
      this.worker.onmessage = (event) => this.handleMessage(event.data);
      this.worker.onerror = () => this.handleWorkerFailure();
      return this.worker;
    } catch {
      this.workerCreationFailed = true;
      return null;
    }
  }

  private handleMessage(response: EweNoteComputeResponse): void {
    const pending = this.pendingById.get(response.requestId);
    if (!pending) return;
    this.pendingById.delete(response.requestId);
    this.inflightByKey.delete(pending.key);

    recordEweNotePerformance({
      name: EWE_NOTE_PERFORMANCE_SPANS.workerUnlinkedMentions,
      startTime: Math.max(0, performance.now() - response.workerDuration),
      duration: response.workerDuration,
      thread: 'worker',
      blocking: false,
      itemCount: pending.request.notes.length,
      requestId: response.requestId,
    });
    recordEweNotePerformance({
      name: EWE_NOTE_PERFORMANCE_SPANS.workerRoundtrip,
      startTime: pending.startedAt,
      duration: performance.now() - pending.startedAt,
      thread: 'main',
      blocking: false,
      itemCount: pending.request.notes.length,
      requestId: response.requestId,
    });

    if (!response.ok) {
      pending.resolve(this.executeFallback(pending.request));
      return;
    }
    pending.resolve({
      requestId: response.requestId,
      result: response.result,
      stale: this.isStale(pending.request),
      usedFallback: false,
    });
  }

  private handleWorkerFailure(): void {
    const pending = Array.from(this.pendingById.values());
    this.pendingById.clear();
    pending.forEach(({ key }) => this.inflightByKey.delete(key));
    this.resetWorker();
    pending.forEach(({ request, resolve }) =>
      resolve(this.executeFallback(request))
    );
  }

  private executeFallback(
    request: EweNoteComputeRequest
  ): EweNoteComputeResult {
    const result = measureEweNotePerformance(
      EWE_NOTE_PERFORMANCE_SPANS.notesUnlinkedMentions,
      () => executeEweNoteComputeTask(request),
      { itemCount: request.notes.length, requestId: request.requestId }
    );
    return {
      requestId: request.requestId,
      result,
      stale: this.isStale(request),
      usedFallback: true,
    };
  }

  private isStale(request: EweNoteComputeRequest): boolean {
    return this.latestVersionByScope.get(request.scope) !== request.version;
  }

  private resetWorker(): void {
    this.worker?.terminate();
    this.worker = null;
    this.workerCreationFailed = false;
  }
}

let sharedClient: EweNoteComputeClient | null = null;

export function getEweNoteComputeClient(): EweNoteComputeClient {
  sharedClient ??= new EweNoteComputeClient();
  return sharedClient;
}
