// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://brianwestphal.github.io',
  base: '/kerf',
  // KF-154: the basics example at index 9 was originally `09-raw-sanitise`
  // (British spelling). The slug moved to `09-raw-sanitize` after the
  // American-English sweep (KF-153); this redirect preserves deep links
  // to the old URL. Remove once external traffic to the old slug stops.
  redirects: {
    '/examples/basics/09-raw-sanitise': '/kerf/examples/basics/09-raw-sanitize/',
    '/examples/basics/09-raw-sanitise/': '/kerf/examples/basics/09-raw-sanitize/',
  },
  vite: {
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'kerfjs',
    },
  },
  integrations: [
    starlight({
      title: 'Kerf — the smallest cut',
      description:
        'Tiny reactive UI framework — fine-grained signals + DOM diff + JSX. 6.6 KB, no virtual DOM, no compiler.',
      customCss: ['./src/styles/live-example.css'],
      head: [
        {
          // KF-67: when the sidebar contains the current page deep enough that
          // it would otherwise sit off-screen, scroll the sidebar pane (NOT
          // the document) so the highlighted item is visible without the
          // reader having to hunt for it. No-op when the active link is
          // already in view, so short sidebars are unaffected. Re-runs after
          // Astro view transitions so client-side navigation behaves the
          // same as a hard load.
          tag: 'script',
          content: `(function(){function s(){var p=document.querySelector('.sidebar-pane');if(!p)return;var a=p.querySelector('[aria-current="page"]');if(!a)return;var pr=p.getBoundingClientRect();var ar=a.getBoundingClientRect();if(ar.top>=pr.top&&ar.bottom<=pr.bottom)return;var o=(ar.top-pr.top)+p.scrollTop-(p.clientHeight/2)+(ar.height/2);p.scrollTop=Math.max(0,o)}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',s)}else{s()}document.addEventListener('astro:page-load',s)})();`,
        },
        // Favicon set + PWA manifest. The SVG path is owned by Starlight's
        // `favicon` option below; the head additions cover the legacy ICO,
        // PNG fallbacks, Apple touch icon, Safari pinned-tab mask, manifest,
        // and the Android theme-color meta. All assets are emitted by
        // `scripts/build-icons.mjs` from the SVGs in `src/assets/`.
        { tag: 'link', attrs: { rel: 'icon',             type: 'image/png',     sizes: '32x32', href: '/kerf/favicon-32.png' } },
        { tag: 'link', attrs: { rel: 'icon',             type: 'image/png',     sizes: '16x16', href: '/kerf/favicon-16.png' } },
        { tag: 'link', attrs: { rel: 'icon',             type: 'image/x-icon',                  href: '/kerf/favicon.ico' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', sizes: '180x180',                       href: '/kerf/apple-touch-icon.png' } },
        { tag: 'link', attrs: { rel: 'mask-icon',                                                href: '/kerf/mask-icon.svg', color: '#ef4370' } },
        { tag: 'link', attrs: { rel: 'manifest',                                                 href: '/kerf/site.webmanifest' } },
        { tag: 'meta', attrs: { name: 'theme-color',                                             content: '#ef4370' } },
      ],
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: false,
      },
      favicon: '/favicon.svg',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/brianwestphal/kerf',
        },
      ],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Why Kerf', slug: 'why-kerf' },
            { label: 'Use cases', slug: 'use-cases' },
            { label: 'When to use something else', slug: 'alternatives' },
            { label: 'AI', slug: 'ai' },
          ],
        },
        {
          label: 'Docs',
          items: [
            { label: 'Overview', slug: 'docs/overview' },
            { label: 'Reactivity', slug: 'docs/reactivity' },
            { label: 'Stores', slug: 'docs/stores' },
            { label: 'Render', slug: 'docs/render' },
            { label: 'Events', slug: 'docs/events' },
            { label: 'JSX runtime', slug: 'docs/jsx' },
            { label: 'SVG', slug: 'docs/svg' },
          ],
        },
        {
          label: 'API reference',
          slug: 'api',
        },
        {
          label: 'Examples',
          items: [
            {
              label: 'Basics',
              collapsed: true,
              items: [{ autogenerate: { directory: 'examples/basics' } }],
            },
            {
              label: 'Complete apps',
              collapsed: true,
              items: [{ autogenerate: { directory: 'examples/complete' } }],
            },
          ],
        },
        {
          label: 'Migrating',
          items: [
            { label: 'Pick your starting point', slug: 'migrating' },
            { label: 'Coming from React', slug: 'migrating/react' },
            { label: 'Coming from Alpine', slug: 'migrating/alpine' },
            { label: 'Coming from Lit', slug: 'migrating/lit' },
            { label: 'Coming from vanjs', slug: 'migrating/vanjs' },
          ],
        },
      ],
    }),
  ],
});
