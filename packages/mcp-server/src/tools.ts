/**
 * Purpose: MCP tool registration and validation for EweserDB document access.
 * Exports: ToolServer, registerTools, and tool helper types.
 * Touches: DataLayer reads/writes, Zod schemas, access logging, and redaction.
 * Read before editing: packages/mcp-server/src/INDEX.md and README.md.
 */
import { z } from 'zod';
import type { DataLayer } from './data-layer.js';
import {
  estimateMemoryTokens,
  exportAgentJournalMarkdown,
  exportProjectWikiMarkdown,
  buildProjectWikiDrafts,
  type MemoryAuditAction,
  type MemoryAuditEvent,
  type Conversation,
  type EweDocument,
  type MemoryCaptureMode,
  type MemoryScopeType,
  type MemoryStrategyKind,
  type ProjectWikiDraft,
  type ProjectWikiPage,
} from '@eweser/shared';
import path from 'node:path';

type LogFn = (entry: {
  roomId: string;
  collectionKey: string;
  action: 'read' | 'write';
  documentCount?: number;
}) => Promise<void>;

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export type MemoryAuditSink = (event: MemoryAuditEvent) => void | Promise<void>;

type ToolRegistrar = <TShape extends z.ZodRawShape>(
  name: string,
  description: string,
  inputSchema: TShape,
  handler: (
    args: z.infer<z.ZodObject<TShape>>
  ) => ToolResult | Promise<ToolResult>
) => void;

export type ToolServer = {
  tool: unknown;
};

function getToolRegistrar(server: ToolServer): ToolRegistrar {
  if (typeof server.tool !== 'function') {
    throw new TypeError('MCP server is missing a tool registration method.');
  }

  return (server.tool as (...args: unknown[]) => unknown).bind(
    server
  ) as ToolRegistrar;
}

const SECRET_PATTERNS: RegExp[] = [
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  /\baws_secret_access_key\s*=\s*[^\s]+/gi,
  /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^\s"',}]+/gi,
  /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
];

function redactSecretLikeText(text: string): {
  text: string;
  redacted: boolean;
} {
  let redacted = false;
  let next = text;

  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, () => {
      redacted = true;
      return '[REDACTED_SECRET]';
    });
  }

  return { text: next, redacted };
}

/** Extract a short text summary from a document (first 200 chars of JSON). */
function summarize(doc: EweDocument): string {
  return JSON.stringify(doc).slice(0, 200);
}

/** Search result shape returned by the aggregator POST /api/agent-search */
interface AggregatorSearchResult {
  id: string;
  _ref: string;
  title: string;
  summary?: string;
  collectionKey: string;
  roomId: string;
  snippet: string;
  score: number;
  memoryType?: string;
  agentId?: string;
  date?: string;
  tags?: string[];
}

/** Emoji prefix for a result based on collectionKey / memoryType */
function resultEmoji(result: AggregatorSearchResult): string {
  if (result.memoryType === 'memory' || result.memoryType === 'decision')
    return '🧠';
  if (result.memoryType === 'session') return '📝';
  if (result.memoryType === 'bookmark' || result.collectionKey === 'bookmarks')
    return '🔖';
  return '📚';
}

/** Format aggregator search results for LLM consumption */
function formatAggregatorResults(results: AggregatorSearchResult[]): string {
  if (results.length === 0) return 'No results found.';
  return results
    .map((r) => {
      const emoji = resultEmoji(r);
      const parts = [
        `${emoji} [${r.collectionKey}] ${r.title || '(untitled)'} (score: ${r.score.toFixed(3)})`,
        r.summary ? `  Summary: ${r.summary}` : null,
        r.snippet ? `  Snippet: ${r.snippet}` : null,
        `  ref: ${r._ref}`,
        r.tags?.length ? `  tags: ${r.tags.join(', ')}` : null,
      ].filter(Boolean);
      return parts.join('\n');
    })
    .join('\n\n');
}

function normalizeTagValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[/\\]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function buildWorktreeTag(explicitTag?: string): string {
  const raw = explicitTag ?? path.basename(process.cwd());
  const normalized = normalizeTagValue(raw);
  return `worktree:${normalized || 'default'}`;
}

const SearchFiltersSchema = z
  .object({
    collectionKey: z
      .array(z.string())
      .optional()
      .describe('Restrict to these collection keys'),
    memoryType: z
      .array(z.enum(['session', 'memory', 'decision', 'bookmark']))
      .optional()
      .describe('Filter by memoryType'),
    agentId: z
      .string()
      .optional()
      .describe('Filter by agent that wrote the doc'),
    tags: z.array(z.string()).optional().describe('Filter by tags (ANY match)'),
    dateFrom: z
      .string()
      .optional()
      .describe('ISO date lower bound (inclusive)'),
    dateTo: z.string().optional().describe('ISO date upper bound (inclusive)'),
  })
  .optional();

type SearchFilters = z.infer<typeof SearchFiltersSchema>;

const MemoryStrategySchema = z.enum([
  'agent-journal',
  'project-wiki',
  'auto-curated',
  'knowledge-graph',
  'workspace-intelligence',
  'custom',
]);

const MemoryCaptureModeSchema = z.enum(['manual', 'suggest', 'auto']);
const MemoryScopeTypeSchema = z.enum([
  'global',
  'project',
  'workspace',
  'agent',
]);

type InMemorySearchResult = {
  roomId: string;
  collectionKey: string;
  doc: EweDocument;
};

function getStringField(doc: EweDocument, key: string): string | undefined {
  const value = (doc as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function getStringArrayField(
  doc: EweDocument,
  key: string
): string[] | undefined {
  const value = (doc as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function matchesSearchFilters(
  result: InMemorySearchResult,
  filters: SearchFilters
): boolean {
  if (!filters) return true;

  if (
    filters.collectionKey?.length &&
    !filters.collectionKey.includes(result.collectionKey)
  ) {
    return false;
  }

  const memoryType = getStringField(result.doc, 'memoryType');
  if (filters.memoryType?.length && !memoryType) return false;
  if (
    filters.memoryType?.length &&
    !filters.memoryType.some((type) => type === memoryType)
  ) {
    return false;
  }

  const agentId = getStringField(result.doc, 'agentId');
  if (filters.agentId && agentId !== filters.agentId) return false;

  const tags = getStringArrayField(result.doc, 'tags') ?? [];
  if (filters.tags?.length && !filters.tags.some((tag) => tags.includes(tag))) {
    return false;
  }

  const date = getStringField(result.doc, 'date');
  if (filters.dateFrom && (!date || date < filters.dateFrom)) return false;
  if (filters.dateTo && (!date || date > filters.dateTo)) return false;

  return true;
}

let auditSequence = 0;

function nextAuditId(action: MemoryAuditAction): string {
  auditSequence += 1;
  return `mcp-${action}-${auditSequence}`;
}

function emitAudit(
  auditSink: MemoryAuditSink | undefined,
  event: { action: MemoryAuditAction } & Record<string, unknown>
): void {
  if (!auditSink) return;
  const reason = typeof event.reason === 'string' ? event.reason : undefined;
  const query = typeof event.query === 'string' ? event.query : undefined;
  const resultSummary =
    typeof event.resultSummary === 'string' ? event.resultSummary : undefined;
  const redactedReason = reason ? redactSecretLikeText(reason) : undefined;
  const redactedQuery = query ? redactSecretLikeText(query) : undefined;
  const redactedSummary = resultSummary
    ? redactSecretLikeText(resultSummary)
    : undefined;
  const safetyWarnings = [
    ...(Array.isArray(event.safetyWarnings)
      ? event.safetyWarnings.filter(
          (warning): warning is string => typeof warning === 'string'
        )
      : []),
    ...(redactedReason?.redacted ||
    redactedQuery?.redacted ||
    redactedSummary?.redacted
      ? ['secret-like content redacted before audit']
      : []),
  ];
  const safeEvent = stripUndefined({
    ...event,
    id: nextAuditId(event.action),
    timestamp: new Date().toISOString(),
    ...(redactedReason && { reason: redactedReason.text }),
    ...(redactedQuery && { query: redactedQuery.text }),
    ...(redactedSummary && { resultSummary: redactedSummary.text }),
    ...(safetyWarnings.length && { safetyWarnings }),
  }) as MemoryAuditEvent;
  void auditSink(safeEvent);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}

function resultText(result: ToolResult): string {
  return result.content.map((entry) => entry.text).join('\n');
}

function auditResultSummary(result: ToolResult): string {
  return redactSecretLikeText(resultText(result).slice(0, 500)).text;
}

function activeProjectWikiDocs<T extends { _deleted?: boolean }>(
  docs: Record<string, T>
): T[] {
  return Object.values(docs).filter((doc): doc is T =>
    Boolean(doc && !doc._deleted)
  );
}

function findProjectWikiDraftBySlug(
  drafts: ProjectWikiDraft[],
  scopeType: MemoryScopeType,
  scopeKey: string,
  pageSlug: string
): ProjectWikiDraft | undefined {
  return drafts.find(
    (draft) =>
      draft.scopeType === scopeType &&
      draft.scopeKey === scopeKey &&
      draft.pageSlug === pageSlug
  );
}

function findProjectWikiPageBySlug(
  pages: ProjectWikiPage[],
  scopeType: MemoryScopeType,
  scopeKey: string,
  slug: string
): ProjectWikiPage | undefined {
  return pages.find(
    (page) =>
      page.scopeType === scopeType &&
      page.scopeKey === scopeKey &&
      page.slug === slug
  );
}

export function registerTools(
  server: ToolServer,
  dataLayer: DataLayer,
  log: LogFn,
  aggregatorUrl?: string,
  worktreeTag?: string,
  auditSink?: MemoryAuditSink
): void {
  const tool = getToolRegistrar(server);

  // -------------------------------------------------------------------------
  // eweser_get_memory_strategy
  // -------------------------------------------------------------------------
  tool(
    'eweser_get_memory_strategy',
    'Return the active memory strategy, capture mode, scope, and writable targets for this agent token.',
    {
      scopeType: MemoryScopeTypeSchema.optional(),
      scopeKey: z.string().optional(),
    },
    async ({ scopeType, scopeKey }) => {
      const strategy = dataLayer.getMemoryStrategy({ scopeKey, scopeType });
      emitAudit(auditSink, {
        action: 'strategy_lookup',
        scopeType,
        scopeKey,
        worktreeTag,
        resultSummary: `${strategy.strategy} ${strategy.captureMode}`,
        tokenEstimate: estimateMemoryTokens(JSON.stringify(strategy)),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(strategy, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_list_memory_scopes
  // -------------------------------------------------------------------------
  tool(
    'eweser_list_memory_scopes',
    'List global/project/workspace memory scopes this agent can use.',
    {},
    async () => {
      const scopes = dataLayer.listMemoryScopes();
      emitAudit(auditSink, {
        action: 'scope_list',
        worktreeTag,
        resultCount: scopes.length,
        roomIds: scopes.flatMap((scope) => [
          ...(scope.readableRoomIds ?? []),
          ...(scope.writableRoomIds ?? []),
        ]),
        resultSummary: `Listed ${scopes.length} memory scopes.`,
        tokenEstimate: estimateMemoryTokens(JSON.stringify(scopes)),
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(scopes, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_list_rooms
  // -------------------------------------------------------------------------

  tool(
    'eweser_list_rooms',
    'List rooms the agent can access, optionally filtered by collection type.',
    {
      collectionKey: z
        .string()
        .optional()
        .describe('Filter by collection key, e.g. "notes", "flashcards"'),
    },
    async ({ collectionKey }) => {
      const rooms = dataLayer.listRooms(collectionKey);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(rooms, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_list_documents
  // -------------------------------------------------------------------------
  tool(
    'eweser_list_documents',
    'List documents in a room (returns IDs + summaries).',
    {
      roomId: z.string().describe('The room UUID'),
      limit: z.number().int().min(1).max(500).optional().default(50),
    },
    async ({ roomId, limit }) => {
      const connected = dataLayer.assertReadAccess(roomId);
      const docs = dataLayer.getRawDocuments(roomId);
      const entries = Object.values(docs)
        .filter((d) => d && !(d as { _deleted?: boolean })._deleted)
        .slice(0, limit)
        .map((d) => ({
          id: (d as EweDocument)._id,
          summary: summarize(d as EweDocument),
          _created: (d as EweDocument)._created,
          _updated: (d as EweDocument)._updated,
        }));

      void log({
        roomId,
        collectionKey: connected.meta.collectionKey,
        action: 'read',
        documentCount: entries.length,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(entries, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_read_document
  // -------------------------------------------------------------------------
  tool(
    'eweser_read_document',
    'Read a full document by room ID and document ID.',
    {
      roomId: z.string().describe('The room UUID'),
      documentId: z.string().describe('The document ID'),
    },
    async ({ roomId, documentId }) => {
      const connected = dataLayer.assertReadAccess(roomId);
      const crudApi = dataLayer.getDocumentsForRoom(roomId);
      const doc = crudApi.get(documentId);

      if (!doc) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Document not found: ${documentId}`,
            },
          ],
        };
      }

      void log({
        roomId,
        collectionKey: connected.meta.collectionKey,
        action: 'read',
        documentCount: 1,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(doc, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_search
  // -------------------------------------------------------------------------
  tool(
    'eweser_search',
    'Full-text search across documents in allowed rooms. ' +
      'When connected to the aggregator, uses PostgreSQL full-text search with result ranking ' +
      '(memory/decision docs boosted 1.5×). Falls back to in-memory scan if aggregator unavailable.',
    {
      query: z.string().min(1).describe('Search query string'),
      filters: SearchFiltersSchema.describe('Optional search filters'),
    },
    async ({ query, filters }) => {
      // Use aggregator for PostgreSQL full-text search when available.
      // Do NOT pass roomIds — let aggregator use all agent's allowedRooms,
      // which includes vault rooms that may not be in the Yjs DataLayer.
      if (aggregatorUrl) {
        try {
          const agentToken = dataLayer.getAgentToken();
          const res = await fetch(`${aggregatorUrl}/api/agent-search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${agentToken}`,
            },
            body: JSON.stringify({ query, ...(filters ? { filters } : {}) }),
          });

          if (res.ok) {
            const data = (await res.json()) as {
              results: AggregatorSearchResult[];
            };
            const formatted = formatAggregatorResults(data.results);
            const result = {
              content: [
                { type: 'text' as const, text: formatted },
                { type: 'text' as const, text: JSON.stringify(data.results) },
              ],
            };
            emitAudit(auditSink, {
              action: 'memory_search',
              query,
              worktreeTag,
              roomIds: data.results.map((entry) => entry.roomId),
              memoryIds: data.results.map((entry) => entry.id),
              resultCount: data.results.length,
              resultSummary: auditResultSummary(result),
              tokenEstimate: estimateMemoryTokens(resultText(result)),
            });
            return result;
          }
          // Fall through to in-memory on non-ok response
        } catch {
          // Fall through to in-memory fallback
        }
      }

      // In-memory fallback (O(n) scan over loaded Y.Docs)
      const collectionFilter =
        filters?.collectionKey?.length === 1
          ? filters.collectionKey[0]
          : undefined;
      const results = dataLayer
        .searchDocuments(query, collectionFilter)
        .filter((result) => matchesSearchFilters(result, filters))
        .slice(0, 10);
      const result = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
      emitAudit(auditSink, {
        action: 'memory_search',
        query,
        worktreeTag,
        roomIds: results.map((entry) => entry.roomId),
        memoryIds: results.map((entry) => entry.doc._id),
        resultCount: results.length,
        resultSummary: auditResultSummary(result),
        tokenEstimate: estimateMemoryTokens(resultText(result)),
      });
      return result;
    }
  );

  // -------------------------------------------------------------------------
  // eweser_create_document
  // -------------------------------------------------------------------------
  tool(
    'eweser_create_document',
    'Create a new document in a room.',
    {
      roomId: z.string().describe('The room UUID'),
      data: z
        .record(z.unknown())
        .describe('Document fields (excluding metadata)'),
    },
    async ({ roomId, data }) => {
      const connected = dataLayer.assertWriteAccess(roomId, data);
      const crudApi = dataLayer.getDocumentsForRoom(roomId);
      const newDoc = crudApi.new(data as Parameters<typeof crudApi.new>[0]);

      void log({
        roomId,
        collectionKey: connected.meta.collectionKey,
        action: 'write',
        documentCount: 1,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ id: newDoc._id, created: true }, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_update_document
  // -------------------------------------------------------------------------
  tool(
    'eweser_update_document',
    'Update fields on an existing document.',
    {
      roomId: z.string().describe('The room UUID'),
      documentId: z.string().describe('The document ID to update'),
      updates: z.record(z.unknown()).describe('Fields to update'),
    },
    async ({ roomId, documentId, updates }) => {
      const crudApi = dataLayer.getDocumentsForRoom(roomId);
      const existing = crudApi.get(documentId);

      if (!existing) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Document not found: ${documentId}`,
            },
          ],
        };
      }

      dataLayer.assertWriteAccess(roomId, existing);
      const candidate = { ...existing, ...updates } as EweDocument;
      const connected = dataLayer.assertWriteAccess(roomId, candidate);
      const updated = crudApi.set(candidate);

      void log({
        roomId,
        collectionKey: connected.meta.collectionKey,
        action: 'write',
        documentCount: 1,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(updated, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_save_memory
  // -------------------------------------------------------------------------
  tool(
    'eweser_save_memory',
    'Save a memory note, session summary, decision, or bookmark to a conversations room. ' +
      'A convenience wrapper around eweser_create_document with sensible defaults for AI agents. ' +
      'Requires readwrite access on the target room (collectionKey: "conversations"). ' +
      'Keep summary concise — ideally under 500 tokens.',
    {
      roomId: z
        .string()
        .optional()
        .describe(
          'The conversations room UUID to write to. Optional when exactly one writable memory target is available.'
        ),
      title: z
        .string()
        .min(1)
        .describe('Short descriptive title for this memory'),
      summary: z
        .string()
        .min(1)
        .max(2000)
        .describe('Agent-written summary. Keep concise (≤ ~500 tokens).'),
      memoryType: z
        .enum(['session', 'memory', 'decision', 'bookmark'])
        .describe(
          'session = end-of-session summary; memory = recalled fact; decision = architectural/strategic decision; bookmark = URL or reference'
        ),
      agentId: z
        .string()
        .optional()
        .describe(
          'Agent identifier, e.g. "copilot", "claude". Defaults to "unknown".'
        ),
      date: z
        .string()
        .optional()
        .describe('ISO date string. Defaults to today.'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Labels for filtering/search'),
      turns: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
            timestamp: z.string(),
          })
        )
        .optional()
        .describe(
          'Optional turn-by-turn transcript. Capped at last 100 turns.'
        ),
      relatedDocIds: z
        .array(z.string())
        .optional()
        .describe('IDs of related EweserDB documents'),
      scopeType: MemoryScopeTypeSchema.optional(),
      scopeKey: z.string().optional(),
      strategy: MemoryStrategySchema.optional(),
      captureMode: MemoryCaptureModeSchema.optional(),
    },
    async ({
      roomId,
      title,
      summary,
      memoryType,
      agentId,
      date,
      tags,
      turns,
      relatedDocIds,
      scopeType,
      scopeKey,
      strategy,
      captureMode,
    }) => {
      const resolvedRoomId = dataLayer.resolveMemoryWriteRoom({
        roomId,
        scopeKey,
        scopeType,
      });
      const crudApi = dataLayer.getDocumentsForRoom(resolvedRoomId);

      const MAX_TURNS = 100;
      let cappedTurns = turns;
      if (turns && turns.length > MAX_TURNS) {
        cappedTurns = [
          {
            role: 'assistant' as const,
            content: `[${turns.length - MAX_TURNS} turns truncated]`,
            timestamp: new Date().toISOString(),
          },
          ...turns.slice(-MAX_TURNS),
        ];
      }

      const redactedSummary = redactSecretLikeText(summary);
      let redactedTurns = false;
      const sanitizedTurns = cappedTurns?.map((turn) => {
        const redacted = redactSecretLikeText(turn.content);
        redactedTurns = redactedTurns || redacted.redacted;
        return { ...turn, content: redacted.text };
      });

      const docData = {
        title,
        summary: redactedSummary.text,
        memoryType,
        agentId: agentId ?? 'unknown',
        date: date ?? new Date().toISOString().slice(0, 10),
        strategy: strategy ?? ('agent-journal' satisfies MemoryStrategyKind),
        captureMode: captureMode ?? ('manual' satisfies MemoryCaptureMode),
        scopeType: scopeType ?? ('global' satisfies MemoryScopeType),
        scopeKey: scopeKey ?? 'default',
        reviewStatus: 'accepted',
        tags:
          (tags?.some((tag: string) => tag.startsWith('worktree:')) ?? false)
            ? tags
            : [...(tags ?? []), buildWorktreeTag(worktreeTag)],
        ...(sanitizedTurns !== undefined && { turns: sanitizedTurns }),
        ...(relatedDocIds !== undefined && { relatedDocIds }),
        ...((redactedSummary.redacted || redactedTurns) && {
          redactionWarnings: ['secret-like content redacted before save'],
        }),
      };

      const connected = dataLayer.assertWriteAccess(resolvedRoomId, docData);
      if (connected.meta.collectionKey !== 'conversations') {
        throw new Error('eweser_save_memory requires a conversations room');
      }

      const newDoc = crudApi.new(docData as Parameters<typeof crudApi.new>[0]);

      void log({
        roomId: resolvedRoomId,
        collectionKey: connected.meta.collectionKey,
        action: 'write',
        documentCount: 1,
      });

      const result = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ id: newDoc._id, created: true }, null, 2),
          },
        ],
      };
      emitAudit(auditSink, {
        action: 'memory_save',
        agentId: docData.agentId,
        scopeType: docData.scopeType,
        scopeKey: docData.scopeKey,
        worktreeTag,
        roomIds: [resolvedRoomId],
        memoryIds: [newDoc._id],
        resultCount: 1,
        resultSummary: auditResultSummary(result),
        tokenEstimate: estimateMemoryTokens(docData.summary),
        safetyWarnings: docData.redactionWarnings,
      });
      return result;
    }
  );

  // -------------------------------------------------------------------------
  // eweser_suggest_memory
  // -------------------------------------------------------------------------
  tool(
    'eweser_suggest_memory',
    'Stage a suggested memory for later review. This writes a conversations document with reviewStatus: "suggested".',
    {
      roomId: z.string().optional(),
      title: z.string().min(1),
      summary: z.string().min(1).max(2000),
      memoryType: z.enum(['session', 'memory', 'decision', 'bookmark']),
      agentId: z.string().optional(),
      scopeType: MemoryScopeTypeSchema.optional(),
      scopeKey: z.string().optional(),
      strategy: MemoryStrategySchema.optional(),
      captureMode: z.literal('suggest').optional(),
      tags: z.array(z.string()).optional(),
    },
    async ({
      roomId,
      title,
      summary,
      memoryType,
      agentId,
      scopeType,
      scopeKey,
      strategy,
      tags,
    }) => {
      const resolvedRoomId = dataLayer.resolveMemoryWriteRoom({
        roomId,
        scopeKey,
        scopeType,
      });
      const redactedSummary = redactSecretLikeText(summary);
      const docData = {
        title,
        summary: redactedSummary.text,
        memoryType,
        agentId: agentId ?? 'unknown',
        date: new Date().toISOString().slice(0, 10),
        strategy: strategy ?? 'agent-journal',
        captureMode: 'suggest',
        scopeType: scopeType ?? 'global',
        scopeKey: scopeKey ?? 'default',
        reviewStatus: 'suggested',
        tags:
          (tags?.some((tag: string) => tag.startsWith('worktree:')) ?? false)
            ? tags
            : [...(tags ?? []), buildWorktreeTag(worktreeTag)],
        ...(redactedSummary.redacted && {
          redactionWarnings: ['secret-like content redacted before save'],
        }),
      };
      const connected = dataLayer.assertWriteAccess(resolvedRoomId, docData);
      if (connected.meta.collectionKey !== 'conversations') {
        throw new Error('eweser_suggest_memory requires a conversations room');
      }
      const crudApi = dataLayer.getDocumentsForRoom(resolvedRoomId);
      const newDoc = crudApi.new(docData as Parameters<typeof crudApi.new>[0]);
      void log({
        roomId: resolvedRoomId,
        collectionKey: connected.meta.collectionKey,
        action: 'write',
        documentCount: 1,
      });
      const result = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ id: newDoc._id, suggested: true }, null, 2),
          },
        ],
      };
      emitAudit(auditSink, {
        action: 'memory_suggest',
        agentId: docData.agentId,
        scopeType: docData.scopeType,
        scopeKey: docData.scopeKey,
        worktreeTag,
        roomIds: [resolvedRoomId],
        memoryIds: [newDoc._id],
        resultCount: 1,
        resultSummary: auditResultSummary(result),
        tokenEstimate: estimateMemoryTokens(docData.summary),
        safetyWarnings: docData.redactionWarnings,
      });
      return result;
    }
  );

  // -------------------------------------------------------------------------
  // eweser_export_memory
  // -------------------------------------------------------------------------
  tool(
    'eweser_export_memory',
    'Export Agent Journal memory for a selected scope. Defaults to Obsidian-compatible Markdown.',
    {
      roomId: z.string().optional(),
      scopeType: MemoryScopeTypeSchema.optional(),
      scopeKey: z.string().optional(),
      format: z.enum(['obsidian', 'markdown', 'json']).optional(),
    },
    async ({ roomId, scopeType, scopeKey, format }) => {
      const targetRoomId = dataLayer.resolveMemoryWriteRoom({
        roomId,
        scopeKey,
        scopeType,
      });
      const connected = dataLayer.assertReadAccess(targetRoomId);
      if (connected.meta.collectionKey !== 'conversations') {
        throw new Error('eweser_export_memory requires a conversations room');
      }
      const raw = dataLayer.getRawDocuments<Conversation>(targetRoomId);
      const memories = Object.values(raw).filter((doc): doc is Conversation =>
        Boolean(doc && !doc._deleted)
      );
      const files = exportAgentJournalMarkdown(memories, {
        format: format ?? 'obsidian',
        scopeType,
        scopeKey,
      });
      void log({
        roomId: targetRoomId,
        collectionKey: connected.meta.collectionKey,
        action: 'read',
        documentCount: memories.length,
      });
      const result = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(files, null, 2),
          },
        ],
      };
      emitAudit(auditSink, {
        action: 'memory_export',
        scopeType,
        scopeKey,
        worktreeTag,
        roomIds: [targetRoomId],
        memoryIds: memories.map((memory) => memory._id),
        resultCount: files.length,
        resultSummary: `Exported ${files.length} Agent Journal files.`,
        tokenEstimate: estimateMemoryTokens(resultText(result)),
      });
      return result;
    }
  );

  // -------------------------------------------------------------------------
  // eweser_build_project_wiki
  // -------------------------------------------------------------------------
  tool(
    'eweser_build_project_wiki',
    'Build or refresh deterministic Project Wiki drafts for a configured project scope without mutating source memory rooms.',
    {
      scopeType: z.literal('project').optional(),
      scopeKey: z.string().optional(),
    },
    async ({ scopeType, scopeKey }) => {
      const targets = dataLayer.resolveProjectWikiTargets({
        scopeKey,
        scopeType,
      });
      const sourceMemories = targets.sourceRoomIds.flatMap((roomId) => {
        const connected = dataLayer.assertReadAccess(roomId);
        if (connected.meta.collectionKey !== 'conversations') {
          return [];
        }
        const raw = dataLayer.getRawDocuments<Conversation>(roomId);
        return activeProjectWikiDocs(raw);
      });

      const pageCrud = dataLayer.getDocumentsForRoom<ProjectWikiPage>(
        targets.pageRoomId
      );
      const existingPages = activeProjectWikiDocs(
        dataLayer.getRawDocuments<ProjectWikiPage>(targets.pageRoomId)
      );
      void pageCrud;
      const drafts = buildProjectWikiDrafts(sourceMemories, {
        generatorId: 'eweser-mcp',
        scopeKey: targets.scope.scopeKey,
        targetPageIds: Object.fromEntries(
          existingPages.map((page) => [page.pageKind, page._id])
        ),
      });

      const draftCrud = dataLayer.getDocumentsForRoom<ProjectWikiDraft>(
        targets.draftRoomId
      );
      const existingDrafts = activeProjectWikiDocs(
        dataLayer.getRawDocuments<ProjectWikiDraft>(targets.draftRoomId)
      );
      const writtenDrafts = drafts.map((draft) => {
        const existing = findProjectWikiDraftBySlug(
          existingDrafts,
          draft.scopeType,
          draft.scopeKey,
          draft.pageSlug
        );
        const candidate = {
          ...draft,
          reviewStatus: 'pending' as const,
        };
        return existing
          ? draftCrud.set({
              ...existing,
              ...candidate,
            })
          : draftCrud.new(candidate);
      });

      const connected = dataLayer.assertWriteAccess(targets.draftRoomId);
      void log({
        roomId: targets.draftRoomId,
        collectionKey: connected.meta.collectionKey,
        action: 'write',
        documentCount: writtenDrafts.length,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              writtenDrafts.map((draft) => ({
                id: draft._id,
                pageKind: draft.pageKind,
                pageSlug: draft.pageSlug,
                sourceMemoryIds: draft.sourceMemoryIds,
                targetPageId: draft.targetPageId,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_list_project_wiki_drafts
  // -------------------------------------------------------------------------
  tool(
    'eweser_list_project_wiki_drafts',
    'List Project Wiki drafts for a configured project scope.',
    {
      reviewStatus: z.enum(['pending', 'accepted', 'rejected']).optional(),
      scopeType: z.literal('project').optional(),
      scopeKey: z.string().optional(),
    },
    async ({ reviewStatus, scopeType, scopeKey }) => {
      const targets = dataLayer.resolveProjectWikiTargets({
        scopeKey,
        scopeType,
      });
      const drafts = activeProjectWikiDocs(
        dataLayer.getRawDocuments<ProjectWikiDraft>(targets.draftRoomId)
      ).filter(
        (draft) =>
          draft.scopeType === targets.scope.scopeType &&
          draft.scopeKey === targets.scope.scopeKey &&
          (!reviewStatus || draft.reviewStatus === reviewStatus)
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(drafts, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_list_project_wiki_pages
  // -------------------------------------------------------------------------
  tool(
    'eweser_list_project_wiki_pages',
    'List accepted Project Wiki pages for a configured project scope.',
    {
      scopeType: z.literal('project').optional(),
      scopeKey: z.string().optional(),
    },
    async ({ scopeType, scopeKey }) => {
      const targets = dataLayer.resolveProjectWikiTargets({
        scopeKey,
        scopeType,
      });
      const pages = activeProjectWikiDocs(
        dataLayer.getRawDocuments<ProjectWikiPage>(targets.pageRoomId)
      ).filter(
        (page) =>
          page.scopeType === targets.scope.scopeType &&
          page.scopeKey === targets.scope.scopeKey
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(pages, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_review_project_wiki_draft
  // -------------------------------------------------------------------------
  tool(
    'eweser_review_project_wiki_draft',
    'Accept or reject a Project Wiki draft. Accept writes only to canonical projectWikiPages; reject leaves canonical pages untouched.',
    {
      action: z.enum(['accept', 'reject']),
      draftId: z.string(),
      scopeType: z.literal('project').optional(),
      scopeKey: z.string().optional(),
    },
    async ({ action, draftId, scopeType, scopeKey }) => {
      const targets = dataLayer.resolveProjectWikiTargets({
        scopeKey,
        scopeType,
      });
      const draftCrud = dataLayer.getDocumentsForRoom<ProjectWikiDraft>(
        targets.draftRoomId
      );
      const pageCrud = dataLayer.getDocumentsForRoom<ProjectWikiPage>(
        targets.pageRoomId
      );
      const draft = draftCrud.get(draftId);
      if (!draft || draft._deleted) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Project Wiki draft not found: ${draftId}`,
            },
          ],
        };
      }

      if (action === 'reject') {
        const rejected = draftCrud.set({
          ...draft,
          reviewStatus: 'rejected',
          provenance: {
            ...draft.provenance,
            rejectedAt: new Date().toISOString(),
          },
        });
        const connected = dataLayer.assertWriteAccess(targets.draftRoomId);
        void log({
          roomId: targets.draftRoomId,
          collectionKey: connected.meta.collectionKey,
          action: 'write',
          documentCount: 1,
        });
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { action, draftId: rejected._id, canonicalPageChanged: false },
                null,
                2
              ),
            },
          ],
        };
      }

      const existingPages = activeProjectWikiDocs(
        dataLayer.getRawDocuments<ProjectWikiPage>(targets.pageRoomId)
      );
      const existingPage =
        (draft.targetPageId ? pageCrud.get(draft.targetPageId) : undefined) ??
        findProjectWikiPageBySlug(
          existingPages,
          draft.scopeType,
          draft.scopeKey,
          draft.pageSlug
        );
      const pageCandidate = {
        scopeType: draft.scopeType,
        scopeKey: draft.scopeKey,
        slug: draft.pageSlug,
        title: draft.title,
        pageKind: draft.pageKind,
        format: draft.format,
        content: draft.proposedContent,
        sourceMemoryIds: draft.sourceMemoryIds,
        sourceRefs: draft.sourceRefs ?? [],
        reviewStatus: 'accepted' as const,
        lastAcceptedDraftId: draft._id,
        provenance: {
          ...draft.provenance,
          acceptedAt: new Date().toISOString(),
        },
      };
      const page = existingPage
        ? pageCrud.set({ ...existingPage, ...pageCandidate })
        : pageCrud.new(pageCandidate);
      const updatedDraft = draftCrud.set({
        ...draft,
        reviewStatus: 'accepted',
        targetPageId: page._id,
        provenance: {
          ...draft.provenance,
          acceptedAt: new Date().toISOString(),
        },
      });
      const pageConnected = dataLayer.assertWriteAccess(targets.pageRoomId);
      const draftConnected = dataLayer.assertWriteAccess(targets.draftRoomId);
      void log({
        roomId: targets.pageRoomId,
        collectionKey: pageConnected.meta.collectionKey,
        action: 'write',
        documentCount: 1,
      });
      void log({
        roomId: targets.draftRoomId,
        collectionKey: draftConnected.meta.collectionKey,
        action: 'write',
        documentCount: 1,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                action,
                canonicalPageId: page._id,
                draftId: updatedDraft._id,
                pageSlug: page.slug,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_export_project_wiki
  // -------------------------------------------------------------------------
  tool(
    'eweser_export_project_wiki',
    'Export accepted Project Wiki pages for a configured project scope as Markdown or JSON.',
    {
      format: z.enum(['obsidian', 'markdown', 'json']).optional(),
      scopeType: z.literal('project').optional(),
      scopeKey: z.string().optional(),
    },
    async ({ format, scopeType, scopeKey }) => {
      const targets = dataLayer.resolveProjectWikiTargets({
        scopeKey,
        scopeType,
      });
      const pages = activeProjectWikiDocs(
        dataLayer.getRawDocuments<ProjectWikiPage>(targets.pageRoomId)
      ).filter(
        (page) =>
          page.scopeType === targets.scope.scopeType &&
          page.scopeKey === targets.scope.scopeKey
      );
      const files = exportProjectWikiMarkdown(pages, {
        format: format ?? 'obsidian',
        scopeKey: targets.scope.scopeKey,
      });
      const connected = dataLayer.assertReadAccess(targets.pageRoomId);
      void log({
        roomId: targets.pageRoomId,
        collectionKey: connected.meta.collectionKey,
        action: 'read',
        documentCount: pages.length,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(files, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_delete_document
  // -------------------------------------------------------------------------
  tool(
    'eweser_delete_document',
    'Soft-delete a document (sets _deleted = true).',
    {
      roomId: z.string().describe('The room UUID'),
      documentId: z.string().describe('The document ID to delete'),
    },
    async ({ roomId, documentId }) => {
      const crudApi = dataLayer.getDocumentsForRoom(roomId);
      const existing = crudApi.get(documentId);

      if (!existing) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Document not found: ${documentId}`,
            },
          ],
        };
      }

      const connected = dataLayer.assertWriteAccess(roomId, existing);
      crudApi.delete(documentId);

      void log({
        roomId,
        collectionKey: connected.meta.collectionKey,
        action: 'write',
        documentCount: 1,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ deleted: true }, null, 2),
          },
        ],
      };
    }
  );
}
