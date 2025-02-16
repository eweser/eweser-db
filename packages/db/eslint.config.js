import eweserBase from '@eweser/eslint-config-ts';

export default [
  ...eweserBase,
  {
    files: ['./src/**/*.ts', 'types/**/*.ts'],
  },
  {
    ignores: [
      'vite.config.*',
      'types/**/*.d.ts',
      'dist/',
      './src/setupTests.ts',
    ],
  },
];
