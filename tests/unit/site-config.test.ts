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
});
