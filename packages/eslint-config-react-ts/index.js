import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

export default tseslint
  .config({
    extends: [eslint.configs.recommended, tseslint.configs.strict],

    plugins: {
      react,
      // '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    rules: {
      'no-console': 'warn', // Allow console for debugging; warn to encourage removal
      'react-hooks/rules-of-hooks': 'error', // Critical for correct React behavior
      'react-hooks/exhaustive-deps': 'error', // Catch dependency bugs early
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'prettier/prettier': 'error', // Enforce consistent formatting
      'linebreak-style': 'off', // ignore overly strict linebreak style rule
      'prefer-const': 'warn', // Style preference; non-blocking
      '@typescript-eslint/consistent-type-imports': 'warn', // Style preference; non-blocking
      '@typescript-eslint/no-explicit-any': 'error', // Catch implicit any usage
      'no-unused-vars': 'off', // typescript-eslint/no-unused-vars will cover this
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ], // Prevent accidental unused vars
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': 'allow-with-description',
        },
      ], // Require justification for bypassing type checks
    },
  })
  .concat(eslintPluginPrettier);
