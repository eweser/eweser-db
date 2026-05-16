import type { Conversation } from '../collections/conversation.js';
import type { ProjectWikiDraftBase } from '../collections/project-wiki-draft.js';
import type { ProjectWikiPageKind } from '../collections/project-wiki-page.js';

export interface ProjectWikiBuildOptions {
  generatedAt?: string;
  generatorId?: string;
  scopeKey: string;
  targetPageIds?: Partial<Record<ProjectWikiPageKind, string>>;
}

type SourceMemory = Conversation | (Conversation & Record<string, unknown>);

const PAGE_ORDER: ProjectWikiPageKind[] = [
  'overview',
  'decisions',
  'active-questions',
  'source-index',
];

export function buildProjectWikiDrafts(
  memories: SourceMemory[],
  options: ProjectWikiBuildOptions
): Array<Omit<ProjectWikiDraftBase, 'reviewStatus'>> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sorted = memories
    .filter(
      (memory) =>
        !memory._deleted &&
        memory.reviewStatus !== 'rejected' &&
        memory.reviewStatus !== 'redacted'
    )
    .slice()
    .sort(compareMemories);

  return PAGE_ORDER.map((pageKind) =>
    buildDraftForKind(pageKind, sorted, {
      generatedAt,
      scopeKey: options.scopeKey,
      ...(options.generatorId ? { generatorId: options.generatorId } : {}),
      ...(options.targetPageIds?.[pageKind]
        ? { targetPageId: options.targetPageIds[pageKind] }
        : {}),
    })
  );
}

function buildDraftForKind(
  pageKind: ProjectWikiPageKind,
  memories: SourceMemory[],
  options: {
    generatedAt: string;
    generatorId?: string;
    scopeKey: string;
    targetPageId?: string;
  }
): Omit<ProjectWikiDraftBase, 'reviewStatus'> {
  const relevantMemories = selectRelevantMemories(pageKind, memories);
  const title = titleForPageKind(pageKind);
  return {
    scopeType: 'project',
    scopeKey: options.scopeKey,
    pageSlug: slugForPageKind(pageKind),
    title,
    pageKind,
    format: 'markdown',
    proposedContent: contentForPageKind(pageKind, relevantMemories, {
      scopeKey: options.scopeKey,
    }),
    sourceMemoryIds: relevantMemories.map((memory) => memory._id),
    sourceRefs: collectSourceRefs(relevantMemories),
    provenance: {
      generatedAt: options.generatedAt,
      generationStrategy: 'deterministic-project-wiki-v1',
      ...(options.generatorId ? { generatorId: options.generatorId } : {}),
    },
    ...(options.targetPageId ? { targetPageId: options.targetPageId } : {}),
  };
}

function selectRelevantMemories(
  pageKind: ProjectWikiPageKind,
  memories: SourceMemory[]
): SourceMemory[] {
  switch (pageKind) {
    case 'decisions':
      return memories.filter((memory) => memory.memoryType === 'decision');
    case 'active-questions':
      return memories.filter(isActiveQuestionMemory);
    case 'overview':
    case 'source-index':
    case 'custom':
      return memories;
  }
}

function contentForPageKind(
  pageKind: ProjectWikiPageKind,
  memories: SourceMemory[],
  options: { scopeKey: string }
): string {
  switch (pageKind) {
    case 'overview':
      return buildOverviewContent(memories, options.scopeKey);
    case 'decisions':
      return buildDecisionsContent(memories);
    case 'active-questions':
      return buildActiveQuestionsContent(memories);
    case 'source-index':
      return buildSourceIndexContent(memories);
    case 'custom':
      return '# Custom\n';
  }
}

function buildOverviewContent(
  memories: SourceMemory[],
  scopeKey: string
): string {
  const dates = memories.map((memory) => memory.date).filter(Boolean);
  const dateRange =
    dates.length > 0
      ? `${dates[0]} to ${dates[dates.length - 1]}`
      : 'No dated source memories';
  const lines = [
    '# Overview',
    '',
    '## Scope',
    '',
    `- Project: ${scopeKey}`,
    `- Source memories: ${memories.length}`,
    `- Date range: ${dateRange}`,
    '',
    '## Source-backed notes',
    '',
  ];

  if (memories.length === 0) {
    lines.push('No approved source memories were available.');
    lines.push('');
    return lines.join('\n');
  }

  for (const memory of memories) {
    lines.push(formatMemoryBullet(memory));
  }
  lines.push('');
  return lines.join('\n');
}

function buildDecisionsContent(memories: SourceMemory[]): string {
  const lines = ['# Decisions', ''];
  if (memories.length === 0) {
    lines.push('No explicit decision memories were found in approved sources.');
    lines.push('');
    return lines.join('\n');
  }

  for (const memory of memories) {
    lines.push(formatMemoryBullet(memory));
  }
  lines.push('');
  return lines.join('\n');
}

function buildActiveQuestionsContent(memories: SourceMemory[]): string {
  const lines = ['# Active Questions', ''];
  if (memories.length === 0) {
    lines.push(
      'No explicit open-question memories were found in approved sources.'
    );
    lines.push('');
    return lines.join('\n');
  }

  for (const memory of memories) {
    lines.push(formatMemoryBullet(memory));
  }
  lines.push('');
  return lines.join('\n');
}

function buildSourceIndexContent(memories: SourceMemory[]): string {
  const lines = [
    '# Source Index',
    '',
    '| Date | Type | Title | Source |',
    '| --- | --- | --- | --- |',
  ];

  if (memories.length === 0) {
    lines.push('| - | - | No approved source memories were available. | - |');
    lines.push('');
    return lines.join('\n');
  }

  for (const memory of memories) {
    lines.push(
      `| ${memory.date} | ${memory.memoryType} | ${escapeTable(
        memory.title
      )} | ${memory._id} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

function formatMemoryBullet(memory: SourceMemory): string {
  return `- ${memory.date} — ${memory.title}: ${memory.summary} [source: ${memory._id}]`;
}

function titleForPageKind(pageKind: ProjectWikiPageKind): string {
  switch (pageKind) {
    case 'overview':
      return 'Overview';
    case 'decisions':
      return 'Decisions';
    case 'active-questions':
      return 'Active Questions';
    case 'source-index':
      return 'Source Index';
    case 'custom':
      return 'Custom';
  }
}

function slugForPageKind(pageKind: ProjectWikiPageKind): string {
  switch (pageKind) {
    case 'active-questions':
      return 'active-questions';
    case 'source-index':
      return 'source-index';
    default:
      return pageKind;
  }
}

function isActiveQuestionMemory(memory: SourceMemory): boolean {
  const haystack = `${memory.title}\n${memory.summary}`.toLowerCase();
  return (
    memory.tags.some((tag) =>
      ['open-question', 'question', 'follow-up', 'todo', 'unknown'].includes(
        tag.toLowerCase()
      )
    ) ||
    haystack.includes('open question') ||
    haystack.includes('follow-up') ||
    haystack.includes('unknown') ||
    memory.title.includes('?') ||
    memory.summary.includes('?')
  );
}

function collectSourceRefs(memories: SourceMemory[]): string[] {
  return Array.from(
    new Set(
      memories.flatMap((memory) => [
        ...(memory.relatedDocIds ?? []),
        ...(memory.provenance?.sourceRef ? [memory.provenance.sourceRef] : []),
      ])
    )
  );
}

function compareMemories(a: SourceMemory, b: SourceMemory): number {
  return `${a.date}:${a.title}:${a._id}`.localeCompare(
    `${b.date}:${b.title}:${b._id}`
  );
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|');
}
