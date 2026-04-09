import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default tseslint.config({
  extends: [eslint.configs.recommended, tseslint.configs.strict],

  languageOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    globals: {
      ...globals.browser,
      ...globals.node,
    },
  },
  plugins: {
    prettier,
  },
  rules: {
    'prettier/prettier': 'error', // Enforce consistent formatting
    'linebreak-style': 'off', // ignore overly strict linebreak style rule
    'prefer-const': 'warn', // Warn about using const instead of let. Helps to avoid accidental reassignment
    'no-console': 'error', // Allowed in server/CLI/library code; remove before commit is a convention not a gate
    '@typescript-eslint/consistent-type-imports': 'warn', // Style preference; non-blocking
    '@typescript-eslint/no-explicit-any': 'error', // Catch implicit any usage to maintain type safety
    'no-unused-vars': 'off', // typescript-eslint/no-unused-vars will cover this
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ], // Prevent accidental unused vars and clutter
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-ignore': 'allow-with-description',
        'ts-nocheck': 'allow-with-description',
      },
    ], // Require justification for bypassing type checks
  },
});
