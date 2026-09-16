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
    expect(source).toContain('<img class="catalog-mark" src={kerfLogoUrl} alt="" />');
    expect(source).toContain('</ToolbarControlGroup>} trailing=');
    expect(source).toContain('<p class="catalog-brand__subtitle">UI components</p>');
    expect(source).not.toContain('<span class="catalog-mark" aria-hidden="true">K</span>');
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
