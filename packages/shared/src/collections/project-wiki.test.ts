import { describe, expect, it } from 'vitest';
import { COLLECTION_KEYS } from './index.js';
import type { ProjectWikiDraft } from './project-wiki-draft.js';
import type { ProjectWikiPage } from './project-wiki-page.js';

describe('project wiki collections', () => {
  it('registers project wiki collection keys', () => {
    expect(COLLECTION_KEYS).toContain('projectWikiPages');
    expect(COLLECTION_KEYS).toContain('projectWikiDrafts');
  });

  it('accepts canonical page documents', () => {
    const page: Omit<
      ProjectWikiPage,
      '_id' | '_ref' | '_created' | '_updated'
    > = {
      scopeType: 'project',
      scopeKey: 'eweser-db',
      slug: 'overview',
      title: 'Overview',
      pageKind: 'overview',
      format: 'markdown',
      content: '# Overview',
      sourceMemoryIds: ['memory-1'],
      sourceRefs: ['notes.room.doc'],
      reviewStatus: 'accepted',
      provenance: {
        generatedAt: '2026-05-06T00:00:00.000Z',
        generationStrategy: 'deterministic-project-wiki-v1',
      },
      lastAcceptedDraftId: 'draft-1',
    };

    expect(page.pageKind).toBe('overview');
    expect(page.reviewStatus).toBe('accepted');
  });

  it('accepts derived draft documents', () => {
    const draft: Omit<
      ProjectWikiDraft,
      '_id' | '_ref' | '_created' | '_updated'
    > = {
      scopeType: 'project',
      scopeKey: 'eweser-db',
      pageSlug: 'decisions',
      title: 'Decisions',
      pageKind: 'decisions',
      format: 'markdown',
      proposedContent: '# Decisions',
      sourceMemoryIds: ['memory-1'],
      reviewStatus: 'pending',
      provenance: {
        generatedAt: '2026-05-06T00:00:00.000Z',
        generationStrategy: 'deterministic-project-wiki-v1',
      },
    };

    expect(draft.pageKind).toBe('decisions');
    expect(draft.reviewStatus).toBe('pending');
  });
});
