import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/lib.ts'],
  format: ['esm'],
  outDir: 'dist',
  splitting: false,
  // dts generated separately via tsc (tsup dts + noExternal causes OOM)
  // noExternal: ['@eweser/shared'],
});
