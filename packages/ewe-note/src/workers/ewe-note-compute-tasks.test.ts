import { describe, expect, it } from 'vitest';
import { executeEweNoteComputeTask } from './ewe-note-compute-tasks';
import { serializeEweNoteWorkerError } from './ewe-note-compute.protocol';

describe('executeEweNoteComputeTask', () => {
  it('derives unlinked mentions from transferable note data', () => {
    const result = executeEweNoteComputeTask({
      kind: 'derive-unlinked-mentions',
      requestId: 1,
      scope: 'note-analysis:current',
      version: 1,
      noteId: 'current',
      notes: [
        {
          id: 'current',
          title: 'Current note',
          aliases: [],
          sourcePath: 'Current note.md',
          content: 'The worker should find Project Atlas in this note.',
        },
        {
          id: 'project-atlas',
          title: 'Project Atlas',
          aliases: ['Atlas'],
          sourcePath: 'Projects/Project Atlas.md',
          content: '',
        },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({ noteId: 'project-atlas' }),
    ]);
  });

  it('serializes worker failures without exposing arbitrary values', () => {
    expect(serializeEweNoteWorkerError(new Error('expected failure'))).toBe(
      'expected failure'
    );
    expect(serializeEweNoteWorkerError({ private: 'value' })).toBe(
      'Worker task failed'
    );
  });

  it('fails closed for an unsupported runtime task kind', () => {
    expect(() =>
      executeEweNoteComputeTask({
        kind: 'unsupported-task',
      } as unknown as Parameters<typeof executeEweNoteComputeTask>[0])
    ).toThrow('Unsupported Ewe Note compute task');
  });
});
