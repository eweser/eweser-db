import eweserBase from '@eweser/eslint-config-react-ts';

export default [
  ...eweserBase,
  {
    files: ['./src/**/*.{ts,tsx}'],
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
