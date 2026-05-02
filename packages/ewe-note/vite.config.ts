import { defineConfig } from 'vite';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      injectRegister: false,
      manifest: false,
      registerType: 'prompt',
      scope: '/',
      includeAssets: [
        'favicon.ico',
        'eweser-logo.svg',
        'eweser-logo-white.svg',
        'manifest.webmanifest',
        'android/android-launchericon-192-192.png',
        'android/android-launchericon-512-512.png',
        'ios/180.png',
        'windows11/SplashScreen.scale-200.png',
      ],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        globPatterns: ['**/*.{css,html,ico,js,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/sync(?:\/|$)/],
        skipWaiting: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5181,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:38101',
        changeOrigin: true,
      },
      '/ping': {
        target: 'http://localhost:38101',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['yjs'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            id.includes('/@tiptap/') ||
            id.includes('/prosemirror-') ||
            id.includes('/yjs/') ||
            id.includes('/y-pro')
          ) {
            return 'vendor-editor';
          }
          if (id.includes('/@radix-ui/')) return 'vendor-radix';
          if (id.includes('/react') || id.includes('/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('/recharts/') || id.includes('/d3-')) {
            return 'vendor-charts';
          }
          return undefined;
        },
      },
    },
  },
});
