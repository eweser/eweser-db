module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['@eweser/eslint-config'],
  overrides: [
    {
      files: ['*.ts'],
      extends: ['plugin:@typescript-eslint/recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      parser: '@typescript-eslint/parser',

      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/consistent-type-imports': 'warn', // Require consistent use of type imports
        '@typescript-eslint/no-explicit-any': 'off',
        'no-unused-vars': 'off', // typescript-eslint/no-unused-vars will cover this, and wont throw errors for unused variables in function parameters for ts types
        '@typescript-eslint/no-unused-vars': [
          'warn',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ], // Warn about unused variables to avoid leaving them in the code accidentally and creating clutter.
        '@typescript-eslint/ban-ts-comment': 'off', // Allow ts-ignore comments to turn off type checking when needed
      },
    },
  ],
  ignorePatterns: ['vite.config.*', 'types/**/*.d.ts'],
};
