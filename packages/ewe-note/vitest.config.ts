import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@eweser/db': path.resolve(__dirname, './src/test/mocks/eweser-db.ts'),
      '@eweser/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
    // Match the production bundle's y-prosemirror singleton.
    dedupe: ['y-prosemirror'],
  },
  test: {
    env: {
      // Prevent dev environment variables from leaking into tests
      VITE_AUTH_SERVER: '',
    },
    server: {
      deps: {
        // Exercise Vite's resolver so this test detects duplicate
        // y-prosemirror PluginKey instances across the TipTap extensions.
        inline: [
          '@tiptap/extension-collaboration',
          '@tiptap/extension-collaboration-cursor',
          'y-prosemirror',
        ],
      },
    },
  },
});
