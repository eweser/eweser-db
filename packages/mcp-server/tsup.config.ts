import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/lib.ts'],
  format: ['esm'],
  outDir: 'dist',
  splitting: false,
  dts: true,
  // Bundle @eweser/shared inline so Node.js ESM dir-import issues in shared/dist
  // don't affect the mcp-server at runtime.
  noExternal: ['@eweser/shared'],
});
