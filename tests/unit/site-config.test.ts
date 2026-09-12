import { describe, expect, it } from 'vitest';

import { redirects } from '../../site/redirects.mjs';

describe('site config', () => {
  it('defines one normalized legacy redirect for the renamed raw-sanitize example', () => {
    const legacyRedirects = Object.entries(redirects).filter(
      ([from]) => from.replace(/\/$/, '') === '/examples/basics/09-raw-sanitise',
    );

    expect(legacyRedirects).toEqual([
      ['/examples/basics/09-raw-sanitise', '/kerf/examples/basics/09-raw-sanitize/'],
    ]);
  });
});
