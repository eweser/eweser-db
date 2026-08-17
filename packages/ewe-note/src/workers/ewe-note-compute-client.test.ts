// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UnlinkedMention } from '@/app/contexts/note-links';
import {
  EweNoteComputeClient,
  type EweNoteWorkerPort,
} from './ewe-note-compute-client';
import type {
  EweNoteComputeRequest,
  EweNoteComputeResponse,
} from './ewe-note-compute.protocol';

class FakeWorker implements EweNoteWorkerPort {
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<EweNoteComputeResponse>) => void) | null =
    null;
  readonly requests: EweNoteComputeRequest[] = [];
  terminate = vi.fn();

  postMessage(message: EweNoteComputeRequest) {
    this.requests.push(message);
  }

  respond(index: number, result: UnlinkedMention[] = []) {
    const request = this.requests[index];
    if (!request) throw new Error(`Missing worker request ${index}`);
    this.onmessage?.({
      data: {
        kind: request.kind,
        ok: true,
        requestId: request.requestId,
        scope: request.scope,
        version: request.version,
        result,
        workerDuration: 12,
      },
    } as MessageEvent<EweNoteComputeResponse>);
  }
}

const notes = [
  {
    id: 'current',
    title: 'Current note',
    aliases: [],
    sourcePath: 'Current note.md',
    content: 'Project Atlas',
  },
  {
    id: 'project-atlas',
    title: 'Project Atlas',
    aliases: [],
    sourcePath: 'Project Atlas.md',
    content: '',
  },
];

describe('EweNoteComputeClient', () => {
  afterEach(() => {
    delete window.__EWE_NOTE_PERFORMANCE__;
  });

  it('deduplicates matching in-flight work', async () => {
    const worker = new FakeWorker();
    const client = new EweNoteComputeClient(() => worker);
    const options = {
      notes,
      noteId: 'current',
      scope: 'unlinked-mentions:current',
      version: 1,
    };

    const first = client.deriveUnlinkedMentions(options);
    const duplicate = client.deriveUnlinkedMentions(options);

    expect(duplicate).toBe(first);
    expect(worker.requests).toHaveLength(1);
    worker.respond(0, [
      {
        noteId: 'project-atlas',
        mention: 'Project Atlas',
        start: 0,
        end: 13,
      },
    ]);
    await expect(first).resolves.toMatchObject({
      stale: false,
      usedFallback: false,
      result: [expect.objectContaining({ noteId: 'project-atlas' })],
    });
  });

  it('marks superseded responses stale within the same scope', async () => {
    const worker = new FakeWorker();
    const client = new EweNoteComputeClient(() => worker);
    const first = client.deriveUnlinkedMentions({
      notes,
      noteId: 'current',
      scope: 'unlinked-mentions:current',
      version: 1,
    });
    const second = client.deriveUnlinkedMentions({
      notes,
      noteId: 'current',
      scope: 'unlinked-mentions:current',
      version: 2,
    });

    worker.respond(0);
    worker.respond(1);

    await expect(first).resolves.toMatchObject({ stale: true });
    await expect(second).resolves.toMatchObject({ stale: false });
  });

  it('falls back safely and clears failed in-flight work', async () => {
    const worker = new FakeWorker();
    worker.postMessage = vi.fn(() => {
      throw new Error('worker unavailable');
    });
    const client = new EweNoteComputeClient(() => worker);
    const options = {
      notes,
      noteId: 'current',
      scope: 'unlinked-mentions:current',
      version: 1,
    };

    await expect(client.deriveUnlinkedMentions(options)).resolves.toMatchObject(
      {
        stale: false,
        usedFallback: true,
        result: [expect.objectContaining({ noteId: 'project-atlas' })],
      }
    );
    await client.deriveUnlinkedMentions(options);

    expect(worker.postMessage).toHaveBeenCalledTimes(2);
  });

  it('terminates pending work with fallback and recreates lazily', async () => {
    const firstWorker = new FakeWorker();
    const secondWorker = new FakeWorker();
    const workers = [firstWorker, secondWorker];
    const factory = vi.fn(() => workers.shift() ?? null);
    const client = new EweNoteComputeClient(factory);
    const pending = client.deriveUnlinkedMentions({
      notes,
      noteId: 'current',
      scope: 'unlinked-mentions:current',
      version: 1,
    });

    client.terminate();
    await expect(pending).resolves.toMatchObject({ usedFallback: true });
    expect(firstWorker.terminate).toHaveBeenCalledOnce();

    const recreated = client.deriveUnlinkedMentions({
      notes,
      noteId: 'current',
      scope: 'unlinked-mentions:current',
      version: 2,
    });
    expect(factory).toHaveBeenCalledTimes(2);
    secondWorker.respond(0);
    await expect(recreated).resolves.toMatchObject({
      stale: false,
      usedFallback: false,
    });
  });
});
