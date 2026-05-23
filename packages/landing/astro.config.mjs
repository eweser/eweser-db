import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
  devToolbar: {
    enabled: false,
  },
  vite: {
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
  build: {
    assets: 'assets',
  },
});
