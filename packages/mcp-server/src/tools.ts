/**
 * MCP Tool definitions for EweserDB.
 * Each tool wraps DataLayer methods with Zod validation.
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DataLayer } from './data-layer.js';
import type { EweDocument } from '@eweser/shared';

type LogFn = (entry: {
  roomId: string;
  collectionKey: string;
  action: 'read' | 'write';
  documentCount?: number;
}) => Promise<void>;

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

export function registerTools(
  server: McpServer,
  dataLayer: DataLayer,
  log: LogFn,
  aggregatorUrl?: string
): void {
  // -------------------------------------------------------------------------
  // eweser_list_rooms
  // -------------------------------------------------------------------------

  // @ts-ignore TS2589: deep Zod overload inference
  server.tool(
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
  // @ts-ignore TS2589: deep Zod overload inference
  server.tool(
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
  server.tool(
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
  server.tool(
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
            return {
              content: [
                { type: 'text' as const, text: formatted },
                { type: 'text' as const, text: JSON.stringify(data.results) },
              ],
            };
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
        .slice(0, 10);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------------------
  // eweser_create_document
  // -------------------------------------------------------------------------
  // @ts-ignore TS2589: deep Zod overload inference
  server.tool(
    'eweser_create_document',
    'Create a new document in a room.',
    {
      roomId: z.string().describe('The room UUID'),
      data: z
        .record(z.unknown())
        .describe('Document fields (excluding metadata)'),
    },
    async ({ roomId, data }) => {
      const connected = dataLayer.assertWriteAccess(roomId);
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
  server.tool(
    'eweser_update_document',
    'Update fields on an existing document.',
    {
      roomId: z.string().describe('The room UUID'),
      documentId: z.string().describe('The document ID to update'),
      updates: z.record(z.unknown()).describe('Fields to update'),
    },
    async ({ roomId, documentId, updates }) => {
      const connected = dataLayer.assertWriteAccess(roomId);
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

      const updated = crudApi.set({ ...existing, ...updates } as EweDocument);

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
  // @ts-ignore TS2589: deep Zod overload inference
  server.tool(
    'eweser_save_memory',
    'Save a memory note, session summary, decision, or bookmark to a conversations room. ' +
      'A convenience wrapper around eweser_create_document with sensible defaults for AI agents. ' +
      'Requires readwrite access on the target room (collectionKey: "conversations"). ' +
      'Keep summary concise — ideally under 500 tokens.',
    {
      roomId: z.string().describe('The conversations room UUID to write to'),
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
    }) => {
      const connected = dataLayer.assertWriteAccess(roomId);
      const crudApi = dataLayer.getDocumentsForRoom(roomId);

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

      const docData = {
        title,
        summary,
        memoryType,
        agentId: agentId ?? 'unknown',
        date: date ?? new Date().toISOString().slice(0, 10),
        tags: tags ?? [],
        ...(cappedTurns !== undefined && { turns: cappedTurns }),
        ...(relatedDocIds !== undefined && { relatedDocIds }),
      };

      const newDoc = crudApi.new(docData as Parameters<typeof crudApi.new>[0]);

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
  // eweser_delete_document
  // -------------------------------------------------------------------------
  server.tool(
    'eweser_delete_document',
    'Soft-delete a document (sets _deleted = true).',
    {
      roomId: z.string().describe('The room UUID'),
      documentId: z.string().describe('The document ID to delete'),
    },
    async ({ roomId, documentId }) => {
      const connected = dataLayer.assertWriteAccess(roomId);
      const crudApi = dataLayer.getDocumentsForRoom(roomId);
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
