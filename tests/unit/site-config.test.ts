import { existsSync, readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

interface SiteConfig {
  redirects?: Record<string, string>;
}

describe('site config', () => {
  it('defines one normalized legacy redirect for the renamed raw-sanitize example', async () => {
    const configUrl = pathToFileURL(`${cwd()}/site/astro.config.mjs`).href;
    const { default: config } = (await import(configUrl)) as { default: SiteConfig };
    const redirects = Object.entries(config.redirects ?? {});
    const legacyRedirects = redirects.filter(
      ([from]) => from.replace(/\/$/, '') === '/examples/basics/09-raw-sanitise',
    );

    expect(legacyRedirects).toEqual([
      ['/examples/basics/09-raw-sanitise', '/kerf/examples/basics/09-raw-sanitize/'],
    ]);
  });

  it('keeps the public site on Astro and does not publish the in-progress UI package', () => {
    const sitePackage = JSON.parse(readFileSync(`${cwd()}/site/package.json`, 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const astroConfig = readFileSync(`${cwd()}/site/astro.config.mjs`, 'utf8');
    const installPolicy = readFileSync(
      `${cwd()}/site/scripts/check-install-script-policy.mjs`,
      'utf8',
    );

    expect(sitePackage.dependencies).toHaveProperty('astro');
    expect(sitePackage.dependencies).toHaveProperty('@astrojs/starlight');
    expect(sitePackage.dependencies).not.toHaveProperty('@kerfjs/ui');
    expect(astroConfig).not.toContain("slug: 'docs/ui-package'");
    expect(existsSync(`${cwd()}/site/src/content/docs/docs/ui-package.md`)).toBe(false);
    expect(installPolicy).toContain("path.startsWith('node_modules/') && entry.hasInstallScript");
  });

  it('gates the complete site build tree on high and critical dependency advisories', () => {
    const sitePackage = JSON.parse(readFileSync(`${cwd()}/site/package.json`, 'utf8')) as {
      scripts: Record<string, string>;
    };
    const ciWorkflow = readFileSync(`${cwd()}/.github/workflows/ci.yml`, 'utf8');

    expect(sitePackage.scripts['check:audit']).toBe(
      'npm audit --include=dev --audit-level=high',
    );
    expect(ciWorkflow).toContain(
      [
        '- name: Audit all site build dependencies (high and critical)',
        '        working-directory: site',
        '        run: npm run --silent check:audit',
      ].join('\n'),
    );
  });
});
