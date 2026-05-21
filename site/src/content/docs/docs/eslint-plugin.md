---
title: ESLint plugin
description: eslint-plugin-kerfjs — AST-only rules enforcing kerf's hard rules and rename-safety patterns at edit time.
---

`eslint-plugin-kerfjs` is a companion ESLint plugin that catches kerf hard-rule violations at edit time, before they reach `tsc` or the runtime dev-warns. It sits alongside two earlier defense layers shipped by kerf:

| Layer | Catches | When |
|---|---|---|
| `tsc --noEmit` with strict typings | Most type-shaped bugs (e.g. partial-set against multi-key store state) | Build time |
| Opt-in dev-warns (`KERF_DEV_WARN_*`) | Rebuilt listeners, untracked signals, narrow set | Runtime |
| **`eslint-plugin-kerfjs`** | Inline JSX handlers, missing `data-key`, nested `mount()`, global JSX augmentation | **Edit time** |

The rules are AST-only — no `@typescript-eslint/parser` *service* dependency is required by the plugin (consumers configure their own parser). This keeps consumer setup trivial and the plugin's release cadence independent of TypeScript-ESLint major upgrades.

## Install

```bash
npm install --save-dev eslint-plugin-kerfjs
```

## Configure — flat config (ESLint v9+)

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

## Configure — legacy `.eslintrc`

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaFeatures": { "jsx": true } },
  "extends": ["plugin:kerfjs/legacy-recommended"]
}
```

## Rules

Most rules ship as `error` in the `recommended` preset (AST-shaped antipatterns are bugs). `prefer-attr-selector`, `no-raw-with-dynamic-arg`, and `ai-assistant-configs` ship as `warn` — they're nudges, audit trails, or project-hygiene checks, not correctness bugs.

### `kerfjs/no-inline-jsx-event-handlers`

Disallow inline `onClick`-style JSX event handler attributes on intrinsic (lowercase-tag) elements. Use a `data-action` attribute and `delegate()` from the mount root instead.

```tsx
// ❌
<button onClick={save}>Save</button>

// ✅
<button data-action="save">Save</button>
delegate(rootEl, 'click', '[data-action="save"]', save);
```

### `kerfjs/require-data-key-in-each`

Require `data-key` (or `id`) on the root element returned from an `each()` row render. Without a key, the keyed reconciler matches by position and loses identity, focus, and cursor position on insert / delete.

```tsx
// ❌
each(items, (item) => <li>{item.name}</li>)

// ✅
each(items, (item) => <li data-key={item.id}>{item.name}</li>)
```

### `kerfjs/no-nested-mount`

Disallow `mount()` calls inside another `mount()`'s render callback. Composition is via plain functions that return JSX, not nested mount trees.

```tsx
// ❌
mount(root, () => {
  mount(otherRoot, () => <div />);
  return <div />;
});

// ✅
mount(headerRoot, () => <Header />);
mount(bodyRoot, () => <Body />);
```

### `kerfjs/prefer-module-jsx-augmentation`

Disallow declaration-merging `JSX.IntrinsicElements` into the global namespace. kerf's JSX runtime reads custom-element typings from its own module's `JSX` namespace, so global augmentations don't flow through.

```ts
// ❌
declare global {
  namespace JSX {
    interface IntrinsicElements { 'my-tag': { foo?: string } }
  }
}

// ✅
declare module 'kerfjs/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements { 'my-tag': KerfCustomElement & { foo?: string } }
  }
}
```

### `kerfjs/prefer-attr-selector`

When `delegate()` / `delegateCapture()` is called with a literal `[name="value"]` selector string, nudge toward defining `attr('name', 'value')` once and passing its `.selector` — so the JSX (`{...spec.attrs}`) and the delegate target stay synchronized through a single typed source. Rename-safety; not a correctness rule. Severity: `warn`.

```tsx
// ❌ — JSX attribute and selector string are independent literals
<button data-action="toggle">Toggle</button>
delegate(root, 'click', '[data-action="toggle"]', handler);

// ✅ — one typed constant drives both
const TOGGLE = attr('data-action', 'toggle');
<button {...TOGGLE.attrs}>Toggle</button>
delegate(root, 'click', TOGGLE.selector, handler);
```

## Why these rules, and not more

Rules that need flow analysis (signal reads outside render), call-graph analysis (`addEventListener` inside the mount tree), or type information (partial-set against multi-key state) are already covered by the opt-in dev-warns and strict TS. Duplicating them in lint would mean either high false-positive rates without type info, or a `parserServices` dependency that complicates consumer setup.

## Source + per-rule docs

`eslint-plugin-kerfjs` lives in the kerf monorepo under [`eslint-plugin/`](https://github.com/brianwestphal/kerf/tree/main/eslint-plugin). Each rule has a longer docs page with edge cases and what-it-doesn't-catch notes.
