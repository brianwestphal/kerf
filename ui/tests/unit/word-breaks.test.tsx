import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { ListActionRow } from '../../src/components/collections/list-action-row/list-action-row.js';
import { ListItem } from '../../src/components/collections/list-item/list-item.js';
import { withWordBreaks } from '../../src/shared/text/word-breaks.js';

const html = (value: unknown) => String(value);

describe('withWordBreaks', () => {
  it('adds a break opportunity at each camelCase and acronym boundary', () => {
    expect(html(withWordBreaks('QuickTicketComposer'))).toBe(
      'Quick<wbr>Ticket<wbr>Composer',
    );
    expect(html(withWordBreaks('HTMLParserV2Beta'))).toBe(
      'HTML<wbr>Parser<wbr>V2<wbr>Beta',
    );
    expect(html(withWordBreaks('ticketBoardColumn'))).toBe(
      'ticket<wbr>Board<wbr>Column',
    );
  });

  it('leaves labels without a boundary, SafeHtml, and text escaping alone', () => {
    expect(withWordBreaks('Settings')).toBe('Settings');
    expect(withWordBreaks('two words')).toBe('two words');
    const markup = raw('<b>BoldName</b>');
    expect(withWordBreaks(markup)).toBe(markup);
    expect(html(withWordBreaks('a<bTag'))).toBe('a&lt;b<wbr>Tag');
  });
});

describe('multiline rows break long names at word boundaries', () => {
  it('ListItem adds break opportunities only when multiline', () => {
    const host = document.createElement('div');
    host.innerHTML = html(
      ListItem({
        action: 'open',
        label: 'QuickTicketComposer',
        multiline: true,
      }),
    );
    const label = host.querySelector('.kui-list-item__primary-label')!;
    expect(label.innerHTML).toBe('Quick<wbr>Ticket<wbr>Composer');
    // The text, and so the accessible name, is unchanged.
    expect(label.textContent).toBe('QuickTicketComposer');
    expect(
      html(ListItem({ action: 'open', label: 'QuickTicketComposer' })),
    ).not.toContain('<wbr>');
  });

  it('ListActionRow adds break opportunities only when multiline', () => {
    const multiline = html(
      ListActionRow({
        label: 'TicketBoardColumn',
        multiline: true,
        action: 'open',
        trailingAction: 'more',
        trailingActionLabel: 'More',
        trailingActionIcon: raw('<svg></svg>'),
      }),
    );
    expect(multiline).toContain('Ticket<wbr>Board<wbr>Column');
    expect(
      html(
        ListActionRow({
          label: 'TicketBoardColumn',
          action: 'open',
          trailingAction: 'more',
          trailingActionLabel: 'More',
          trailingActionIcon: raw('<svg></svg>'),
        }),
      ),
    ).not.toContain('<wbr>');
  });
});
