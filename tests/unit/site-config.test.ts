import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cwd, execPath } from 'node:process';

import { describe, expect, it } from 'vitest';

import { redirects } from '../../site/redirects.mjs';

describe('site config', () => {
  it('defines one normalized legacy redirect for the renamed raw-sanitize example', () => {
    const legacyRedirects = Object.entries(redirects).filter(
      ([from]) =>
        from.replace(/\/$/, '') === '/examples/basics/09-raw-sanitise',
    );

    expect(legacyRedirects).toEqual([
      [
        '/examples/basics/09-raw-sanitise',
        '/kerf/examples/basics/09-raw-sanitize/',
      ],
    ]);

    const astroConfig = readFileSync(`${cwd()}/site/astro.config.mjs`, 'utf8');
    expect(astroConfig).toContain(
      "import { redirects } from './redirects.mjs';",
    );
    expect(astroConfig).toMatch(/\n {2}redirects,\n/);
  });

  it('loads the redirect contract in a clean environment without site dependencies', () => {
    const cleanRoot = mkdtempSync(join(tmpdir(), 'kerf-site-config-'));
    try {
      copyFileSync(
        `${cwd()}/site/redirects.mjs`,
        join(cleanRoot, 'redirects.mjs'),
      );

      const output = execFileSync(
        execPath,
        [
          '--input-type=module',
          '--eval',
          "import { redirects } from './redirects.mjs'; process.stdout.write(JSON.stringify(redirects));",
        ],
        { cwd: cleanRoot, encoding: 'utf8' },
      );

      expect(existsSync(join(cleanRoot, 'node_modules'))).toBe(false);
      expect(JSON.parse(output)).toEqual(redirects);
    } finally {
      rmSync(cleanRoot, { recursive: true, force: true });
    }
  });

  it('keeps the public site on Astro and does not publish the in-progress UI package', () => {
    const sitePackage = JSON.parse(
      readFileSync(`${cwd()}/site/package.json`, 'utf8'),
    ) as {
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
    expect(
      existsSync(`${cwd()}/site/src/content/docs/docs/ui-package.md`),
    ).toBe(false);
    expect(installPolicy).toContain(
      "path.startsWith('node_modules/') && entry.hasInstallScript",
    );
  });

  it('gates the complete site build tree on high and critical dependency advisories', () => {
    const sitePackage = JSON.parse(
      readFileSync(`${cwd()}/site/package.json`, 'utf8'),
    ) as {
      scripts: Record<string, string>;
    };
    const ciWorkflow = readFileSync(
      `${cwd()}/.github/workflows/ci.yml`,
      'utf8',
    );

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
