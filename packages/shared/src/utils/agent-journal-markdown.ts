import type {
  Conversation,
  ConversationMemoryType,
} from '../collections/conversation.js';
import type {
  MemoryCaptureMode,
  MemoryExportFormat,
  MemoryProvenance,
  MemoryScopeType,
  MemoryStrategyKind,
} from '../collections/memory-strategy.js';
import {
  extractTags,
  extractWikiLinks,
  parseFrontmatter,
  serializeFrontmatter,
} from './obsidian-markdown.js';

export interface AgentJournalMarkdownFile {
  path: string;
  content: string;
}

export interface AgentJournalExportOptions {
  format?: MemoryExportFormat;
  generatedAt?: string;
  scopeType?: MemoryScopeType | undefined;
  scopeKey?: string | undefined;
  title?: string;
}

export interface ImportedAgentJournalMemory {
  title: string;
  summary: string;
  agentId: string;
  memoryType: ConversationMemoryType;
  date: string;
  tags: string[];
  strategy: MemoryStrategyKind;
  captureMode: MemoryCaptureMode;
  scopeType: MemoryScopeType;
  scopeKey: string;
  aliases?: string[];
  sourceMemoryIds?: string[];
  provenance?: MemoryProvenance;
  relatedDocIds?: string[];
}

type ConversationMemory =
  | Conversation
  | (Conversation & Record<string, unknown>);

export function exportAgentJournalMarkdown(
  memories: ConversationMemory[],
  options: AgentJournalExportOptions = {}
): AgentJournalMarkdownFile[] {
  const format = options.format ?? 'obsidian';
  const scopeType = options.scopeType ?? inferScopeType(memories);
  const scopeKey = options.scopeKey ?? inferScopeKey(memories);
  const title = options.title ?? 'Agent Journal';
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sorted = memories
    .filter((memory) => !memory._deleted)
    .slice()
    .sort(compareMemory);

  if (format === 'json') {
    return [
      {
        path: 'memory.json',
        content: `${JSON.stringify(sorted, null, 2)}\n`,
      },
    ];
  }

  const detailFiles = sorted.map((memory) =>
    buildMemoryDetailFile(memory, format)
  );
  const dailyFiles = buildDailyFiles(sorted, format);
  const projectFile = buildProjectIndexFile(
    sorted,
    scopeType,
    scopeKey,
    format
  );
  const decisionFile = buildDecisionFile(sorted, format);

  return [
    buildRootFile(sorted, {
      format,
      generatedAt,
      scopeKey,
      scopeType,
      title,
    }),
    ...dailyFiles,
    projectFile,
    decisionFile,
    ...detailFiles,
  ].sort(compareExportFiles);
}

export function importAgentJournalMarkdown(
  files: AgentJournalMarkdownFile[],
  defaults: Partial<ImportedAgentJournalMemory> = {}
): ImportedAgentJournalMemory[] {
  return files
    .filter((file) => file.path.startsWith('memory/items/'))
    .map((file) => importMemoryFile(file, defaults));
}

function buildRootFile(
  memories: ConversationMemory[],
  options: Required<Pick<AgentJournalExportOptions, 'generatedAt'>> & {
    format: MemoryExportFormat;
    scopeType: MemoryScopeType;
    scopeKey: string;
    title: string;
  }
): AgentJournalMarkdownFile {
  const links = memories.map((memory) => `- [[${detailTitle(memory)}]]`);
  const body = [
    `# ${options.title}`,
    '',
    `Generated: ${options.generatedAt}`,
    '',
    '## Indexes',
    '',
    '- [[decisions]]',
    `- [[projects/${slugify(options.scopeKey)}|${options.scopeKey}]]`,
    '',
    '## Memories',
    '',
    ...links,
    '',
  ].join('\n');

  return {
    path: 'MEMORY.md',
    content: serializeFrontmatter(
      {
        title: options.title,
        type: 'agent-journal-index',
        strategy: 'agent-journal',
        scopeType: options.scopeType,
        scopeKey: options.scopeKey,
        exportFormat: options.format,
        generatedAt: options.generatedAt,
        tags: [
          'memory/agent-journal',
          scopeTag(options.scopeType, options.scopeKey),
        ],
      },
      body
    ),
  };
}

function buildDailyFiles(
  memories: ConversationMemory[],
  format: MemoryExportFormat
): AgentJournalMarkdownFile[] {
  const byDate = new Map<string, ConversationMemory[]>();
  for (const memory of memories) {
    const date = memory.date || timestampToIso(memory._created).slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), memory]);
  }

  return Array.from(byDate.entries()).map(([date, dateMemories]) => ({
    path: `memory/${date}.md`,
    content: serializeFrontmatter(
      {
        title: date,
        type: 'agent-journal-day',
        strategy: 'agent-journal',
        exportFormat: format,
        tags: ['memory/day'],
      },
      [
        `# ${date}`,
        '',
        ...dateMemories.map((memory) => `- [[${detailTitle(memory)}]]`),
        '',
      ].join('\n')
    ),
  }));
}

function buildProjectIndexFile(
  memories: ConversationMemory[],
  scopeType: MemoryScopeType,
  scopeKey: string,
  format: MemoryExportFormat
): AgentJournalMarkdownFile {
  return {
    path: `projects/${slugify(scopeKey)}.md`,
    content: serializeFrontmatter(
      {
        title: scopeKey,
        type: 'agent-journal-scope',
        strategy: 'agent-journal',
        scopeType,
        scopeKey,
        exportFormat: format,
        tags: ['memory/scope', scopeTag(scopeType, scopeKey)],
      },
      [
        `# ${scopeKey}`,
        '',
        ...memories.map((memory) => `- [[${detailTitle(memory)}]]`),
        '',
      ].join('\n')
    ),
  };
}

function buildDecisionFile(
  memories: ConversationMemory[],
  format: MemoryExportFormat
): AgentJournalMarkdownFile {
  const decisions = memories.filter(
    (memory) => memory.memoryType === 'decision'
  );
  return {
    path: 'decisions.md',
    content: serializeFrontmatter(
      {
        title: 'Decisions',
        type: 'agent-journal-decisions',
        strategy: 'agent-journal',
        exportFormat: format,
        tags: ['memory/decision'],
      },
      [
        '# Decisions',
        '',
        ...decisions.map((memory) => `- [[${detailTitle(memory)}]]`),
        '',
      ].join('\n')
    ),
  };
}

function buildMemoryDetailFile(
  memory: ConversationMemory,
  format: MemoryExportFormat
): AgentJournalMarkdownFile {
  const scopeType = memory.scopeType ?? 'global';
  const scopeKey = memory.scopeKey ?? 'default';
  const tags = buildMemoryTags(memory);
  const aliases = memory.aliases ?? [];
  const relatedLinks = (memory.relatedDocIds ?? []).map(
    (related) => `- [[${related}]]`
  );

  const body = [
    `# ${memory.title}`,
    '',
    memory.summary,
    '',
    '## Context',
    '',
    `- Type: ${memory.memoryType}`,
    `- Agent: ${memory.agentId}`,
    `- Date: ${memory.date}`,
    `- Scope: ${scopeType}/${scopeKey}`,
    '',
    relatedLinks.length > 0 ? '## Related' : '',
    ...relatedLinks,
    '',
    tags.map((tag) => `#${tag}`).join(' '),
    '',
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n');

  return {
    path: `memory/items/${slugify(detailTitle(memory))}.md`,
    content: serializeFrontmatter(
      {
        title: memory.title,
        type: 'agent-journal-memory',
        memoryType: memory.memoryType,
        scopeType,
        scopeKey,
        strategy: memory.strategy ?? 'agent-journal',
        captureMode: memory.captureMode ?? 'manual',
        reviewStatus: memory.reviewStatus ?? 'accepted',
        createdAt: timestampToIso(memory._created),
        updatedAt: timestampToIso(memory._updated),
        sourceMemoryIds: memory.sourceMemoryIds ?? [],
        tags,
        aliases,
        provenance: JSON.stringify(memory.provenance ?? {}),
        exportFormat: format,
      },
      body
    ),
  };
}

function importMemoryFile(
  file: AgentJournalMarkdownFile,
  defaults: Partial<ImportedAgentJournalMemory>
): ImportedAgentJournalMemory {
  const { content, frontmatter } = parseFrontmatter(file.content);
  const inlineTags = extractTags(content);
  const links = extractWikiLinks(content)
    .map((link) => link.target)
    .filter(Boolean);
  const title =
    stringField(frontmatter.title) ?? firstHeading(content) ?? file.path;
  const tags = uniqueStrings([
    ...arrayStringField(frontmatter.tags),
    ...inlineTags,
    ...(defaults.tags ?? []),
  ]);
  const unsupportedFrontmatter = pickUnsupportedFrontmatter(frontmatter);

  return {
    title,
    summary: bodySummary(content),
    agentId: defaults.agentId ?? 'import',
    memoryType:
      memoryTypeField(frontmatter.memoryType) ??
      defaults.memoryType ??
      'memory',
    date:
      stringField(frontmatter.date) ??
      stringField(frontmatter.createdAt)?.slice(0, 10) ??
      defaults.date ??
      new Date().toISOString().slice(0, 10),
    tags,
    strategy:
      strategyField(frontmatter.strategy) ??
      defaults.strategy ??
      'agent-journal',
    captureMode:
      captureModeField(frontmatter.captureMode) ??
      defaults.captureMode ??
      'manual',
    scopeType:
      scopeTypeField(frontmatter.scopeType) ?? defaults.scopeType ?? 'global',
    scopeKey:
      stringField(frontmatter.scopeKey) ?? defaults.scopeKey ?? 'default',
    aliases: uniqueStrings([
      ...arrayStringField(frontmatter.aliases),
      ...(defaults.aliases ?? []),
    ]),
    sourceMemoryIds: uniqueStrings([
      ...arrayStringField(frontmatter.sourceMemoryIds),
      ...(defaults.sourceMemoryIds ?? []),
    ]),
    relatedDocIds: uniqueStrings([...(defaults.relatedDocIds ?? []), ...links]),
    provenance: {
      ...defaults.provenance,
      importedFrom: file.path,
      unsupportedFrontmatter,
    },
  };
}

function compareMemory(a: ConversationMemory, b: ConversationMemory): number {
  return `${a.date}:${a.title}:${a._id}`.localeCompare(
    `${b.date}:${b.title}:${b._id}`
  );
}

function compareExportFiles(
  a: AgentJournalMarkdownFile,
  b: AgentJournalMarkdownFile
): number {
  if (a.path === 'MEMORY.md') return -1;
  if (b.path === 'MEMORY.md') return 1;
  return a.path.localeCompare(b.path);
}

function inferScopeType(memories: ConversationMemory[]): MemoryScopeType {
  return memories.find((memory) => memory.scopeType)?.scopeType ?? 'global';
}

function inferScopeKey(memories: ConversationMemory[]): string {
  return memories.find((memory) => memory.scopeKey)?.scopeKey ?? 'default';
}

function detailTitle(memory: ConversationMemory): string {
  return `${memory.date || 'undated'} - ${memory.title}`;
}

function buildMemoryTags(memory: ConversationMemory): string[] {
  return uniqueStrings([
    ...memory.tags,
    `memory/${memory.memoryType}`,
    `strategy/${memory.strategy ?? 'agent-journal'}`,
    scopeTag(memory.scopeType ?? 'global', memory.scopeKey ?? 'default'),
    ...(memory.redactionWarnings?.length ? ['safety/redacted'] : []),
  ]).map(slugifyTag);
}

function scopeTag(scopeType: MemoryScopeType, scopeKey: string): string {
  return `scope/${scopeType}/${scopeKey}`;
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

function timestampToIso(value: number): string {
  return new Date(value).toISOString();
}

function slugifyTag(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_/-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function arrayStringField(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function memoryTypeField(value: unknown): ConversationMemoryType | undefined {
  return value === 'session' ||
    value === 'memory' ||
    value === 'decision' ||
    value === 'bookmark'
    ? value
    : undefined;
}

function strategyField(value: unknown): MemoryStrategyKind | undefined {
  return value === 'agent-journal' ||
    value === 'project-wiki' ||
    value === 'auto-curated' ||
    value === 'knowledge-graph' ||
    value === 'workspace-intelligence' ||
    value === 'custom'
    ? value
    : undefined;
}

function captureModeField(value: unknown): MemoryCaptureMode | undefined {
  return value === 'manual' || value === 'suggest' || value === 'auto'
    ? value
    : undefined;
}

function scopeTypeField(value: unknown): MemoryScopeType | undefined {
  return value === 'global' ||
    value === 'project' ||
    value === 'workspace' ||
    value === 'agent'
    ? value
    : undefined;
}

function firstHeading(content: string): string | undefined {
  return content
    .split('\n')
    .find((line) => line.startsWith('# '))
    ?.replace(/^#\s+/, '')
    .trim();
}

function bodySummary(content: string): string {
  return content
    .split('\n')
    .filter((line) => !line.startsWith('#') && !line.startsWith('- '))
    .join('\n')
    .trim()
    .slice(0, 2000);
}

function pickUnsupportedFrontmatter(
  frontmatter: Record<string, unknown>
): Record<string, unknown> {
  const supported = new Set([
    'title',
    'type',
    'memoryType',
    'scopeType',
    'scopeKey',
    'strategy',
    'captureMode',
    'reviewStatus',
    'createdAt',
    'updatedAt',
    'sourceMemoryIds',
    'tags',
    'aliases',
    'provenance',
    'exportFormat',
    'date',
  ]);
  return Object.fromEntries(
    Object.entries(frontmatter).filter(([key]) => !supported.has(key))
  );
}
