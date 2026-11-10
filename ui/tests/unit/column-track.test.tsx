import { describe, expect, it } from 'vitest';

import { ColumnTrack } from '../../src/components/layout/column-track/column-track.js';
import { px } from '../../src/shared/styles/css-values.js';

describe('ColumnTrack', () => {
  it('renders a scroll track around its columns by default', () => {
    expect(String(ColumnTrack({ children: <section /> }))).toBe(
      '<div class="kui-column-track" data-component="column-track" data-layout="scroll"><div class="kui-column-track__columns"><section></section></div></div>',
    );
  });

  it('opts out of inline edge clearance without changing column insets', () => {
    expect(
      String(ColumnTrack({ children: <section />, inset: 'none' })),
    ).toContain('data-inset="none"');
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
  it('names the track as a region with ariaLabel, owning its role and name', () => {
    const html = String(
      ColumnTrack({
        children: <section />,
        ariaLabel: 'Board',
        rootAttributes: {
          role: 'group',
          'aria-label': 'Overridden',
          'aria-busy': 'true',
          'data-board': 'tickets',
        },
      }),
    );
    expect(html).toContain(
      'data-board="tickets" aria-busy="true" role="region" aria-label="Board" class="kui-column-track"',
    );
    expect(html).not.toContain('Overridden');
    expect(html).not.toContain('role="group"');
    // Without a name the track keeps rootAttributes' structural metadata.
    expect(
      String(
        ColumnTrack({
          children: <section />,
          ariaLabel: '',
          rootAttributes: { role: 'group', 'aria-label': 'Columns' },
        }),
      ),
    ).toContain('role="group" aria-label="Columns" class="kui-column-track"');
  });
});
