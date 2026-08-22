/**
 * `kerfjs/router` — the "postcard router": the smallest client-side router that
 * is still a router. The kerf *core* stays router-free (docs/1 "Not a router" is
 * about the runtime); this is an opt-in, tree-shakeable subpath, on the same
 * footing as `kerfjs/list` / `kerfjs/overlay` — it adds nothing to the main
 * barrel until you import it.
 *
 *   import { createRouter } from 'kerfjs/router';
 *
 *   const router = createRouter({
 *     routes: [
 *       { path: '/',          component: () => <Home /> },
 *       { path: '/users/:id', component: ({ id }) => <User id={id} /> },
 *       { path: '*',          component: () => <NotFound /> },  // catch-all
 *     ],
 *   });
 *
 *   mount(app, () => (
 *     <div>
 *       <nav> … in-app links here are auto-intercepted … </nav>
 *       {router.outlet()}   // renders the matched route's component
 *     </div>
 *   ));
 *
 * The whole model is three moving parts kerf already has: a `signal` for the
 * current route, `delegate()` for link interception, and the keyed morph for the
 * outlet (a route change swaps the page wholesale; a param change updates in
 * place). Everything a full framework's router adds — nested layouts, data
 * loaders, lazy routes, guards, SSR matching — is deliberately OUT of scope;
 * compose those with kerf primitives (an `effect` on `router.route`, a `resource`
 * from `kerfjs/async`) when you need them.
 */
import { delegate } from './delegate.js';
import { jsx } from './jsx-runtime.js';
import { type MountResult } from './mount.js';
import { computed, type ReadonlySignal, signal } from './reactive.js';

/** The reactive current-route snapshot (`router.route.value`). */
export interface RouteState {
  /** The matched pathname, base stripped (history mode) or the hash body (hash mode). Always starts with `/`. */
  path: string;
  /** Path parameters from the matched pattern — `/users/:id` on `/users/7` → `{ id: '7' }`. */
  params: Record<string, string>;
  /** The parsed query string (`?a=1` → `URLSearchParams`). Empty when there is none. */
  query: URLSearchParams;
  /** The raw location hash including `#` (history mode), or `''`. In hash mode the hash IS the route, so this is `''`. */
  hash: string;
}

/** A route's view: receives the matched `params` and the full `route` snapshot, returns kerf content. */
export type RouteComponent = (params: Record<string, string>, route: RouteState) => MountResult;

/** One route in the table. `path` is a pattern: `/`, `/users/:id`, `/files/*rest`, or `*` (catch-all). */
export interface RouteDef {
  /** Pattern: static segments, `:param` captures, a trailing `*rest` wildcard, or `*` (matches anything — put last). */
  path: string;
  /** The view rendered in the outlet when this route matches. */
  component: RouteComponent;
}

/** Options for {@link navigate}. */
export interface NavigateOptions {
  /** Replace the current history entry instead of pushing a new one. Default `false`. */
  replace?: boolean;
  /** Arbitrary state stored on the history entry (readable via `history.state`). */
  state?: unknown;
}

/** Options for {@link createRouter}. */
export interface RouterOptions {
  /** The route table, tried in order; the first match wins. Include a `path: '*'` entry last for a fallback. */
  routes: readonly RouteDef[];
  /**
   * `'history'` (default) uses the real pathname (`/users/7`) via the History
   * API; `'hash'` keeps the route after `#` (`#/users/7`) for static hosts with
   * no server rewrite.
   */
  mode?: 'history' | 'hash';
  /** History mode only: a base path every route sits under (`/app`), stripped from `route.path` and prepended on navigation. */
  base?: string;
  /**
   * Auto-intercept clicks on in-app `<a href>` links (same-origin, left-click, no
   * modifier keys / `target` / `download`) and route them instead of reloading.
   * Opt a single link out with `data-router-ignore` or `rel="external"`. Default
   * `true`; set `false` to wire navigation entirely yourself.
   */
  interceptLinks?: boolean;
}

/** The handle {@link createRouter} returns. Holds no module-global state — it's a closure. */
export interface RouterHandle {
  /** The reactive current route. Read `.value` (tracked) in a render / `computed` / `effect`. */
  route: ReadonlySignal<RouteState>;
  /** Navigate to `path` (may include `?query` / `#hash`). Pushes history (or replaces, per options). */
  navigate: (path: string, options?: NavigateOptions) => void;
  /** History back — `history.back()`. */
  back: () => void;
  /** History forward — `history.forward()`. */
  forward: () => void;
  /**
   * A reactive "is this path active?" — true when the current path equals
   * `pattern` or is nested under it (`match('/users')` is true on `/users/7`).
   * `match('/')` is exact (only true on `/`). Bind it for active-nav styling.
   */
  match: (pattern: string) => ReadonlySignal<boolean>;
  /** Convenience: a bound class signal — `className` while {@link match}`(pattern)` is active, else `''`. */
  activeClass: (pattern: string, className: string) => ReadonlySignal<string>;
  /**
   * The routed view. Call it inside a `mount()` render: it renders the matched
   * route's component in a keyed wrapper, so a route change swaps the page
   * wholesale (fresh DOM) while a param change updates it in place.
   */
  outlet: () => MountResult;
  /** Tear down the popstate / link listeners. Idempotent. */
  dispose: () => void;
}

/**
 * Match `path` against a route `pattern`. Returns the captured params on a match,
 * or `null` on no match. `*` matches anything; a trailing `*name` captures the
 * remaining segments joined by `/`; `:name` captures one segment.
 */
function matchPattern(pattern: string, path: string): Record<string, string> | null {
  if (pattern === '*') return {};
  const pp = pattern.split('/').filter(Boolean);
  const ps = path.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    const seg = pp[i];
    if (seg.startsWith('*')) {
      // Wildcard rest — consumes every remaining segment.
      const name = seg.slice(1);
      if (name.length > 0) params[name] = ps.slice(i).map(decodeURIComponent).join('/');
      return params;
    }
    if (i >= ps.length) return null;
    if (seg.startsWith(':')) {
      params[seg.slice(1)] = decodeURIComponent(ps[i]);
      continue;
    }
    if (seg !== ps[i]) return null;
  }
  // No wildcard matched, so the segment counts must be exactly equal.
  return ps.length === pp.length ? params : null;
}

/**
 * Create a router bound to the browser history. Reads the current location
 * immediately (so `route.value` is correct before first paint), installs a
 * `popstate` listener (+ `hashchange` in hash mode) and, unless disabled, a
 * single delegated link interceptor. See {@link RouterOptions} / {@link RouterHandle}.
 */
export function createRouter(options: RouterOptions): RouterHandle {
  const { routes, mode = 'history', base = '', interceptLinks = true } = options;
  // Normalize base to '' or '/foo' (no trailing slash), so `base + path` is clean.
  const normBase = base === '/' ? '' : base.replace(/\/$/, '');

  // The current matched route def, kept in step with the signal so `outlet()`
  // doesn't have to re-match — it reads `route.value` only to subscribe.
  let matched: { def: RouteDef; params: Record<string, string> } | null = null;

  const readLocation = (): RouteState => {
    let path: string;
    let query: URLSearchParams;
    let hash: string;
    if (mode === 'hash') {
      // Everything after '#': '#/users/7?a=1' → path '/users/7', query 'a=1'.
      const raw = location.hash.slice(1) || '/';
      const qIndex = raw.indexOf('?');
      path = qIndex === -1 ? raw : raw.slice(0, qIndex);
      query = new URLSearchParams(qIndex === -1 ? '' : raw.slice(qIndex + 1));
      hash = '';
    } else {
      path = location.pathname;
      if (normBase.length > 0 && path.startsWith(normBase)) path = path.slice(normBase.length) || '/';
      query = new URLSearchParams(location.search);
      hash = location.hash;
    }
    if (!path.startsWith('/')) path = '/' + path;
    return { path, params: {}, query, hash };
  };

  const resolve = (state: RouteState): RouteState => {
    for (const def of routes) {
      const params = matchPattern(def.path, state.path);
      if (params !== null) {
        matched = { def, params };
        return { ...state, params };
      }
    }
    matched = null;
    return state;
  };

  const route = signal<RouteState>(resolve(readLocation()));

  // Re-read location → re-match → publish. Only writes when the path actually
  // changed, so a doubled popstate/hashchange is a harmless no-op.
  const sync = (): void => {
    const next = resolve(readLocation());
    if (next.path !== route.value.path || next.query.toString() !== route.value.query.toString()
      || next.hash !== route.value.hash) {
      route.value = next;
    }
  };

  const navigate = (path: string, opts: NavigateOptions = {}): void => {
    const url = mode === 'hash'
      ? '#' + (path.startsWith('/') ? path : '/' + path)
      : normBase + (path.startsWith('/') ? path : '/' + path);
    // pushState/replaceState do NOT fire popstate, so publish the new route ourselves.
    history[opts.replace === true ? 'replaceState' : 'pushState'](opts.state ?? null, '', url);
    route.value = resolve(readLocation());
  };

  const match = (pattern: string): ReadonlySignal<boolean> =>
    computed(() => {
      const p = route.value.path;
      if (pattern === '/') return p === '/';
      const base = pattern.replace(/\/$/, '');
      return p === base || p.startsWith(base + '/');
    });

  const activeClass = (pattern: string, className: string): ReadonlySignal<string> => {
    const active = match(pattern);
    return computed(() => (active.value ? className : ''));
  };

  const outlet = (): MountResult => {
    void route.value; // tracked read — subscribes the enclosing mount to navigation
    if (matched === null) return null;
    // Keyed by the route PATTERN: a different pattern → the morph replaces the
    // wrapper wholesale (fresh DOM for the new page); the same pattern (only the
    // params changed) → the morph reconciles the children in place.
    return jsx('div', {
      'data-router-outlet': '',
      'data-key': matched.def.path,
      children: matched.def.component(matched.params, route.value),
    });
  };

  // --- Listeners ---------------------------------------------------------
  const removers: Array<() => void> = [];
  globalThis.addEventListener('popstate', sync);
  removers.push(() => globalThis.removeEventListener('popstate', sync));
  if (mode === 'hash') {
    globalThis.addEventListener('hashchange', sync);
    removers.push(() => globalThis.removeEventListener('hashchange', sync));
  }

  if (interceptLinks && typeof document !== 'undefined') {
    const onClick = (event: Event, anchor: HTMLAnchorElement): void => {
      const e = event as MouseEvent;
      // Let the browser handle anything that isn't a plain left-click navigation.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (anchor.hasAttribute('download') || anchor.hasAttribute('data-router-ignore')) return;
      const target = anchor.getAttribute('target');
      if (target !== null && target !== '' && target !== '_self') return;
      const rel = anchor.getAttribute('rel');
      if (rel !== null && /\bexternal\b/.test(rel)) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      if (mode === 'history') {
        if (normBase.length > 0 && !url.pathname.startsWith(normBase)) return; // outside the app's base
        event.preventDefault();
        navigate(url.pathname.slice(normBase.length) + url.search + url.hash);
      } else {
        // Hash mode: only intercept in-app hash links (`#/...`), leave others alone.
        if (url.pathname !== location.pathname || !url.hash.startsWith('#/')) return;
        event.preventDefault();
        navigate(url.hash.slice(1));
      }
    };
    removers.push(delegate<HTMLAnchorElement>(document.body, 'click', 'a[href]', onClick));
  }

  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    for (const remove of removers) remove();
  };

  return { route, navigate, back: () => history.back(), forward: () => history.forward(), match, activeClass, outlet, dispose };
}
