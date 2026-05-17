import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const authServerTarget =
  process.env.VITE_AUTH_SERVER_URL ?? 'http://127.0.0.1:38101';
const authPagesPort = Number(
  process.env.AUTH_PAGES_PORT ?? process.env.VITE_AUTH_PAGES_PORT ?? '3001'
);

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@eweser/db': resolve(__dirname, '../db/src/index.ts'),
      '@eweser/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  preview: {
    port: authPagesPort,
  },
  server: {
    port: authPagesPort,
    proxy: {
      '/api': {
        changeOrigin: true,
        target: authServerTarget,
      },
    },
  },
});
