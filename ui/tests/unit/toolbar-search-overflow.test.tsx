import { describe, expect, it } from 'vitest';

import { ToolbarControlGroup } from '../../src/components/actions/toolbar-control-group/toolbar-control-group.js';
import { Text } from '../../src/components/typography/text/text.js';

describe('ToolbarControlGroup expanded search overflow', () => {
  it('preserves default markup and projects the explicit opt-in independently of expansion', () => {
    for (const expanded of [false, true]) {
      for (const expandedOverflow of [undefined, 'clip'] as const) {
        expect(
          String(
            ToolbarControlGroup({
              children: Text({ children: 'Search' }),
              content: 'search',
              expanded,
              expandedOverflow,
            }),
          ),
        ).not.toContain('data-expanded-overflow');
      }
      const html = String(
        ToolbarControlGroup({
          children: Text({ children: 'Search' }),
          content: 'search',
          expanded,
          expandedOverflow: 'visible',
        }),
      );
      expect(html).toContain('data-expanded-overflow="visible"');
      expect(html).toContain(`data-expanded="${expanded}"`);
      expect(html).not.toContain('expandedOverflow=');
    }
  });
  it('retains anchored application content alongside a busy search without changing its ownership', () => {
    const html = String(
      ToolbarControlGroup({
        children: (
          <section data-token-search-keep-open>
            <button type="button">Choose date</button>
          </section>
        ),
        content: 'search',
        expanded: true,
        expandedOverflow: 'visible',
        busy: true,
      }),
    );
    expect(html).toContain('data-token-search-keep-open');
    expect(html).toContain('inert');
    expect(html).toContain('role="status"');
  });
});
