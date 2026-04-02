import eweserBase from '@eweser/eslint-config-ts';

export default [
  ...eweserBase,
  {
    files: ['./src/**/*.ts'],
  },
  {
    ignores: ['dist/', 'drizzle/'],
  },
];
