import { MenuHeader, MenuItem, PageHeader, Toolbar } from '@kerfjs/ui';
import { raw, renderDocument, type SafeHtml } from 'kerfjs';

export interface SitePage {
  description: string;
  html: string;
  path: string;
  source: string;
  title: string;
  toc: Array<{ depth: number; id: string; label: string }>;
}

export interface NavigationGroup {
  label: string;
  items: Array<[string, string]>;
}

const BASE = '/kerf';

function icon(name: 'back' | 'forward' | 'github' | 'menu' | 'theme' | 'top') {
  const paths = {
    back: '<path d="m15 18-6-6 6-6"/>',
    forward: '<path d="m9 18 6-6-6-6"/>',
    github: '<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.58 9.58 0 0 1 12 6.7c.85 0 1.7.11 2.5.34 1.9-1.29 2.74-1.02 2.74-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.89c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    theme: '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36A7 7 0 0 1 12 3Z"/>',
    top: '<path d="m18 15-6-6-6 6"/>',
  };
  return raw(`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`);
}

function routeHref(path: string) {
  return `${BASE}${path}`;
}

function navigation(groups: NavigationGroup[], currentPath: string) {
  return <nav class="site-navigation kui-sidebar" aria-label="Documentation">
    {groups.map((group) => <section class="site-navigation__group kui-sidebar-section">
      <MenuHeader label={group.label} />
      <div class="site-navigation__items">
        {group.items.map(([label, path]) => <MenuItem action="navigate" itemId={path} label={label} selected={currentPath === path} />)}
      </div>
    </section>)}
  </nav>;
}

function tableOfContents(page: SitePage) {
  if (page.toc.length === 0) return null;
  return <aside class="site-toc kui-sidebar" aria-label="On this page">
    <MenuHeader label="On this page" />
    {page.toc.map((entry) => <MenuItem action="scroll-to" itemId={entry.id} label={entry.label} className={`site-toc__item site-toc__item--${entry.depth}`} />)}
    <MenuItem action="scroll-to" itemId="site-top" label="Back to top" icon={icon('top')} className="site-toc__top" />
  </aside>;
}

function hero() {
  return <header class="site-hero">
    <div class="site-hero__copy"><p class="site-hero__eyebrow">Introducing Kerf</p><h1>Reactive UI that touches only the bytes that changed.</h1><p class="site-hero__tagline">The smallest cut.<br /><strong>~11 KB. No virtual DOM. No compiler. No magic.</strong></p><div class="site-hero__actions"><a class="site-button site-button--primary" href={`${BASE}/getting-started/`}>Get started →</a><a class="site-button" href={`${BASE}/examples/basics/`}>View examples</a><a class="site-button site-button--quiet" href={`${BASE}/migrating/`}>Coming from React?</a></div></div>
    <img src={`${BASE}/favicon.svg`} alt="" width="240" height="240" />
  </header>;
}

export function renderSite(pages: SitePage[], groups: NavigationGroup[], currentPath: string): SafeHtml {
  const page = pages.find((candidate) => candidate.path === currentPath) ?? pages.find((candidate) => candidate.path === '/')!;
  const navigationPaths = ['/', ...groups.flatMap((group) => group.items.map(([, path]) => path))];
  const orderedPages = [...pages].sort((left, right) => {
    const leftIndex = navigationPaths.indexOf(left.path);
    const rightIndex = navigationPaths.indexOf(right.path);
    if (leftIndex >= 0 || rightIndex >= 0) return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
    return left.path.localeCompare(right.path);
  });
  const index = orderedPages.indexOf(page);
  const previous = index > 0 ? orderedPages[index - 1] : undefined;
  const next = index < orderedPages.length - 1 ? orderedPages[index + 1] : undefined;
  return <div class="site-app" data-current-path={page.path}>
    <aside class="site-sidebar" data-site-sidebar>
      <div class="site-brand"><a href={`${BASE}/`} aria-label="Kerf home"><img src={`${BASE}/favicon.svg`} alt="" width="36" height="36" /><span><strong>Kerf</strong><small>the smallest cut</small></span></a><MenuItem action="close-nav" label="Close" accessibleLabel="Close navigation" className="site-sidebar__close" /></div>
      {navigation(groups, page.path)}
      <footer class="site-sidebar__footer"><a href="https://github.com/brianwestphal/kerf" rel="external">{icon('github')}<span>View on GitHub</span></a></footer>
    </aside>
    <div class="site-sidebar-scrim" data-action="close-nav" aria-hidden="true"></div>
    <div class="site-workspace">
      <Toolbar
        className="site-toolbar"
        label="Site controls"
        leading={<><MenuItem action="open-nav" label="Menu" accessibleLabel="Open navigation" icon={icon('menu')} className="site-toolbar__menu" /><a class="site-toolbar__brand" href={`${BASE}/`}>Kerf</a></>}
        center={<div class="kerf-search-host" data-morph-skip></div>}
        trailing={<><MenuItem action="history-back" label="Back" accessibleLabel="Go back" icon={icon('back')} className="site-toolbar__icon" /><MenuItem action="history-forward" label="Forward" accessibleLabel="Go forward" icon={icon('forward')} className="site-toolbar__icon" /><MenuItem action="toggle-theme" label="Theme" accessibleLabel="Toggle color theme" icon={icon('theme')} className="site-toolbar__icon" /></>}
      />
      <div class="site-page-grid">
        <main id="site-top" class="site-main" data-pagefind-body>
          {page.path === '/' ? hero() : <PageHeader title={page.title} />}
          <article class="site-article">{raw(page.html)}</article>
          <nav class="site-pagination" aria-label="Adjacent pages">
            {previous ? <a href={routeHref(previous.path)}><span>Previous</span><strong>← {previous.title}</strong></a> : <span></span>}
            {next ? <a href={routeHref(next.path)}><span>Next</span><strong>{next.title} →</strong></a> : <span></span>}
          </nav>
          <footer class="site-footer"><span>Built with kerfjs and @kerfjs/ui.</span><a href="https://github.com/brianwestphal/kerf">Source</a></footer>
        </main>
        {tableOfContents(page)}
      </div>
    </div>
  </div>;
}

export function renderSiteDocument(pages: SitePage[], groups: NavigationGroup[], currentPath: string): string {
  const page = pages.find((candidate) => candidate.path === currentPath) ?? pages.find((candidate) => candidate.path === '/')!;
  return renderDocument(<html lang="en" data-kerf-base={`${BASE}/`}>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={page.description} />
      <meta name="theme-color" content="#ef4370" />
      <title>{page.title}</title>
      <link rel="canonical" href={`https://brianwestphal.github.io${BASE}${page.path}`} />
      <link rel="icon" href={`${BASE}/favicon.svg`} type="image/svg+xml" />
      <link rel="icon" href={`${BASE}/favicon-32.png`} sizes="32x32" />
      <link rel="apple-touch-icon" href={`${BASE}/apple-touch-icon.png`} />
      <link rel="manifest" href={`${BASE}/site.webmanifest`} />
      <link rel="stylesheet" href={`${BASE}/assets/site.css`} />
      <script>{raw(`try{const t=localStorage.getItem('kerf-site-theme');if(t)document.documentElement.dataset.theme=t}catch{}`)}</script>
    </head>
    <body data-nav-open="false"><div id="site-root">{renderSite(pages, groups, page.path)}</div><script type="module" src={`${BASE}/assets/site.js`}></script></body>
  </html>);
}
