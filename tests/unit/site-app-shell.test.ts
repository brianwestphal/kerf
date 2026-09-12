import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

describe('documentation site application shell', () => {
  it('server-renders @kerfjs/ui search and showcase surfaces', () => {
    const search = readFileSync(join(cwd(), 'site/src/scripts/search.tsx'), 'utf8');
    const showcase = readFileSync(join(cwd(), 'site/src/scripts/showcase.tsx'), 'utf8');

    expect(search).toContain("from '@kerfjs/ui'");
    expect(search).toContain('<MenuItem');
    expect(search).toContain('<Toolbar');
    expect(search).toContain('Search the Kerf handbook');
    expect(showcase).toContain('<SegmentedControl');
    expect(showcase).toContain('<StateBanner');
    expect(showcase).toContain('ValueTable({');
  });

  it('keeps Pagefind behind a cached dynamic import', () => {
    const source = readFileSync(join(cwd(), 'site/src/scripts/search.tsx'), 'utf8');

    expect(source).toContain('pagefindPromise ??= import(');
    expect(source).toContain('pagefind/pagefind.js');
    expect(source).toMatch(/async function runSearch[\s\S]*await loadPagefind\(\)/);
  });

  it('uses one Kerf UI shell for static rendering and client routing', () => {
    const view = readFileSync(join(cwd(), 'site/src/scripts/site-view.tsx'), 'utf8');
    const client = readFileSync(join(cwd(), 'site/src/scripts/site.tsx'), 'utf8');
    const renderer = readFileSync(join(cwd(), 'site/scripts/render-site.tsx'), 'utf8');

    expect(view).toContain("from '@kerfjs/ui'");
    expect(view).toContain('<MenuHeader');
    expect(view).toContain('<MenuItem');
    expect(view).toContain('<PageHeader');
    expect(client).toContain("from 'kerfjs/router'");
    expect(renderer).toContain('renderSiteDocument');
  });

  it('audits dependency install scripts without counting the site preinstall itself', () => {
    const policy = readFileSync(join(cwd(), 'site/scripts/check-install-script-policy.mjs'), 'utf8');

    expect(policy).toContain("path.startsWith('node_modules/') && entry.hasInstallScript");
  });
});
