# 8. API reference

Everything kerf exports, organized by module. Imported via `import { … } from 'kerfjs'` unless noted.

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

The `ArraySignal<T>` class is detected via `Symbol.for('kerfjs.ArraySignal')`, not `instanceof`, so multiple bundle copies still interoperate. The brand symbol itself is also exported as **`ARRAY_SIGNAL_BRAND`** from `kerfjs/array-signal` for consumers who build their own collection types and want `each(...)` to recognize them via brand check.

The mutator events are surfaced as the **`ArrayPatch<T>`** type — a tagged-union covering `update` / `insert` / `remove` / `move` / `replace`:

```ts
type ArrayPatch<T> =
  | { type: 'update'; index: number; item: T }
  | { type: 'insert'; index: number; item: T }
  | { type: 'remove'; index: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'replace'; items: readonly T[] };
```

Most consumers never touch `ArrayPatch` directly — `each(...)` consumes the queue internally. Export the type when you want to observe patches from outside `each()` (e.g. logging, persistence layers, custom reconcilers).

## 8.2 Stores

### `defineStore<TState, TActions>(spec): Store<TState, TActions>`

```ts
defineStore({
  initial: () => TState,
  actions: (set: (next: TState) => void, get: () => TState) => TActions,
});
```

Creates a store with `state: ReadonlySignal<TState>`, `actions: TActions`, `reset(): void`. Registers in the global registry consumed by `resetAllStores()`.

`set(next)` REPLACES state; it does NOT merge. Pass the full state object on every call, or use `set({ ...get(), ...patch })` to merge. In dev mode (`NODE_ENV !== 'production'`), `get()` returns a frozen snapshot so that `get().count = 42`-style mutations throw a native `TypeError` (KF-141). Opt in to the runtime narrow-set warning with `KERF_DEV_WARN_NARROW_SET=1` to catch partial-set bugs at the moment they happen (KF-212; see [docs/11-dev-warnings.md](11-dev-warnings.md) for the full dev-warn family).

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

### `mount(rootEl: HTMLElement, render: () => MountResult): () => void`

```ts
type MountResult = SafeHtml | string | number | boolean | null | undefined;
```

Bind `render()` to `rootEl`'s children. Wraps `effect()` with kerf's segment-aware diff. Returns a disposer.

`MountResult` is wide enough that consumers can write `() => cond ? <jsx/> : null` and `() => cond && <jsx/>` without a sentinel — matching the React / Solid convention. `null` / `undefined` / `false` / `true` coerce to "render nothing" (empty string); numbers stringify; everything else falls through `String(...)`. See `docs/4-render.md` §4.4 for the rationale and the equivalent fallback patterns. The `MountResult` type alias is exported from the main barrel for consumers that want to annotate their render functions explicitly.

The diff:

- Only ever touches `rootEl`'s subtree; `rootEl` itself is preserved.
- Matches elements by `id`, then `data-key`. Position otherwise.
- Short-circuits on the live element when:
  - It has `data-morph-skip` (element AND subtree preserved as-is; no attribute morphing).
  - It has `data-morph-skip-children` (attributes morph; subtree preserved as-is).
  - It's a list parent owned by `each(...)` (children-only short-circuit; `each`'s reconciler owns those rows). Attribute morphing on the parent itself still happens.
  - `fromEl.isEqualNode(toEl)` (no work needed).
  - It's the focused `[contenteditable]` (entire subtree preserved on this morph; see §8.7 below and `docs/4-render.md` §4.4).
- The trailing-removal pass (unmatched live children that the new template doesn't emit) skips elements marked `data-morph-preserve` — imperatively-injected nodes whose lifetime the consumer manages outside kerf.
- Otherwise preserves the focused text-entry's value + selection range, then proceeds.

Lists rendered with `each(...)` go through a separate keyed reconciler that operates directly on the live parent's children — O(changes), not O(rows). See `each` below.

### `morph(liveRoot: Element, template: Element | SafeHtml | string): void`

One-shot in-place reconciliation primitive — the same algorithm `mount()` uses internally, exported for consumers that have an already-populated element they need to reconcile against a freshly-built template. Unlike `mount()`, `morph()` doesn't wrap an `effect()` and doesn't bulk-write `innerHTML` first: it runs once per call against the live tree as-is.

```ts
import { morph, raw } from 'kerfjs';

morph(liveCard, freshlyBuiltCardEl);         // Element template
morph(liveCard, '<article class="card">…</article>'); // raw HTML string
morph(liveCard, raw(htmlFromServer));        // SafeHtml
```

When `template` is a string or `SafeHtml`, kerf creates a transient element by cloning `liveRoot`'s shell (so the parsed children land inside an element with the same tag, which keeps `innerHTML` parsing rules consistent) and assigns the stringified template to its `innerHTML`. The transient is discarded after the reconciliation.

Every short-circuit `mount()`'s morph honors carries over: `data-morph-skip` (element + subtree preserved), `data-morph-skip-children` (attrs morph, subtree preserved), `data-morph-preserve` (element survives the trailing-removal pass), `isEqualNode` byte-identity skip, focused text-input value + selection preservation, focused-`[contenteditable]` subtree preservation, and `<details>` / `<dialog>`'s user-agent-owned `open` attribute. Match keys (`id`, then `data-key`) behave the same way.

`morph()` does NOT subscribe to signals. If you want re-renders, use `mount()`. If you want a one-shot reconciliation against a tree you own, this is the primitive. See `docs/4-render.md` §4.4.3.

### `each<T>(items, render, cacheKey?): SafeHtml`

```ts
each(rows.value, (row) => <tr data-key={row.id}>{row.label}</tr>);
each(rows.value, (row) => <tr…>…</tr>, (row) => row.id === selectedId ? 1 : 0);
```

Keyed list iteration with per-item memoization, routed through `mount()`'s native list reconciler. Skips re-running `render` for items whose object identity (and optional `cacheKey`) are unchanged since the previous call — those items keep their existing live DOM nodes verbatim. Items whose identity or cacheKey did change get a fresh node (all fresh-node HTML for a render is bulk-parsed in one `innerHTML` call); items that disappeared are removed. Reorders use a longest-increasing-subsequence pass so the number of `insertBefore` calls is the minimum possible. Items must be objects (cache is a `WeakMap`); wrap primitives if you need to iterate them. Each item's render output must produce exactly one top-level element.

`cacheKey` is a passive comparator (not a reactive subscription): kerf calls it once per item per mount-effect run and compares the returned value against the previous run's. Use it when external state, not the item itself, drives what the row should render (e.g. a "currently selected" id flips a CSS class). Distinct from `data-key` on the rendered element, which is the DOM-reconciliation identity that morph uses — `cacheKey` controls when the cached HTML is invalidated; `data-key` controls how a row maps to its existing live DOM node. (Renamed from `key` for clarity; positional callers — the canonical form — are unaffected.)

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

Same shape, but installs on the capture phase and matches via `target.matches(selector)` (direct match, no walk-up). The escape hatch — use it for custom non-bubbling events that aren't in `delegate()`'s auto-promotion list, or when you want capture-phase semantics with strict element-match behavior.

### `attrSelector(attrs: Record<string, string>): string`

Build a CSS attribute-selector string from a plain object map of `name → value` pairs:

```ts
attrSelector({ 'data-action': 'add-todo' })
// → '[data-action="add-todo"]'

attrSelector({ 'data-action': 'toggle', 'data-id': itemId })
// → '[data-action="toggle"][data-id="42"]'

delegate(root, 'click', attrSelector({ 'data-action': 'toggle' }), handler);
```

Both the attribute name and value are CSS-escaped — the name via `cssEscapeIdent` (identifier safe, SSR-safe), the value as a CSS double-quoted string — so the function is safe for any string value including external input with CSS metacharacters. Throws on an empty attribute name.

Use this when selectors are constructed from data (e.g. `action` keys stored in constants) rather than hand-written string literals. Hand-written string literals like `'[data-action="add"]'` are fine for fixed selectors; `attrSelector` earns its keep when you're building a selector from a variable.

### Generic type parameter: `delegate<T extends Element = Element>()`

Both `delegate()` and `delegateCapture()` accept an optional element-type generic that narrows the `target` argument in the handler, avoiding casts:

```ts
delegate<HTMLButtonElement>(root, 'click', 'button[data-action]', (e, btn) => {
  // btn is HTMLButtonElement — no cast needed
  btn.disabled = true;
});
```

The default is `Element` (untyped call sites are unaffected).

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

Plain-string values passed to `href`, `src`, `xlink:href`, `formaction`, or `action` are screened against `/^\s*(?:(?:java|vb)script:|data:text\/html[;,])/i`. Matching values cause the attribute to be **dropped entirely** and a `console.warn` to be emitted. The screen is bypassed for `SafeHtml` (i.e. `raw(...)`) values — that's the documented opt-out for legitimate cases (bookmarklet builders, sanitized-upstream URLs). Non-URL attributes are not screened. See `docs/6-jsx-runtime.md` §6.4.1 for the full rationale and examples.

## 8.6 Direct JSX → DOM

### `toElement(jsx: SafeHtml | string): Element`

Parses a JSX/SafeHtml/string and returns a single DOM element. Detects SVG content (root `<svg>` or orphan SVG fragment) and routes through `DOMParser('image/svg+xml')` for correct namespacing. HTML takes the `<template>.innerHTML` path.

Throws if the input produces zero elements OR if `DOMParser` returns a `parsererror`.

## 8.7 Conventions used by `mount`

| Attribute | Effect |
| --- | --- |
| `id="..."` | Used as a diff key. Highest priority. |
| `data-key="..."` | Used as a diff key. Lower priority than `id`. |
| `data-morph-skip` (any value, even empty) | Element AND subtree preserved as-is on every re-render. No attribute morphing on the element itself. |
| `data-morph-skip-children` (any value, even empty) | Attributes on the element morph normally; the subtree is left as-is. For client-hydrated slots whose host state classes still need to flow through. |
| `data-morph-preserve` (any value, even empty) | The element is skipped by the diff's trailing-removal pass — survives across renders even when the new template doesn't emit it. For imperatively-injected nodes (autoplay video, tooltip overlays, analytics pixels). Does NOT block a keyed-match move. |

| Element kind | Behavior when focused during a morph |
| --- | --- |
| `<input type="text" \| "search" \| "url" \| "email" \| "tel" \| "password" \| "">` | Live `.value` + `selectionStart`/`selectionEnd` copied to the morph target; morph proceeds (attribute updates apply). |
| `<textarea>` | Same as text-entry inputs. |
| `[contenteditable]` | Entire subtree skipped on this morph (same mechanism as `data-morph-skip`). User's edit + caret + multi-range selection preserved verbatim; attribute updates deferred until the next render after blur. See `docs/4-render.md` §4.4. |
| Anything else (`<button>`, `<a>`, `<div tabindex>`, non-text inputs…) | Morph proceeds normally — no special handling. |

| User-agent-owned attribute | Effect |
| --- | --- |
| `<details>` `open` | The morph never removes `open` from a live `<details>` — the user agent toggles it on summary click and the diff treats it as user-owned. Trade-off: controlled-style `<details open={false}>` won't auto-collapse a previously-opened details element; drive `.open` imperatively if you need controlled behavior. See `docs/4-render.md` §4.4.1. |
| `<dialog>` `open` | Same as `<details>`. The browser sets `open=""` when `.show()` / `.showModal()` is called; the morph leaves it alone. |
