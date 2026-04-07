import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  splitting: false,
  // Bundle @eweser/shared inline so Node.js ESM dir-import issues in shared/dist
  // don't affect the mcp-server at runtime.
  noExternal: ['@eweser/shared'],
});
