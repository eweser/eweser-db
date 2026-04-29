import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
  devToolbar: {
    enabled: false,
  },
  build: {
    assets: 'assets',
  },
});
