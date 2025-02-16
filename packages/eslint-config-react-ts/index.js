import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

export default tseslint
  .config({
    extends: [eslint.configs.recommended, tseslint.configs.recommended],

    plugins: {
      react,
      // '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    rules: {
      'no-console': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
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
      'prefer-const': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn', // Require consistent use of type imports
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off', // typescript-eslint/no-unused-vars will cover this, and wont throw errors for unused variables in function parameters for ts types
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ], // Warn about unused variables to avoid leaving them in the code accidentally and creating clutter.
      '@typescript-eslint/ban-ts-comment': 'off', // Allow ts-ignore comments to turn off type checking when needed
    },
  })
  .concat(eslintPluginPrettier);
