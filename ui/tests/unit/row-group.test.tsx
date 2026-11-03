import { describe, expect, it } from 'vitest';

import { Row } from '../../src/components/layout/row/row.js';

// KF-7V2VGS: a Row of related controls can name itself as a group.
describe('Row ariaLabel', () => {
  it('names the row as a group only when labeled', () => {
    const labeled = String(
      Row({
        ariaLabel: 'Filter Suggestions',
        rootAttributes: { 'data-search-field-keep-open': '' },
        children: 'x',
      }),
    );
    expect(labeled).toContain('role="group"');
    expect(labeled).toContain('aria-label="Filter Suggestions"');
    expect(labeled).toContain('data-search-field-keep-open=""');
    expect(String(Row({ children: 'x' }))).not.toContain('role=');
  });
});
