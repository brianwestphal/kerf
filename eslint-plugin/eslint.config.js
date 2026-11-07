// Lint config for eslint-plugin-kerfjs itself: plain Node ESM (the rules,
// their tests, and the ESLint-major matrix script). The repository root's
// config ignores this package, which runs its own `npm run lint`.
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
  { ignores: ['node_modules/**'] },
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
