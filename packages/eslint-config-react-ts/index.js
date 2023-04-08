module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  overrides: [],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', '@typescript-eslint'],
  rules: {
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
  ignorePatterns: ['.eslintrc.js'],
};
