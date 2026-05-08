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
