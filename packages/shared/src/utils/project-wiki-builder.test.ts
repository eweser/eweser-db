import { describe, expect, it } from 'vitest';
import { buildProjectWikiDrafts } from './project-wiki-builder.js';
import type { Conversation } from '../collections/conversation.js';

const baseMemory = {
  _created: Date.parse('2026-05-01T00:00:00.000Z'),
  _deleted: false,
  _id: 'memory-1',
  _ref: 'conversations.room.memory-1',
  _updated: Date.parse('2026-05-01T00:00:00.000Z'),
  agentId: 'codex',
  captureMode: 'manual' as const,
  date: '2026-05-01',
  memoryType: 'memory' as const,
  reviewStatus: 'accepted' as const,
  scopeKey: 'eweser-db',
  scopeType: 'project' as const,
  sourceMemoryIds: [],
  strategy: 'project-wiki' as const,
  tags: ['research'],
  title: 'Shared context',
  summary: 'The project wiki should stay source-backed.',
};

function makeMemory(
  id: string,
  overrides: Partial<Conversation> = {}
): Conversation {
  return {
    ...baseMemory,
    _id: id,
    _ref: `conversations.room.${id}`,
    ...overrides,
  } as Conversation;
}

describe('buildProjectWikiDrafts', () => {
  it('builds deterministic overview, decisions, active-questions, and source-index drafts', () => {
    const memories = [
      makeMemory('memory-2', {
        date: '2026-05-02',
        memoryType: 'decision',
        summary: 'Use dedicated page and draft collections.',
        title: 'Collection decision',
      }),
      makeMemory('memory-3', {
        date: '2026-05-03',
        summary: 'Which source rooms should the wiki read first?',
        tags: ['open-question'],
        title: 'Source-room question',
      }),
      makeMemory('memory-1'),
    ];

    const drafts = buildProjectWikiDrafts(memories, {
      generatedAt: '2026-05-06T00:00:00.000Z',
      generatorId: 'codex',
      scopeKey: 'eweser-db',
    });

    expect(drafts.map((draft) => draft.pageSlug)).toEqual([
      'overview',
      'decisions',
      'active-questions',
      'source-index',
    ]);
    expect(drafts[0]?.sourceMemoryIds).toEqual([
      'memory-1',
      'memory-2',
      'memory-3',
    ]);
    expect(drafts[1]?.sourceMemoryIds).toEqual(['memory-2']);
    expect(drafts[2]?.sourceMemoryIds).toEqual(['memory-3']);
    expect(drafts[0]?.proposedContent).toContain(
      'The project wiki should stay source-backed.'
    );
    expect(drafts[3]?.proposedContent).toContain('| 2026-05-02 | decision |');
  });

  it('keeps repeated runs stable for the same inputs', () => {
    const memories = [
      makeMemory('memory-1'),
      makeMemory('memory-2', {
        memoryType: 'decision',
        summary: 'Use deterministic builders.',
        title: 'Builder decision',
      }),
    ];

    const options = {
      generatedAt: '2026-05-06T00:00:00.000Z',
      generatorId: 'codex',
      scopeKey: 'eweser-db',
    } as const;

    expect(buildProjectWikiDrafts(memories, options)).toEqual(
      buildProjectWikiDrafts(memories, options)
    );
  });
});
