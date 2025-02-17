import eweserBase from '@eweser/eslint-config-react-ts';

export default [
  ...eweserBase,
  {
    files: ['./src/'],
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
