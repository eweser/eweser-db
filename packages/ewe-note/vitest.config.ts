import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      // Prevent dev environment variables from leaking into tests
      VITE_AUTH_SERVER: '',
    },
  },
});
