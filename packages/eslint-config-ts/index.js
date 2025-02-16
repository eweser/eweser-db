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
    'prettier/prettier': [
      'warn',
      {
        trailingComma: 'es5',
        tabWidth: 2,
        semi: true,
        singleQuote: true,
      },
    ],
    'linebreak-style': 'off', // ignore overly strict linebreak style rule
    'prefer-const': 'warn', // Warn about using const instead of let. Helps to avoid accidental reassignment
    'no-console': 'warn',
    '@typescript-eslint/consistent-type-imports': 'warn', // Require consistent use of type imports
    '@typescript-eslint/no-explicit-any': 'off',
    'no-unused-vars': 'off', // typescript-eslint/no-unused-vars will cover this, and wont throw errors for unused variables in function parameters for ts types
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ], // Warn about unused variables to avoid leaving them in the code accidentally and creating clutter.
    '@typescript-eslint/ban-ts-comment': 'off', // Allow ts-ignore comments to turn off type checking when needed
  },
});
