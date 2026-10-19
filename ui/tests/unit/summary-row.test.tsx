import { describe, expect, it } from 'vitest';

import { SummaryRow } from '../../src/components/collections/summary-row/summary-row.js';

describe('SummaryRow', () => {
  it('renders an unselected row option with only the title zone by default', () => {
    expect(String(SummaryRow({ title: <span>Fix it</span> }))).toBe(
      '<div class="kui-summary-row" data-component="summary-row" data-presentation="row" role="option" tabindex="0" aria-selected="false">' +
        '<div class="kui-summary-row__body"><div class="kui-summary-row__content"><div class="kui-summary-row__title"><span>Fix it</span></div></div></div></div>',
    );
  });

  it('renders every zone and state', () => {
    const html = String(
      SummaryRow({
        title: <span>Fix it</span>,
        leading: <svg />,
        trailingMeta: '2m',
        metadata: <span>Started</span>,
        presentation: 'card',
        titleLines: 3,
        rail: 'warning',
        selected: true,
        dimmed: true,
        listEdge: 'only',
        deferRendering: true,
        ariaLabel: 'KF-12 Fix it',
        id: 'kf-12',
        className: 'ticket',
        rootAttributes: {
          'data-item-id': 'KF-12',
          'data-selected': 'false',
        } as unknown as Record<`data-${string}`, string>,
      }),
    );
    expect(html).toContain(
      'data-item-id="KF-12" id="kf-12" class="kui-summary-row ticket" data-component="summary-row" data-presentation="card" data-list-edge="only" data-rail="warning" data-selected="true" data-dimmed="true" data-defer="true" role="option" tabindex="0" aria-selected="true" aria-label="KF-12 Fix it" style="--_kui-summary-row-title-lines:3"',
    );
    expect(html).toContain(
      '<span class="kui-summary-row__rail" aria-hidden="true"></span>',
    );
    expect(html).toContain(
      '<span class="kui-summary-row__leading"><svg></svg></span>',
    );
    expect(html).toContain(
      '<span class="kui-summary-row__trailing">2m</span><span>Fix it</span>',
    );
    expect(html).toContain(
      '<div class="kui-summary-row__metadata"><span>Started</span></div>',
    );
  });

  it('rejects a title line budget that is not a positive integer', () => {
    for (const titleLines of [0, 1.5, -1])
      expect(() => SummaryRow({ title: <span />, titleLines })).toThrow(
        RangeError,
      );
  });

  it('renders a labeled static group with a nested native action and visual selection only', () => {
    const html = String(
      SummaryRow({
        semanticRole: 'group',
        ariaLabel: 'Unreadable ticket',
        title: <button type="button">Open</button>,
        presentation: 'card',
        rail: 'danger',
        selected: true,
        listEdge: 'only',
      }),
    );
    expect(html).toContain('role="group" aria-label="Unreadable ticket"');
    expect(html).not.toContain('aria-selected');
    expect(html).not.toContain('tabindex=');
    expect(html).toContain('data-selected="true"');
    expect(html).toContain('data-rail="danger"');
    expect(html).toContain('data-list-edge="only"');
    expect(html).toContain('<button type="button">Open</button>');
  });

  it('keeps the native drag attribute on row and card options with selection identity', () => {
    for (const presentation of ['row', 'card'] as const) {
      const html = String(
        SummaryRow({
          title: <span>Ticket</span>,
          presentation,
          draggable: true,
          selected: true,
          rootAttributes: { 'data-item-id': 'KF-12' },
        }),
      );
      expect(html).toContain(
        'role="option" draggable="true" tabindex="0" aria-selected="true"',
      );
      expect(html).toContain('data-item-id="KF-12"');
      expect(html).toContain(`data-presentation="${presentation}"`);
    }
    expect(
      String(SummaryRow({ title: <span>Ticket</span>, draggable: false })),
    ).toContain('draggable="false"');
    expect(String(SummaryRow({ title: <span>Ticket</span> }))).not.toContain(
      'draggable=',
    );
  });
});
