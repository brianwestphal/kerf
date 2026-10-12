import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { ListActionRow } from '../../src/components/collections/list-action-row/list-action-row.js';
import {
  ListItem,
  ListItemLink,
} from '../../src/components/collections/list-item/list-item.js';

function render(html: unknown) {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host.firstElementChild as HTMLElement;
}

type ActionRowProps = Parameters<typeof ListActionRow>[0];

const actionRow = (props: Partial<ActionRowProps>) =>
  ListActionRow({
    label: 'Row',
    action: 'select',
    trailingAction: 'more',
    trailingActionLabel: 'More',
    trailingActionIcon: raw('<svg></svg>'),
    ...props,
  } as ActionRowProps);

describe('list row reorder props', () => {
  it.each([
    [
      'ListItem',
      (props: object) => ListItem({ label: 'Row', action: 'a', ...props }),
    ],
    [
      'ListItemLink',
      (props: object) => ListItemLink({ label: 'Row', href: '#', ...props }),
    ],
    ['ListActionRow', (props: object) => actionRow(props)],
  ])(
    '%s renders draggable, dragging, and drop position on its root',
    (_, make) => {
      const plain = render(make({}));
      expect(plain.hasAttribute('draggable')).toBe(false);
      expect(plain.hasAttribute('data-dragging')).toBe(false);
      expect(plain.hasAttribute('data-drop-position')).toBe(false);

      const dragged = render(make({ draggable: true, dragging: true }));
      expect(dragged.getAttribute('draggable')).toBe('true');
      expect(dragged.dataset.dragging).toBe('true');

      expect(render(make({ draggable: false })).getAttribute('draggable')).toBe(
        'false',
      );
      expect(
        render(make({ dropPosition: 'before' })).dataset.dropPosition,
      ).toBe('before');
      expect(render(make({ dropPosition: 'after' })).dataset.dropPosition).toBe(
        'after',
      );
    },
  );

  it.each([
    [
      'ListItem',
      (props: object) => ListItem({ label: 'Row', action: 'a', ...props }),
    ],
    ['ListActionRow', (props: object) => actionRow(props)],
  ])('%s placeholder is never draggable', (_, make) => {
    expect(
      render(make({ draggable: true, placeholder: true })).getAttribute(
        'draggable',
      ),
    ).toBe('false');
  });

  it('protects the reorder attributes from rootAttributes', () => {
    const attributes = {
      'data-dragging': 'spoof',
      'data-drop-position': 'spoof',
      'data-domain': 'kept',
    } as never;
    for (const element of [
      render(
        ListItem({ label: 'Row', action: 'a', rootAttributes: attributes }),
      ),
      render(actionRow({ rootAttributes: attributes })),
    ]) {
      expect(element.hasAttribute('data-dragging')).toBe(false);
      expect(element.hasAttribute('data-drop-position')).toBe(false);
      expect(element.dataset.domain).toBe('kept');
    }
  });
});
