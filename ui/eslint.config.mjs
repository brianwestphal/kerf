import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', project: './tsconfig.json', ecmaFeatures: { jsx: true } },
      globals: {
        document: 'readonly', window: 'readonly', customElements: 'readonly', HTMLElement: 'readonly', Element: 'readonly',
        Event: 'readonly', KeyboardEvent: 'readonly', PointerEvent: 'readonly', CSSStyleDeclaration: 'readonly', console: 'readonly',
        URL: 'readonly', URLSearchParams: 'readonly', location: 'readonly', history: 'readonly', performance: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tsPlugin, 'simple-import-sort': simpleImportSort },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['dist/**', 'dist-demo/**', 'node_modules/**', 'test-results/**'] },
];
