// Flat-config ESLint for kerf. Mirrors the conventions used in Hot Sheet
// (typescript-eslint + simple-import-sort) but trimmed down to what a
// runtime-only library needs.

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
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        document: 'readonly',
        window: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        DOMParser: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Node: 'readonly',
        Text: 'readonly',
        SVGElement: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // TypeScript function overloads are legitimate redeclarations; tsc --noEmit
      // catches actual redeclaration bugs, so the JS-only rule is redundant here.
      'no-redeclare': 'off',
    },
  },
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // Playwright real-browser tests run in a Node test runner that drives a
    // browser via `page.evaluate`. Both globals are available in their
    // respective execution contexts; we silence undef + console-info here.
    files: ['tests/browser/**/*.ts', 'tests/browser/**/*.tsx', 'tests/browser/**/*.mjs'],
    languageOptions: {
      globals: {
        performance: 'readonly',
        MutationObserver: 'readonly',
        MutationRecord: 'readonly',
        CompositionEvent: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        localStorage: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'examples/**',
      // eslint-plugin-kerfjs is a separate publishable package with its own
      // node_modules and lint conventions (plain ESM JS, not TS). It manages
      // its own test gate via `npm test` in eslint-plugin/.
      'eslint-plugin/**',
      // KF-123: these directories are compiled by separate `tsc -p` / esbuild
      // invocations against `dist/*.d.ts` (not by the root tsconfig used for
      // the main lint pass), so the root eslint can't resolve their
      // parserOptions.project. They get type-checked by their own dedicated
      // gates: `tsc -p tests/dist/jsx-typing/tsconfig.json` and the
      // consumer-app esbuild build inside Playwright's globalSetup.
      'tests/dist/jsx-typing/**',
      'tests/dist/consumer-app/**',
      // KF-165: each complete example app is bundled by Vite into its own
      // `tests/dist/example-apps/<name>/` directory at globalSetup time. The
      // build script + the emitted JS bundles aren't source files we lint
      // (matching the `tests/dist/consumer-app/**` pattern). The driving spec
      // at `tests/browser/example-apps.spec.ts` is still linted.
      'tests/dist/example-apps/**',
    ],
  },
];
