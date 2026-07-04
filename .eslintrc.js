// .eslintrc.js
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: __dirname,
      sourceType: 'module',
    },
    extends: ['next/core-web-vitals'],
    rules: {
      '@next/next/no-img-element': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  }
