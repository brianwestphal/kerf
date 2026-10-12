import { describe, expect, it } from 'vitest';

import {
  FramedList,
  FramedListRow,
} from '../../src/components/collections/framed-list/framed-list.js';

describe('FramedList', () => {
  it('renders a labeled list of rows on the lowered surface by default', () => {
    const html = String(
      FramedList({
        label: 'Keyboard shortcuts',
        children: [
          FramedListRow({ children: <span>New ticket</span> }),
          FramedListRow({ children: <span>Search</span>, highlighted: true }),
        ],
      }),
    );
    expect(html).toBe(
      '<ul class="kui-framed-list" data-component="framed-list" data-surface="lowered" role="list" aria-label="Keyboard shortcuts">' +
        '<li class="kui-framed-list__row" data-component="framed-list-row"><span>New ticket</span></li>' +
        '<li class="kui-framed-list__row" data-component="framed-list-row" data-highlighted="true"><span>Search</span></li>' +
        '</ul>',
    );
  });

  it('forwards ids, classes, slot, surface, and safe metadata only', () => {
    const html = String(
      FramedList({
        id: 'accounts',
        className: 'settings',
        surface: 'base',
        slot: 'body',
        rootAttributes: {
          'data-section': 'accounts',
          'data-surface': 'raised',
        } as unknown as Record<`data-${string}`, string>,
        children: FramedListRow({
          id: 'github',
          className: 'account',
          rootAttributes: {
            'data-account': 'github',
            'data-highlighted': 'true',
          } as unknown as Record<`data-${string}`, string>,
          children: <span>GitHub</span>,
        }),
      }),
    );
    expect(html).toContain(
      'data-section="accounts" id="accounts" class="kui-framed-list settings" data-component="framed-list" data-surface="base"',
    );
    expect(html).toContain('slot="body"');
    expect(html).not.toContain('raised');
    expect(html).toContain(
      'data-account="github" id="github" class="kui-framed-list__row account"',
    );
    expect(html).not.toContain('data-highlighted');
  });
});
