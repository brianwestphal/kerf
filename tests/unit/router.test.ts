import { afterEach, describe, expect, it } from 'vitest';

import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { createRouter, type RouterHandle } from '../../src/router.js';

// Reset the URL + DOM between tests. happy-dom implements history/location.
function goto(path: string): void {
  history.replaceState(null, '', path);
}

let router: RouterHandle | undefined;
afterEach(() => {
  router?.dispose();
  router = undefined;
  document.body.innerHTML = '';
  goto('/');
});

const routes = [
  { path: '/', component: () => jsx('div', { class: 'home', children: 'Home' }) },
  { path: '/users/:id', component: (p: Record<string, string>) => jsx('div', { class: 'user', children: `User ${p.id}` }) },
  { path: '/files/*rest', component: (p: Record<string, string>) => jsx('div', { class: 'file', children: p.rest }) },
  { path: '*', component: () => jsx('div', { class: 'nf', children: 'Not found' }) },
];

describe('createRouter() — matching + route signal', () => {
  it('reads the initial location on creation', () => {
    goto('/users/7');
    router = createRouter({ routes });
    expect(router.route.value.path).toBe('/users/7');
    expect(router.route.value.params).toEqual({ id: '7' });
  });

  it('matches static, :param, *rest wildcard, and the * catch-all in order', () => {
    router = createRouter({ routes });
    router.navigate('/');
    expect(router.route.value.params).toEqual({});
    router.navigate('/users/42');
    expect(router.route.value.params).toEqual({ id: '42' });
    router.navigate('/files/a/b/c.txt');
    expect(router.route.value.params).toEqual({ rest: 'a/b/c.txt' });
    router.navigate('/nothing/here');
    expect(router.route.value.path).toBe('/nothing/here'); // catch-all matched (params empty)
    expect(router.route.value.params).toEqual({});
  });

  it('decodes path params and parses the query string', () => {
    router = createRouter({ routes });
    router.navigate('/users/a%20b?tab=posts&page=2');
    expect(router.route.value.params).toEqual({ id: 'a b' });
    expect(router.route.value.query.get('tab')).toBe('posts');
    expect(router.route.value.query.get('page')).toBe('2');
  });

  it('navigate pushes history; navigate({ replace }) replaces it', () => {
    router = createRouter({ routes });
    const before = history.length;
    router.navigate('/users/1');
    expect(history.length).toBe(before + 1);
    router.navigate('/users/2', { replace: true });
    expect(history.length).toBe(before + 1); // replaced, not pushed
    expect(location.pathname).toBe('/users/2');
  });

  it('syncs on popstate (back / forward)', () => {
    router = createRouter({ routes });
    router.navigate('/users/1');
    router.navigate('/users/2');
    // Simulate a back: change the URL and fire popstate (what the browser does).
    history.replaceState(null, '', '/users/1');
    globalThis.dispatchEvent(new Event('popstate'));
    expect(router.route.value.path).toBe('/users/1');
    expect(router.route.value.params).toEqual({ id: '1' });
  });

  it('an unmatched path with no catch-all leaves params empty and matched null (outlet renders nothing)', () => {
    router = createRouter({ routes: [{ path: '/', component: () => jsx('div', { children: 'H' }) }] });
    router.navigate('/missing');
    expect(router.outlet()).toBeNull();
  });
});

describe('createRouter() — outlet (keyed morph swap)', () => {
  it('renders the matched component, swaps wholesale across routes, updates in place within a route', () => {
    goto('/');
    router = createRouter({ routes });
    const app = document.createElement('div');
    document.body.appendChild(app);
    const r = router;
    mount(app, () => jsx('div', { children: r.outlet() }));

    // Initial: Home.
    expect(app.querySelector('.home')?.textContent).toBe('Home');
    const homeWrapper = app.querySelector('[data-router-outlet]');
    expect(homeWrapper?.getAttribute('data-key')).toBe('/');

    // Cross-route nav → the keyed wrapper is a DIFFERENT element (fresh DOM).
    r.navigate('/users/1');
    expect(app.querySelector('.home')).toBeNull();
    expect(app.querySelector('.user')?.textContent).toBe('User 1');
    const userWrapper = app.querySelector('[data-router-outlet]');
    expect(userWrapper?.getAttribute('data-key')).toBe('/users/:id');
    expect(userWrapper).not.toBe(homeWrapper); // wholesale replace

    // Same-route param change → SAME wrapper element (morph in place), new content.
    r.navigate('/users/2');
    expect(app.querySelector('.user')?.textContent).toBe('User 2');
    expect(app.querySelector('[data-router-outlet]')).toBe(userWrapper); // preserved DOM identity
  });
});

describe('createRouter() — match / activeClass', () => {
  it('match(pattern) is reactive: exact for "/", prefix for nested paths', () => {
    router = createRouter({ routes });
    const home = router.match('/');
    const users = router.match('/users');
    router.navigate('/');
    expect(home.value).toBe(true);
    expect(users.value).toBe(false);
    router.navigate('/users/1');
    expect(home.value).toBe(false); // "/" is exact, not a prefix-of-everything
    expect(users.value).toBe(true); // prefix match on /users/1
  });

  it('activeClass returns the class while active, empty otherwise', () => {
    router = createRouter({ routes });
    const cls = router.activeClass('/users', 'on');
    router.navigate('/');
    expect(cls.value).toBe('');
    router.navigate('/users/9');
    expect(cls.value).toBe('on');
  });
});

describe('createRouter() — link interception', () => {
  function link(attrs: Record<string, string>): HTMLAnchorElement {
    const a = document.createElement('a');
    for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
    a.textContent = 'go';
    document.body.appendChild(a);
    return a;
  }
  const leftClick = (init: MouseEventInit = {}) =>
    new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });

  it('intercepts a same-origin left-click and navigates instead of reloading', () => {
    goto('/');
    router = createRouter({ routes });
    const a = link({ href: '/users/5' });
    const ev = leftClick();
    a.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(router.route.value.path).toBe('/users/5');
  });

  it('lets the browser handle modifier-clicks, target, download, rel=external, data-router-ignore, and cross-origin', () => {
    goto('/');
    router = createRouter({ routes });
    // A guard registered AFTER the router (so it runs after the router's bubble
    // handler): it stops happy-dom from actually following the un-prevented link
    // (a real fetch) without changing what the router decided.
    const guard = (e: Event): void => e.preventDefault();
    document.body.addEventListener('click', guard);
    const cases: Array<[HTMLAnchorElement, MouseEventInit]> = [
      [link({ href: '/a' }), { metaKey: true }],
      [link({ href: '/a' }), { ctrlKey: true }],
      [link({ href: '/a', target: '_blank' }), {}],
      [link({ href: '/a', download: '' }), {}],
      [link({ href: '/a', rel: 'external' }), {}],
      [link({ href: '/a', 'data-router-ignore': '' }), {}],
      [link({ href: 'https://example.com/a' }), {}],
    ];
    for (const [a, init] of cases) a.dispatchEvent(leftClick(init));
    document.body.removeEventListener('click', guard);
    expect(router.route.value.path).toBe('/'); // the router never navigated for any case
  });

  it('interceptLinks: false wires no listener', () => {
    goto('/');
    router = createRouter({ routes, interceptLinks: false });
    const guard = (e: Event): void => e.preventDefault(); // stop happy-dom following the link
    document.body.addEventListener('click', guard);
    const a = link({ href: '/users/1' });
    a.dispatchEvent(leftClick());
    document.body.removeEventListener('click', guard);
    expect(router.route.value.path).toBe('/'); // the router did not intercept
  });
});

describe('createRouter() — hash mode + base', () => {
  it('hash mode reads and writes the route after #', () => {
    location.hash = '#/users/3';
    router = createRouter({ routes, mode: 'hash' });
    expect(router.route.value.path).toBe('/users/3');
    router.navigate('/files/x.txt');
    expect(location.hash).toBe('#/files/x.txt');
    expect(router.route.value.params).toEqual({ rest: 'x.txt' });
    location.hash = '';
  });

  it('base strips + prepends the base path (history mode)', () => {
    goto('/app/users/8');
    router = createRouter({ routes, base: '/app' });
    expect(router.route.value.path).toBe('/users/8'); // base stripped
    expect(router.route.value.params).toEqual({ id: '8' });
    router.navigate('/users/9');
    expect(location.pathname).toBe('/app/users/9'); // base prepended
  });
});

describe('createRouter() — edge coverage', () => {
  function link(attrs: Record<string, string>): HTMLAnchorElement {
    const a = document.createElement('a');
    for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
    document.body.appendChild(a);
    return a;
  }
  const leftClick = (init: MouseEventInit = {}) =>
    new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });

  it('back() / forward() delegate to history without throwing', () => {
    goto('/');
    router = createRouter({ routes });
    expect(() => { router!.back(); router!.forward(); }).not.toThrow();
  });

  it('navigate() normalizes a relative path (no leading slash) in both modes', () => {
    router = createRouter({ routes });
    router.navigate('users/1'); // history mode, relative
    expect(router.route.value.path).toBe('/users/1');
    router.dispose();
    router = createRouter({ routes, mode: 'hash' });
    router.navigate('users/2'); // hash mode, relative
    expect(location.hash).toBe('#/users/2');
    location.hash = '';
  });

  it('a bare "*" wildcard segment matches without capturing a param', () => {
    router = createRouter({ routes: [{ path: '/files/*', component: () => jsx('div', { children: 'f' }) }] });
    router.navigate('/files/a/b');
    expect(router.route.value.params).toEqual({});
  });

  it('hash mode: intercepts in-app "#/..." links, ignores non-hash links', () => {
    location.hash = '#/';
    router = createRouter({ routes, mode: 'hash' });
    const guard = (e: Event): void => e.preventDefault();
    document.body.addEventListener('click', guard);
    const inApp = link({ href: '#/users/9' });
    inApp.dispatchEvent(leftClick());
    expect(router.route.value.path).toBe('/users/9'); // intercepted

    const notHash = link({ href: '/plain' });
    notHash.dispatchEvent(leftClick());
    expect(router.route.value.path).toBe('/users/9'); // unchanged — not a hash link
    document.body.removeEventListener('click', guard);
    location.hash = '';
  });

  it('history mode with base: intercepts in-base links, ignores out-of-base links', () => {
    goto('/app/');
    router = createRouter({ routes, base: '/app' });
    const inBase = link({ href: '/app/users/3' });
    inBase.dispatchEvent(leftClick());
    expect(router.route.value.path).toBe('/users/3'); // intercepted, base stripped

    const guard = (e: Event): void => e.preventDefault();
    document.body.addEventListener('click', guard);
    const outOfBase = link({ href: '/other/page' });
    outOfBase.dispatchEvent(leftClick());
    expect(router.route.value.path).toBe('/users/3'); // unchanged — outside base
    document.body.removeEventListener('click', guard);
  });

  it('intercepts target="_self" and an already-defaultPrevented click is left alone', () => {
    goto('/');
    router = createRouter({ routes });
    link({ href: '/users/1', target: '_self' }).dispatchEvent(leftClick());
    expect(router.route.value.path).toBe('/users/1'); // _self is intercepted

    const a = link({ href: '/users/2' });
    const ev = leftClick();
    ev.preventDefault(); // some other handler already handled it
    a.dispatchEvent(ev);
    expect(router.route.value.path).toBe('/users/1'); // router leaves a pre-prevented click alone
  });

  it('base root path normalizes to "/" and hash without a leading slash is normalized', () => {
    goto('/app');
    router = createRouter({ routes, base: '/app' });
    expect(router.route.value.path).toBe('/'); // base === path → '/'
    router.dispose();
    location.hash = '#users/5'; // no leading slash
    router = createRouter({ routes, mode: 'hash' });
    expect(router.route.value.path).toBe('/users/5');
    location.hash = '';
  });

  it('base: "/" behaves like no base', () => {
    goto('/users/6');
    router = createRouter({ routes, base: '/' });
    expect(router.route.value.path).toBe('/users/6');
  });

  it('hash mode parses a query after the route', () => {
    location.hash = '#/users/2?tab=likes';
    router = createRouter({ routes, mode: 'hash' });
    expect(router.route.value.path).toBe('/users/2');
    expect(router.route.value.query.get('tab')).toBe('likes');
    location.hash = '';
  });

  it('match() treats a trailing-slash pattern the same as without', () => {
    router = createRouter({ routes });
    const users = router.match('/users/');
    router.navigate('/users/1');
    expect(users.value).toBe(true);
  });

  it('sync republishes when only the query or hash changes (same path)', () => {
    goto('/users/1');
    router = createRouter({ routes });
    history.replaceState(null, '', '/users/1?tab=x');
    globalThis.dispatchEvent(new Event('popstate'));
    expect(router.route.value.query.get('tab')).toBe('x');
    history.replaceState(null, '', '/users/1?tab=x#frag');
    globalThis.dispatchEvent(new Event('popstate'));
    expect(router.route.value.hash).toBe('#frag');
  });
});

describe('createRouter() — dispose', () => {
  it('dispose removes the popstate listener (idempotent)', () => {
    goto('/');
    router = createRouter({ routes });
    router.navigate('/users/1');
    router.dispose();
    router.dispose(); // idempotent
    history.replaceState(null, '', '/users/2');
    globalThis.dispatchEvent(new Event('popstate'));
    expect(router.route.value.path).toBe('/users/1'); // no longer syncing
  });
});
