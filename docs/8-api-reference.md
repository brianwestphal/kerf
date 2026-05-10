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

### `arraySignal<T>(initial?: readonly T[]): ArraySignal<T>` — `kerfjs/array-signal` subpath

```ts
import { arraySignal } from 'kerfjs/array-signal';

const rows = arraySignal<{ id: number; label: string }>([]);
```

Granular collection signal. Lives in its own subpath — `import { arraySignal } from 'kerfjs/array-signal'` — so apps that don't use it shed ~1 KB from the main barrel. Pair with `each(...)` inside a `mount()` for O(patches)-not-O(N) reconciles. See `docs/2-reactivity.md` §2.6 for the rationale and gotchas, and `docs/4-render.md` §4.2 (granular reconcile) for how the binding works.

```ts
class ArraySignal<T> {
  readonly value: readonly T[];                            // tracking read
  update(index: number, fn: (item: T) => T): void;        // → 1 update patch
  insert(index: number, item: T): void;                   // → 1 insert patch
  push(item: T): void;                                    // sugar for insert(length, item)
  remove(index: number): T;                               // → 1 remove patch (returns removed item)
  move(from: number, to: number): void;                   // → 1 move patch (no-op if from === to)
  replace(items: readonly T[]): void;                     // → 1 replace patch (forces snapshot reconcile)
}
```

All mutators throw a descriptive `Error` on out-of-bounds indices. Reads on `arraySig.value` register a tracking dependency just like `signal.value` — `computed(() => arraySig.value.filter(...))` and `effect(() => render(arraySig.value))` work the same way.

The `ArraySignal<T>` class is detected via `Symbol.for('kerfjs.ArraySignal')`, not `instanceof`, so multiple bundle copies still interoperate.

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

Although the static signature requires `SafeHtml | string`, the runtime additionally accepts `null`, `undefined`, `false`, and `true` — they coerce to "render nothing" (empty string), matching the React / Solid convention so `() => cond ? <jsx/> : null` and `() => cond && <jsx/>` patterns work without each consumer adding a sentinel. Numbers stringify; non-string non-`SafeHtml` values fall through `String(...)`.

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

If a descendant of a moved row holds focus, the reconciler snapshots the active element + its selection range before the move pass and re-applies them afterwards — so focus and caret position survive a reorder even on engines that drop focus on `insertBefore` (older Safari, happy-dom). See `docs/4-render.md` §4.4.

## 8.4 Event delegation

### `delegate(rootEl, type, selector, handler): () => void`

```ts
delegate(rootEl, 'click', '[data-action="add"]', (event, matched) => { ... });
delegate(rootEl, 'focus', '.field-row',          (event, row)     => { ... });
```

One root listener with `closest(selector)`-style walk-up matching; fires `handler(event, matched)` if the match is inside `rootEl`. Returns a disposer.

Auto-promotes the well-known non-bubbling event types (`focus`, `blur`, `scroll`, `load`, `error`, `mouseenter`, `mouseleave`) to capture phase under the hood, so the call site looks identical regardless of whether the event bubbles. Selector matching stays `closest()`-style for every event type — wrapper selectors still match when the event lands on a descendant.

### `delegateCapture(rootEl, type, selector, handler): () => void`

Same shape, but installs on the capture phase and matches via `target.matches(selector)` (direct match, no walk-up). The escape hatch — use it for custom non-bubbling events that aren't in `delegate()`'s auto-promotion list, or when you want capture-phase semantics with strict element-match behaviour.

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

### Custom-element typing via declaration merging

Per-tag intrinsic-element interfaces live in `src/jsx-types.ts` and are aliased into the JSX namespace by `src/jsx-runtime.ts`. To add tags for custom elements / web components, declaration-merge into the `kerfjs/jsx-runtime` JSX namespace:

```ts
import type { KerfCustomElement } from 'kerfjs/jsx-runtime';

declare module 'kerfjs/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'my-element': KerfCustomElement & { foo?: string };
    }
  }
}
```

`IntrinsicElements` is exported as an `interface` (not a `type` alias) precisely to make this pattern work — type aliases can't be merged. `KerfCustomElement`, `KerfBaseAttrs`, `AttrLike`, `AttrValue`, and `DataAriaAttrs` are all re-exported from `kerfjs/jsx-runtime` so apps can compose attribute types without reaching into the internal `kerfjs/jsx-types` path.

### Dangerous URL filter

Plain-string values passed to `href`, `src`, `xlink:href`, `formaction`, or `action` are screened against `/^\s*(?:(?:java|vb)script:|data:text\/html[;,])/i`. Matching values cause the attribute to be **dropped entirely** and a `console.warn` to be emitted. The screen is bypassed for `SafeHtml` (i.e. `raw(...)`) values — that's the documented opt-out for legitimate cases (bookmarklet builders, sanitised-upstream URLs). Non-URL attributes are not screened. See `docs/6-jsx-runtime.md` §6.4.1 for the full rationale and examples.

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

| User-agent-owned attribute | Effect |
| --- | --- |
| `<details>` `open` | The morph never removes `open` from a live `<details>` — the user agent toggles it on summary click and the diff treats it as user-owned. Trade-off: controlled-style `<details open={false}>` won't auto-collapse a previously-opened details element; drive `.open` imperatively if you need controlled behaviour. See `docs/4-render.md` §4.4.1. |
| `<dialog>` `open` | Same as `<details>`. The browser sets `open=""` when `.show()` / `.showModal()` is called; the morph leaves it alone. |
