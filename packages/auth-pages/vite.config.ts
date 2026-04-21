import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const authServerTarget =
  process.env.VITE_AUTH_SERVER_URL ?? 'http://127.0.0.1:38101';

export default defineConfig({
  base: '/auth/',
  plugins: [react()],
  preview: {
    port: 3001,
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        target: authServerTarget,
      },
    },
  },
});
