# eslint-plugin-kerfjs

ESLint rules that enforce kerf's hard rules. Catches AI-shaped bugs at edit time, before they reach `tsc` or the runtime dev-warns.

- **Full docs:** [brianwestphal.github.io/kerf/docs/eslint-plugin/](https://brianwestphal.github.io/kerf/docs/eslint-plugin/)
- **Kerf site:** [brianwestphal.github.io/kerf](https://brianwestphal.github.io/kerf/)

This plugin sits alongside two other defense layers shipped by [`kerfjs`](https://brianwestphal.github.io/kerf/):

| Layer | Catches | When |
|---|---|---|
| `tsc --noEmit` with strict typings | Hard Rules 8 (partial-set), most type errors | Build time |
| Opt-in dev-warns (`KERF_DEV_WARN_*`) | Hard Rules 4 (rebuilt listeners), 7 (untracked signals), 8 (narrow set) | Runtime |
| **This plugin** | Hard Rules 2, 5, 6, 10, 12 — AST-shaped antipatterns; plus rename-safety / `raw()`-audit nudges and a project-hygiene check for the bundled AI-assistant configs | **Edit time** |

All but one rule are AST-only — no `@typescript-eslint/parser` *service* dependency is required by the plugin (consumers configure their own parser). The exception, `ai-assistant-configs`, reads the filesystem instead of the AST and runs once per lint pass.

## Install

```bash
npm install --save-dev eslint-plugin-kerfjs
```

## Configure (flat config, ESLint v9+)

```js
// eslint.config.js
import kerfjs from 'eslint-plugin-kerfjs';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  kerfjs.configs.recommended,
];
```

## Configure (legacy `.eslintrc`)

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaFeatures": { "jsx": true } },
  "extends": ["plugin:kerfjs/legacy-recommended"]
}
```

## Rules

| Rule | Hard Rule | Severity (recommended) |
|---|---|---|
| [`no-inline-jsx-event-handlers`](docs/rules/no-inline-jsx-event-handlers.md) | 10 — use `data-action` + `delegate()` | `error` |
| [`require-data-key-in-each`](docs/rules/require-data-key-in-each.md) | 2 — `data-key` per item | `error` |
| [`require-delegate-disposer`](docs/rules/require-delegate-disposer.md) | 5 — capture `delegate()` disposers when scope < page | `warn` |
| [`no-nested-mount`](docs/rules/no-nested-mount.md) | 6 — one `mount()` per root | `error` |
| [`prefer-module-jsx-augmentation`](docs/rules/prefer-module-jsx-augmentation.md) | 12 — augment `kerfjs/jsx-runtime`, not global | `error` |
| [`prefer-attr-selector`](docs/rules/prefer-attr-selector.md) | — (rename-safety nudge for `delegate()` selectors) | `warn` |
| [`no-raw-with-dynamic-arg`](docs/rules/no-raw-with-dynamic-arg.md) | — (XSS audit trail) | `warn` |
| [`ai-assistant-configs`](docs/rules/ai-assistant-configs.md) | — (project hygiene) | `warn` |

The "Hard Rule" column refers to the numbered rules in [`docs/ai/usage-guide.md`](../docs/ai/usage-guide.md) on the main kerf repo. `no-raw-with-dynamic-arg` and `ai-assistant-configs` don't map to numbered Hard Rules — the former creates an audit trail for every dynamic `raw()` call site (potential XSS); the latter checks that the bundled AI-assistant configs are installed and current. See [`docs/12-ai-assistant-configs.md`](../docs/12-ai-assistant-configs.md) on the main kerf repo for the AI-configs design.

## Why these five Hard-Rule rules (and not more)?

Rules that need flow analysis (signal reads outside render — Rule 8), call-graph analysis (`addEventListener` inside the mount tree — Rule 4), or type information (partial-set against multi-key state — Rule 9) are already covered by the opt-in dev-warns and strict TS. Duplicating them here would mean either high false-positive rates without type info, or a `parserServices` dependency that complicates consumer setup.

When a real bug ships that the existing defense stack misses AND a new lint rule would not false-positive on legitimate code, file an issue on the main kerf repo.

## Develop / test

```bash
npm install
npm test
```

The AST rules' test suites use ESLint's `RuleTester` with `@typescript-eslint/parser`. The `ai-assistant-configs` tests are filesystem-driven — they build temp project roots with fixture `node_modules/kerfjs/ai/` bundles and drive the rule's classifier directly, since `RuleTester` doesn't simulate the filesystem.

## License

MIT
