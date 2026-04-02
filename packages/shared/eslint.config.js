import eweserBase from '@eweser/eslint-config-ts';

export default [
  ...eweserBase,
  {
    files: ['./src/**/*.ts'],
  },
  {
    ignores: [
      'vite.config.*',
      'types/**/*.d.ts',
      'dist/',
      'setupTests.ts',
      '.eslintrc.cjs',
    ],
  },
];
