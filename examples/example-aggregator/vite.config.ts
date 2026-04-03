/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.EXAMPLE_AGGREGATOR_PORT ?? '38195');

export default defineConfig({
  base: '/',
  plugins: [react()],
  define: {
    global: 'window',
  },
  server: { port },
  preview: { port },
});
