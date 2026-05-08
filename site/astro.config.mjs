// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://brianwestphal.github.io',
  base: '/kerf',
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
      ],
      logo: {
        src: './src/assets/logo-placeholder.svg',
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
      ],
    }),
  ],
});
