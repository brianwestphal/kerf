# 8. API reference

Everything kerf exports, organized by module. Imported via `import { … } from 'kerfjs'` unless noted.

## 8.1 Reactivity

### `signal<T>(value?: T): Signal<T>`

A reactive value. `.value` reads / writes; reads inside `effect()` / `computed()` are tracked.

### `computed<T>(fn: () => T): ReadonlySignal<T>`

A derived signal. Re-runs `fn` whenever any signal it reads changes. Read-only.

### `effect(fn: () => void | (() => void)): () => void`

Run `fn` immediately, then re-run it whenever any signal it reads changes. Returns a disposer. `fn` may return a cleanup function, which runs before each re-run and on dispose (see `docs/2-reactivity.md` §2.3).

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

All mutators throw a descriptive `Error` on out-of-bounds indices (with one carve-out: `move()`'s `from === to` no-op check runs *before* its bounds check, so an out-of-bounds `move(9, 9)` silently no-ops). Reads on `arraySig.value` register a tracking dependency just like `signal.value` — `computed(() => arraySig.value.filter(...))` and `effect(() => render(arraySig.value))` work the same way.

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
  actions: (set: (next: TState) => void, get: () => Readonly<TState>) => TActions,
});
```

Creates a store with `state: ReadonlySignal<TState>`, `actions: TActions`, `reset(): void`. Registers in the global registry consumed by `resetAllStores()`.

`set(next)` REPLACES state; it does NOT merge. Pass the full state object on every call, or use `set({ ...get(), ...patch })` to merge. When the diagnostics are installed (`import 'kerfjs/dev'`), `get()` returns a deep read-only `Proxy` so that any mutation of it — including a nested `get().nested.x = 1` — throws a `TypeError`; reads (spread, `JSON.stringify`, `Object.keys`, iteration) are transparent, and the live state object is never frozen. Production returns the bare reference for zero overhead. Opt in to the runtime narrow-set warning with `KERF_DEV_WARN_NARROW_SET=1` to catch partial-set bugs at the moment they happen (see [docs/11-dev-warnings.md](11-dev-warnings.md) for the full dev-warn family).

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

### `kerfjs/dev` subpath — install the development diagnostics

kerf does **not** infer whether it is running in development. Importing this
subpath is the development signal; omitting it is production. Gate the import
with your own build's dev flag, in your own code:

```js
if (import.meta.env.DEV) await import('kerfjs/dev');                   // Vite
if (process.env.NODE_ENV !== 'production') await import('kerfjs/dev'); // webpack / Node
```

That condition folds to `false` in your production build, so the statement is
eliminated and the chunk is never emitted or fetched — a realistic import is
**12.24 KB min+gzip without it vs 16.91 KB when the diagnostics shipped in the
main bundle**. A no-build/CDN app imports it from its development page and
omits it from the production page.

Installing enables: the whole `KERF_DEV_WARN_*` warning family (each still
requires its own switch — see `enableWarnings()` below), the structural list-invariant checks, the read-only
`defineStore` `get()` snapshot, and the *throwing* form of the dangerous-URL
screen (production warns and drops instead).

#### `enableWarnings(options: DevWarningOptions): void`

Switches individual diagnostics on. Installing makes them PRESENT; this decides
which are ON, so importing the entry never floods the console:

```js
if (import.meta.env.DEV) {
  const dev = await import('kerfjs/dev');
  dev.enableWarnings({ staleBinding: true, narrowSet: true, invariants: 'throw' });
}
```

Keys (all optional, all off unless named): `rebuiltListeners`,
`untrackedSignals`, `narrowSet`, `delegateInEffect`, `eachInMorphSkip`,
`duplicateEachKeys`, `staleBinding`, `valueOnlyRerender`, `listRebind`,
`staleIndex`, `parserRepair`, and `invariants` (`true` warns, `'throw'`
throws). Each corresponds one-to-one with a `KERF_DEV_WARN_*` environment
variable — those still work for Node, SSR, and CI — and an explicit call wins
over the environment in both directions, so `{ narrowSet: false }` silences an
ambient variable.

**In a browser, this is the only switch there is.** A browser realm has no
`process` object, and a bundler `define` cannot reach the read, so the
environment variables are unreachable in the environment where these warnings
are most wanted.

Call it as early as you can: every diagnostic reads its switch at call time
except `untrackedSignals`, which is chosen when a signal is created — enabling
that one prints its coverage boundary once.

The subpath also re-exports `clearDevHooks()`, `installDevHooks()` and
`devHooks` so a consumer's own test suite can assert production-shaped
behavior without reloading modules.

Order matters in one place: `signal()` chooses its constructor at creation
time, so signals created before the dev entry runs are invisible to
`KERF_DEV_WARN_UNTRACKED_SIGNALS` — and since static imports hoist above a
top-level `await import()`, that is the common case. To cover module-scope
signals, make `import 'kerfjs/dev'` the first static import of a dev-only entry
file. Opting into that warning prints the boundary once so the gap is never
silent. Every other hook is read at call time. See
[`docs/11-dev-warnings.md`](11-dev-warnings.md) §11.2.2 and §11.3.6.

## 8.3 Render

### `mount(rootEl: HTMLElement, render: () => MountResult): () => void`

```ts
type MountResult = SafeHtml | string | number | boolean | null | undefined;
```

Bind `render()` to `rootEl`'s children. Wraps `effect()` with kerf's segment-aware diff. Returns a disposer.

If `rootEl` belongs to an *inert* document (no browsing context — e.g. a `DOMParser` result, a `<template>.content` child, or `document.implementation.createHTMLDocument()` output), `mount()` adopts it into the live `document` first, so its first-render `innerHTML` write is safe on every engine (some engines mis-parse `innerHTML` on inert-document elements under rapid bursts). Roots that are already in the live document — the normal case — are untouched, and a live element in another realm (e.g. an iframe) is left in place. `toElement()` output is already adopted, so this only matters for hand-rolled roots.

`MountResult` is wide enough that consumers can write `() => cond ? <jsx/> : null` and `() => cond && <jsx/>` without a sentinel — matching the React / Solid convention. `null` / `undefined` / `false` / `true` coerce to "render nothing" (empty string); numbers stringify; everything else falls through `String(...)`. See `docs/4-render.md` §4.1 (step 2 of the render pipeline) for the rationale and the equivalent fallback patterns. The `MountResult` type alias is exported from the main barrel for consumers that want to annotate their render functions explicitly.

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

One-shot in-place reconciliation primitive — the same algorithm `mount()` uses internally, exported for consumers that have an already-populated element they need to reconcile against a freshly-built template. Unlike `mount()`, `morph()` doesn't wrap an `effect()` and doesn't bulk-write `innerHTML` first: it runs once per call against the live tree as-is. When it mutates a `checked` / `value` / `selected` attribute it syncs the matching DOM property too, so controlled form state holds up after user interaction (the dirty-state flags would otherwise detach the visible state from the attribute); attributes the template never mentions are left alone.

```ts
import { morph, raw } from 'kerfjs';

morph(liveCard, freshlyBuiltCardEl);         // Element template
morph(liveCard, '<article class="card">…</article>'); // raw HTML string
morph(liveCard, raw(htmlFromServer));        // SafeHtml
```

When `template` is a string or `SafeHtml`, kerf creates a transient element by cloning `liveRoot`'s shell (so the parsed children land inside an element with the same tag, which keeps `innerHTML` parsing rules consistent) and assigns the stringified template to its `innerHTML`. The transient is discarded after the reconciliation.

Every short-circuit `mount()`'s morph honors carries over: `data-morph-skip` (element + subtree preserved), `data-morph-skip-children` (attrs morph, subtree preserved), `data-morph-preserve` (element survives the trailing-removal pass), `isEqualNode` byte-identity skip, focused text-input value + selection preservation, focused-`[contenteditable]` subtree preservation, and `<details>` / `<dialog>`'s user-agent-owned `open` attribute. Match keys (`id`, then `data-key`) behave the same way.

`morph()` does NOT subscribe to signals. If you want re-renders, use `mount()`. If you want a one-shot reconciliation against a tree you own, this is the primitive. See `docs/4-render.md` §4.4.3.

A `null` / `undefined` `liveRoot` throws immediately with a descriptive error (the usual cause is a `getElementById` typo returning `null` at runtime despite the TypeScript types) — the same guard `mount()` applies to its `rootEl`.

> **Security — trusted templates only.** A `string` / `SafeHtml` template is parsed as HTML with **no escaping and no URL screening** — the same trust model as `innerHTML` / `raw()`. An `Element` template's attributes are copied to the live tree **verbatim**, including `on*` inline handlers and `javascript:` URLs. So a `morph()` template must be markup you trust: built via JSX, or sanitized upstream (DOMPurify). Never pass unsanitized user input as a `morph()` template. (This is distinct from the `mount()` render path, where JSX escapes values and screens dangerous URLs — `morph()` bypasses that because its template is already-built markup.)

### `renderDocument(node: SafeHtml | string, options?: RenderDocumentOptions): string`

```ts
import { renderDocument } from 'kerfjs';
return c.html(renderDocument(<Page />)); // "<!DOCTYPE html><html>…"
```

SSR convenience: prepends the doctype to a rendered document so routes don't reinvent `"<!DOCTYPE html>" + page.toString()`. `node` is a `SafeHtml` (JSX or the `html` tagged template) or a raw string — both are stringified via `.toString()`. `RenderDocumentOptions` is `{ doctype?: string }` (default `'html'`). Pure string work; no DOM dependency.

### `each<T>(items, render, cacheKey?): SafeHtml`

The third argument may instead be an options object —
`each<T>(items, render, options?): SafeHtml` — carrying `cacheKey` and/or
`key`. Both forms are supported; the options form is what you need when a list
requires a stable identity (see below).

```ts
each(rows.value, (row) => <tr data-key={row.id}>{row.label}</tr>);
each(rows.value, (row) => <tr…>…</tr>, (row) => row.id === selectedId ? 1 : 0);
each(rows.value, (row) => <tr…>…</tr>, { key: 'rows' });
each(rows.value, (row) => <tr…>…</tr>, { key: 'rows', cacheKey: (row) => row.id === selectedId });
```

Keyed list iteration with per-item memoization, routed through `mount()`'s native list reconciler. Skips re-running `render` for items whose object identity (and optional `cacheKey`) are unchanged since the previous call — those items keep their existing live DOM nodes verbatim. Items whose identity or cacheKey did change get a fresh node (all fresh-node HTML for a render is bulk-parsed in one `innerHTML` call); items that disappeared are removed. Reorders use a longest-increasing-subsequence pass so the number of `insertBefore` calls is the minimum possible. Items must be objects (cache is a `WeakMap`); wrap primitives if you need to iterate them. Each item's render output must produce exactly one top-level element — and that element must survive HTML parsing as itself, so put an `each()` of `<tr>` inside an explicit `<tbody>` (a bare `<table>` makes the parser insert one, which kerf rejects with a precise error).

`cacheKey` is a passive comparator (not a reactive subscription): kerf calls it once per item per mount-effect run and compares the returned value against the previous run's. Use it when external state, not the item itself, drives what the row should render (e.g. a "currently selected" id flips a CSS class). Distinct from `data-key` on the rendered element, which is the DOM-reconciliation identity that morph uses — `cacheKey` controls when the cached HTML is invalidated; `data-key` controls how a row maps to its existing live DOM node. (Renamed from `key` for clarity; positional callers — the canonical form — are unaffected.)

`render` receives `(item, index)`. The `index` is the row's position at render time; it is **not** part of the memo key (only item identity, `cacheKey`, and content version are). So a row that keeps its identity while its position changes — a reorder, or an insert/remove/move ahead of it — keeps the HTML it rendered at its old index, and any use of `index` in the output (a `{index + 1}.` prefix, zebra striping, an "N of M" label) goes stale on the moved rows. When the output depends on the index, fold it into the memo key so displaced rows re-render: `each(items, render, { cacheKey: (_, i) => i })` (add a `key` if the list needs one). The opt-in `KERF_DEV_WARN_STALE_INDEX=1` surfaces the hazard at runtime. (One edge this workaround doesn't cover — an `arraySignal` batch whose fresh inserts displace *each other* — is noted in [`docs/4-render.md`](4-render.md) §4.2; for index-labeled rows with multi-insert batches, prefer immutable `signal<T[]>` updates.)

`key` gives the list a **stable identity**. Without one, a list is identified by its call order — "the n-th `each()` in this render" — so any render that changes how many `each()` calls run *before* it reassigns its identity, and kerf rebuilds the list from scratch: rows lose their DOM nodes, and with them focus, scroll position and in-progress IME composition. The common trigger is a conditional list rendered above another list. Give a key to any list that can be preceded by one:

```tsx
{showFilters.value ? <ul>{each(filters.value, renderFilter, { key: 'filters' })}</ul> : ''}
<ul>{each(results.value, renderResult, { key: 'results' })}</ul>
```

A keyed list does not occupy a call-order slot, so keying just the *conditional* list is usually enough — its unkeyed siblings stop shifting too. Keys must be unique within a mount; two lists claiming the same key throw. In development, kerf warns once per list when it detects an identity shift and names the fix.

A key must be a non-empty string of letters, digits, or `_ . : / -` and may not contain `--` — kerf writes it into the list's marker comment in the DOM, so anything that could terminate a comment is rejected with an error rather than corrupting the mount.

**`each()` does not nest.** A row's HTML is flattened to a string, so an `each()` called inside a row render never binds — it would render as inert static markup. Render an inner collection with plain `.map()` (it re-renders with its row), or restructure to a flat list. A *keyed* nested `each()` throws and says so.

If a descendant of a moved row holds focus, the reconciler snapshots the active element + its selection range before the move pass and re-applies them afterwards — so focus and caret position survive a reorder even on engines that drop focus on `insertBefore` (older Safari, happy-dom). See `docs/4-render.md` §4.4.

## 8.4 Event delegation

### `delegate(rootEl, type, selector, handler, options?): () => void`

```ts
delegate(rootEl, 'click', '[data-action="add"]', (event, matched) => { ... });
delegate(rootEl, 'focus', '.field-row',          (event, row)     => { ... });
```

One root listener with `closest(selector)`-style walk-up matching; fires `handler(event, matched)` if the match is inside `rootEl`. Returns a `() => void` disposer — **capture it and call it when the delegate's scope ends** (closing a modal, leaving a route, tearing down a widget). Discarding the disposer is only safe for genuinely page-lifetime registrations: top-level mount on a root that never tears down. Everywhere else the closure pins `rootEl`, `handler`, and everything the handler closes over, so an undisposed listener leaks the app graph and re-mounts stack listeners. `mount()`'s disposer does NOT remove delegates for you. See `docs/5-event-delegation.md` §5.3 — and §5.3's "When capturing the disposer still isn't enough" for the cluster of cases where capturing alone isn't sufficient (delegate inside `effect()`, delegate on `toElement()` output that's replaced, disposer variable overwrites, nested transient roots).

Auto-promotes the well-known non-bubbling event types (`focus`, `blur`, `scroll`, `load`, `error`, `mouseenter`, `mouseleave`) to capture phase under the hood, so the call site looks identical regardless of whether the event bubbles. Selector matching stays `closest()`-style for every event type — wrapper selectors still match when the event lands on a descendant.

The optional fifth argument is `{ match?: 'closest' | 'direct' }` (see [`DelegateOptions`](#delegateoptions-type) below). It defaults to `'closest'`; pass `'direct'` to fire only when `event.target` itself matches the selector (no walk-up).

### `delegateCapture(rootEl, type, selector, handler, options?): () => void`

Same shape, but installs on the capture phase. Selector matching is `closest()`-style by default — the same walk-up as `delegate()`, passing the matched ancestor (not the raw target) to your handler. The escape hatch — use it for custom non-bubbling events that aren't in `delegate()`'s auto-promotion list, or when you want capture-phase semantics (run before any descendant's bubble-phase handler). Same disposer-capture rule as `delegate()`. Pass `{ match: 'direct' }` to opt into strict `target.matches(selector)` matching (fire only on the exact element the selector identifies, no walk-up).

### `DelegateOptions` (type)

```ts
interface DelegateOptions {
  match?: 'closest' | 'direct';
}
```

Options accepted by both `delegate()` and `delegateCapture()`. `match` selects how the selector is applied to `event.target`: `'closest'` (the default) walks up via `closest(selector)` and fires for the nearest matching ancestor inside `rootEl`; `'direct'` fires only when `event.target` itself matches the selector.

### `attr(name, value)` — static form

```ts
attr<N extends string, V extends string>(name: N, value: V): AttrSpec<N, V>
```

Create a pre-computed attribute descriptor. Escapes name and value once at definition time; the resulting `AttrSpec` is frozen and ready to use in both JSX and `delegate()`.

```ts
import { attr, type AttrSpec } from 'kerfjs';

const ACTIONS = {
  toggle: attr('data-action', 'toggle'),
  remove: attr('data-action', 'remove'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;

// In JSX — spread .attrs (rename-safe; no hardcoded attribute name at call sites):
<button {...ACTIONS.toggle.attrs}>Toggle</button>

// In delegate — use the pre-computed selector:
delegate(root, 'click', ACTIONS.toggle.selector, handler);
// → '[data-action="toggle"]'
```

### `attr(name)` — dynamic form

```ts
attr<N extends string, V extends string = string>(name: N): (value: V) => { readonly [K in N]: V }
```

Pre-validates and pre-escapes the attribute name, then returns a factory for per-render values. Use for per-row data attributes like `data-id` where the value changes per item. Leaving both generics off infers `N` from the argument and defaults `V` to `string`; specify both explicitly to constrain which values the factory accepts.

```ts
const ITEM = { id: attr('data-id') } as const;

// In JSX — call the factory inline:
<li {...ITEM.id(String(item.id))}>…</li>
```

The attribute name is validated and CSS-escaped at creation; the factory result carries the raw value (escaped later by the JSX attribute renderer when spread). In the *static* form, both the name (CSS identifier) and value (double-quoted CSS string) are CSS-escaped into `.selector` at creation — SSR-safe, no `CSS.escape` dependency. Both forms throw on an empty attribute name.

For ad-hoc compound selectors, concatenate `.selector` strings:

```ts
delegate(root, 'click',
  ACTIONS.toggle.selector + attr('data-id', id).selector,
  handler);
```

### `AttrSpec<N, V>` (type)

```ts
interface AttrSpec<N extends string = string, V extends string = string> {
  readonly name: N;             // raw attribute name
  readonly value: V;            // raw attribute value
  readonly selector: string;    // pre-computed '[name="value"]' selector string
  readonly attrs: { readonly [K in N]: V };  // spreadable JSX object
}
```

### Generic type parameter: `delegate<T extends Element = Element>()`

Both `delegate()` and `delegateCapture()` accept an optional element-type generic that narrows the `target` argument in the handler, avoiding casts:

```ts
delegate<HTMLButtonElement>(root, 'click', 'button[data-action]', (e, btn) => {
  // btn is HTMLButtonElement — no cast needed
  btn.disabled = true;
});
```

The default is `Element` (untyped call sites are unaffected).

### `action<V extends string>(value: V): AttrSpec<'data-action', V>` — `kerfjs/actions` subpath

```ts
import { action, delegateActions } from 'kerfjs/actions';
```

`action('select-file')` is a thin specialization of `attr('data-action', 'select-file')` — it returns the same [`AttrSpec`](#attrspec-n-v-type). Spread its `.attrs` in JSX and use its `.value` as the handler-table key, so the action name lives in exactly one place and can't drift between the markup and the dispatcher. Lives in its own subpath so apps that don't use it pay nothing.

### `delegateActions<E extends Element = Element>(root, eventType, table, options?): () => void`

```ts
const A = { select: action('select'), remove: action('remove') };

// JSX:  <button {...A.select.attrs} data-id={id}>…</button>
const dispose = delegateActions(root, 'click', {
  [A.select.value]: (_e, el) => select(el.getAttribute('data-id')),
  [A.remove.value]: (_e, el) => remove(el.getAttribute('data-id')),
});
```

Wires a whole table of `data-action` handlers with ONE delegated listener (built on `delegate()`, so it inherits the single-listener dispatch and the capture auto-promotion for non-bubbling event types). On `eventType`, the nearest element carrying the action attribute (walk-up `closest()` by default; `{ match: 'direct' }` for an exact match) is looked up in `table` by its attribute value and the matching handler runs; an action absent from the table is ignored, like a `switch (dataset.action)` with no matching `case`. Returns a `() => void` disposer. One event type per call (mirroring `delegate()`) — collect the disposers when a root needs several. Options: `{ attr?: string; match?: 'closest' | 'direct' }` — `attr` (default `'data-action'`) overrides the keyed attribute; `match` is inherited from [`DelegateOptions`](#delegateoptions-type). The `ActionHandler<E>` and `DelegateActionsOptions` types are exported for annotating handlers and options.

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

The return type of every JSX expression. `.toString()` returns the underlying HTML. (The listing above is the public contract, deliberately simplified: the emitted declaration's constructor also accepts an internal `Segment` and the instance carries a `__segment` field — both internal plumbing for `mount()`'s list handling that consumers should not construct or read.)

`SafeHtml` instances carry a brand symbol — `Symbol.for('kerfjs.SafeHtml')` — so cross-bundle identification works even if a consumer's bundler ends up loading two copies of kerf (e.g. the barrel and the JSX-runtime entry resolved as independent modules). Prefer `isSafeHtml()` over `instanceof SafeHtml` when writing custom integrations.

### `isSafeHtml(value: unknown): value is SafeHtml`

Cross-bundle-safe type guard. Returns `true` for any object carrying the `Symbol.for('kerfjs.SafeHtml')` brand. Use this rather than `instanceof SafeHtml` if you're inspecting JSX values yourself — `instanceof` fails when two copies of kerf produce structurally-identical-but-class-distinct `SafeHtml` instances.

### `raw(html: string): SafeHtml`

Wrap a pre-escaped HTML string, bypassing kerf's auto-escaping. Useful for icons, rendered Markdown, or server-included fragments.

**Reach for `raw()` rarely.** kerf escapes automatically everywhere else, so a codebase with a lot of `raw()` is usually reaching past a safer first-class tool:

- **Interpolating dynamic text or attributes?** Plain JSX already escapes it (`<p>{value}</p>`, `class={sig}`) — you don't need `raw()`.
- **Composing markup?** Build a `SafeHtml` the normal way — a JSX expression, the `html` tagged template (`kerfjs/html`), `each()`, or a component function returning JSX. All produce trusted `SafeHtml` without hand-writing an HTML string.
- **A genuinely trusted, pre-escaped *dynamic* value** (server output, config, a hard-coded string) is the one legitimate use. The `kerfjs/no-raw-with-dynamic-arg` lint rule flags a `raw()` whose argument is **not** a literal — because unsanitized user input is the canonical XSS mistake. Acknowledge a call you've reviewed with an explicit `// eslint-disable-next-line kerfjs/no-raw-with-dynamic-arg`. That override is the single sanctioned way to say "this is trusted," and it leaves a searchable audit trail. (The rule ships at `warn` in `configs.recommended`, so an un-acknowledged dynamic `raw()` is a nudge, not a hard failure — but the disable comment is how you signal intent.)

`raw()` is **not** a sanitizer — it does no escaping. For user-controlled input, sanitize first (`raw(DOMPurify.sanitize(marked(userMarkdown)))`) or, better, render it through escaping JSX instead.

### `Fragment` (component)

JSX `<>...</>` — concatenates children without a wrapper tag. Available from both `kerfjs/jsx-runtime` (used by the JSX transform) and the main `kerfjs` barrel (when you need to compose `Fragment` manually, e.g. `jsx(Fragment, { children })`).

### `` html`…` `` — `kerfjs/html` subpath

```ts
import { html, type HtmlValue } from 'kerfjs/html';

function html(strings: TemplateStringsArray, ...values: HtmlValue[]): SafeHtml;

type HtmlValue =
  | SafeHtml | string | number | boolean | null | undefined
  | ReadonlySignal<unknown>
  | readonly HtmlValue[];
```

Tagged-template authoring path — the same `SafeHtml` output and the **same runtime semantics** as JSX, with no JSX transform required. Made for CDN / importmap consumers ("no build step" taken literally); it lives at its own subpath so JSX-only apps don't ship it.

```js
html`<div class="${cls}">Count: ${count}</div>`
html`<ul>${each(items.value, (i) => html`<li id="${i.id}">${i.label}</li>`)}</ul>`
```

Text/child holes follow the JSX child rules (escaping, number stringify, boolean/nullish → nothing, arrays, `SafeHtml`/`each()` passthrough, signal → fine-grained text binding, DOM nodes throw). Attribute holes follow the JSX attribute rules (boolean attributes, `SafeHtml` bypass, dangerous-URL screening, `on*`/malformed-name rejection, signal → fine-grained attribute binding). Two differences: attribute names are emitted **verbatim** (write `class`, not `className` — no camelCase aliasing), and holes are only legal in text positions or as a **complete** attribute value (`attr=${v}` / `attr="${v}"`); tag-name holes, attribute-name holes, partial values (`class="a ${b}"`), and holes inside comments throw. Static template parts pass through verbatim (same trust model as JSX tags/attrs). The static parts are parsed once per call site and cached by template-strings identity. See `docs/6-jsx-runtime.md` §6.11.

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

Attribute names, value sets, and per-element membership come from the WHATWG HTML Living Standard and SVG 2 — not from another framework's table, which models a *property* surface rather than the content attributes kerf actually emits. Coverage is focused rather than exhaustive; the deliberate departures (lowercase aliases, `contentEditable="inherit"`, the `@deprecated` presentational attributes) are enumerated in `src/jsx-types.ts`'s header. The rule that follows from it — `boolean` means *boolean attribute*, and HTML's enumerated attributes take strings — is documented in [`docs/6-jsx-runtime.md`](6-jsx-runtime.md) §6.4.

### Fine-grained signal bindings

`AttrValue` / `AttrLike` (attribute values) and the JSX child type accept a `ReadonlySignal<unknown>` in addition to the usual `string | number | boolean | null | undefined | SafeHtml`. Passing a `signal`/`computed` *itself* into a JSX attribute (`class={someSignal}`) or text hole (`{someSignal}`) inside a `mount()` binds that hole fine-grained — the node updates on signal change without re-running `render()` or walking the reconciler. `ReadonlySignal` is used (covariant) so both `signal(...)` and `computed(...)` of any `T` are accepted. Outside a `mount()` (SSR / `.toString()`) the signal snapshots its current value. Full semantics, the "use `computed()` not a bare closure" rule, and the row-mutation staleness limitation are in [`docs/2-reactivity.md`](2-reactivity.md) §2.9.

### Dangerous URL filter

Plain-string values passed to `href`, `src`, `xlink:href`, `formaction`, `action`, or `data` (`<object data>`) are screened by scheme (`javascript:` / `vbscript:` and script-executing `data:` document types). Matching values cause the attribute to be **dropped entirely**. In **development** the screen **throws an `Error`** with the diagnostic (fail loudly at your desk); in **production** it `console.warn`s and drops (never crash a shipped app on attacker-influenced data) — the attribute is dropped in both modes, only the reporting differs, and production output is byte-identical to before. Mode follows whether `kerfjs/dev` is imported — kerf does not probe the environment. The `javascript:` no-op placeholders — `javascript:void(0)`, `javascript:void(0);`, `javascript:void 0`, `javascript:;`, and a bare `javascript:` — are **allowed**: they are the placeholder-link idiom rather than an attack, and the match is against the whole normalized value so nothing can be appended to one. The screen is bypassed for `SafeHtml` (i.e. `raw(...)`) values in both modes — that's the documented opt-out for legitimate cases (bookmarklet builders, sanitized-upstream URLs). Non-URL attributes are not screened. The same screen applies to **fine-grained bound** URL attributes (a `href={sig}` whose signal resolves to a dangerous value is dropped — throwing in dev, warning in prod). See `docs/6-jsx-runtime.md` §6.4.1 for the full rationale and examples.

## 8.6 Direct JSX → DOM

### `toElement(jsx: SafeHtml | string): Element | DocumentFragment`

Parses a JSX/SafeHtml/string and returns a DOM node ready to insert into a parent.

- **Single-root input** (one element child, surrounding whitespace OK) → returns the `Element`. For `<svg>` roots and orphan SVG fragments (`<path>`, `<g>`, `<circle>`, …) the input is XML-parsed through `DOMParser('image/svg+xml')` so the returned element is namespaced correctly and malformed SVG markup is rejected with a parse error.
- **Multi-root input** (multiple elements, or any non-whitespace text alongside an element — `<><svg/> label</>`, `<>icon<text>icon</>`, two icons side by side) → returns a `DocumentFragment` containing every top-level node, including text nodes. Pass the result straight to `parent.appendChild(...)` / `parent.replaceChildren(...)` / `parent.append(...)` — the DOM insertion APIs inline a `DocumentFragment`'s children on insert and empty the fragment, so the caller never sees the wrapper. Nothing is silently dropped.

Throws if the input produces zero element children OR if `DOMParser` rejects an SVG input.

The returned node is always adopted into the live `document` (`node.ownerDocument === document`), never left owned by the inert `<template>` / `DOMParser` document it was parsed in. This matters when you operate on the node **before inserting it** — e.g. `mount(toElement(<div/>), …)`, which sets `innerHTML` on first render. An inert-document element is unsafe to mutate that way on some engines (WebKit can mis-parse `innerHTML` on it under rapid bursts), so kerf moves the node into the live document up front. Identity and SVG/MathML namespaces are preserved by the adoption.

> **Security — trusted input only.** `toElement()` parses its input into live DOM with **no escaping and no URL screening** — the same trust model as `innerHTML` / `raw()`. The **SVG path is more dangerous than the HTML path**: a top-level `<svg><script>…</script></svg>`, an SVG event attribute (`onload`, `<animate onbegin>`), `xlink:href="javascript:"`, or `<foreignObject>` HTML all **execute** once the returned node is inserted into the live document — whereas an HTML-string `<script>` is inert (it's parsed via `<template>.innerHTML`, which never runs scripts). Pass only markup you trust: built via JSX, or sanitized upstream with an SVG-aware sanitizer (DOMPurify). Never pass unsanitized user input.

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

## 8.8 Overlays — `kerfjs/overlay` subpath

Optional subpath (`import { overlay, confirm, toast } from 'kerfjs/overlay'`) that blesses the modal/overlay pattern every real kerf app hand-rolls. Structural only — kerf ships no CSS; you style the wrapper. Each function owns its DOM + listeners in a closure and returns a handle (no per-instance framework state). Because `overlay()` owns its content's `mount()` (so `close()` disposes it), this subpath pulls in the core renderer — but an app already importing `kerfjs` shares that via code-splitting, so the marginal cost is ~2 KB.

### `overlay(content, options?): OverlayHandle`

```ts
const dialog = overlay(<Settings />, { dismiss: ['escape', 'backdrop'], initialFocus: 'input' });
await dialog.result;      // resolves when closed
dialog.close(value);      // or close it yourself
```

Appends a wrapper (class from `options.className`, default `'kerf-overlay'`) to `options.container` (default `document.body`), `mount()`s `content` inside it, wires the requested dismissals, and returns an [`OverlayHandle`](#overlay-types) `{ el, close(result?), result }`. `content` is an [`OverlayContent`](#overlay-types) — a `SafeHtml` (static) or a `() => MountResult` render function (driven reactively). `close()` is idempotent: it disposes the mount, removes the listeners + node, restores focus to the previously-focused element, and resolves `result`.

Options ([`OverlayOptions`](#overlay-types)): `dismiss` (`'escape' | 'backdrop' | 'outside'`, an array, or `false`; default `['escape', 'backdrop']` — `'backdrop'` is a click on the wrapper itself, `'outside'` a click anywhere outside it for popovers); `initialFocus` (selector, `true` = first focusable, or `false`; default `true`); `trap` (trap Tab/Shift+Tab within + set `role="dialog"` / `aria-modal`; default `true`); `role`; `onDismiss`; and `outsideIgnore` (elements whose clicks don't count as outside, e.g. the trigger). A user dismissal resolves `result` with `undefined`.

### `confirm(message, options?): Promise<boolean>`

```ts
if (await confirm('Delete this file?', { danger: true })) remove();
```

A promise-based `window.confirm` replacement (that global is a no-op in Tauri WKWebViews). Renders a two-button dialog on top of `overlay()` and resolves `true` for OK, `false` for Cancel or any dismissal. `message` + labels are auto-escaped through the JSX runtime. Options ([`ConfirmOptions`](#overlay-types)): `title`, `okText` (default `'OK'`), `cancelText` (default `'Cancel'`), `danger` (adds a `kerf-confirm--danger` class), plus `container` / `className`.

### `prompt(message, options?): Promise<string | null>`

```ts
const name = await prompt('Rename layer', { defaultValue: layer.name });
if (name !== null) rename(name);
```

The symmetric sibling of `confirm()` — a promise-based `window.prompt` replacement (also a no-op in Tauri webviews). Renders a one-field dialog on top of `overlay()` and resolves the entered **string** on OK (an empty string is a valid result), or `null` on Cancel / dismissal. **Enter** in the input submits. `message`, the default value, and labels are auto-escaped. Options ([`PromptOptions`](#overlay-types)): `defaultValue` (default `''`), `placeholder`, `inputType` (default `'text'`), `title`, `okText` / `cancelText`, `validate` (return a non-empty error string to block OK — it shows inline), plus `container` / `className`.

### `form(fields, options?): Promise<Record<string, string> | null>`

```ts
const creds = await form([
  { name: 'host', label: 'Host', defaultValue: 'localhost' },
  { name: 'token', label: 'API token', type: 'password', validate: (v) => v ? '' : 'required' },
]);
if (creds !== null) connect(creds.host, creds.token);
```

The two-or-three-input generalization of `prompt()`: renders one labeled input per [`FormField`](#overlay-types) and resolves a `Record<name, value>` on OK (after **every** field's `validate` passes) or `null` on Cancel / dismissal. Enter in any field submits; the first invalid field is focused. Each `FormField` has `name` (the record key + input `name`), optional `label` (defaults to `name`), `defaultValue`, `placeholder`, `type` (default `'text'`), and `validate`. Options ([`FormOptions`](#overlay-types)): `title`, `okText` / `cancelText`, `container` / `className`.

### `choice<R>(message, actions, options?): Promise<R | null>`

```ts
const r = await choice('Unsaved changes', [
  { value: 'save', label: 'Save Draft' },
  { value: 'discard', label: 'Discard', className: 'btn-danger' },
  { value: 'cancel', label: 'Keep Editing' },
], { defaultValue: 'cancel' });
// r is 'save' | 'discard' | 'cancel' | null (Escape/backdrop)
```

The **N-way** sibling of `confirm()`: renders one button per [`ChoiceAction<R>`](#overlay-types) and resolves that action's `value` on click, or `null` on Cancel / dismissal. Pass **`defaultValue`** to make **Enter** (pressed anywhere in the dialog) resolve a default action — the "global Enter-to-confirm" model — without holding the overlay handle. An action's `value` may itself be `null`/`undefined` and stays distinct from a dismissal (the promise resolves on the click, not via the overlay's result). `message` + labels auto-escape; `render` gives BYO markup (spread each `slots.actions[i]` onto your buttons). kerf owns dismiss / focus-trap / focus-restore. Options ([`ChoiceOptions<R>`](#overlay-types)): `title`, `defaultValue`, `render`, `container` / `className`. For fully bespoke keyboard/close control, drive [`overlay()`](#overlaycontent-options-overlayhandle) directly.

### Bring your own markup (`render`) — design-system dialogs

`confirm` / `prompt` / `form` render kerf's own button/field DOM with kerf class names. When you have a **design system** and want its markup + classes, pass a `render` option: it returns the full dialog body, and you spread the provided **wiring slots** onto your own elements. kerf keeps owning the promise, `validate`, Enter-submit, dismiss, focus-trap, and focus-restore — you only own the look. (The generic `overlay()` is the other route: mount any markup and drive dismiss/focus yourself.)

```tsx
// confirm with your design system's buttons — { message, ok, cancel } are attribute bags
await confirm('Delete this file?', {
  render: ({ message, ok, cancel }) => (
    <div class="modal">
      <p>{message}</p>
      <button {...cancel} class="btn btn-sm">No</button>
      <button {...ok} class="btn btn-danger">Yes</button>
    </div>
  ),
});
```

`prompt`'s slots are `{ message, input, error, ok, cancel }` (spread `input` onto your `<input>`, `error` optional); `form`'s are `{ fields, ok, cancel }` where each `fields[i]` is `{ name, label, input, error }`. Omitting an `error` slot just skips that inline message — `validate` still blocks and focuses. Slot types: [`ConfirmRenderSlots`](#overlay-types), [`PromptRenderSlots`](#overlay-types), [`FormRenderSlots`](#overlay-types) / [`FormRenderField`](#overlay-types).

### `popover(anchor, content, options?): OverlayHandle`

```ts
const trigger = document.querySelector('#menu-btn')!;
const pop = popover(trigger, <Menu />); // opens below the button, dismisses on outside click
```

An **anchored, non-modal** overlay: positions `content` relative to `anchor` (below by default, flipping above if it would overflow the viewport, and clamped horizontally) and repositions on scroll / resize while open. It's a thin wrapper over `overlay()` with non-modal defaults — `trap: false`, `dismiss: ['outside']`, and the anchor added to `outsideIgnore` so the click that opened it doesn't immediately close it. Returns the same [`OverlayHandle`](#overlay-types); `close()` also drops the reposition listeners. `position: fixed` is set inline (you style everything else — kerf ships no CSS). Options ([`PopoverOptions`](#overlay-types)): `placement` (`'bottom'` | `'top'`, default `'bottom'`, auto-flips), `align` (`'start'` | `'end'`, default `'start'`), `gap` (px, default `4`), `dismiss`, `initialFocus` (default `false`), `outsideIgnore` (merged with the anchor), `onDismiss`, `container` / `className`. The positioning is dependency-free (below/above + clamp); for complex cases (arrow, collision on both axes) drive `overlay()` yourself.

### `positionAnchored(el, anchor, options?): void` / `autoReposition(el, anchor, options?): () => void`

```ts
positionAnchored(hintEl, badgeEl, { placement: 'top' });        // one-shot
const stop = autoReposition(hintEl, badgeEl, { gap: 6 });       // stays glued; stop() to unbind
```

`popover()`'s placement core, exported for positioning your **own** element against an anchor with no overlay lifecycle (an inline hint, a floating label). `positionAnchored` sets `el.style` `position: fixed`, `margin: 0`, `left`, `top` — below the anchor by default, flipping above on overflow, aligned to a horizontal edge and clamped into view. `autoReposition` positions once, then re-runs on `scroll` (capture — catches inner scroll containers) and `resize`, returning a disposer that removes the listeners. Both take [`AnchorPositionOptions`](#overlay-types) (`placement`, `align`, `gap`).

### `tooltip(anchor, content, options?): () => void`

```ts
const stop = tooltip(buttonEl, 'Delete this item'); // hover/focus tooltip, above by default
```

A hover/focus-triggered, non-modal, auto-hiding tooltip anchored to `anchor`. Shows after `delay` on `pointerenter`/`focus`, hides after `hideDelay` on `pointerleave`/`blur`, and keeps itself positioned with `autoReposition` (`placement` defaults to `'top'`). No click-dismiss model — it follows the pointer/focus. `content` is a [`TooltipContent`](#overlay-types) (a string is auto-escaped, or pass `SafeHtml` / a render fn). Returns a disposer that removes the anchor listeners and hides any shown tooltip. Options ([`TooltipOptions`](#overlay-types), extends `AnchorPositionOptions`): `delay` (default `400`), `hideDelay` (default `100`), `role` (default `'tooltip'`), `container` / `className` (default `'kerf-tooltip'`).

### `toast(content, options?): ToastHandle`

```ts
toast('Saved', { variant: 'success' });
const { el, dismiss } = toast('Uploading…', { duration: 0 }); // sticky; dismiss() when done
toast('Only the latest shows', { mode: 'replace' });          // collapse-to-latest
```

Shows a non-modal, auto-dismissing notification, stacked in a shared body-level region (lazily created, or `options.container`). `content` is a [`ToastContent`](#overlay-types) (text, `SafeHtml`, or a render function). Returns a [`ToastHandle`](#overlay-types) `{ el, dismiss }` — `el` is the node (inspect it, wire an action button, or run your own entrance/exit transitions) and `dismiss()` removes it early (idempotent). `dismiss({ instant: true })` removes it **synchronously**, skipping the exit transition — for an action button that immediately shows a replacement toast in a single centered slot (no cross-fade); `mode: 'replace'` with `collapse: 'instant'` likewise cleans up a toast that is already mid-fade. Options ([`ToastOptions`](#overlay-types)): `duration` (ms; `0` = sticky; default `4000`), `mode` (`'stack'` default, or `'replace'` — dismiss the region's current toast(s) first for collapse-to-latest), `collapse` (how `'replace'` drops the prior toast(s): `'fade'` default = run their exit transition, good for a **stacking** region; `'instant'` = remove them synchronously, what a single **centered** slot wants so messages never cross-fade in the same spot), `variant` (`'info'` | `'success'` | `'warning'` → adds a `${className}--${variant}` accent class), `enterClass` (added on the next animation frame, so a CSS **entrance** transition runs), `exitClass` + `exitDuration` (CSS owns the **exit**: on dismiss the `enterClass` is REMOVED — so `exitClass` needn't out-specify it, and a symmetric single-class fade works by setting only `enterClass` + `exitDuration` — then the node is removed `exitDuration` ms later, delayed whenever `exitClass` is set OR `exitDuration > 0`), `className` (default `'kerf-toast'`), `role` (default `'status'`), `container`.

### Overlay types

`OverlayHandle`, `OverlayContent`, `OverlayOptions`, `DismissTrigger`, `ConfirmOptions`, `ConfirmRenderSlots`, `PromptOptions`, `PromptRenderSlots`, `FormField`, `FormOptions`, `FormRenderSlots`, `FormRenderField`, `FieldValidator`, `ChoiceAction`, `ChoiceOptions`, `ChoiceRenderSlots`, `PopoverOptions`, `PopoverPlacement`, `AnchorPositionOptions`, `TooltipContent`, `TooltipOptions`, `ToastContent`, `ToastOptions`, `ToastVariant`, and `ToastHandle` are all exported from `kerfjs/overlay` for annotating handles, content, and option bags.

## 8.9 Dispose scopes — `kerfjs/scope` subpath

Optional subpath (`import { disposeScope, disposeSubtree, observeRemovals } from 'kerfjs/scope'`) that ties a set of disposers to a DOM element's lifetime. kerf hands out disposers (`mount()` / `effect()` / `delegate()` all return `() => void`), but nothing scopes them to a subtree, so append-heavy UIs leak detached-but-subscribed effects and listeners. No module-level mutable state — scopes live in a `WeakMap` keyed by element.

### `disposeScope(el): Scope`

```ts
const s = disposeScope(card);
s.mount(card, renderCard);            // mounts AND registers the disposer
s.effect(() => sync(card));
s.delegate(card, 'click', '.del', del);
s.add(() => observer.disconnect());   // any () => void disposer
// …later:
s.dispose();                          // runs them all, best-effort, idempotent
```

Returns the per-element [`Scope`](#scope-type). Calling `disposeScope(el)` again for the same element returns the **same** scope (so disparate code paths register into one place); after `dispose()`, a later call starts fresh. `Scope` has `add(dispose)` (register any disposer, returns it), the convenience wrappers `mount(el, render)` / `effect(fn)` / `delegate(root, type, selector, handler, options?)` (which call the kerf primitive **and** register its disposer), and `dispose()` (runs every registered disposer best-effort — a throwing one won't strand the rest — then resets; idempotent).

### `disposeSubtree(root): void`

```ts
disposeSubtree(feed);  // dispose every scope in feed, root included
feed.remove();
```

Disposes `root`'s own scope and every descendant scope, then leaves the DOM removal to you. Call it right before removing a subtree. Finds scopes by walking the subtree against the `WeakMap` — it adds no marker attributes to your DOM.

### `observeRemovals(root): () => void`

```ts
const stop = observeRemovals(document.body); // auto-dispose on removal, app-wide
```

Installs a `MutationObserver` on `root` that auto-runs a node's scope (via `disposeSubtree`) when that node — or an ancestor — is removed from the subtree. One observer covers the whole tree. Returns a disconnect function. `MutationObserver` fires asynchronously, so disposal runs a microtask after the removal.

### `Scope` (type)

The handle returned by `disposeScope`, exported for annotation: `{ add, mount, effect, delegate, dispose }` (see `disposeScope` above).

## 8.10 Async state — `kerfjs/async` subpath

Optional subpath (`import { resource } from 'kerfjs/async'`) that models async state — the `{ status, data, error }` shape every app reproduces — with the stale-response guard built in. You still write the fetch; `.run()` owns the status transitions and drops out-of-order responses. Signals only, no render core, so it's tiny.

### `resource<T, I = void>(options?): Resource<T, I>`

```ts
const users = resource<User[]>();

// Browser (client-side fetch):
users.run(() => fetch('/api/users', { headers: auth() }).then((r) => r.json()));

// SSR (Node 18+ global fetch — same primitive):
await users.run(() => fetch(apiUrl).then((r) => r.json() as Promise<User[]>));

// render off users.value.status
users.value.status; // 'idle' | 'running' | 'completed' | 'failed'
```

Returns a [`Resource<T, I>`](#resource-types). `resource.value` is a **tracking read** of `ResourceState<T, I>` (`{ status, data, error, progress, input, revision }`) — drive UI off `value.status`, exactly like reading a signal inside `mount()`/`computed()`/`effect()`. Methods:

- **`run(fetcher): Promise<T | undefined>`** — sets `running`, then `completed` (with `data`) or `failed` (with `error`), guarding against stale responses: **only the latest `run` may resolve the state**, so a slow response can't clobber a newer one. It **never rejects** — a failure lands in `value.error`; the returned promise resolves the data (or `undefined` on failure) for callers who want to await. Previous `data` is preserved across a re-run and on failure (stale-while-revalidate).
- **`run(input, fetcher): Promise<T | undefined>`** — same as above, plus records `input` as `value.input` for the `running`/`completed`/`failed` states of this run (again latest-wins under the stale guard). Use it when the failure UI must know **which request failed** — e.g. an inline error keyed by `value.input.fileId` — so you don't reintroduce module-scope bookkeeping. Parametrize the input type via the second type argument (`resource<Diff, { fileId: string }>()`).
- **`reset(): void`** — back to `idle`, clearing data/error/progress/input **and the per-key cache**, and invalidating any in-flight run.
- **`cached(key): T | undefined`** / **`cachedKeys(): string[]`** / **`clearCache(key?): void`** — a read-only view of the `cacheKey` cache, plus eviction. `cached(key)` returns a slice without running it (so a test or app can ask "is this window cached?"); `cachedKeys()` lists the cached keys (`.length` is the size); `clearCache(key)` evicts one key (or the whole cache with no argument) **without** touching `value`.

**Per-input cache + SWR** ([`ResourceOptions`](#resource-types)): pass `cacheKey(input)` to keep the last value **per key**. Starting a run for a previously-loaded key paints its cached slice immediately (still `running`) while it revalidates; a never-loaded key starts with no `data`. Without `cacheKey`, a run keeps the previous run's `data` (single-slot stale-while-revalidate), as before.

**Paint dedup** (`value.revision`): a counter that bumps **only when `data` actually changes** — by `options.equals` (default `Object.is`). Compare it to the revision you last painted to skip a redundant re-render (a poll returning identical data leaves it untouched, so you don't wipe scroll / sort / hover). Pass a structural `equals` to dedup a fresh-but-equal object.

```ts
const win = resource<Slice, string>({ cacheKey: (w) => w, equals: (a, b) => a.etag === b.etag });
win.run(tab, () => fetchSlice(tab)); // revisiting a loaded tab paints instantly, then revalidates
effect(() => {
  if (win.value.revision === lastPainted) return; // identical data → keep the DOM
  lastPainted = win.value.revision;
  paint(win.value.data);
});
```

**Progress** is opt-in: your fetcher receives a `report(completed, total)` callback (a plain `() => Promise<T>` is assignable — ignore it if unused). Reports from a superseded run are dropped.

```ts
upload.run((report) => putWithProgress(file, (sent, size) => report(sent, size)));
// upload.value.progress -> { completed, total } | undefined

// input threading — recover the failed request in the error branch:
const diff = resource<Diff, { fileId: string }>();
diff.run({ fileId }, (report) => fetchDiff(fileId, report));
// on failure: diff.value.status === 'failed' && diff.value.input?.fileId
```

### Resource types

`Resource<T, I>`, `ResourceState<T, I>`, `ResourceOptions<T, I>`, `ResourceStatus`, `ResourceProgress`, and `ResourceFetcher<T>` are all exported from `kerfjs/async`. The input type `I` defaults to `void` (so `resource<T>()` keeps `value.input` as `undefined`).

## 8.11 Keyed reactive list — `kerfjs/list` subpath

Optional subpath (`import { bindList } from 'kerfjs/list'`) providing `bindList` — a keyed list with a **live per-row mount** and optional **viewport virtualization**. It is a deliberate second list API, distinct from [`each()`](#eacht-items-render-cachekey-safehtml): reach for it when you need surgical per-row updates or windowing; `each()` stays the default for item-owned-state lists rendered to HTML strings. See `docs/4-render.md` §4.2 for the tradeoff.

### `bindList<T>(parent, source, options): () => void`

```ts
const dispose = bindList(listEl, itemsSignal, {
  key: (row) => row.id,
  render: (row) => <span class={selected} data-id={row.id}>{row.label}</span>,
  tag: 'li',                       // row element tag (default 'div')
  virtualize: { rowHeight: 32 },   // optional windowing
});
```

Binds a keyed list to `parent` (whose children `bindList` owns — by default it appends/moves rows to the very end; pass **`before`** to keep the rows as a block ending before a fixed trailing sibling, so a list can share its `parent` with an "add" button or indicator), driven by `source` — anything with a tracking `.value` array read, so a `signal<readonly T[]>` **or** an `arraySignal<T>` both work. When the source is an `arraySignal` and the list is **not** virtualized, bindList applies its insert/remove/move/update patches **granularly** (O(patches)) instead of diffing the snapshot; a plain `signal<T[]>`, a virtualized list, a `replace()`, or an `arraySignal` shared with another consumer fall back to the keyed diff (all correct — the granular path is a transparent optimization). Returns a disposer that tears down every row mount, the scroll listener, and the source subscription.

- **Per-row reactivity (content mode).** Return a `MountResult` (JSX / `SafeHtml`) and each row is individually `mount()`ed, so a signal the row's `render` reads updates just that row (a fine-grained binding or a one-row morph) — its siblings don't re-render. Read signals in `render` for reactivity (external state like a `selectedId`, or signals the item carries); keep item **objects** stable and drive structure (add/remove/move) through the source. A row whose item object identity changes is rebuilt (same rule as `each()`'s memo).
- **Own the row element (element mode).** Return an `HTMLElement` (or `{ el, update?, dispose? }`) and that element **is** the row — so the app owns its tag, class, `data-*`, and listeners, exactly how apps already build keyed rows (`<div class="ticket-row" data-id=…>`, a `<tr>` in a `<tbody>`). kerf **keys / moves / reuses** it: the SAME element survives an append, a remove elsewhere, a reorder, **or a fresh item object at the same key** (so focus / scroll / selection / imperative listeners are preserved). Your `dispose` runs **only** when the row is genuinely removed (or the list disposes) — not for surviving rows. Refresh a reused element's content by reading signals inside it, or by returning an `update(item)` that kerf calls on the existing element whenever the item changes at that key. A list may mix the two modes per row. (Content-mode `render` runs once extra at row creation for the mode probe, so keep `render` a pure projection — which bindList already requires.)
- **Virtualization.** With `virtualize: { rowHeight, overscan? }` only the rows in the scroll viewport are rendered. `bindList` renders the rows into an inner **sizer** element it creates inside `parent` and sets that sizer's `padding-top`/`padding-bottom` so `parent`'s `scrollHeight` stays honest — the padding lives on the sizer, not on `parent`, because padding counts toward `clientHeight` and would otherwise break the window math. It also sizes each row to `rowHeight` for you. `overscan` (default 3) renders extra rows above/below the viewport. Give `parent` a fixed height + `overflow: auto` in your CSS (the rows are `parent > sizer > row`).

Options ([`BindListOptions<T>`](#list-types)): `key` (stable per-row key — a `ListKey`, i.e. `string | number`), `render` (returns the row — a `MountResult` for content mode, or a `RowElement<T>` (`HTMLElement` / `{ el, update?, dispose? }`) for element mode), `tag` (content mode only), `before` (a `Node` or `() => Node | null` — keep the rows as a contiguous block ending just before it, for a `parent` shared with trailing controls; the node must be a child of `parent`; ignored when virtualized), `virtualize`.

### List types

`ListKey`, `ListSource<T>`, `RowElement<T>`, and `BindListOptions<T>` are exported from `kerfjs/list`.

## 8.12 Timing primitives — `kerfjs/timing` subpath

Optional subpath (`import { debounce, throttle, debouncedSignal } from 'kerfjs/timing'`) for the `let timer; clearTimeout(timer); timer = setTimeout(…)` pattern every app hand-rolls, with disposer-shaped ergonomics. `debounce`/`throttle` are dependency-free; only `debouncedSignal` pulls in signals (no render core), so the subpath is tiny.

### `debounce<A>(fn, ms): Debounced<A>`

```ts
const save = debounce(() => persist(state), 300);
input.addEventListener('input', save);
// …on teardown: save.cancel();
```

Trailing-edge debounce: `fn` runs `ms` after calls **stop**, with the most recent arguments; each call within the quiet window resets the timer. Returns a [`Debounced<A>`](#timing-types) — callable like `fn`, plus `cancel()` (drop a pending call) and `flush()` (run it immediately and clear the timer). The argument tuple `A` is inferred from `fn`.

### `throttle<A>(fn, ms): Throttled<A>`

```ts
const onScroll = throttle(() => measure(), 100);
window.addEventListener('scroll', onScroll);
```

Leading-plus-trailing throttle: `fn` runs immediately on the first call, then **at most once per `ms`**; calls during a cooldown collapse to a single trailing call (with the latest arguments) at the window's end. Returns a [`Throttled<A>`](#timing-types) with the same `cancel()` / `flush()` shape.

### `debouncedSignal<T>(source, ms): ReadonlySignal<T>`

```ts
const query = signal('');
const debouncedQuery = debouncedSignal(query, 250); // trails query by 250ms
// render / computed / effect off debouncedQuery.value — repaints only after typing settles
```

A read-only signal that trails `source` by `ms` (trailing-edge): writes to `source` reschedule, and the derived value settles once writes go quiet, so it composes inside the reactive graph (`computed`/`effect`/`mount`) instead of beside it. It holds a **live subscription** to `source` for its lifetime (like a module-scope `effect`) — intended for app-lifetime signals; for a disposable variant, drive your own `effect` with `debounce`.

### Timing types

`Debounced<A>` and `Throttled<A>` are exported from `kerfjs/timing` for annotating the returned callables.

## 8.13 Keyed subtree replacement — `kerfjs/remount` subpath

Optional subpath (`import { remountOn } from 'kerfjs/remount'`) for the opposite of kerf's morph-by-default: **replace** a subtree wholesale when a key changes instead of morphing it in place. The folk pattern is a monotonic counter spent as `data-key={`gen-${n}`}` on a `data-morph-skip` div; `remountOn` names it. Reach for it when a library-owned subtree (a highlighted diff, a chart, an editor) must be torn down and rebuilt on fresh DOM so the library re-initializes rather than the morph patching stale internals underneath it. See `docs/4-render.md` §4.3.

### `remountOn<K>(parent, key, render, options?): () => void`

```ts
// Replace the diff pane whenever the file (or diff mode) changes:
const stop = remountOn(paneEl, () => fileId.value, () => <DiffView id={fileId.value} />);
// same key  → the subtree is left entirely alone (no morph, no rebuild)
// key change → the old subtree + its mounts are disposed, a fresh one is mounted
```

`remountOn` **owns `parent`'s children** (like `mount()` / `bindList`). It watches `key` — a `ReadonlySignal<K>` **or** a thunk `() => K` that reads signals — and, whenever the key changes (by `Object.is`), disposes the current subtree (and its nested mounts) and renders a fresh one via `mount(parent, render)`. An unchanged key (including a thunk whose inputs moved but whose value stayed equal) leaves the subtree untouched, so per-row reactivity inside `render` still updates in place. Returns a disposer that tears down the current subtree and stops watching.

Options ([`RemountOptions`](#remount-types)): **`onMount(root)`** runs after each (re)mount with the live subtree (`parent`) — the blessed place to bind an imperative widget, since `render` returns a string with no live node yet. It may return a cleanup that runs before the next remount and on dispose. Returning `attach`'s disposer here makes teardown **synchronous** (before the DOM is cleared) rather than relying on its `MutationObserver`:

```ts
import { attach } from 'kerfjs/attach';

remountOn(paneEl, () => fileId.value, () => <div class="pane" data-morph-skip />, {
  onMount: (root) => attach(root.querySelector('.pane')!, (el) => {
    const chart = Chart.mount(el);
    return () => chart.destroy(); // runs on the next key change and on dispose
  }),
});
```

### Remount types

`RemountKey<K>` (`ReadonlySignal<K> | (() => K)`) and `RemountOptions` (`{ onMount?: (root: HTMLElement) => (() => void) | void }`) are exported from `kerfjs/remount`.

## 8.14 Node-lifecycle adapter — `kerfjs/attach` subpath

Optional subpath (`import { attach } from 'kerfjs/attach'`) that binds a non-kerf widget's lifecycle to a single **existing** DOM node: run a setup against the node and auto-run its teardown when that node leaves the document. `data-morph-skip` lets a library own a subtree so kerf won't touch it, but nothing tears that widget down when the node is replaced/removed; `attach` closes that seam. DOM only (a `MutationObserver`) — no signals, no render core, so it's the smallest subpath.

This is **not** React's `useEffect`: there's no dependency array, no re-run, and no render-phase or hook-order scoping — the node already exists, so setup runs once, right now. It's closer to a Web Component's `connectedCallback`/`disconnectedCallback` pair, Svelte's `onMount(() => () => cleanup)`, or Solid's `onCleanup`. (Related: [`observeRemovals`](#89-dispose-scopes--kerfjsscope-subpath) in `kerfjs/scope` also auto-disposes on removal via a `MutationObserver`, but scoped to a subtree's collected disposers rather than one node's setup/teardown pair — reach for that when collecting many disposers under an element, and for `attach` when binding one widget to one node.)

### `attach(node, setup): () => void`

```ts
attach(canvasEl, (el) => {
  const chart = D3.mount(el);
  return () => chart.destroy(); // runs when el leaves the DOM (or on dispose)
});
```

`setup(node)` runs **immediately** and may return a teardown function. The teardown runs **once** — whichever comes first — when `node` leaves the document (detected by a `MutationObserver`, so a morph swap, a [`remountOn`](#813-keyed-subtree-replacement--kerfjsremount-subpath) replacement, or any removal all trigger it) or when the returned disposer is called. The disposer is idempotent, so a `mount()` / [`Scope`](#disposescopeel-scope) can drive teardown explicitly without double-firing. Re-creation is **not** handled here — a fresh node is a fresh `attach()` call; pair it with `kerfjs/remount`, which replaces the node and re-runs your bind on the new one. Setup type: [`AttachSetup`](#attach-types).

### Attach types

`AttachSetup` (`(node: Element) => (() => void) | void`) is exported from `kerfjs/attach`.
