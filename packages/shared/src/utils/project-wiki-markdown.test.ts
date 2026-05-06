import { describe, expect, it } from 'vitest';
import { exportProjectWikiMarkdown } from './project-wiki-markdown.js';
import type { ProjectWikiPage } from '../collections/project-wiki-page.js';

function makePage(
  id: string,
  overrides: Partial<ProjectWikiPage> = {}
): ProjectWikiPage {
  return {
    _created: Date.parse('2026-05-06T00:00:00.000Z'),
    _id: id,
    _ref: `projectWikiPages.room.${id}`,
    _updated: Date.parse('2026-05-06T00:00:00.000Z'),
    content: '# Overview\n',
    format: 'markdown',
    lastAcceptedDraftId: 'draft-1',
    pageKind: 'overview',
    provenance: {
      generatedAt: '2026-05-06T00:00:00.000Z',
      generationStrategy: 'deterministic-project-wiki-v1',
    },
    reviewStatus: 'accepted',
    scopeKey: 'eweser-db',
    scopeType: 'project',
    slug: 'overview',
    sourceMemoryIds: ['memory-1'],
    sourceRefs: ['notes.room.doc'],
    title: 'Overview',
    ...overrides,
  };
}

describe('exportProjectWikiMarkdown', () => {
  it('exports accepted pages to stable markdown files with provenance frontmatter', () => {
    const files = exportProjectWikiMarkdown(
      [
        makePage('page-1'),
        makePage('page-2', {
          content: '# Decisions\n',
          pageKind: 'decisions',
          slug: 'decisions',
          title: 'Decisions',
        }),
      ],
      {
        generatedAt: '2026-05-06T00:00:00.000Z',
      }
    );

    expect(files.map((file) => file.path)).toEqual([
      'PROJECT_WIKI.md',
      'wiki/decisions.md',
      'wiki/overview.md',
    ]);
    expect(files[0]?.content).toContain('type: project-wiki-index');
    expect(files[1]?.content).toContain('strategy: project-wiki');
    expect(files[1]?.content).toContain('sourceMemoryIds:');
    expect(files[1]?.content).toContain('notes.room.doc');
  });

  it('keeps repeated exports stable for the same inputs', () => {
    const pages = [makePage('page-1')];
    const options = {
      generatedAt: '2026-05-06T00:00:00.000Z',
    } as const;

    expect(exportProjectWikiMarkdown(pages, options)).toEqual(
      exportProjectWikiMarkdown(pages, options)
    );
  });
});
