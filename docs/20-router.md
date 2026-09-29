# 20. Routing — the `kerfjs/router` subpath

> **Status: shipped.** `kerfjs/router` is an **opt-in, tree-shakeable** subpath —
> the "postcard router": route matching + `navigate` + `delegate()`-based link
> interception + a keyed outlet, and deliberately nothing more. The kerf **core**
> stays router-free; this adds nothing to the main barrel until you import it.

## 20.1 Why a router, and why it doesn't contradict "Not a router"

`docs/1-overview.md` and `CLAUDE.md` say kerf is **"Not a router."** That is a
statement about the **core runtime** — kerf-the-UI-runtime is not a full
framework. It is not a claim that no official router may exist. `kerfjs/router`
ships the router as a _separate, opt-in subpath_, on the exact footing as
`kerfjs/list` / `kerfjs/overlay` / `kerfjs/async`: it lives in the `kerfjs`
package, but tree-shakes away entirely unless imported, so the core stays minimal
and the "Not a router" positioning holds. An app that never imports
`kerfjs/router` pays nothing and ships the same ~13 KB core.

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
  base: '/app',      // optional (history mode; exact path/segment boundary)
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
  `Record<string, string>` from the matched pattern (`{}` when no route matches);
  `query` is a `URLSearchParams`. Read `.value` (tracked) in a render / `computed` /
  `effect`. In hash mode the route lives after `#` (`#/users/7?tab=1` → `path`
  `/users/7`, `query` `tab=1`), `route.hash` is always `''`, and the router listens
  to `hashchange` as well as `popstate`.
- **`navigate(path, { replace?, state? })`** — push (or replace) a history entry
  and update `route`. `path` may include `?query` and `#hash`.
- **`back()` / `forward()`** — `history.back()` / `history.forward()`.
- **`match(pattern)`** → `ReadonlySignal<boolean>` — reactive "is this active?":
  a **literal path-prefix** comparison, true when `route.path` equals `pattern` or
  continues it at a `/` boundary (`match('/users')` is true on `/users/7`, not on
  `/users-admin`). `match('/')` is **exact**. The pattern never goes through the
  route matcher, so `:param` / `*` segments are compared as literal text —
  `match('/users/:id')` is never true; pass the static prefix (`'/users'`).
- **`activeClass(pattern, className)`** → `ReadonlySignal<string>` — `className`
  while `match(pattern)` is active, else `''`. Spread into a `class` hole.
- **`outlet()`** → the routed view (call it inside a `mount()` render). The
  matched component is called as `component(params, route)`; when no route matches
  (no `*` fallback), `outlet()` returns `null` and renders nothing.
- **`dispose()`** — remove the `popstate` (plus hash-mode `hashchange`) and link
  listeners. Idempotent.

### Route patterns

- Static: `/about`.
- Param: `/users/:id` → `params.id` (URL-decoded).
- Wildcard rest: `/files/*rest` → `params.rest` is the remaining segments joined by
  `/`. A bare `*` segment matches the rest without capturing.
- Catch-all: `*` matches anything — list it **last** as the not-found fallback.

Routes are tried **in order**; the first match wins.

Named and wildcard captures are URL-decoded. If any captured segment contains a malformed percent escape, that route fails closed as a no-match instead of throwing `URIError`; matching continues with the next route, normally the final `*` fallback.

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
- same-origin (and, in history mode with a `base`, exactly that base or below it at a path-segment boundary — `/app` does not claim `/apple`),
- in hash mode, an in-app `#/…` link.

Everything else falls through to the browser untouched. Opt a single link out with
`data-router-ignore` (or `rel="external"`); opt the whole app out with
`interceptLinks: false` and call `navigate()` from your own handlers.

**Handler order: a later handler cannot veto a navigation that already
happened.** The interceptor is a bubbling `click` listener on `document.body`
(via `delegate()`), and it navigates synchronously the moment it sees an
eligible click. An app handler that runs **after** it — one registered on
`document.body` after `createRouter`, or on `document` / `window` — can still
call `preventDefault()`, but the router has already pushed the new history
entry and updated `route` by then (KF-F9REWE). To keep the router off a link,
use one of the opt-outs that act first:

- `data-router-ignore` or `rel="external"` on the link,
- or call `preventDefault()` in a handler that runs **before** the router's —
  on the link itself or an element inside it, on an ancestor below `body`, or
  on `body` registered before `createRouter` — since the interceptor skips an
  already-`defaultPrevented` click (and only re-syncs the route from the URL).

**Already-handled clicks re-sync.** A click that arrives `defaultPrevented` is
never navigated, but the router re-reads the location (a no-op when nothing
moved). That keeps a second router on the same document in step: the first
router's interceptor navigates with `pushState` — which fires no `popstate` —
and the second follows the URL instead of diverging (KF-XW1RE9).

**One router per document is the supported shape.** A second router follows
link clicks (above) and history traversal (`popstate` — Back / Forward / a
`back()` / `forward()` call), but **not** another router's programmatic
`navigate()`: that is a `pushState` / `replaceState`, which fires no
`popstate`, and the router deliberately does no cross-router broadcasting
(postcard scope, §20.2). The second router stays on the old route until the
next `popstate` or link click (KF-ND072Q, pinned by a unit test so a change in
this behavior is deliberate). If two views must route, drive both from one
`createRouter` handle.

## 20.6 Composing the excluded features

The scope boundary (§20.2) is not a dead end — each excluded feature is a short
composition with primitives you already have:

- **Data loading:** `const user = resource<User, string>(); effect(() => user.run(router.route.value.params.id, fetchUser));`
- **A guard / redirect:** `effect(() => { if (!authed.value && router.route.value.path.startsWith('/admin')) router.navigate('/login', { replace: true }); });`
- **A nested view:** a route's component reads `router.route.value` and renders its
  own sub-view (another `match`, an `each`, a conditional).

## 20.7 Testing

The matching, navigation, `route` signal, `match` / `activeClass`, hash mode, base
path, link-interception _logic_, and the keyed-outlet swap are all unit-tested in
happy-dom (`tests/unit/router.test.ts`) — happy-dom implements `history` /
`location` / `popstate`. The parts happy-dom can't model truthfully — real
`popstate` from browser back/forward, real link-click navigation, scroll — belong
to the Playwright suite (`tests/browser/router.spec.ts`).
