<p align="center">
  <img src="./site/src/assets/logo.svg" alt="Kerf logo" width="96" height="96" />
</p>

<h1 align="center">Kerf</h1>

<p align="center"><em>The smallest cut.</em></p>

---

> Introducing Kerf.
> The smallest cut.
>
> ~11 KB. No virtual DOM. No compiler. No magic.
> Reactive UI that touches only the bytes that changed.

```ts
import { signal, mount } from 'kerfjs';

const count = signal(0);

mount(document.getElementById('app')!, () => (
  <div>
    <button data-action="inc">+</button>
    <span>{count.value}</span>
  </div>
));
```

That's it. Your JSX renders to HTML strings, kerf's native diff applies the minimum DOM mutations to make the live tree match, and signals re-run the render only when something they read actually changed.

## Why Kerf

1. **Small bundle.** ~11 KB minified + gzipped including `@preact/signals-core` (~12 KB with `arraySignal`). One runtime dependency. No virtual DOM, no scheduler, no concurrent-mode machinery. On the official [krausest js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/current.html) — where kerf is a listed entry, measured on the same reference machine as every competitor ([local mirror](./bench/results.md)) — kerf is in the same cluster as Vue, vanjs, and Lit on most operations; Solid's compiler leads the update-path benchmarks (notably `partial update`), which kerf doesn't try to match by design — no compiler.

2. **No virtual DOM, no compiler.** JSX → HTML strings → native diff. DevTools shows the real DOM because it *is* the DOM.

3. **Values bind, structure re-renders.** Hand a signal *itself* into a JSX hole — `class={selectedId}` or `{status}` — and kerf binds that one node directly: when the signal changes, only that attribute or text node updates, with no render re-run and no list reconcile. A selection flip on a 10,000-row table touches exactly one class. Taken to its logical end: a mount whose render reads no `.value` at all runs **exactly once, forever** — every subsequent update flows through the per-hole bindings. Read `.value` in the render only when the *structure* depends on it (conditionals, list shape).

4. **Focus, selection, listeners survive re-renders — even mid-list.** The reconciler morphs instead of rebuilding, so caret position, selection range, IME composition, and delegated listeners survive every re-render. Keyed lists get the same treatment: same-identity rows are updated *in place* rather than recreated, so a row reorder or a single-cell edit no longer blows away focus, scroll, or an in-flight animation the way node replacement does.

5. **Safe by default.** Text and attribute values are HTML-escaped automatically, URL attributes are scheme-screened (`javascript:` / script-carrying `data:` dropped), inline `on*` handlers are rejected outright, and the same screening covers the fine-grained bound path — so untrusted data stays inert even when kerf is dropped into someone else's page. The URL screen fails loudly at your desk (throws in development) and degrades safely in the field (warns and drops in production). `raw()` is the explicit, auditable opt-out.

6. **Small public API.** ~17 exports from the main barrel (plus `arraySignal` and the `html` tagged template on their own subpaths). No hooks, no lifecycle, no per-instance state. Components are plain functions that return JSX.

7. **Plain TS, plain JSX, plain ESM.** Drops into anything using esbuild / Vite / tsup. No plugin chain. And with the `html` tagged template (`import { html } from 'kerfjs/html'` — identical runtime semantics to JSX), a CDN / importmap project needs no build step at all.

8. **Grown-up tooling around a tiny core.** An [ESLint plugin](https://brianwestphal.github.io/kerf/docs/eslint-plugin/) that enforces the hard rules at edit time, an opt-in family of `KERF_DEV_WARN_*` runtime warnings that catch the classic mistakes in development (with zero production cost), a `create-kerf-component` scaffold for publishable component packages, drop-in AI-assistant configs, and side-by-side migration guides for a dozen-plus frameworks — none of which grows the core runtime past ~11 KB.

## When to use Kerf

- **Hybrid desktop apps (Tauri / Electron)** — small bundle, predictable diff, debuggable runtime; ideal for the embedded webview.
- **Embedded widgets** — chat bubbles, comment boxes, dashboards dropped into someone else's page.
- **Server-rendered apps with islands** — Rails / Phoenix / Django / Hono. `mount` per island; `delegate` survives turbo-frame swaps.
- **Admin panels & internal tools** — reactivity without 200 KB of framework + state lib + router.
- **Replacing jQuery** — incremental migration; same delegation mental model, modern primitives.
- **Prototyping** — entire mental model on a postcard.

### When to reach for something else

- Need a full ecosystem (router + forms + data + SSR streaming) → **Next.js / Remix / SolidStart**.
- Building a deeply componentised design-system app → **React / Solid / Svelte**.
- Need React Native / cross-platform mobile → **React** (Kerf + Tauri/Electron also covers many of these cases).
- Building a static site → **Astro** (we use it for *this* project's site).
- Already invested in a framework where switching cost outweighs the bundle size gain.

## Quick tour

```ts
import { signal, computed, effect, defineStore, mount, each, delegate } from 'kerfjs';

// 1. A signal — single piece of reactive state.
const count = signal(0);

// 2. A computed — auto-derived from other signals.
const doubled = computed(() => count.value * 2);

// 3. A store — multi-consumer state with named actions and reset semantics.
const cart = defineStore({
  initial: () => ({ items: [] as { id: string; name: string }[] }),
  actions: (set, get) => ({
    add: (id: string, name: string) => set({ items: [...get().items, { id, name }] }),
    remove: (id: string) => set({ items: get().items.filter((i) => i.id !== id) }),
  }),
});

// 4. Mount JSX to a DOM element. Re-renders only when read signals change.
const root = document.getElementById('root')!;

mount(root, () => (
  <div>
    <h1>Cart ({cart.state.value.items.length})</h1>
    <ul>
      {each(cart.state.value.items, (item) => (
        <li data-key={item.id}>
          {item.name}
          <button data-action="remove" data-id={item.id}>×</button>
        </li>
      ))}
    </ul>
    <p>Doubled count: {doubled.value}</p>
  </div>
));

// 5. Event delegation — one listener per event type, dispatched by data-action.
delegate(root, 'click', '[data-action="remove"]', (_e, btn) => {
  cart.actions.remove((btn as HTMLElement).dataset.id!);
});
```

The stringly-typed `'[data-action="remove"]'` pair above can be made rename-safe with the `attr()` helper — declare the attribute once and use it on both sides:

```ts
import { attr } from 'kerfjs';

const REMOVE = attr('data-action', 'remove'); // pre-escaped name/value/selector

<button {...REMOVE.attrs} data-id={item.id}>×</button>;          // in JSX
delegate(root, 'click', REMOVE.selector, (_e, btn) => { /* … */ }); // in delegation
```

### Fine-grained updates: bind a signal into a hole

Inside a `mount()`, hand a signal *itself* (not its `.value`) into an attribute or text position and kerf wires that hole straight to the signal — the render function never re-runs and the list reconciler never walks:

```ts
const status = signal('idle');

mount(root, () => (
  <div class={status}>       {/* class attribute bound to the signal */}
    Status: {status}         {/* text node bound to the signal */}
  </div>
));

status.value = 'saving';     // updates the class + the text node directly — no re-render
```

The headline use is external state driving one spot: a `selectedId` flipping a single row's class inside a 10,000-row `each()` list touches exactly that one node, no reconcile. Works in static content and inside `each()` rows (a row's binding is torn down with the row); outside a `mount()` (SSR / `SafeHtml.toString()`) a bound signal just snapshots its current value.

This is kerf's guiding idiom — *values bind, structure re-renders*: pass the signal itself wherever a hole is just a value, and read `.value` in the render function only where the JSX structure depends on it. A render that reads no `.value` runs exactly once; from then on every update is a direct write to the node it concerns. See [`docs/2-reactivity.md`](./docs/2-reactivity.md) §2.9.

### Long keyed lists: `arraySignal`

For lists where most updates are pointwise (single-row edits, append-to-end, selection flips on individual rows), reach for `arraySignal` from the `kerfjs/array-signal` subpath. Mutators emit typed patches that `each()` applies in O(patches), not O(N):

```ts
import { arraySignal } from 'kerfjs/array-signal';

const rows = arraySignal<{ id: number; label: string }>([]);

mount(root, () => (
  <ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
));

rows.push({ id: 1, label: 'a' });               // 1 insert patch
rows.update(0, (r) => ({ ...r, label: 'A' }));  // 1 update patch
rows.move(0, 1);                                // 1 move patch
```

The class lives in its own subpath so apps that don't need it shed ~1 KB. Reads on `rows.value` are tracking, so `computed(() => rows.value.filter(...))` works as expected. See [`docs/2-reactivity.md`](./docs/2-reactivity.md) §2.6.

### One-shot reconcile: `morph`

`mount()` wraps `effect()` so the render re-runs on signal changes. Sometimes you have a freshly-built template and an already-populated element and you just want to reconcile them once — no subscription, no re-render loop. That's `morph`:

```ts
import { morph, raw } from 'kerfjs';

morph(liveCard, freshlyBuiltCardEl);                     // Element template
morph(liveCard, '<article class="card">…</article>');    // raw HTML string
morph(liveCard, raw(htmlFromServer));                    // SafeHtml
```

Same algorithm `mount()` uses internally — `data-morph-skip`, `data-morph-skip-children`, `data-morph-preserve`, focused-input value + selection preservation, the `<details>` / `<dialog>` user-agent-owned `open` rule all carry over. Use it for SSR-fragment hydration, page-refresh diffs, third-party widget remounts. See [`docs/4-render.md`](./docs/4-render.md) §4.4.3.

### No build step at all: the `html` tagged template

"No compiler" isn't just a JSX story. The `html` tagged template from `kerfjs/html` has **identical runtime semantics to JSX** — escaping, boolean/nullish attribute rules, URL screening, `on*` rejection, fine-grained signal bindings, `each()` composition — with no transform, so a plain `<script type="module">` on a CDN / importmap page is a complete kerf app:

```html
<script type="module">
  import { signal, mount, each } from 'https://esm.sh/kerfjs';
  import { html } from 'https://esm.sh/kerfjs/html';

  const items = signal([{ id: 1, label: 'no build step' }]);

  mount(document.getElementById('app'), () => html`
    <ul>${each(items.value, (i) => html`<li id="${i.id}">${i.label}</li>`)}</ul>
  `);
</script>
```

Attribute names are written verbatim (`class`, not `className`), and holes are only legal in text positions or as a complete attribute value — anything ambiguous throws with an actionable message. Static template parts parse once per call site. See [`docs/6-jsx-runtime.md`](./docs/6-jsx-runtime.md) §6.11.

## Install

```bash
npm install kerfjs
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "kerfjs"
  }
}
```

### Optional: `eslint-plugin-kerfjs`

A companion ESLint plugin enforces kerf's hard rules at edit time. Eight rules total: four `error`-level AST rules catch hard-rule violations — inline JSX event handlers, missing `data-key` in `each()`, nested `mount()`, and global `JSX.IntrinsicElements` augmentation — and four `warn`-level rules cover delegate-disposer capture, `attr()` selector rename-safety, `raw()` XSS audit trails, and AI-assistant config hygiene. The plugin is AST-only (no parser-services dependency), so it works with any TypeScript-ESLint setup.

```bash
npm install --save-dev eslint-plugin-kerfjs
```

```js
// eslint.config.js (flat config, ESLint v9+)
import kerfjs from 'eslint-plugin-kerfjs';
export default [kerfjs.configs.recommended];
```

Full docs at [brianwestphal.github.io/kerf/docs/eslint-plugin/](https://brianwestphal.github.io/kerf/docs/eslint-plugin/) — legacy `.eslintrc` config, per-rule examples, and the rationale for which violations get lint rules vs. dev-warns vs. strict TS.

### Optional: `create-kerf-component`

Building a reusable component package? Scaffold one that already follows kerf's hard packaging rules (kerfjs as a peer dependency and `external` in the build, ESM + `.d.ts`, `jsxImportSource: "kerfjs"`, subpath exports) plus an example component showing per-instance state via a factory and a `wire(root)` delegation disposer:

```bash
npm create kerf-component@latest my-widgets
```

See [`docs/13-component-packages.md`](./docs/13-component-packages.md) for the full authoring guide.

## Links

- **Site:** [brianwestphal.github.io/kerf](https://brianwestphal.github.io/kerf/)
- **Docs:** [`docs/`](./docs/) — overview · reactivity · stores · render · events · jsx · svg · [API reference](./docs/8-api-reference.md)
- **Migrating:** [coming from another framework?](https://brianwestphal.github.io/kerf/migrating/) — side-by-side TodoMVC translations + per-framework gotchas
- **AI guide:** [`docs/ai/usage-guide.md`](./docs/ai/usage-guide.md) — reference for AI tools fetching kerf docs (linked from `llms.txt`)
- **ESLint plugin:** [brianwestphal.github.io/kerf/docs/eslint-plugin/](https://brianwestphal.github.io/kerf/docs/eslint-plugin/) — `eslint-plugin-kerfjs`; eight rules (four hard-rule errors + four warns: `require-delegate-disposer`, `prefer-attr-selector`, `no-raw-with-dynamic-arg`, `ai-assistant-configs`) at edit time (source: [`eslint-plugin/`](./eslint-plugin/))
- **Component scaffold:** `npm create kerf-component@latest <dir>` — `create-kerf-component`; generates a publishable component package with the hard packaging rules pre-wired (source: [`create-kerf-component/`](./create-kerf-component/))
- **Demo:** [live demo](https://brianwestphal.github.io/kerf/demo/) — nine sections exercising every primitive (counter, store-backed cart, focus survival, keyed list, morph-skip, SVG render, Tier-2 capture, `arraySignal` patches, fine-grained signal bindings)
- **Repo:** [github.com/brianwestphal/kerf](https://github.com/brianwestphal/kerf)

## Why "kerf"?

A *kerf* is the narrow strip of material a saw blade removes when cutting — the smallest possible cut. The framework's job is the same: apply the smallest possible mutation to update your DOM.

(And yes, ~~kerformance~~ → *performance* jokes were written. They were also rejected.)

## Status

Stable — the public API follows semver. See [CHANGELOG.md](./CHANGELOG.md) for the current version and what's shipped.

## Sponsor

If kerf saves you time on a project you ship, [sponsoring on GitHub](https://github.com/sponsors/brianwestphal) keeps it actively maintained. Any amount is appreciated.

## License

MIT
