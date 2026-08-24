<p align="center">
  <img src="./site/src/assets/logo.svg" alt="Kerf logo" width="96" height="96" />
</p>

<h1 align="center">Kerf</h1>

<p align="center"><em>A tiny reactive UI framework. The smallest cut.</em></p>

<p align="center">
  <a href="https://brianwestphal.github.io/kerf/"><strong>brianwestphal.github.io/kerf</strong></a> — docs · examples · live demo
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/kerfjs"><img src="https://img.shields.io/npm/v/kerfjs.svg" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/min%2Bgzip-~12%20KB-brightgreen.svg" alt="~12 KB minified and gzipped" />
  <img src="https://img.shields.io/npm/l/kerfjs.svg" alt="MIT license" />
  <img src="https://img.shields.io/badge/types-included-3178c6.svg" alt="TypeScript types included" />
</p>

---

> ~12 KB. No virtual DOM. No compiler. No magic.
> Reactive UI that touches only the bytes that changed.

```ts
import { signal, mount, delegate } from 'kerfjs';

const count = signal(0);
const app = document.getElementById('app')!;

mount(app, () => (
  <div>
    <button data-action="inc">+</button>
    <span>{count.value}</span>
  </div>
));

delegate(app, 'click', '[data-action="inc"]', () => count.value++);
```

That's it. Your JSX renders to HTML strings, kerf's native diff applies the minimum DOM mutations to make the live tree match, and signals re-run the render only when something they read actually changed.

Here's the whole development loop — write a component, run the dev server, click around, edit, watch the browser pick it up:

[![Animated demo: coding a kerf counter in an editor, running the dev server, then hot-reloading a class change in the browser](https://brianwestphal.github.io/kerf/demos/getting-started.svg)](https://brianwestphal.github.io/kerf/getting-started/)
**[Quick start](#quick-start) · [Why kerf](#why-kerf) · [Quick tour](#quick-tour) · [Docs & examples](https://brianwestphal.github.io/kerf/)**

## Quick start

```bash
npm install kerfjs
```

```jsonc
// tsconfig.json — point JSX at kerf
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "kerfjs" } }
```

Write plain `.tsx` and build with your existing esbuild / Vite / tsup — no extra plugin. New here? Read the [5-minute orientation](https://github.com/brianwestphal/kerf/blob/main/docs/orientation.md), or open a [complete example](https://brianwestphal.github.io/kerf/examples/complete/).
## Why Kerf

1. **~12 KB, one dependency.** ~12 KB minified + gzipped including `@preact/signals-core` (~13 KB with `arraySignal`). No virtual DOM, no scheduler, no concurrent-mode machinery. On the official [krausest benchmark](https://krausest.github.io/js-framework-benchmark/current.html) kerf sits in the same cluster as Vue, Lit, and vanjs; Solid's compiler leads the update-path benchmarks, which kerf doesn't try to match by design — no compiler.

2. **No virtual DOM, no compiler.** JSX → HTML strings → native diff. DevTools shows the real DOM because it *is* the DOM.

3. **Values bind, structure re-renders.** Hand a signal *itself* into a JSX hole — `class={selectedId}` — and kerf binds that one node: on change, only that attribute updates, with no render re-run and no list reconcile. A selection flip on a 10,000-row table touches exactly one class. ([more →](#fine-grained-updates-bind-a-signal-into-a-hole))

4. **Focus, selection, and listeners survive re-renders — even mid-list.** The reconciler morphs instead of rebuilding, so caret position, IME composition, scroll, and delegated listeners survive every update; keyed rows are patched in place rather than recreated.

5. **Safe by default.** Text and attributes are HTML-escaped automatically, URL attributes are scheme-screened (`javascript:` dropped), and inline `on*` handlers are rejected outright — so untrusted data stays inert. `raw()` is the explicit, auditable opt-out.

**Plus, nothing you don't ask for:** JSX typed against the HTML standard (not React's props) · a ~18-export API with no hooks, lifecycle, or per-instance state · **nine** tree-shakeable companion subpaths (`router`, `list`, `overlay`, `async`, …) that stay out of the core until imported · an [ESLint plugin](https://brianwestphal.github.io/kerf/docs/eslint-plugin/) + opt-in dev warnings + a `create-kerf-component` scaffold · plain TS/JSX/ESM that drops into esbuild / Vite / tsup — or **no** build at all via the `html` tagged template.
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
import { signal, computed, defineStore, mount, each, delegate } from 'kerfjs';

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
  import { signal, mount, each } from 'https://esm.sh/kerfjs@4';
  import { html } from 'https://esm.sh/kerfjs@4/html';

  const items = signal([{ id: 1, label: 'no build step' }]);

  mount(document.getElementById('app'), () => html`
    <ul>${each(items.value, (i) => html`<li id="${i.id}">${i.label}</li>`)}</ul>
  `);
</script>
```

Nothing is self-hosted — `kerfjs` is on npm, so every ESM CDN (esm.sh, jsDelivr, unpkg) mirrors it automatically. esm.sh works with a direct import as shown; jsDelivr / unpkg want an importmap so the internal `@preact/signals-core` import resolves. Pin to a major (`@4`, as shown — the latest `4.x`) rather than floating on `latest`, or an exact version (`@4.1.0`) for full reproducibility. Attribute names are written verbatim (`class`, not `className`), and holes are only legal in text positions or as a complete attribute value — anything ambiguous throws with an actionable message. See [`docs/6-jsx-runtime.md`](./docs/6-jsx-runtime.md) §6.11 (§6.11.1 for the full CDN / importmap recipes) — or the [live-poll example](https://brianwestphal.github.io/kerf/examples/complete/live-poll/), a complete app served exactly as authored: no bundler ever touches it.

### Batteries when you need them: the companion subpaths

The core stays tiny because the patterns every real app rebuilds live in optional, tree-shakeable subpaths — a modal you'd otherwise hand-roll (`kerfjs/overlay`), an async-state container with the stale-response race already solved (`kerfjs/async`), a debounce that composes inside the reactive graph (`kerfjs/timing`), teardown tied to a DOM node's lifetime (`kerfjs/scope`). The largest is `kerfjs/list` — a keyed list that mounts each row individually (so a signal one row reads updates just that row) and virtualizes a long viewport, with fixed, app-declared, or measured row heights:

```ts
import { bindList, observeRowHeights } from 'kerfjs/list';

// Fixed-height windowing: only the visible rows render.
bindList(scrollEl, rows, {
  key: (r) => r.id,
  render: (r) => <div class="row">{r.label}</div>,
  virtualize: { rowHeight: 32 },
});

// Measured heights (chat, feeds): kerf estimates, you report the real height.
const list = bindList(scrollEl, messages, {
  key: (m) => m.id,
  render: (m) => <div class="msg">{m.text}</div>,
  virtualize: { rowHeight: { estimate: 64 } },
});
observeRowHeights(list); // one ResizeObserver → kerf anchor-corrects scroll
```

And a whole client-side router in one call — `kerfjs/router`, the "postcard router." A route table, a keyed `outlet()`, and automatic `<a href>` interception; the *core* stays router-free (this is opt-in):

```ts
import { createRouter } from 'kerfjs/router';

const router = createRouter({
  routes: [
    { path: '/',          component: () => <Home /> },
    { path: '/users/:id', component: ({ id }) => <User id={id} /> },
    { path: '*',          component: () => <NotFound /> },
  ],
});

mount(app, () => <div><nav>{/* <a href> links, auto-intercepted */}</nav>{router.outlet()}</div>);
```

`router.route` is a signal; `router.outlet()` swaps the page wholesale across routes and morphs in place within one. Deliberately small — no nested layouts, loaders, or guards; compose those with the primitives above.

Each subpath adds nothing to the main barrel until it's imported. See [`docs/8-api-reference.md`](./docs/8-api-reference.md) for the full list (`list`, `router`, `overlay`, `scope`, `async`, `timing`, `remount`, `attach`, `actions`).

## Optional tooling

Install and JSX setup are in [Quick start](#quick-start) above. These companion packages are opt-in.

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
