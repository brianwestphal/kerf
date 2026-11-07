// Lint config for the create-kerf-component initializer and its catalog
// command: plain Node ESM. The scaffold template is a separate TypeScript
// package (linted and type-checked by the generated project, and by the
// root's scaffold typing gate), so it is not linted here.
import js from '@eslint/js';

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  URL: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  structuredClone: 'readonly',
  TextEncoder: 'readonly',
};

export default [
  { ignores: ['node_modules/**', 'template/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
