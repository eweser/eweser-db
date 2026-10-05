import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

const state = vi.hoisted(() => ({
  layers: [] as {
    init: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }[],
  init: async () => {},
  read: async () => ({ content: [{ type: 'text' as const, text: 'ok' }] }),
}));
vi.mock('@eweser/mcp', () => ({
  DataLayer: class {
    init = vi.fn(() => state.init());
    disconnect = vi.fn(async () => {});
    constructor() {
      state.layers.push(this);
    }
  },
  registerTools: (server: McpServer) => {
    server.registerTool('test_read', { inputSchema: {} }, () => state.read());
  },
}));
vi.mock('../env.js', () => ({
  env: {
    AUTH_SERVER_URL: 'http://auth.test',
    AUTH_TRUSTED_ORIGINS: [],
    MCP_ALLOWED_ORIGINS: [],
    MCP_SESSION_MODE: 'single',
  },
}));
vi.mock('../model/oauth.js', () => ({
  getValidOAuthAccessToken: vi.fn(async () => ({
    id: 'oauth',
    userId: 'user',
    scopes: ['readwrite'],
    lastUsedAt: new Date(),
  })),
  touchOAuthAccessToken: vi.fn(),
}));
vi.mock('../model/agents.js', () => ({
  getAgentConfigByTokenHash: vi.fn(),
  hashToken: vi.fn(),
  logAgentAccess: vi.fn(),
}));
vi.mock('../model/users.js', () => ({
  getUserById: vi.fn(async () => ({ rooms: ['room'] })),
}));
vi.mock('../model/rooms/calls.js', () => ({
  getRoomsByIds: vi.fn(async () => [{ id: 'room', collectionKey: 'notes' }]),
}));
vi.mock('../model/security-events.js', () => ({ logSecurityEvent: vi.fn() }));
// Register the session-pruning interval on the test clock as well.
vi.useFakeTimers();
const { mcpRouter } = await import('./mcp.js');
const app = new Hono().route('/mcp', mcpRouter);
let id = 0;
function request(
  method = 'initialize',
  session?: string,
  signal?: AbortSignal
) {
  return app.fetch(
    new Request('http://localhost/mcp', {
      method: 'POST',
      signal,
      headers: {
        Authorization: 'Bearer test-only',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(session ? { 'mcp-session-id': session } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++id,
        method,
        params:
          method === 'initialize'
            ? {
                protocolVersion: '2025-03-26',
                capabilities: {},
                clientInfo: { name: 'test', version: '1' },
              }
            : method === 'tools/call'
              ? { name: 'test_read', arguments: {} }
              : {},
      }),
    })
  );
}
async function cancelBody(response: Response, reason?: string) {
  if (!response.body) throw new Error('Expected a streamed response');
  await response.body.cancel(reason);
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
let closeServer: ReturnType<typeof vi.spyOn>;
let closeTransport: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  state.layers.length = 0;
  state.init = async () => {};
  state.read = async () => ({ content: [{ type: 'text', text: 'ok' }] });
  closeServer = vi.spyOn(McpServer.prototype, 'close');
  closeTransport = vi.spyOn(
    WebStandardStreamableHTTPServerTransport.prototype,
    'close'
  );
});
afterEach(async () => {
  await vi.advanceTimersByTimeAsync(35 * 60_000);
  vi.restoreAllMocks();
});

describe('MCP response resource ownership', () => {
  it('releases every layer/server/transport after repeated stateless responses finish', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await request(i % 2 ? 'tools/list' : 'initialize');
      expect(response.status).toBe(200);
      expect(state.layers[i].disconnect).not.toHaveBeenCalled();
      await response.text();
      expect(state.layers[i].disconnect).toHaveBeenCalledTimes(1);
    }
    expect(closeServer).toHaveBeenCalledTimes(10);
    expect(closeTransport).toHaveBeenCalledTimes(10);
  });

  it('keeps resources usable until a delayed streamed tool result completes', async () => {
    const gate = deferred();
    state.read = async () => {
      await gate.promise;
      return { content: [{ type: 'text', text: 'late result' }] };
    };
    const response = await request('tools/call');
    expect(state.layers[0].disconnect).not.toHaveBeenCalled();
    expect(closeServer).not.toHaveBeenCalled();
    const text = response.text();
    gate.resolve();
    expect(await text).toContain('late result');
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('cleans up once on body cancellation and a subsequent request abort', async () => {
    const gate = deferred();
    state.read = async () => {
      await gate.promise;
      return { content: [{ type: 'text', text: 'late' }] };
    };
    const abort = new AbortController();
    const response = await request('tools/call', undefined, abort.signal);
    await cancelBody(response, 'client left');
    abort.abort();
    gate.resolve();
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(closeTransport).toHaveBeenCalledTimes(1);
  });

  it('cleans up when the upstream response body errors', async () => {
    vi.spyOn(
      WebStandardStreamableHTTPServerTransport.prototype,
      'handleRequest'
    ).mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          pull(controller) {
            controller.error(new Error('stream failed'));
          },
        })
      )
    );
    const response = await request();
    await expect(response.text()).rejects.toThrow('stream failed');
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(closeTransport).toHaveBeenCalledTimes(1);
  });

  it('cleans up a partially initialized layer when setup rejects', async () => {
    state.init = async () => {
      throw new Error('init failed');
    };
    const response = await request();
    expect(response.status).toBe(500);
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('closes both server and transport if connecting the transport rejects', async () => {
    vi.spyOn(
      WebStandardStreamableHTTPServerTransport.prototype,
      'start'
    ).mockRejectedValueOnce(new Error('start failed'));
    expect((await request()).status).toBe(500);
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(closeTransport).toHaveBeenCalledTimes(1);
  });

  it('releases the layer on abort during initialization without starting a server', async () => {
    const gate = deferred();
    state.init = () => gate.promise;
    const abort = new AbortController();
    const pending = request('initialize', undefined, abort.signal);
    await vi.waitFor(() => expect(state.layers).toHaveLength(1));
    abort.abort();
    gate.resolve();
    expect((await pending).status).toBe(500);
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(closeServer).not.toHaveBeenCalled();
  });

  it('does not close another overlapping stateless request', async () => {
    const gate = deferred();
    state.read = async () => {
      await gate.promise;
      return { content: [{ type: 'text', text: 'still active' }] };
    };
    const first = await request('tools/call');
    const second = await request('tools/call');
    await cancelBody(first);
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(state.layers[1].disconnect).not.toHaveBeenCalled();
    gate.resolve();
    expect(await second.text()).toContain('still active');
    expect(state.layers[1].disconnect).toHaveBeenCalledTimes(1);
  });

  it('preserves a shared cached layer across cancellation and idle pruning while a request is active', async () => {
    const session = `cached-${id}`;
    await (await request('initialize', session)).text();
    const gate = deferred();
    state.read = async () => {
      await gate.promise;
      return { content: [{ type: 'text', text: 'shared result' }] };
    };
    const first = await request('tools/call', session);
    const second = await request('tools/call', session);
    await cancelBody(first);
    await vi.advanceTimersByTimeAsync(35 * 60_000);
    expect(state.layers).toHaveLength(1);
    expect(state.layers[0].disconnect).not.toHaveBeenCalled();
    gate.resolve();
    expect(await second.text()).toContain('shared result');
    expect(state.layers[0].disconnect).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(35 * 60_000);
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
  });
  it('cleans up when request handling rejects or returns a bodyless response', async () => {
    const handle = vi.spyOn(
      WebStandardStreamableHTTPServerTransport.prototype,
      'handleRequest'
    );
    handle.mockRejectedValueOnce(new Error('request failed'));
    expect((await request()).status).toBe(500);
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
    handle.mockResolvedValueOnce(new Response(null, { status: 202 }));
    expect((await request()).status).toBe(202);
    expect(state.layers[1].disconnect).toHaveBeenCalledTimes(1);
    expect(closeServer).toHaveBeenCalledTimes(2);
    expect(closeTransport).toHaveBeenCalledTimes(2);
  });

  it('releases an active response when only the request signal aborts', async () => {
    const gate = deferred();
    state.read = async () => {
      await gate.promise;
      return { content: [{ type: 'text', text: 'late' }] };
    };
    const abort = new AbortController();
    const response = await request('tools/call', undefined, abort.signal);
    const consuming = response.text();
    const rejected = expect(consuming).rejects.toThrow();
    abort.abort();
    await rejected;
    await vi.advanceTimersByTimeAsync(0);
    gate.resolve();
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(closeTransport).toHaveBeenCalledTimes(1);
  });

  it('disposes a duplicate layer when overlapping setups create the same cached session', async () => {
    const gates = [deferred(), deferred()];
    let next = 0;
    state.init = () => gates[next++].promise;
    const session = `concurrent-setup-${id}`;
    const first = request('initialize', session);
    const second = request('initialize', session);
    await vi.waitFor(() => expect(state.layers).toHaveLength(2));
    gates[0].resolve();
    const firstResponse = await first;
    gates[1].resolve();
    const secondResponse = await second;
    expect(state.layers[0].disconnect).not.toHaveBeenCalled();
    expect(state.layers[1].disconnect).toHaveBeenCalledTimes(1);
    await firstResponse.text();
    await secondResponse.text();
    expect(state.layers[0].disconnect).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(35 * 60_000);
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(state.layers[1].disconnect).toHaveBeenCalledTimes(1);
  });
  it('still releases server and transport when another resource cleanup rejects', async () => {
    const response = await request();
    state.layers[0].disconnect.mockRejectedValueOnce(
      new Error('disconnect failed')
    );
    await response.text();
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(closeTransport).toHaveBeenCalledTimes(1);
  });
  it('cancels a response returned after request abort during handling', async () => {
    let resolveResponse!: (response: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const handle = vi
      .spyOn(
        WebStandardStreamableHTTPServerTransport.prototype,
        'handleRequest'
      )
      .mockReturnValueOnce(pendingResponse);
    const abort = new AbortController();
    const pending = request('initialize', undefined, abort.signal);
    await vi.waitFor(() => expect(handle).toHaveBeenCalled());
    abort.abort();
    const cancel = vi.fn();
    resolveResponse(new Response(new ReadableStream({ cancel })));
    expect((await pending).status).toBe(500);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(state.layers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(closeTransport).toHaveBeenCalledTimes(1);
  });
});
