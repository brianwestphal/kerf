---
title: Adopting kerf incrementally
description: You don't have to rewrite your React/Vue/Svelte app to start using kerf. Run both side by side and convert one island at a time — DOM ownership, the jsxImportSource pragma, teardown, and state bridging.
---

You don't have to choose between "all React" and "all kerf." kerf was built to own a
DOM subtree, not a whole page, so it coexists with React (or Vue, Svelte, Angular,
jQuery — anything) on the same document. You can migrate **one island at a time**,
ship at every step, and never schedule a big-bang rewrite.

This page is the framework-agnostic strategy. For the line-by-line primitive
mapping, see your source framework's page — e.g. [Coming from React](/kerf/migrating/react/).

## The one rule: disjoint DOM ownership

Two frameworks can share a page but **never the same DOM node**. kerf's `mount()`
takes over an element's children (it sets `innerHTML` on first render, then morphs on
every change); React's reconciler does the same for its root. As long as each
framework owns a *different* subtree, they don't fight.

So every migration step is the same shape: carve out one element, hand it to kerf,
and tell the other framework to keep its hands off it. There are two directions.

## Direction A — a kerf island inside a React app

The common case while migrating *away* from React: React still owns the page; you
replace one widget at a time with kerf. React renders an **empty** host element and
never gives it children, so it leaves kerf's DOM alone. A `useEffect` mounts kerf and
returns the disposer for teardown:

```tsx
/** @jsxImportSource react */
import { useEffect, useRef } from 'react';
import { mount } from 'kerfjs';
import { CartWidget } from './cart-widget'; // a kerf component (its own file, see below)

export function CartIsland() {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // CartWidget() returns SafeHtml; mount owns hostRef's children from here on.
    const dispose = mount(hostRef.current!, () => CartWidget());
    return dispose; // run on unmount — and on React 19 StrictMode's dev double-invoke
  }, []);
  return <div ref={hostRef} />; // empty host: React never touches its children
}
```

`mount()` returns a disposer (`() => void`). Returning it from `useEffect` is the
whole teardown story — StrictMode's dev-mode mount→unmount→remount is safe because
dispose stops the effect and the next mount re-renders the host from scratch. If the
island also wires events with `delegate()`, capture and call those disposers too.

## Direction B — a React island inside a kerf app

The mirror case: kerf owns the shell and you keep a heavy React component (a data
grid, a charting widget) until you're ready to port it. kerf renders an empty host
marked [`data-morph-skip`](/kerf/docs/render/) so the morph never reconciles inside
it, then React mounts into that host:

```tsx
/** @jsxImportSource kerfjs */
import { mount } from 'kerfjs';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { LegacyChart } from './legacy-chart'; // a React component

mount(appRoot, () => (
  <section>
    <h2>Dashboard</h2>
    <div class="chart-host" data-morph-skip />
  </section>
));

// After first render, hand the skipped host to React:
const host = appRoot.querySelector('.chart-host')!;
const root = createRoot(host);
root.render(createElement(LegacyChart));
// on teardown: root.unmount();
```

`data-morph-skip` is the key — without it, kerf's next morph would walk into the
host and clobber React's DOM. (Use `createElement` rather than JSX for the React
component here, since this file's JSX compiles to kerf's runtime.)

## The jsxImportSource gotcha

This is the one that bites first. kerf needs `jsxImportSource: "kerfjs"`; React needs
its own runtime. A single `tsconfig.json` can only set **one** global default, so in a
mixed project you override per file with the standard TypeScript pragma — a block
comment on the **first line**:

```tsx
/** @jsxImportSource kerfjs */   // top of a kerf file
```

```tsx
/** @jsxImportSource react */    // top of a React file
```

The pragma overrides the tsconfig default and is understood by tsc, esbuild, Vite,
and swc alike. Pick whichever framework has more files as the tsconfig-wide default
and pragma the minority — early in a React→kerf migration, keep `react` as the
default and pragma each new `kerf` file; flip it once kerf is the majority. (An
alternative is keeping each framework's files under its own folder with a scoped
`tsconfig`, but the per-file pragma is less ceremony.) Keep each component's JSX in
its own file so a file never mixes the two runtimes.

## Sharing state across the boundary

kerf's reactivity is just [`@preact/signals-core`](/kerf/docs/reactivity/)
re-exported — a plain signal is framework-neutral, so it makes an ideal shared
channel. Put the state in a module both sides import:

```ts
// shared-state.ts — no JSX, no framework
import { signal } from 'kerfjs';
export const cartCount = signal(0);
```

kerf reads it directly (`cartCount.value` inside a `mount` render re-renders on
change). The React side bridges a signal into local state with one `effect`:

```tsx
/** @jsxImportSource react */
import { useEffect, useState } from 'react';
import { effect } from 'kerfjs';
import { cartCount } from './shared-state';

export function CartBadge() {
  const [count, setCount] = useState(cartCount.value);
  // effect() auto-tracks the read and returns an unsubscribe — perfect useEffect cleanup.
  useEffect(() => effect(() => setCount(cartCount.value)), []);
  return <span className="badge">{count}</span>;
}
```

Either side writes (`cartCount.value++`); both stay in sync. For larger shared state,
reach for a [`defineStore`](/kerf/docs/stores/) instead of a bare signal — same
bridging pattern, `store.state.value` in place of the signal read.

## Step-by-step

1. **Pick the smallest interactive island** with its own clear root element.
2. **Add the `jsxImportSource` pragma** to the new kerf file(s).
3. **Mount kerf** into an empty host (Direction A) or carve a `data-morph-skip` host
   out of your kerf shell for any framework code you're keeping (Direction B).
4. **Move that island's state** into a `signal` / `defineStore`; bridge it to the
   other framework only where they genuinely share state.
5. **Convert handlers** to `delegate(root, type, selector, fn)` — root-scoped, so
   they never collide with the other framework's listeners (kerf attaches nothing to
   `document`).
6. **Wire teardown**: return the `mount()` (and any `delegate()`) disposers from the
   host component's unmount path.
7. **Repeat** on the next island. Delete the React dependency only when the last one
   is gone.

## Gotchas

- **Never share a node.** The empty-host (Direction A) and `data-morph-skip`
  (Direction B) patterns exist precisely to keep the boundary clean. If React keeps
  rendering children into kerf's host, the next morph and the next React render will
  trade blows.
- **You ship two runtimes mid-migration.** That's a temporary bundle cost, not a
  permanent one — the whole point is that it shrinks to just kerf as islands convert.
- **SSR / hydration.** If the surrounding app is server-rendered, mount kerf islands
  *after* the host framework hydrates (in `useEffect` / `onMounted`), not during SSR.
  `SafeHtml.toString()` can server-render kerf, but don't interleave it with another
  framework's hydration pass over the same nodes.
- **Attribute names.** kerf JSX uses HTML names (`class`, `for`, `autofocus`), not
  React's (`className`, `htmlFor`, `autoFocus`) — and `onClick={fn}` is not a thing in
  kerf JSX (use `delegate`). These rules apply inside your kerf files even though the
  React files next door keep React's conventions.
- **When to not bother.** If the app is one deeply-composed React component tree with
  heavy prop drilling and shared context, island-by-island extraction may be more
  work than it's worth — see [When to reach for something else](/kerf/alternatives/).
