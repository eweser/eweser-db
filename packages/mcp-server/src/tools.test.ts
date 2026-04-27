import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DataLayer } from './data-layer.js';

// ---------------------------------------------------------------------------
// Mock DataLayer
// ---------------------------------------------------------------------------

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

// Capture tool registrations so we can invoke them directly in tests
const registeredTools = new Map<string, ToolHandler>();

const mockServer = {
  tool: vi.fn(
    (
      name: string,
      _description: string,
      _schema: unknown,
      handler: ToolHandler
    ) => {
      registeredTools.set(name, handler);
    }
  ),
} as unknown as McpServer;

const mockLog = vi.fn().mockResolvedValue(undefined);

const mockRoom = {
  id: 'room-1',
  name: 'My Notes',
  collectionKey: 'notes',
  syncUrl: 'ws://localhost:1234',
  syncBaseUrl: null,
};

const mockConnectedRoom = {
  meta: mockRoom,
  ydoc: {},
  provider: {},
  syncToken: 'token',
  tokenExpiry: new Date(Date.now() + 3600_000),
};

const mockDoc1 = {
  _id: 'doc-1',
  _ref: 'notes/room-1/doc-1',
  _created: '2024-01-01T00:00:00.000Z',
  _updated: '2024-01-01T00:00:00.000Z',
  _deleted: false,
  text: 'Hello world',
};

const mockCrudApi = {
  get: vi.fn((id: string) => (id === 'doc-1' ? mockDoc1 : undefined)),
  set: vi.fn((doc: unknown) => doc),
  new: vi.fn(() => ({ ...mockDoc1, _id: 'new-doc' })),
  delete: vi.fn(),
  getAll: vi.fn(() => [mockDoc1]),
};

const mockDataLayer = {
  listRooms: vi.fn(() => [mockRoom]),
  assertReadAccess: vi.fn(() => mockConnectedRoom),
  assertWriteAccess: vi.fn(() => mockConnectedRoom),
  getRawDocuments: vi.fn(() => ({ 'doc-1': mockDoc1 })),
  getDocumentsForRoom: vi.fn(() => mockCrudApi),
  getAgentToken: vi.fn(() => 'mock-agent-token'),
  searchDocuments: vi.fn(() => [
    { roomId: 'room-1', document: mockDoc1, score: 1 },
  ]),
} as unknown as DataLayer;

// ---------------------------------------------------------------------------
// Import and initialize tools
// ---------------------------------------------------------------------------
import { registerTools } from './tools.js';

beforeEach(() => {
  registeredTools.clear();
  vi.clearAllMocks();
  // Re-mock log on each run
  mockLog.mockResolvedValue(undefined);
  // Register all tools fresh
  registerTools(mockServer, mockDataLayer, mockLog);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function callTool(name: string, args: Record<string, unknown> = {}) {
  const handler = registeredTools.get(name);
  if (!handler) throw new Error(`Tool not registered: ${name}`);
  return handler(args);
}

// ---------------------------------------------------------------------------
// eweser_list_rooms
// ---------------------------------------------------------------------------
describe('eweser_list_rooms', () => {
  it('returns all rooms when no filter', async () => {
    const result = await callTool('eweser_list_rooms');
    expect(result.isError).toBeFalsy();
    const rooms = JSON.parse(result.content[0].text);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].id).toBe('room-1');
  });

  it('passes collectionKey filter to dataLayer', async () => {
    await callTool('eweser_list_rooms', { collectionKey: 'notes' });
    expect(mockDataLayer.listRooms).toHaveBeenCalledWith('notes');
  });
});

// ---------------------------------------------------------------------------
// eweser_list_documents
// ---------------------------------------------------------------------------
describe('eweser_list_documents', () => {
  it('returns document summaries', async () => {
    const result = await callTool('eweser_list_documents', {
      roomId: 'room-1',
      limit: 50,
    });
    expect(result.isError).toBeFalsy();
    const docs = JSON.parse(result.content[0].text);
    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe('doc-1');
  });

  it('calls assertReadAccess with roomId', async () => {
    await callTool('eweser_list_documents', { roomId: 'room-1', limit: 50 });
    expect(mockDataLayer.assertReadAccess).toHaveBeenCalledWith('room-1');
  });
});

// ---------------------------------------------------------------------------
// eweser_read_document
// ---------------------------------------------------------------------------
describe('eweser_read_document', () => {
  it('returns document JSON on success', async () => {
    const result = await callTool('eweser_read_document', {
      roomId: 'room-1',
      documentId: 'doc-1',
    });
    expect(result.isError).toBeFalsy();
    const doc = JSON.parse(result.content[0].text);
    expect(doc._id).toBe('doc-1');
  });

  it('returns isError when document not found', async () => {
    const result = await callTool('eweser_read_document', {
      roomId: 'room-1',
      documentId: 'missing',
    });
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// eweser_search
// ---------------------------------------------------------------------------
describe('eweser_search', () => {
  it('returns in-memory search results when no aggregator configured', async () => {
    const result = await callTool('eweser_search', { query: 'hello' });
    expect(result.isError).toBeFalsy();
    // In-memory fallback uses searchDocuments which returns raw results array
    const text = result.content[0].text;
    const results = JSON.parse(text);
    expect(results).toHaveLength(1);
    expect(results[0].document._id).toBe('doc-1');
  });

  it('passes collectionKey filter to searchDocuments fallback', async () => {
    await callTool('eweser_search', {
      query: 'hello',
      filters: { collectionKey: ['notes'] },
    });
    expect(mockDataLayer.searchDocuments).toHaveBeenCalledWith(
      'hello',
      'notes'
    );
  });
});

// ---------------------------------------------------------------------------
// eweser_create_document
// ---------------------------------------------------------------------------
describe('eweser_create_document', () => {
  it('creates a document and returns its id', async () => {
    const result = await callTool('eweser_create_document', {
      roomId: 'room-1',
      data: { text: 'New note' },
    });
    expect(result.isError).toBeFalsy();
    const res = JSON.parse(result.content[0].text);
    expect(res.created).toBe(true);
    expect(res.id).toBe('new-doc');
  });

  it('calls assertWriteAccess', async () => {
    await callTool('eweser_create_document', {
      roomId: 'room-1',
      data: { text: 'x' },
    });
    expect(mockDataLayer.assertWriteAccess).toHaveBeenCalledWith('room-1', {
      text: 'x',
    });
  });
});

// ---------------------------------------------------------------------------
// eweser_update_document
// ---------------------------------------------------------------------------
describe('eweser_update_document', () => {
  it('updates a document', async () => {
    const result = await callTool('eweser_update_document', {
      roomId: 'room-1',
      documentId: 'doc-1',
      updates: { text: 'Updated' },
    });
    expect(result.isError).toBeFalsy();
  });

  it('returns isError when document not found', async () => {
    const result = await callTool('eweser_update_document', {
      roomId: 'room-1',
      documentId: 'missing',
      updates: {},
    });
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// eweser_delete_document
// ---------------------------------------------------------------------------
describe('eweser_delete_document', () => {
  it('deletes a document and returns confirmation', async () => {
    const result = await callTool('eweser_delete_document', {
      roomId: 'room-1',
      documentId: 'doc-1',
    });
    expect(result.isError).toBeFalsy();
    const res = JSON.parse(result.content[0].text);
    expect(res.deleted).toBe(true);
    expect(mockCrudApi.delete).toHaveBeenCalledWith('doc-1');
  });

  it('enforces write access', async () => {
    await callTool('eweser_delete_document', {
      roomId: 'room-1',
      documentId: 'doc-1',
    });
    expect(mockDataLayer.assertWriteAccess).toHaveBeenCalledWith(
      'room-1',
      mockDoc1
    );
  });
});

// ---------------------------------------------------------------------------
// eweser_save_memory
// ---------------------------------------------------------------------------
describe('eweser_save_memory', () => {
  it('creates a conversation document with required fields', async () => {
    const result = await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Decision: Hono over Express',
      summary: 'Chose Hono for auth server — smaller bundle, native fetch.',
      memoryType: 'decision',
    });
    expect(result.isError).toBeFalsy();
    const res = JSON.parse(result.content[0].text);
    expect(res.created).toBe(true);
    expect(mockCrudApi.new).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Decision: Hono over Express',
        summary: 'Chose Hono for auth server — smaller bundle, native fetch.',
        memoryType: 'decision',
        agentId: 'unknown',
        tags: ['worktree:mcp-server'],
      })
    );
  });

  it('auto-sets agentId from caller and date to today', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'PA session',
      summary: 'Discussed deployment.',
      memoryType: 'session',
      agentId: 'openclaw-pa',
    });
    expect(mockCrudApi.new).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'openclaw-pa', date: today })
    );
  });

  it('caps turns at 100 with truncation marker', async () => {
    const many = Array.from({ length: 120 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `turn ${i}`,
      timestamp: new Date().toISOString(),
    }));
    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Long session',
      summary: 'Many turns.',
      memoryType: 'session',
      turns: many,
    });
    const call = mockCrudApi.new.mock.calls[0][0] as { turns: unknown[] };
    // 100 actual turns + 1 truncation marker = 101
    expect(call.turns).toHaveLength(101);
    const firstTurn = call.turns[0] as { content: string };
    expect(firstTurn.content).toMatch(/20 turns truncated/);
  });

  it('enforces write access', async () => {
    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Test',
      summary: 'Test.',
      memoryType: 'memory',
    });
    expect(mockDataLayer.assertWriteAccess).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({
        title: 'Test',
        memoryType: 'memory',
      })
    );
  });

  it('logs access after creation', async () => {
    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Bookmark',
      summary: 'Useful link.',
      memoryType: 'bookmark',
    });
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'room-1', action: 'write' })
    );
  });
});

// ---------------------------------------------------------------------------
// eweser_save_memory
// ---------------------------------------------------------------------------
describe('eweser_save_memory', () => {
  it('creates a conversation doc and returns id', async () => {
    const result = await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Decision: Use Hono',
      summary: 'Decided to use Hono for auth server.',
      memoryType: 'decision',
    });
    expect(result.isError).toBeFalsy();
    const res = JSON.parse(result.content[0].text);
    expect(res.created).toBe(true);
    expect(res.id).toBe('new-doc');
  });

  it('calls assertWriteAccess', async () => {
    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Test',
      summary: 'A test memory',
      memoryType: 'memory',
    });
    expect(mockDataLayer.assertWriteAccess).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({
        title: 'Test',
        memoryType: 'memory',
      })
    );
  });

  it('defaults agentId to "unknown" when not provided', async () => {
    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Test',
      summary: 'A test memory',
      memoryType: 'memory',
    });
    const callArgs = mockCrudApi.new.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    expect(callArgs?.agentId).toBe('unknown');
  });

  it('adds a worktree tag when saving memories', async () => {
    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Test',
      summary: 'A test memory',
      memoryType: 'session',
    });

    const callArgs = mockCrudApi.new.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    const tags = callArgs?.tags as string[] | undefined;

    expect(Array.isArray(tags)).toBe(true);
    expect(tags?.some((tag) => tag.startsWith('worktree:'))).toBe(true);
  });

  it('uses provided agentId', async () => {
    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Test',
      summary: 'A test memory',
      memoryType: 'session',
      agentId: 'copilot',
    });
    const callArgs = mockCrudApi.new.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    expect(callArgs?.agentId).toBe('copilot');
  });

  it('caps turns to last 100 with truncation marker', async () => {
    const turns = Array.from({ length: 120 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Turn ${i}`,
      timestamp: new Date().toISOString(),
    })) as Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
    }>;

    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Long session',
      summary: 'Session with many turns',
      memoryType: 'session',
      turns,
    });

    const callArgs = mockCrudApi.new.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    const savedTurns = callArgs?.turns as Array<{ content: string }>;
    // 1 truncation marker + 100 turns = 101
    expect(savedTurns).toHaveLength(101);
    expect(savedTurns[0].content).toContain('truncated');
    expect(savedTurns[savedTurns.length - 1].content).toBe('Turn 119');
  });

  it('passes through turns unchanged when within limit', async () => {
    const turns = [
      {
        role: 'user' as const,
        content: 'hello',
        timestamp: '2025-01-01T00:00:00.000Z',
      },
      {
        role: 'assistant' as const,
        content: 'world',
        timestamp: '2025-01-01T00:00:01.000Z',
      },
    ];
    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Short session',
      summary: 'Brief exchange',
      memoryType: 'session',
      turns,
    });
    const callArgs = mockCrudApi.new.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    expect(callArgs?.turns).toHaveLength(2);
  });

  it('redacts secret-like content before saving memory', async () => {
    const accessKey = `AKIA${'1234567890ABCDEF'}`;
    await callTool('eweser_save_memory', {
      roomId: 'room-1',
      title: 'Incident note',
      summary: `Rotated AWS_ACCESS_KEY_ID=${accessKey} and token=super-secret-value`,
      memoryType: 'session',
      turns: [
        {
          role: 'user' as const,
          content: `aws_${'secret'}_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`,
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      ],
    });

    const callArgs = mockCrudApi.new.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    const turns = callArgs?.turns as Array<{ content: string }>;

    expect(callArgs?.summary).toContain('[REDACTED_SECRET]');
    expect(callArgs?.summary).not.toContain(accessKey);
    expect(turns[0].content).toBe('[REDACTED_SECRET]');
    expect(callArgs?.redactionWarnings).toEqual([
      'secret-like content redacted before save',
    ]);
  });
});
