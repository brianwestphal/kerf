import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/scripts/**/*.ts', 'src/scripts/**/*.tsx', 'tests/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
];
