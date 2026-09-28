import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('UX catalog sidebar shell', () => {
  it('uses the real Kerf logo and keeps the subtitle outside the toolbar identity', async () => {
    const source = await readFile(
      resolve(import.meta.dirname, '../../ux-demo/main.tsx'),
      'utf8',
    );

    // `?no-inline` keeps the logo an emitted file URL — kerf's URL screening drops
    // a script-capable `data:image/svg+xml` src, so the mark must not be inlined.
    expect(source).toMatch(
      /const kerfLogoUrl = new URL\(\s*'\.\.\/\.\.\/assets\/logo\.svg\?no-inline',\s*import\.meta\.url,?\s*\)\s*\.href;/,
    );
    // The shell is the reusable @kerfjs/ui/catalog Catalog; it renders the logo,
    // title, and subtitle from the brand prop (the subtitle stays outside the
    // toolbar identity by Catalog's own construction).
    expect(source).toMatch(
      /brand=\{\{\s*title: 'Kerf',\s*subtitle: 'UI components',\s*logoUrl: kerfLogoUrl,?\s*\}\}/,
    );
    expect(source).not.toContain(
      '<span class="catalog-mark" aria-hidden="true">K</span>',
    );
  });

  it('sets the brand favicon from an emitted file URL that resolves in dev and build', async () => {
    const source = await readFile(
      resolve(import.meta.dirname, '../../ux-demo/main.tsx'),
      'utf8',
    );
    // From JS via `new URL(..., import.meta.url)` — like the logo — so it resolves
    // on the dev server too, unlike a static `../../` link in index.html which the
    // browser normalizes to a path outside the demo root.
    expect(source).toMatch(
      /faviconLink\.href = new URL\(\s*'\.\.\/\.\.\/assets\/favicon\.svg\?no-inline',\s*import\.meta\.url,?\s*\)\s*\.href;/,
    );
    expect(source).toContain("faviconLink.rel = 'icon';");
  });

  it('serves the repo-owned logo in development and builds relative asset URLs for nested preview paths', async () => {
    const source = await readFile(
      resolve(import.meta.dirname, '../../ux-demo/vite.config.ts'),
      'utf8',
    );

    expect(source).toContain("base: './'");
    expect(source).toContain(
      "fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] }",
    );
  });

  it('leaves the shell layout to Workbench: no Catalog grid, viewport breakpoint, or phone-only navigation layout', async () => {
    const dir = resolve(import.meta.dirname, '../../src/catalog/components');
    for (const name of ['catalog.css', 'catalog-stage.css']) {
      const file = resolve(dir, name);
      const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
      root.walkAtRules('media', (rule) => {
        throw new Error(`${name} has a viewport media query: ${rule.params}`);
      });
      root.walkDecls((decl) => {
        expect(decl.prop, `${name} ${decl.parent}`).not.toMatch(
          /^grid-template-columns$/,
        );
      });
    }
  });
});
