import type { MemoryExportFormat } from '../collections/memory-strategy.js';
import type { ProjectWikiPage } from '../collections/project-wiki-page.js';
import { serializeFrontmatter } from './obsidian-markdown.js';

export interface ProjectWikiMarkdownFile {
  path: string;
  content: string;
}

export interface ProjectWikiMarkdownExportOptions {
  format?: Extract<MemoryExportFormat, 'obsidian' | 'markdown' | 'json'>;
  generatedAt?: string;
  scopeKey?: string;
}

export function exportProjectWikiMarkdown(
  pages: Array<ProjectWikiPage | (ProjectWikiPage & Record<string, unknown>)>,
  options: ProjectWikiMarkdownExportOptions = {}
): ProjectWikiMarkdownFile[] {
  const format = options.format ?? 'obsidian';
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const acceptedPages = pages
    .filter(
      (page) =>
        !page._deleted && page.reviewStatus === 'accepted' && !page._deleted
    )
    .slice()
    .sort(comparePages);

  if (format === 'json') {
    return [
      {
        path: 'project-wiki.json',
        content: `${JSON.stringify(acceptedPages, null, 2)}\n`,
      },
    ];
  }

  const scopeKey =
    options.scopeKey ?? acceptedPages[0]?.scopeKey ?? 'project-wiki';
  const files = acceptedPages.map((page) => ({
    path: `wiki/${slugify(page.slug)}.md`,
    content: serializeFrontmatter(
      {
        title: page.title,
        type: 'project-wiki-page',
        strategy: 'project-wiki',
        scopeType: page.scopeType,
        scopeKey: page.scopeKey,
        pageKind: page.pageKind,
        reviewStatus: page.reviewStatus,
        sourceMemoryIds: page.sourceMemoryIds,
        sourceRefs: page.sourceRefs ?? [],
        lastAcceptedDraftId: page.lastAcceptedDraftId,
        provenance: JSON.stringify(page.provenance ?? {}),
        exportFormat: format,
        createdAt: new Date(page._created).toISOString(),
        updatedAt: new Date(page._updated).toISOString(),
      },
      `${page.content.trim()}\n`
    ),
  }));

  return [
    {
      path: 'PROJECT_WIKI.md',
      content: serializeFrontmatter(
        {
          title: 'Project Wiki',
          type: 'project-wiki-index',
          strategy: 'project-wiki',
          scopeType: 'project',
          scopeKey,
          exportFormat: format,
          generatedAt,
        },
        [
          '# Project Wiki',
          '',
          `Generated: ${generatedAt}`,
          '',
          ...acceptedPages.map(
            (page) => `- [[${slugify(page.slug)}|${page.title}]]`
          ),
          '',
        ].join('\n')
      ),
    },
    ...files,
  ].sort(compareFiles);
}

function comparePages(a: ProjectWikiPage, b: ProjectWikiPage): number {
  return `${a.pageKind}:${a.slug}:${a._id}`.localeCompare(
    `${b.pageKind}:${b.slug}:${b._id}`
  );
}

function compareFiles(
  a: ProjectWikiMarkdownFile,
  b: ProjectWikiMarkdownFile
): number {
  if (a.path === 'PROJECT_WIKI.md') return -1;
  if (b.path === 'PROJECT_WIKI.md') return 1;
  return a.path.localeCompare(b.path);
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[/\\]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_.]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}
