import { describe, expect, it } from 'vitest';

import { ColumnTrack } from '../../src/components/layout/column-track/column-track.js';
import { px } from '../../src/shared/styles/css-values.js';

describe('ColumnTrack', () => {
  it('renders a scroll track around its columns by default', () => {
    expect(String(ColumnTrack({ children: <section /> }))).toBe(
      '<div class="kui-column-track" data-component="column-track" data-layout="scroll"><div class="kui-column-track__columns"><section></section></div></div>',
    );
  });

  it('carries paged layout, sizing, and safe root metadata', () => {
    const html = String(
      ColumnTrack({
        children: <section />,
        layout: 'paged',
        minColumnWidth: px(280),
        peek: px(32),
        id: 'board',
        className: 'tickets',
        slot: 'body',
        rootAttributes: {
          'aria-label': 'Board',
          'data-layout': 'scroll',
        } as unknown as Record<`data-${string}`, string>,
      }),
    );
    expect(html).toContain(
      'aria-label="Board" id="board" class="kui-column-track tickets" data-component="column-track" data-layout="paged" style="--_kui-column-track-min-width:280px;--_kui-column-track-peek:32px" slot="body"',
    );
  });
});
