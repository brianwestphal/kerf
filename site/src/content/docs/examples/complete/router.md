---
title: Router
description: A whole client-side router in one createRouter — URL-driven pages, :param routes, active-nav highlighting, and real Back/Forward, with no page reloads.
---

**[▶ Run live](/kerf/run/router/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/router)

[![Animated preview: navigating a routed app inside a fake browser window; the address bar and Back button drive URL routing with no page reloads](/kerf/demos/router.svg)](/kerf/run/router/)

A small single-page app driven by [`kerfjs/router`](/kerf/docs/docs/20-router/) — the "postcard router", shown inside a **fake browser window** so you can watch the address bar. Navigate between Home, a guides list, an individual guide (a `/guides/:slug` param route), and About; the window's Back button drives real history. The active nav tab follows the URL, the address bar updates on every step, and **nothing ever reloads** — links are intercepted and the outlet swaps the page.

The kerf **core stays router-free**: `kerfjs/router` is an opt-in, tree-shakeable subpath, so an app that doesn't route ships the same ~12 KB core.

**What to look at:**

- **One `createRouter`.** A route table maps a URL pattern to a component; `router.outlet()` renders the matched one inside `mount()`. Patterns here are static (`/`, `/guides`, `/about`), a `:param` (`/guides/:slug`), and a `*` catch-all.
- **The keyed outlet.** `outlet()` wraps each page in an element keyed by the matched *pattern*, so kerf's morph **swaps the page wholesale** when you move between routes and **updates in place** when only a param changes (switching between two `/guides/:slug` pages). No new machinery — it's the same keyed reconcile the rest of kerf uses.
- **Automatic link interception.** `createRouter` installs one delegated click listener; in-app `<a href="#/…">` links route instead of reloading (opt a link out with `data-router-ignore` / `rel="external"`). This demo uses **hash mode** so it works no matter what sub-path it's served under.
- **Reactive active links.** `router.activeClass('/guides', 'active')` returns a bound class signal — the nav highlight follows the route with no manual wiring.

This example deliberately stays a "postcard router": no nested layouts, data loaders, lazy routes, or guards. Those compose with kerf primitives (`resource` from `kerfjs/async` for loading, an `effect` on `router.route` for a guard) — see [`docs/20-router.md`](/kerf/docs/docs/20-router/).

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/router)

```tsx
// site/src/examples/complete/router/main.tsx (excerpt — full source on GitHub)
import { delegate, mount } from 'kerfjs';
import { createRouter } from 'kerfjs/router';

const router = createRouter({
  mode: 'hash',
  routes: [
    { path: '/',            component: () => <Home /> },
    { path: '/guides',      component: () => <Guides /> },
    { path: '/guides/:slug', component: (p) => <GuideDetail slug={p.slug} /> },
    { path: '*',            component: () => <NotFound /> },
  ],
});

mount(app, () => (
  <div class="rt-browser">
    {/* The address bar is bound to the route — it updates live as you navigate. */}
    <div class="rt-addr"><span class="host">kerf.app/</span><span class="path">#{router.route.value.path}</span></div>
    <nav class="rt-bar">
      <a href="#/" class={router.activeClass('/', 'active')}>Home</a>
      <a href="#/guides" class={router.activeClass('/guides', 'active')}>Guides</a>
    </nav>
    {router.outlet()}
  </div>
));

// The fake browser's Back / Forward buttons drive real history — one delegated listener.
delegate(app, 'click', '[data-nav]', (_e, el) => {
  if ((el as HTMLElement).dataset.nav === 'back') router.back();
  else router.forward();
});
```
