// Lints the site's complete example apps (src/examples/complete) with
// eslint-plugin-kerfjs's recommended rules. The examples are reference code
// readers copy, so they dogfood the published rules: a pattern the plugin
// flags in a consumer app must not appear here either. (The basic examples
// under src/examples/basics are not linted yet; they still use literal
// selectors and bare delegate() calls.)
//
// Run with `npm run lint` from site/ (or `npm run lint:site` from the repo
// root). The script passes --max-warnings 0, so the rules the plugin ships as
// `warn` (such as require-delegate-disposer) still fail the gate here.
//
// ESLint and @typescript-eslint/parser resolve from the repository root's
// node_modules (the site package does not install its own copies), and the
// plugin is imported from its in-repo source, so this lints against the
// rules as they are about to ship rather than a published version.

import tsParser from '@typescript-eslint/parser';

import kerfjs from '../eslint-plugin/index.js';

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  {
    files: ['src/examples/complete/**/*.{js,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: kerfjs.configs.recommended.plugins,
    rules: {
      ...kerfjs.configs.recommended.rules,
      // Checks that a consumer project's AI-assistant config files are in
      // sync with the installed kerfjs; the examples are not such a project.
      'kerfjs/ai-assistant-configs': 'off',
    },
  },
];
