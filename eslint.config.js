import eweserTs from '@eweser/eslint-config-ts';
import eweserReact from '@eweser/eslint-config-react-ts';

export default [
  // Global ignores — these directories are excluded from root linting
  {
    ignores: [
      // Next.js auth-server is being migrated — skip for now
      'packages/auth-server/**',
      // React Native uses a different toolchain
      'examples/react-native/**',
      // Old/archived code
      'old-code/**',
      // Build outputs, type stubs, generated files
      '**/dist/**',
      '**/build/**',
      '**/types/**',
      '**/*.d.ts',
      '**/node_modules/**',
      // Vite/build configs (not part of app source)
      '**/vite.config.*',
      '**/vitest.config.*',
      // ESLint config packages themselves (they export config, not app code)
      'packages/eslint-config-ts/**',
      'packages/eslint-config-react-ts/**',
      // Test RPC server (not a maintained package)
      'test-rpc-server/**',
      // Legacy config files in packages that have been migrated
      '**/.eslintrc.*',
      '**/eslint.config.js',
    ],
  },
  // TypeScript-only packages
  ...eweserTs.map((config) => ({
    ...config,
    files: [
      ...(config.files ?? []),
      'packages/shared/src/**/*.ts',
      'packages/db/src/**/*.ts',
      'packages/auth-server-hono/src/**/*.ts',
      'packages/sync-server/src/**/*.ts',
      'packages/aggregator/src/**/*.ts',
      'packages/mcp-server/src/**/*.ts',
      'scripts/**/*.ts',
    ],
  })),
  // React + TypeScript packages
  ...eweserReact.map((config) => ({
    ...config,
    files: [
      ...(config.files ?? []),
      'packages/auth-pages/src/**/*.{ts,tsx}',
      'packages/ewe-note/src/**/*.{ts,tsx}',
      'packages/examples-components/src/**/*.{ts,tsx}',
      'examples/example-basic/src/**/*.{ts,tsx}',
      'examples/example-multi-room/src/**/*.{ts,tsx}',
      'examples/example-interop-notes/src/**/*.{ts,tsx}',
      'examples/example-interop-flashcards/src/**/*.{ts,tsx}',
      'examples/example-aggregator/src/**/*.{ts,tsx}',
      'e2e/cypress/**/*.ts',
    ],
  })),
  // CLI scripts and startup validation — console output is intentional
  {
    files: ['scripts/**/*.ts', 'packages/aggregator/src/env.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
