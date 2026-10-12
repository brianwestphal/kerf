import { MoreHorizontal } from 'lucide';
import { describe, expect, it } from 'vitest';

import {
  openPopupMenuAt,
  type PopupMenuElement,
} from '../../src/components/actions/popup-menu/popup-menu.js';
import { ListActionRow } from '../../src/components/collections/list-action-row/list-action-row.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';

const icon = <LucideIcon icon={MoreHorizontal} name="more-horizontal" />;

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
    label: 'Run tests',
    action: 'select-command',
    itemId: 'run-tests',
    trailingActionVisibility: 'interaction',
    trailingMenu: {
      label: 'Actions for Run tests',
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
    expect(menu.localName).toBe('wa-dropdown');
    expect(menu.dataset.component).toBe('popup-menu');
    expect(menu.dataset.trigger).toBe('button');
    expect(menu.getAttribute('placement')).toBe('bottom-end');
    expect(row.querySelector('.kui-list-action-row__trailing-action')).toBe(
      null,
    );
    const trigger = menu.querySelector('wa-button[slot="trigger"]')!;
    expect(trigger.hasAttribute('with-caret')).toBe(false);
    expect(trigger.hasAttribute('disabled')).toBe(false);
    expect(trigger.querySelector('.kui-popup-menu__label')?.textContent).toBe(
      'Actions for Run tests',
    );
    expect(trigger.querySelector('svg')).not.toBe(null);
    const items = [...menu.querySelectorAll('wa-dropdown-item')];
    expect(items.map((item) => item.getAttribute('data-action'))).toEqual([
      'edit-command',
      'delete-command',
    ]);
    expect(items[1]?.getAttribute('variant')).toBe('danger');
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
    expect(menu.getAttribute('placement')).toBe('top-end');
    expect(menu.querySelector('wa-button')?.hasAttribute('disabled')).toBe(
      true,
    );

    const placeholder = renderRow(commandRow({ placeholder: true }));
    expect(
      placeholder
        .querySelector('[data-component="popup-menu"] wa-button')
        ?.hasAttribute('disabled'),
    ).toBe(true);

    const button = renderRow(
      ListActionRow({
        label: 'File',
        action: 'select-file',
        trailingAction: 'file-actions',
        trailingActionLabel: 'File actions',
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

describe('openPopupMenuAt on a button-triggered PopupMenu', () => {
  type FakePopup = HTMLElement & { anchor?: unknown; placement: string };

  const upgradedMenu = () => {
    const row = renderRow(commandRow());
    const menu = row.querySelector<PopupMenuElement>(
      '[data-component="popup-menu"]',
    )!;
    const popup = document.createElement('wa-popup') as FakePopup;
    popup.placement = 'bottom-end';
    menu.attachShadow({ mode: 'open' }).append(popup);
    return { menu, popup };
  };

  it('anchors the popup at the point bottom-start for one opening, then restores the trigger anchor and placement', () => {
    const { menu, popup } = upgradedMenu();
    openPopupMenuAt(menu, 40, 60);
    expect(menu.open).toBe(true);
    const anchor = popup.anchor as { getBoundingClientRect(): DOMRect };
    const rect = anchor.getBoundingClientRect();
    expect([rect.x, rect.y, rect.width, rect.height]).toEqual([40, 60, 0, 0]);
    expect(popup.placement).toBe('bottom-start');

    // A bubbling hide from a descendant is not the menu's own.
    menu
      .querySelector('wa-dropdown-item')!
      .dispatchEvent(new Event('wa-after-hide', { bubbles: true }));
    expect(popup.anchor).toBe(anchor);

    // Reopening while open replaces, rather than stacks, the restoration.
    openPopupMenuAt(menu, 80, 90);
    const second = popup.anchor as { getBoundingClientRect(): DOMRect };
    expect(second.getBoundingClientRect().x).toBe(80);

    menu.dispatchEvent(new Event('wa-after-hide'));
    expect(popup.anchor).toBeUndefined();
    expect(popup.placement).toBe('bottom-end');

    // The restoration runs once; a later trigger opening keeps its anchor.
    popup.anchor = 'kept';
    menu.dispatchEvent(new Event('wa-after-hide'));
    expect(popup.anchor).toBe('kept');
  });

  it('opens at the trigger before Web Awesome upgrades the menu', () => {
    const row = renderRow(commandRow());
    const menu = row.querySelector<PopupMenuElement>(
      '[data-component="popup-menu"]',
    )!;
    openPopupMenuAt(menu, 10, 20);
    expect(menu.open).toBe(true);
  });

  it('falls back to bottom-start when the menu has no placement attribute', () => {
    const { menu, popup } = upgradedMenu();
    menu.removeAttribute('placement');
    openPopupMenuAt(menu, 1, 2);
    menu.dispatchEvent(new Event('wa-after-hide'));
    expect(popup.placement).toBe('bottom-start');
  });
});
