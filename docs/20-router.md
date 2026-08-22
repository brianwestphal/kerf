# 20. Routing — the `kerfjs/router` subpath

> **Status: shipped.** `kerfjs/router` is an **opt-in, tree-shakeable** subpath —
> the "postcard router": route matching + `navigate` + `delegate()`-based link
> interception + a keyed outlet, and deliberately nothing more. The kerf **core**
> stays router-free; this adds nothing to the main barrel until you import it.

## 20.1 Why a router, and why it doesn't contradict "Not a router"

`docs/1-overview.md` and `CLAUDE.md` say kerf is **"Not a router."** That is a
statement about the **core runtime** — kerf-the-UI-runtime is not a full
framework. It is not a claim that no official router may exist. `kerfjs/router`
ships the router as a *separate, opt-in subpath*, on the exact footing as
`kerfjs/list` / `kerfjs/overlay` / `kerfjs/async`: it lives in the `kerfjs`
package, but tree-shakes away entirely unless imported, so the core stays minimal
and the "Not a router" positioning holds. An app that never imports
`kerfjs/router` pays nothing and ships the same ~12 KB core.

The router is worth blessing because it is the single most-reinvented companion,
and because kerf already has every primitive it needs — a router in userland is
~30 lines. The subpath's value is getting the fiddly parts right once (popstate,
base paths, path-param parsing, the same-origin/modifier-key link guards) and
naming the idiom.

## 20.2 Scope — the "postcard router"

**In scope:** a route table with pattern matching, `navigate()` / `back()` /
`forward()`, a reactive `route` signal, automatic `<a href>` link interception, an
outlet that renders the matched route, hash vs history mode, an optional base
path, and a reactive active-link helper.

**Deliberately OUT of scope** — the features that balloon routers into frameworks
and would betray kerf's positioning:

- **Nested layouts / nested routes.** Compose them yourself: a parent route's
  component renders its own inner content based on `router.route`.
- **Data loading / loaders.** Use `kerfjs/async`'s `resource` inside a route
  component, keyed off `route.params`.
- **Lazy / code-split routes.** The app owns its `import()` strategy.
- **Guards / middleware.** Run an `effect` on `router.route` (redirect with
  `navigate({ replace: true })`), or check in the component.
- **SSR route matching.** Client-side only; `SafeHtml.toString()` still renders a
  route's component server-side if you match the path yourself.

The line is intentional: **match + navigate + outlet**, and the app composes the
rest with kerf primitives. This is what keeps the router a postcard.

## 20.3 API

```ts
import { createRouter } from 'kerfjs/router';
import { mount } from 'kerfjs';

const router = createRouter({
  routes: [
    { path: '/',          component: () => <Home /> },
    { path: '/users/:id', component: ({ id }) => <User id={id} /> },
    { path: '/files/*rest', component: ({ rest }) => <File path={rest} /> },
    { path: '*',          component: () => <NotFound /> },   // catch-all — put last
  ],
  mode: 'history',   // 'history' (default) | 'hash'
  base: '/app',      // optional (history mode)
});

mount(document.getElementById('app')!, () => (
  <div>
    <nav>
      <a href="/" class={router.activeClass('/', 'active')}>Home</a>
      <a href="/users/1" class={router.activeClass('/users', 'active')}>Users</a>
    </nav>
    {router.outlet()}
  </div>
));
```

`createRouter(options)` returns a **`RouterHandle`** (a closure — no module-global
state, like `defineStore`):

- **`route`** — a `ReadonlySignal<{ path, params, query, hash }>`. `params` is a
  `Record<string, string>` from the matched pattern; `query` is a `URLSearchParams`.
  Read `.value` (tracked) in a render / `computed` / `effect`.
- **`navigate(path, { replace?, state? })`** — push (or replace) a history entry
  and update `route`. `path` may include `?query` and `#hash`.
- **`back()` / `forward()`** — `history.back()` / `history.forward()`.
- **`match(pattern)`** → `ReadonlySignal<boolean>` — reactive "is this active?":
  true when `route.path` equals `pattern` or is nested under it
  (`match('/users')` is true on `/users/7`). `match('/')` is **exact**.
- **`activeClass(pattern, className)`** → `ReadonlySignal<string>` — `className`
  while `match(pattern)` is active, else `''`. Spread into a `class` hole.
- **`outlet()`** → the routed view (call it inside a `mount()` render).
- **`dispose()`** — remove the popstate / link listeners. Idempotent.

### Route patterns

- Static: `/about`.
- Param: `/users/:id` → `params.id` (URL-decoded).
- Wildcard rest: `/files/*rest` → `params.rest` is the remaining segments joined by
  `/`. A bare `*` segment matches the rest without capturing.
- Catch-all: `*` matches anything — list it **last** as the not-found fallback.

Routes are tried **in order**; the first match wins.

## 20.4 The outlet — a keyed morph, not a new mechanism

`router.outlet()` reads `route.value` (so the enclosing `mount()` re-renders on
navigation) and returns the matched component wrapped in a **keyed** element:

```
<div data-router-outlet data-key="<the matched route's pattern>"> … </div>
```

The `data-key` is the matched route's **pattern** (`/users/:id`), and kerf's
existing keyed morph does the rest — no new machinery:

- **Cross-route navigation** (`/` → `/users/1`): the pattern changes, so the key
  changes, so the morph **replaces the wrapper wholesale** — the old page's DOM is
  torn down and the new page mounts fresh. Different pages are never morphed into
  each other.
- **Same-route param change** (`/users/1` → `/users/2`): the pattern is the same,
  so the key is the same, so the morph **reconciles in place** — the component
  re-renders with the new `params` and only the changed nodes update, preserving
  scroll / focus / selection.

This is exactly the semantics a router wants, achieved with kerf's own keyed
reconciliation rather than a bespoke swap.

## 20.5 Link interception

Unless you pass `interceptLinks: false`, `createRouter` installs **one** delegated
click listener (via `delegate()`) that routes in-app links instead of reloading.
A click is intercepted only when it is a plain, in-app navigation:

- left-click, no `Ctrl` / `Meta` / `Shift` / `Alt` (so "open in new tab" works),
- not already `defaultPrevented` by another handler,
- no `target` (other than `_self`), no `download`,
- not `rel="external"`, not `data-router-ignore`,
- same-origin (and, in history mode with a `base`, under that base),
- in hash mode, an in-app `#/…` link.

Everything else falls through to the browser untouched. Opt a single link out with
`data-router-ignore` (or `rel="external"`); opt the whole app out with
`interceptLinks: false` and call `navigate()` from your own handlers.

## 20.6 Composing the excluded features

The scope boundary (§20.2) is not a dead end — each excluded feature is a short
composition with primitives you already have:

- **Data loading:** `const user = resource<User, string>(); effect(() => user.run(router.route.value.params.id, fetchUser));`
- **A guard / redirect:** `effect(() => { if (!authed.value && router.route.value.path.startsWith('/admin')) router.navigate('/login', { replace: true }); });`
- **A nested view:** a route's component reads `router.route.value` and renders its
  own sub-view (another `match`, an `each`, a conditional).

## 20.7 Testing

The matching, navigation, `route` signal, `match` / `activeClass`, hash mode, base
path, link-interception *logic*, and the keyed-outlet swap are all unit-tested in
happy-dom (`tests/unit/router.test.ts`) — happy-dom implements `history` /
`location` / `popstate`. The parts happy-dom can't model truthfully — real
`popstate` from browser back/forward, real link-click navigation, scroll — belong
to the Playwright suite (`tests/browser/router.spec.ts`).
