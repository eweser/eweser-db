module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
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
  },
};
