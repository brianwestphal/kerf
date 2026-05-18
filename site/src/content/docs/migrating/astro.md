---
title: Using Kerf with Astro
description: Astro is a meta-framework; kerf is an island runtime. They compose. How to drop kerf into an Astro project as the interactive layer.
---

You're using (or considering) Astro. You're reading this because you want a tiny client-side reactivity layer for the interactive bits of your Astro site without adding the React / Preact / Vue / Svelte runtime as a peer dependency. Astro and kerf are not competitors — Astro is a meta-framework for content-driven sites that ships zero JS by default; kerf is a runtime for the interactive islands inside an Astro page.

**This site is built with Astro and uses kerf for its own interactive examples.** The pattern below is the one the kerf site uses. See [`site/`](https://github.com/brianwestphal/kerf/tree/main/site) for the reference setup — that's the working Astro+kerf composition this page documents.

## 1. Where each tool fits

**Astro** owns:
- Routing (file-based, build-time).
- Page rendering (static or server-rendered HTML).
- Markdown / MDX content.
- Asset pipeline (CSS, images, fonts).
- The shell of every page.

**Kerf** owns:
- Interactive islands inside Astro pages — anything that needs to update without a full page nav.
- Reactive state, event handling, and DOM morphing within those islands.

If your site is content-first with sporadic interactivity (a docs site, a marketing site, a blog), this composition is the right shape. If your site is interaction-first (a dashboard, an admin panel, a SaaS UI), Astro is the wrong shell — use a Vite + kerf setup directly.

## 2. Setup

The bones are: Astro project, kerf installed as a regular dep, JSX configured.

```bash
npm create astro@latest
cd my-astro-site
npm install kerfjs
```

```jsonc
// tsconfig.json — extend Astro's preset, add the kerf JSX import source
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "kerfjs"
  }
}
```

```js
// astro.config.mjs — make sure Vite's JSX is wired the same way
import { defineConfig } from 'astro/config';

export default defineConfig({
  vite: {
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'kerfjs',
    },
  },
});
```

That's the entire integration. Astro handles the page; Vite (which Astro uses) bundles your kerf JSX wherever you write it.

## 3. Anatomy of an island

A typical Astro page that uses kerf has three pieces:

```astro
---
// src/pages/cart.astro — Astro frontmatter (server-side)
const initialItems = await fetch('/api/cart').then((r) => r.json());
---

<!-- 1. Server-rendered HTML shell with the initial state inlined -->
<div id="cart" data-initial={JSON.stringify(initialItems)}>
  <h1>Cart</h1>
  <ul class="cart-items"></ul>
  <p class="total"></p>
</div>

<!-- 2. Client-side mount script -->
<script>
  import { signal, mount, each, delegate } from 'kerfjs';

  const root = document.getElementById('cart')!;
  const initial = JSON.parse(root.dataset.initial!);
  const items = signal<{ id: string; name: string; price: number }[]>(initial);

  mount(root, () => (
    <div>
      <h1>Cart</h1>
      <ul class="cart-items">
        {each(
          items.value,
          (it) => (
            <li data-key={it.id}>
              {it.name} — ${it.price}
              <button data-action="remove" data-id={it.id}>×</button>
            </li>
          ),
          (it) => it.id,
        )}
      </ul>
      <p class="total">Total: ${items.value.reduce((s, it) => s + it.price, 0)}</p>
    </div>
  ));

  delegate(root, 'click', '[data-action="remove"]', (_e, btn) => {
    const id = (btn as HTMLElement).dataset.id;
    items.value = items.value.filter((it) => it.id !== id);
  });
</script>
```

What's happening:

1. Astro's frontmatter (`---` block) runs at build time (or per-request, if you set `output: 'server'`). It fetches the initial cart and inlines it as a `data-initial` attribute on the island's root.
2. The `<script>` tag runs client-side. Vite bundles it as an ES module. It reads the `data-initial`, hydrates a signal, and `mount()`s the kerf render onto the existing server-rendered DOM.
3. The morph reconciles the JSX render against the live DOM. Server-rendered shell content (the `<h1>`, the empty `<ul>`) is patched in place — no flash, no rebuild.

## 4. Astro + kerf vs Astro + React-island

Astro's official integrations (`@astrojs/react`, `@astrojs/preact`, `@astrojs/vue`, `@astrojs/svelte`, `@astrojs/solid`) ship the corresponding framework runtime as part of the island bundle. Kerf-as-island is not an official integration — you wire it via `<script>` tags as above, which is also the way Astro recommends for any "I just want some client JS" use case.

| | Astro + React island | Astro + kerf island |
| --- | --- | --- |
| Per-island runtime cost | ~45 KB (react + react-dom) | ~6.5 KB |
| Component model | React (hooks, lifecycle) | plain functions returning JSX, signals for state |
| Hydration strategy | `client:load` / `client:idle` / `client:visible` directives | `<script>` runs on parse; you call `mount()` whenever you want |
| Server-side rendering of the island | yes, automatic | yes, via `SafeHtml.toString()` if you want to SSR the initial HTML yourself |
| Cross-island state sharing | React Context + a state lib | a module-level `defineStore` imported from multiple islands |

The biggest practical difference: Astro's `client:*` directives are an opt-in lazy-hydration system. With the `<script>` approach, your kerf code runs as soon as the script tag is reached. If you want lazy hydration of a kerf island, use `<script type="module">` with `defer` or use a small `IntersectionObserver` to gate the `mount()` call.

## 5. Sharing state across islands

```ts
// src/state/cart.ts
import { defineStore } from 'kerfjs';

export interface CartItem { id: string; name: string; price: number }

export const cart = defineStore({
  initial: () => ({ items: [] as CartItem[] }),
  actions: (set, get) => ({
    add: (item: CartItem) => set({ items: [...get().items, item] }),
    remove: (id: string) => set({ items: get().items.filter((it) => it.id !== id) }),
  }),
});
```

Two Astro pages (or two `<script>` blocks on the same page) can both `import { cart } from '~/state/cart'` — they share the same module, so they share the same store. Mutations from one island show up in the other's `mount()` re-render automatically.

This is meaningfully simpler than React's Context model for cross-island state. The catch: stores are module-level globals, which means cross-page state-sharing only works for the lifetime of one page (Astro re-loads modules on hard nav). For state that should outlive a nav, persist to `localStorage` via an `effect()` per store.

## 6. Gotchas

**Astro client directives don't apply.** `client:load` / `client:idle` / `client:visible` are integrations of the official framework runtimes. Kerf islands run from `<script>` tags directly; you control hydration timing yourself.

**Hot module replacement quirks.** When you edit a kerf-using `.astro` file, Vite reloads the page. Edits to a separate `.ts` module imported by the script can sometimes HMR cleanly; sometimes you get a full reload. This is no worse than the equivalent React-island setup.

**View transitions need extra care.** If you're using Astro's view-transitions API, kerf's `mount()` runs after the transition completes, but the `<script>` tag fires per-page-load and your event listeners (`delegate(root, ...)`) on the old island leak across transitions unless you call the disposer. Capture the `mount()` return value and dispose it in an `astro:before-swap` listener.

**SSR-of-the-island is your responsibility.** `@astrojs/react` SSRs the React tree as part of the Astro build. Kerf doesn't have a build-time SSR integration; you can call `(<MyIsland />).toString()` to render the initial HTML from kerf JSX on the server, but you write that wiring yourself. For most content-driven sites the empty-shell-then-hydrate pattern (§3) is fine — the shell is plain HTML and pre-renders trivially.

**`data-morph-skip` interacts with Astro's HTML emission.** Astro emits the HTML for the page; if you mark a server-rendered element with `data-morph-skip`, it stays untouched across kerf re-renders. For third-party widgets that Astro doesn't know about, use the same `data-morph-skip` pattern you would in any kerf app.

## 7. When *not* to use kerf with Astro

- **You want the official framework integration's lazy-hydration directives.** `client:visible` is genuinely useful for large React islands. Kerf islands are small enough that hydration timing matters less, but if you want the official directive, use an official integration.
- **You need the SSR-of-the-island pre-rendering Astro does for React/Vue/Solid.** Kerf can produce HTML strings from JSX server-side, but the official integrations handle a lot of edge cases (suspense boundaries, async-component loading) that kerf doesn't.
- **You're not actually using Astro's content layer.** If your site is interaction-first, Astro is overhead — use Vite + kerf directly.
