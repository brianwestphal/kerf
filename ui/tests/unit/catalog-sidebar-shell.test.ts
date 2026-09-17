import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('UX catalog sidebar shell', () => {
  it('uses the real Kerf logo and keeps the subtitle outside the toolbar identity', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../../ux-demo/main.tsx'), 'utf8');

    // `?no-inline` keeps the logo an emitted file URL — kerf's URL screening drops
    // a script-capable `data:image/svg+xml` src, so the mark must not be inlined.
    expect(source).toContain("const kerfLogoUrl = new URL('../../assets/logo.svg?no-inline', import.meta.url).href;");
    // The shell is the reusable @kerfjs/ui/catalog Catalog; it renders the logo,
    // title, and subtitle from the brand prop (the subtitle stays outside the
    // toolbar identity by Catalog's own construction).
    expect(source).toContain("brand={{ title: 'Kerf', subtitle: 'UI components', logoUrl: kerfLogoUrl }}");
    expect(source).not.toContain('<span class="catalog-mark" aria-hidden="true">K</span>');
  });

  it('sets the brand favicon from an emitted file URL that resolves in dev and build', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../../ux-demo/main.tsx'), 'utf8');
    // From JS via `new URL(..., import.meta.url)` — like the logo — so it resolves
    // on the dev server too, unlike a static `../../` link in index.html which the
    // browser normalizes to a path outside the demo root.
    expect(source).toContain("faviconLink.href = new URL('../../assets/favicon.svg?no-inline', import.meta.url).href;");
    expect(source).toContain("faviconLink.rel = 'icon';");
  });

  it('serves the repo-owned logo in development and builds relative asset URLs for nested preview paths', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../../ux-demo/vite.config.ts'), 'utf8');

    expect(source).toContain("base: './'");
    expect(source).toContain("fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] }");
  });

  it('fully collapses the pane so its restore action can live in the detail toolbar', async () => {
    const file = resolve(import.meta.dirname, '../../ux-demo/style.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const collapsedShell = root.nodes.find(
      (node) => node.type === 'rule' && node.selector === '.catalog-shell[data-sidebar-collapsed="true"]',
    );

    if (!collapsedShell || collapsedShell.type !== 'rule') throw new Error('Missing collapsed catalog shell rule');
    const columns = collapsedShell.nodes.find(
      (node) => node.type === 'decl' && node.prop === 'grid-template-columns',
    );
    expect(columns?.type === 'decl' ? columns.value : undefined).toBe('0 minmax(0, 1fr)');
  });
});
