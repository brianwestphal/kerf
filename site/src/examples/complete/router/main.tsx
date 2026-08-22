// A whole client-side router in one `createRouter` — the "postcard router".
//
// Routes map a URL pattern to a component; `router.outlet()` renders the matched
// one inside `mount()`. Because the outlet wraps each page in a keyed element
// (keyed by the matched PATTERN), kerf's morph swaps the page wholesale across
// routes and updates in place within a route — no new machinery. In-app `<a>`
// links are intercepted automatically (here in hash mode, so the demo works no
// matter what sub-path it's served under), and `router.activeClass` drives the
// active-nav highlight reactively.
//
// The kerf CORE stays router-free — `kerfjs/router` is an opt-in, tree-shakeable
// subpath. See docs/20-router.md.

import { mount } from 'kerfjs';
import { createRouter } from 'kerfjs/router';

// Dev diagnostics: kerf never infers dev mode, so the app installs them behind
// its own build's dev flag. Vite folds this to `false` in production.
if (import.meta.env.DEV) await import('kerfjs/dev');

interface Guide {
  slug: string;
  title: string;
  body: string;
}

// Deterministic content (no Math.random) so the demo + its capture are stable.
const GUIDES: Guide[] = [
  { slug: 'getting-started', title: 'Getting started', body: 'Install kerfjs, point your JSX at it, and mount. Ten lines to a reactive app.' },
  { slug: 'signals', title: 'Signals & bindings', body: 'Hand a signal into a JSX hole and kerf binds that one node — values bind, structure re-renders.' },
  { slug: 'routing', title: 'Routing', body: 'This page. createRouter gives you a route signal, an outlet, and link interception.' },
];
const guideBySlug = new Map(GUIDES.map((g) => [g.slug, g]));

function Home() {
  return (
    <div class="rt-view">
      <h2>Home</h2>
      <p>Welcome to the postcard router. Pick a guide, follow a link, and hit Back — every navigation stays on this page.</p>
      <ul class="rt-guides">
        <li><a href="#/guides">Browse the guides →</a></li>
        <li><a href="#/about">About this demo →</a></li>
      </ul>
    </div>
  );
}

function Guides() {
  return (
    <div class="rt-view">
      <h2>Guides</h2>
      <p>A <code>/guides/:slug</code> param route — each link matches the same pattern, so switching between them morphs in place.</p>
      <ul class="rt-guides">
        {GUIDES.map((g) => (
          <li data-key={g.slug}><a href={`#/guides/${g.slug}`}>{g.title}</a></li>
        ))}
      </ul>
    </div>
  );
}

function GuideDetail(params: Record<string, string>) {
  const guide = guideBySlug.get(params.slug);
  if (guide === undefined) {
    return (
      <div class="rt-view">
        <h2 class="rt-nf">No such guide</h2>
        <p>There's no guide called <code>{params.slug}</code>.</p>
        <a class="rt-back" href="#/guides">← Back to guides</a>
      </div>
    );
  }
  return (
    <div class="rt-view">
      <h2>{guide.title}</h2>
      <p>{guide.body}</p>
      <a class="rt-back" href="#/guides">← Back to guides</a>
    </div>
  );
}

function About() {
  return (
    <div class="rt-view">
      <h2>About</h2>
      <p>Built with <code>kerfjs/router</code> — a reactive route signal, a keyed outlet, and delegated link interception, in about 1&nbsp;KB of app-facing code on top of kerf.</p>
    </div>
  );
}

function NotFound() {
  return (
    <div class="rt-view">
      <h2 class="rt-nf">Not found</h2>
      <p>Nothing is routed here. The <code>*</code> catch-all caught it.</p>
      <a class="rt-back" href="#/">← Home</a>
    </div>
  );
}

const router = createRouter({
  mode: 'hash',
  routes: [
    { path: '/', component: () => <Home /> },
    { path: '/guides', component: () => <Guides /> },
    { path: '/guides/:slug', component: (p) => GuideDetail(p) },
    { path: '/about', component: () => <About /> },
    { path: '*', component: () => <NotFound /> },
  ],
});

const app = document.getElementById('app')!;

mount(app, () => (
  <div>
    <nav class="rt-bar">
      <a href="#/" class={router.activeClass('/', 'active')}>Home</a>
      <a href="#/guides" class={router.activeClass('/guides', 'active')}>Guides</a>
      <a href="#/about" class={router.activeClass('/about', 'active')}>About</a>
      <span class="rt-url">#{router.route.value.path}</span>
    </nav>
    {router.outlet()}
    <p class="rt-note">
      One <b>createRouter</b> · pattern matching · a keyed <b>outlet()</b> · auto <b>&lt;a&gt;</b> interception · real Back/Forward.
    </p>
  </div>
));
