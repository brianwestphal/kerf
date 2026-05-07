# 8. API reference

Everything kerf exports, organised by module. Imported via `import { … } from 'kerfjs'` unless noted.

## 8.1 Reactivity

### `signal<T>(initial: T): Signal<T>`

A reactive value. `.value` reads / writes; reads inside `effect()` / `computed()` are tracked.

### `computed<T>(fn: () => T): ReadonlySignal<T>`

A derived signal. Re-runs `fn` whenever any signal it reads changes. Read-only.

### `effect(fn: () => void): () => void`

Run `fn` immediately, then re-run it whenever any signal it reads changes. Returns a disposer.

### `batch(fn: () => void): void`

Run `fn`, deferring effect re-runs until `fn` returns. Multiple writes inside `fn` produce a single re-run.

### `Signal<T>` (type)

```ts
interface Signal<T> { value: T }
```

### `ReadonlySignal<T>` (type)

```ts
interface ReadonlySignal<T> { readonly value: T }
```

## 8.2 Stores

### `defineStore<TState, TActions>(spec): Store<TState, TActions>`

```ts
defineStore({
  initial: () => TState,
  actions: (set: (next: TState) => void, get: () => TState) => TActions,
});
```

Creates a store with `state: ReadonlySignal<TState>`, `actions: TActions`, `reset(): void`. Registers in the global registry consumed by `resetAllStores()`.

### `resetAllStores(): void`

Calls `reset()` on every store registered via `defineStore()`.

### `Store<TState, TActions>` (type)

```ts
interface Store<TState, TActions> {
  readonly state: ReadonlySignal<TState>;
  readonly actions: TActions;
  reset(): void;
}
```

### `clearStoreRegistry(): void` — `kerfjs/testing` subpath

Empties the global store registry. Used by unit tests to isolate cases. Imported via the `kerfjs/testing` subpath, **not** the main `kerfjs` entry, so production builds don't pull it in:

```ts
import { clearStoreRegistry } from 'kerfjs/testing';
```

## 8.3 Render

### `mount(rootEl: HTMLElement, render: () => SafeHtml | string): () => void`

Bind `render()` to `rootEl`'s children. Wraps `effect()` with kerf's segment-aware diff. Returns a disposer.

The diff:

- Only ever touches `rootEl`'s subtree; `rootEl` itself is preserved.
- Matches elements by `id`, then `data-key`. Position otherwise.
- Short-circuits on the live element when:
  - It has `data-morph-skip` (subtree preserved as-is).
  - It's a list parent owned by `each(...)` (children-only short-circuit; `each`'s reconciler owns those rows). Attribute morphing on the parent itself still happens.
  - `fromEl.isEqualNode(toEl)` (no work needed).
  - It's the focused `[contenteditable]` (entire subtree preserved on this morph; see §8.7 below and `docs/4-render.md` §4.4).
- Otherwise preserves the focused text-entry's value + selection range, then proceeds.

Lists rendered with `each(...)` go through a separate keyed reconciler that operates directly on the live parent's children — O(changes), not O(rows). See `each` below.

### `each<T>(items, render, key?): SafeHtml`

```ts
each(rows.value, (row) => <tr data-key={row.id}>{row.label}</tr>);
each(rows.value, (row) => <tr…>…</tr>, (row) => row.id === selectedId ? 1 : 0);
```

Keyed list iteration with per-item memoisation, routed through `mount()`'s native list reconciler. Skips re-running `render` for items whose object identity (and optional `key`) are unchanged since the previous call — those items keep their existing live DOM nodes verbatim. Items whose identity or key did change get a fresh node (all fresh-node HTML for a render is bulk-parsed in one `innerHTML` call); items that disappeared are removed. Reorders use a longest-increasing-subsequence pass so the number of `insertBefore` calls is the minimum possible. Items must be objects (cache is a `WeakMap`); wrap primitives if you need to iterate them. Each item's render output must produce exactly one top-level element. Use `key` when external state, not the item itself, drives what the row should render (e.g. a "currently selected" id flips a CSS class).

## 8.4 Event delegation

### `delegate(rootEl, type, selector, handler): () => void`

```ts
delegate(rootEl, 'click', '[data-action="add"]', (event, matched) => { ... });
```

Bubble-phase delegation. Walks up from `event.target` via `closest(selector)`; if the match is inside `rootEl`, fires `handler(event, matched)`. Returns a disposer.

### `delegateCapture(rootEl, type, selector, handler): () => void`

Same shape, but installs the listener with `capture: true`. Use for non-bubbling events (`focus`, `blur`, `scroll`, `load`, `error`). Match is via `target.matches(selector)` (no walk-up).

## 8.5 JSX runtime

### `import 'kerfjs/jsx-runtime'` — TypeScript / esbuild config

```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "kerfjs"
  }
}
```

### `SafeHtml` (class)

```ts
class SafeHtml {
  readonly __html: string;
  constructor(html: string);
  toString(): string;
}
```

The return type of every JSX expression. `.toString()` returns the underlying HTML.

`SafeHtml` instances carry a brand symbol — `Symbol.for('kerfjs.SafeHtml')` — so cross-bundle identification works even if a consumer's bundler ends up loading two copies of kerf (e.g. the barrel and the JSX-runtime entry resolved as independent modules). Prefer `isSafeHtml()` over `instanceof SafeHtml` when writing custom integrations.

### `isSafeHtml(value: unknown): value is SafeHtml`

Cross-bundle-safe type guard. Returns `true` for any object carrying the `Symbol.for('kerfjs.SafeHtml')` brand. Use this rather than `instanceof SafeHtml` if you're inspecting JSX values yourself — `instanceof` fails when two copies of kerf produce structurally-identical-but-class-distinct `SafeHtml` instances.

### `raw(html: string): SafeHtml`

Wrap a pre-escaped HTML string. Useful for icons, rendered Markdown, server-included fragments.

### `Fragment` (component)

JSX `<>...</>` — concatenates children without a wrapper tag. Available from both `kerfjs/jsx-runtime` (used by the JSX transform) and the main `kerfjs` barrel (when you need to compose `Fragment` manually, e.g. `jsx(Fragment, { children })`).

## 8.6 Direct JSX → DOM

### `toElement(jsx: SafeHtml | string): Element`

Parses a JSX/SafeHtml/string and returns a single DOM element. Detects SVG content (root `<svg>` or orphan SVG fragment) and routes through `DOMParser('image/svg+xml')` for correct namespacing. HTML takes the `<template>.innerHTML` path.

Throws if the input produces zero elements OR if `DOMParser` returns a `parsererror`.

## 8.7 Conventions used by `mount`

| Attribute | Effect |
| --- | --- |
| `id="..."` | Used as a diff key. Highest priority. |
| `data-key="..."` | Used as a diff key. Lower priority than `id`. |
| `data-morph-skip` (any value, even empty) | Subtree preserved as-is on every re-render. |

| Element kind | Behaviour when focused during a morph |
| --- | --- |
| `<input type="text" \| "search" \| "url" \| "email" \| "tel" \| "password" \| "">` | Live `.value` + `selectionStart`/`selectionEnd` copied to the morph target; morph proceeds (attribute updates apply). |
| `<textarea>` | Same as text-entry inputs. |
| `[contenteditable]` | Entire subtree skipped on this morph (same mechanism as `data-morph-skip`). User's edit + caret + multi-range selection preserved verbatim; attribute updates deferred until the next render after blur. See `docs/4-render.md` §4.4. |
| Anything else (`<button>`, `<a>`, `<div tabindex>`, non-text inputs…) | Morph proceeds normally — no special handling. |
