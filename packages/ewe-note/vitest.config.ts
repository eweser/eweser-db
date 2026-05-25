import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@eweser/db': path.resolve(__dirname, './src/test/mocks/eweser-db.ts'),
      '@eweser/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  test: {
    env: {
      // Prevent dev environment variables from leaking into tests
      VITE_AUTH_SERVER: '',
    },
  },
});
