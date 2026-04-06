import { defineConfig } from 'vite';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/notes/',
  plugins: [
    react(),
    VitePWA({
      injectRegister: false,
      manifest: false,
      registerType: 'prompt',
      scope: '/notes/',
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
        navigateFallback: '/notes/index.html',
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
  optimizeDeps: {
    include: ['yjs'],
  },
});
