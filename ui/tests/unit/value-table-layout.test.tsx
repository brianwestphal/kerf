import { describe, expect, it } from 'vitest';

import { ValueTable } from '../../src/components/data-display/value-table/value-table.js';
import { px } from '../../src/shared/styles/css-values.js';

const rows = <div />;

describe('ValueTable layout props', () => {
  it('defaults to columns without a label width or a stacking container', () => {
    const html = String(ValueTable({ label: 'Facts', children: rows }));
    expect(html).toContain(
      'data-density="default" data-presentation="columns"',
    );
    expect(html).not.toContain('data-stack-below');
    expect(html).not.toContain('data-label-width');
    expect(html).not.toContain('style=');
  });

  it('carries labelWidth, stacked presentation, and stackBelow', () => {
    const html = String(
      ValueTable({
        label: 'Connection',
        labelWidth: px(160),
        presentation: 'stacked',
        stackBelow: 'compact',
        children: rows,
      }),
    );
    expect(html).toContain(
      'data-presentation="stacked" data-stack-below="compact" data-label-width="" style="--_kui-value-table-label-min:160px"',
    );
  });
});
