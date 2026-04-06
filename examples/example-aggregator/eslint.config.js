import eweserBase from '@eweser/eslint-config-react-ts';

export default [
  ...eweserBase,
  {
    ignores: ['vite.config.*', 'dist/'],
  },
];
