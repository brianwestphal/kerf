import { Ellipsis } from 'lucide';
import { describe, expect, it } from 'vitest';

import { ListActionRow } from '../../src/components/collections/list-action-row/list-action-row.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';

const icon = <LucideIcon icon={Ellipsis} name="ellipsis" />;

const renderRow = (html: unknown) => {
  document.body.innerHTML = String(html);
  return document.body.querySelector<HTMLElement>(
    '[data-component="list-action-row"]',
  )!;
};

const commandRow = (
  overrides: Partial<Parameters<typeof ListActionRow>[0]> = {},
) =>
  ListActionRow({
    label: 'Run Tests',
    action: 'select-command',
    itemId: 'run-tests',
    trailingActionVisibility: 'interaction',
    trailingMenu: {
      label: 'Actions for Run Tests',
      icon,
      items: [
        { label: 'Edit', action: 'edit-command' },
        { kind: 'divider' },
        { label: 'Delete', action: 'delete-command', tone: 'danger' },
      ],
    },
    ...overrides,
  } as Parameters<typeof ListActionRow>[0]);

describe('ListActionRow trailing menu', () => {
  it('renders a PopupMenu as the sibling trailing control in place of the trailing button', () => {
    const row = renderRow(commandRow());
    expect(row.dataset.trailingVisibility).toBe('interaction');
    const children = [...row.children];
    expect(children).toHaveLength(2);
    expect(children[0]?.className).toBe('kui-list-action-row__primary');
    expect(children[0]?.getAttribute('data-action')).toBe('select-command');
    const menu = children[1] as HTMLElement;
    expect(menu.className).toBe('kui-popup-menu');
    expect(menu.dataset.component).toBe('popup-menu');
    expect(menu.dataset.trigger).toBe('button');
    expect(menu.dataset.placement).toBe('bottom-end');
    expect(row.querySelector('.kui-list-action-row__trailing-action')).toBe(
      null,
    );
    const trigger = menu.querySelector<HTMLButtonElement>(
      ':scope > .kui-popup-menu__trigger',
    )!;
    expect(trigger.querySelector('.kui-popup-menu__caret')).toBe(null);
    expect(trigger.disabled).toBe(false);
    expect(trigger.querySelector('.kui-popup-menu__label')?.textContent).toBe(
      'Actions for Run Tests',
    );
    expect(trigger.querySelector('svg')).not.toBe(null);
    const items = [...menu.querySelectorAll('.kui-popup-menu__item')];
    expect(items.map((item) => item.getAttribute('data-action'))).toEqual([
      'edit-command',
      'delete-command',
    ]);
    expect(items[1]?.getAttribute('data-tone')).toBe('danger');
    // A delegated menu command resolves its row through the row root.
    expect(
      items[0]?.closest<HTMLElement>('[data-component="list-action-row"]')
        ?.dataset.itemId,
    ).toBe('run-tests');
  });

  it('honors placement, disables the trigger for a disabled menu or a placeholder row, and keeps the trailing button path unchanged', () => {
    const placed = renderRow(
      commandRow({
        trailingMenu: {
          label: 'Actions',
          icon,
          items: [{ label: 'Edit', action: 'edit' }],
          placement: 'top-end',
          disabled: true,
        },
      }),
    );
    const menu = placed.querySelector('[data-component="popup-menu"]')!;
    expect(menu.getAttribute('data-placement')).toBe('top-end');
    expect(
      menu.querySelector('.kui-popup-menu__trigger')?.hasAttribute('disabled'),
    ).toBe(true);

    const placeholder = renderRow(commandRow({ placeholder: true }));
    expect(
      placeholder
        .querySelector('[data-component="popup-menu"] .kui-popup-menu__trigger')
        ?.hasAttribute('disabled'),
    ).toBe(true);

    const button = renderRow(
      ListActionRow({
        label: 'File',
        action: 'select-file',
        trailingAction: 'file-actions',
        trailingActionLabel: 'File Actions',
        trailingActionIcon: icon,
      }),
    );
    expect(button.querySelector('[data-component="popup-menu"]')).toBe(null);
    expect(
      button
        .querySelector('.kui-list-action-row__trailing-action')
        ?.getAttribute('data-action'),
    ).toBe('file-actions');
  });

  it('accepts exactly one trailing control at the type level', () => {
    // @ts-expect-error A trailing menu replaces the trailing button.
    ListActionRow({
      label: 'Both',
      action: 'select',
      trailingMenu: { label: 'Actions', icon, items: [] },
      trailingAction: 'more',
    });
    // @ts-expect-error A row needs a trailing button or a trailing menu.
    ListActionRow({ label: 'Neither', action: 'select' });
  });
});
