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
        process.env.EWESER_AGENT_TOKEN ??
        'a7f886f07a6f0a36f98e37cf47e7bd3a35ca2c88fb9f6979db0c9559bb5ebd00',
      EWESER_AUTH_URL: 'http://localhost:38101',
      EWESER_AGGREGATOR_URL: 'http://localhost:38190',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  }
);

let out = '';
const startTime = Date.now();

mcp.stdout.on('data', (d) => {
  out += d.toString();
  process.stdout.write('OUT:' + d);
});
mcp.stderr.on('data', (d) => process.stderr.write('ERR:' + d));
mcp.on('exit', (code) => {
  process.stdout.write(
    'EXIT:' + code + ' after ' + (Date.now() - startTime) + 'ms\n'
  );
});

// Send initialize then tools/list then eweser_search
const sendMessages = async () => {
  await new Promise((r) => setTimeout(r, 500));
  process.stdout.write('--- Sending initialize...\n');
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
  const list = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  });
  mcp.stdin.write(list + '\n');

  await new Promise((r) => setTimeout(r, 2000));
  process.stdout.write('--- Sending eweser_search...\n');
  const search = JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'eweser_search', arguments: { query: 'priorities' } },
  });
  mcp.stdin.write(search + '\n');

  await new Promise((r) => setTimeout(r, 3000));
  process.stdout.write('--- Done. Killing MCP.\n');
  process.stdout.write('Total output length: ' + out.length + '\n');
  mcp.kill();
  process.exit(0);
};

process.stdout.write('Starting MCP server...\n');
// Give MCP time to connect to rooms (max 30s per room)
setTimeout(() => sendMessages(), 10000);

// Safety timeout
setTimeout(() => {
  process.stdout.write('SAFETY TIMEOUT after 75s\n');
  mcp.kill();
  process.exit(1);
}, 75000);
