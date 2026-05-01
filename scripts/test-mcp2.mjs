#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const mcp = spawn(
  'node',
  [
    fileURLToPath(
      new URL('../packages/mcp-server/dist/index.js', import.meta.url)
    ),
  ],
  {
    env: {
      ...process.env,
      EWESER_AGENT_TOKEN:
        process.env.EWESER_AGENT_TOKEN ?? 'test-agent-token-not-real',
      EWESER_AUTH_URL: 'http://localhost:38101',
      EWESER_AGGREGATOR_URL: 'http://localhost:38190',
      EWESER_SYNC_URL: 'ws://localhost:38181/sync',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  }
);

let out = '';
const startTime = Date.now();

mcp.stdout.on('data', (d) => {
  out += d.toString();
  process.stdout.write('OUT(' + (Date.now() - startTime) + 'ms):' + d);
});
mcp.stderr.on('data', (d) => {
  process.stderr.write('ERR(' + (Date.now() - startTime) + 'ms):' + d);
});
mcp.on('exit', (code) => {
  process.stdout.write(
    'EXIT:' + code + ' after ' + (Date.now() - startTime) + 'ms\n'
  );
  process.exit(code ?? 0);
});

// Check progress every 5 seconds
const interval = setInterval(() => {
  process.stdout.write(
    'WAITING... ' + (Date.now() - startTime) + 'ms elapsed\n'
  );
}, 5000);

// Send messages after 35s
setTimeout(async () => {
  clearInterval(interval);
  process.stdout.write(
    '--- Sending initialize after ' + (Date.now() - startTime) + 'ms\n'
  );
  const init = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    },
  });
  mcp.stdin.write(init + '\n');

  await new Promise((r) => setTimeout(r, 1000));
  process.stdout.write('--- Sending tools/list...\n');
  mcp.stdin.write(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    }) + '\n'
  );

  await new Promise((r) => setTimeout(r, 2000));
  process.stdout.write('--- Sending eweser_list_rooms...\n');
  mcp.stdin.write(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'eweser_list_rooms', arguments: {} },
    }) + '\n'
  );

  await new Promise((r) => setTimeout(r, 2000));
  process.stdout.write('--- Sending eweser_search priorities...\n');
  mcp.stdin.write(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'eweser_search', arguments: { query: 'priorities' } },
    }) + '\n'
  );

  await new Promise((r) => setTimeout(r, 5000));
  process.stdout.write('--- Killing MCP, out.length=' + out.length + '\n');
  mcp.kill();
  process.exit(0);
}, 35000);
