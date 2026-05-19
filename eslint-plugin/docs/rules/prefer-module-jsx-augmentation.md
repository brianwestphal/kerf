# `kerfjs/prefer-module-jsx-augmentation`

Disallow declaration-merging `JSX.IntrinsicElements` into the global namespace; use the `kerfjs/jsx-runtime` module instead.

Maps to **kerf Hard Rule 11** — kerf's JSX runtime looks up custom-element typings on its own module's `JSX` namespace. A global augmentation does not flow through to kerf's intrinsic-element table.

## ❌ Incorrect

```ts
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'my-tag': { foo?: string };
    }
  }
}
```

## ✅ Correct

```ts
declare module 'kerfjs/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'my-tag': KerfCustomElement & { foo?: string };
    }
  }
}
```

Import the building-block types from `kerfjs/jsx-runtime`:

```ts
import type { KerfCustomElement, KerfBaseAttrs, AttrLike } from 'kerfjs/jsx-runtime';
```

## What this rule does NOT catch

- Other `declare global { … }` blocks that augment things outside `JSX.IntrinsicElements` (e.g. `interface Window { … }`).
- Augmentations of `JSX.Element` or `JSX.ElementClass` inside `declare global` — only `IntrinsicElements` is reported, since that is what kerf's typed-tag-table consumes.
