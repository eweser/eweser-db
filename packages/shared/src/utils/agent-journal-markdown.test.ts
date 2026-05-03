import { describe, expect, it } from 'vitest';
import {
  exportAgentJournalMarkdown,
  importAgentJournalMarkdown,
} from './agent-journal-markdown.js';
import type { Conversation } from '../collections/conversation.js';

const baseMemory: Conversation = {
  _id: 'memory-1',
  _ref: 'auth|conversations|room-1|memory-1',
  _created: new Date('2026-05-03T00:00:00.000Z').getTime(),
  _updated: new Date('2026-05-03T00:00:00.000Z').getTime(),
  title: 'Keep strategy config user-owned',
  summary:
    'Strategy configuration should live in EweserDB rooms, not only auth PostgreSQL.',
  agentId: 'codex',
  memoryType: 'decision',
  date: '2026-05-03',
  tags: ['architecture'],
  strategy: 'agent-journal',
  captureMode: 'manual',
  scopeType: 'project',
  scopeKey: 'eweser-db',
  reviewStatus: 'accepted',
  aliases: ['Memory strategy decision'],
  relatedDocIds: ['docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md'],
};

describe('Agent Journal Markdown import/export', () => {
  it('exports deterministic Obsidian-compatible Markdown by default', () => {
    const files = exportAgentJournalMarkdown([baseMemory], {
      generatedAt: '2026-05-03T12:00:00.000Z',
      scopeType: 'project',
      scopeKey: 'eweser-db',
    });

    expect(files.map((file) => file.path)).toEqual([
      'MEMORY.md',
      'decisions.md',
      'memory/2026-05-03.md',
      'memory/items/2026-05-03-keep-strategy-config-user-owned.md',
      'projects/eweser-db.md',
    ]);

    const detail = files.find((file) => file.path.startsWith('memory/items/'));
    expect(detail?.content).toContain('type: agent-journal-memory');
    expect(detail?.content).toContain('strategy: agent-journal');
    expect(detail?.content).toContain('captureMode: manual');
    expect(detail?.content).toContain(
      '[[docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md]]'
    );
    expect(detail?.content).toContain('#scope/project/eweser-db');
  });

  it('round-trips supported frontmatter, tags, aliases, and links', () => {
    const files = exportAgentJournalMarkdown([baseMemory], {
      generatedAt: '2026-05-03T12:00:00.000Z',
      scopeType: 'project',
      scopeKey: 'eweser-db',
    });
    const imported = importAgentJournalMarkdown(files);

    expect(imported).toHaveLength(1);
    expect(imported[0]).toEqual(
      expect.objectContaining({
        title: baseMemory.title,
        memoryType: 'decision',
        strategy: 'agent-journal',
        captureMode: 'manual',
        scopeType: 'project',
        scopeKey: 'eweser-db',
      })
    );
    expect(imported[0]?.tags).toContain('architecture');
    expect(imported[0]?.aliases).toContain('Memory strategy decision');
    expect(imported[0]?.relatedDocIds).toContain(
      'docs/ai/plans/2026-04-29-ai-memory-strategy-onboarding.md'
    );
  });

  it('exports json when explicitly requested', () => {
    const files = exportAgentJournalMarkdown([baseMemory], { format: 'json' });
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe('memory.json');
    expect(JSON.parse(files[0]?.content ?? '[]')[0].title).toBe(
      baseMemory.title
    );
  });
});
