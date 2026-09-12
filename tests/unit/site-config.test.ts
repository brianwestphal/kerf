import { describe, expect, it } from 'vitest';

import { LEGACY_REDIRECTS } from '../../site/scripts/lib/site-content.mjs';

describe('site config', () => {
  it('defines one normalized legacy redirect for the renamed raw-sanitize example', () => {
    expect(LEGACY_REDIRECTS).toEqual({
      '/examples/basics/09-raw-sanitise/': '/kerf/examples/basics/09-raw-sanitize/',
    });
  });
});
