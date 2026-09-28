import { describe, expect, it } from 'vitest';

import { CatalogExample } from '../../src/catalog.js';

describe('Catalog example alignment', () => {
  it('insets a CatalogExample note with ListInsetText so its text edge lines up with the ListHeader label and a content-item component', () => {
    const html = String(CatalogExample({ label: 'Label', note: 'A note.' }));
    // ListInsetText owns the 8px margin + 1px border + 8px padding (17px)
    // inline inset; the note carries no geometry of its own.
    expect(html).toMatch(
      /data-component="list-inset-text" data-sides="rl"[^>]*>\s*<span class="kui-text[^"]*"[^>]*data-tone="quiet" data-size="compact"/,
    );
  });
});
