import { mount, signal } from 'kerfjs';
import { ArrowDownAZ, Copy } from 'lucide';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  POPUP_MENU_CLOSE_EVENT,
  POPUP_MENU_OPEN_EVENT,
} from '../../src/components/actions/popup-menu/internal/popup-menu-events.js';
import {
  closePopupMenu,
  openPopupMenu,
  openPopupMenuAt,
  PopupMenu,
  type PopupMenuElement,
  type PopupMenuEntry,
} from '../../src/components/actions/popup-menu/popup-menu.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';

const asHtml = (value: unknown) => String(value);

const render = (html: string) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstElementChild as HTMLElement;
};

const items = (
  root: Element,
  menu = root.querySelector(':scope > .kui-popup-menu__menu')!,
) =>
  [...menu.querySelectorAll<HTMLElement>('.kui-popup-menu__item')].filter(
    (item) => item.closest('.kui-popup-menu__menu') === menu,
  );

const label = (item: Element) =>
  item.querySelector('.kui-popup-menu__item-label')?.textContent;

afterEach(() => {
  document.body.replaceChildren();
});

describe('PopupMenu markup', () => {
  it('renders nested checkbox choices, plain commands, disabled reasons, and danger tone', () => {
    const menu = render(
      asHtml(
        PopupMenu({
          text: 'Actions',
          items: [
            { label: 'Copy', action: 'copy' },
            {
              label: 'Decide',
              submenu: [
                { kind: 'heading', label: 'Review' },
                {
                  label: 'Approve',
                  action: 'decide',
                  checked: true,
                  attributes: { 'data-decision': 'approve' },
                },
                { kind: 'divider' },
                {
                  label: 'Reject',
                  action: 'decide',
                  tone: 'danger',
                  disabled: true,
                  disabledReason: 'Needs a price',
                  attributes: { 'data-decision': 'reject' },
                },
              ],
            },
            { kind: 'divider' },
            { label: 'Newest First', action: 'sort', checked: true },
          ],
        }),
      ),
    );
    const host = menu.querySelector('.kui-popup-menu__submenu-host')!;
    expect(host.getAttribute('role')).toBe('none');
    const parent = host.querySelector(':scope > .kui-popup-menu__item')!;
    expect(label(parent)).toBe('Decide');
    expect(parent.getAttribute('aria-haspopup')).toBe('menu');
    expect(parent.getAttribute('aria-expanded')).toBe('false');
    expect(
      parent.querySelector('.kui-popup-menu__submenu-icon svg path'),
    ).not.toBe(null);
    const submenu = host.querySelector(':scope > .kui-popup-menu__menu')!;
    expect(submenu.getAttribute('role')).toBe('menu');
    expect(submenu.getAttribute('popover')).toBe('manual');
    expect(submenu.hasAttribute('data-submenu')).toBe(true);
    expect(submenu.getAttribute('aria-label')).toBe('Decide');
    expect([...submenu.children].map((child) => child.className)).toEqual([
      'kui-popup-menu__group',
      'kui-popup-menu__divider',
      'kui-popup-menu__item',
    ]);
    const group = submenu.querySelector('.kui-popup-menu__group')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Review');
    expect(
      group
        .querySelector('.kui-popup-menu__heading')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(
      submenu.querySelector('.kui-popup-menu__divider')?.getAttribute('role'),
    ).toBe('separator');
    const [approve, reject] = items(menu, submenu);
    expect(approve!.getAttribute('role')).toBe('menuitemcheckbox');
    expect(approve!.getAttribute('aria-checked')).toBe('true');
    expect(approve!.getAttribute('data-decision')).toBe('approve');
    expect(approve!.querySelector('.kui-popup-menu__check svg')).not.toBe(null);
    expect(reject!.getAttribute('role')).toBe('menuitem');
    expect(reject!.getAttribute('data-tone')).toBe('danger');
    expect(reject!.getAttribute('title')).toBe('Needs a price');
    expect(reject!.getAttribute('aria-disabled')).toBe('true');
    // A plain command in a level with a choice keeps an empty check column.
    expect(
      reject!.querySelector('.kui-popup-menu__check')?.children,
    ).toHaveLength(0);
    const top = items(menu);
    expect(top.map(label)).toEqual(['Copy', 'Decide', 'Newest First']);
    expect(top[2]!.getAttribute('aria-checked')).toBe('true');
    expect(top[0]!.getAttribute('role')).toBe('menuitem');
    expect(top[0]!.hasAttribute('aria-checked')).toBe(false);
  });

  it('reserves the check column only in levels that hold a choice', () => {
    const menu = render(
      asHtml(
        PopupMenu({
          text: 'Drive options',
          items: [
            { label: 'Default', action: 'default', checked: false },
            {
              label: 'Model',
              icon: <LucideIcon icon={Copy} name="model" />,
              submenu: [{ label: 'Other…', action: 'model-other' }],
            },
          ],
        }),
      ),
    );
    const [defaults, model] = items(menu);
    expect(defaults!.getAttribute('aria-checked')).toBe('false');
    // An unchecked choice still renders its glyph, hidden until checked.
    expect(defaults!.querySelector('.kui-popup-menu__check svg')).not.toBe(
      null,
    );
    expect(model!.querySelector('.kui-popup-menu__check')).not.toBe(null);
    const submenu = menu.querySelector('[data-submenu]')!;
    expect(
      items(menu, submenu)[0]!.querySelector('.kui-popup-menu__check'),
    ).toBe(null);
  });

  it('renders an icon-only trigger named by its label over typed commands', () => {
    const menu = render(
      asHtml(
        PopupMenu({
          label: 'Sort Tickets',
          icon: <LucideIcon icon={ArrowDownAZ} name="arrow-down-a-z" />,
          items: [
            { label: 'Recently Updated', action: 'sort-recent' },
            { label: 'Priority', action: 'sort-priority', value: 'priority' },
          ],
        }),
      ),
    );
    expect(menu.localName).toBe('span');
    expect(menu.className).toBe('kui-popup-menu');
    expect(menu.dataset.component).toBe('popup-menu');
    expect(menu.dataset.trigger).toBe('button');
    expect(menu.dataset.placement).toBe('bottom-start');
    // The register owns the open state, so the morph skips the children.
    expect(menu.hasAttribute('data-morph-skip-children')).toBe(true);
    const trigger = menu.querySelector<HTMLButtonElement>(
      ':scope > button.kui-popup-menu__trigger',
    )!;
    expect(trigger.type).toBe('button');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.querySelector('.kui-popup-menu__label')?.textContent).toBe(
      'Sort Tickets',
    );
    expect(trigger.querySelector('.kui-popup-menu__text')).toBe(null);
    expect(trigger.querySelector('[data-lucide="arrow-down-a-z"]')).not.toBe(
      null,
    );
    expect(trigger.querySelector('.kui-popup-menu__caret svg path')).not.toBe(
      null,
    );
    const panel = menu.querySelector(':scope > .kui-popup-menu__menu')!;
    expect(panel.getAttribute('aria-label')).toBe('Sort Tickets');
    expect(panel.hasAttribute('data-submenu')).toBe(false);
    const rows = items(menu);
    expect(rows.map(label)).toEqual(['Recently Updated', 'Priority']);
    expect(rows.map((item) => item.getAttribute('data-action'))).toEqual([
      'sort-recent',
      'sort-priority',
    ]);
    expect(rows.map((item) => item.getAttribute('tabindex'))).toEqual([
      '-1',
      '-1',
    ]);
    expect(rows[0]!.hasAttribute('value')).toBe(false);
    expect(rows[1]!.getAttribute('value')).toBe('priority');
  });

  it('renders visible trigger text, groups, dividers, item icons, and item metadata', () => {
    const menu = render(
      asHtml(
        PopupMenu({
          text: 'Components',
          icon: <LucideIcon icon={Copy} name="lead" />,
          placement: 'top-end',
          caret: false,
          disabled: true,
          slot: 'end',
          rootAttributes: { 'data-catalog-related': '' },
          items: [
            { kind: 'heading', label: 'Structure' },
            {
              label: 'Copy',
              icon: <LucideIcon icon={Copy} name="copy" />,
              details: <kbd>⌘C</kbd>,
              attributes: { 'data-item-id': 'copy' },
            },
            { kind: 'heading', label: 'Danger' },
            { kind: 'heading', label: 'Empty' },
            { kind: 'divider' },
            { label: 'Delete', disabled: true },
          ],
        }),
      ),
    );
    expect(menu.dataset.placement).toBe('top-end');
    expect(menu.getAttribute('slot')).toBe('end');
    expect(menu.hasAttribute('data-catalog-related')).toBe(true);
    const trigger = menu.querySelector<HTMLButtonElement>(
      '.kui-popup-menu__trigger',
    )!;
    expect(trigger.querySelector('.kui-popup-menu__text')?.textContent).toBe(
      'Components',
    );
    expect(trigger.querySelector('.kui-popup-menu__label')).toBe(null);
    expect(trigger.querySelector('.kui-popup-menu__caret')).toBe(null);
    expect(trigger.disabled).toBe(true);
    const panel = menu.querySelector(':scope > .kui-popup-menu__menu')!;
    expect([...panel.children].map((child) => child.className)).toEqual([
      'kui-popup-menu__group',
      'kui-popup-menu__group',
      'kui-popup-menu__group',
      'kui-popup-menu__divider',
      'kui-popup-menu__item',
    ]);
    const [structure, danger] = panel.querySelectorAll(
      '.kui-popup-menu__group',
    );
    expect(
      structure!.querySelector('.kui-popup-menu__heading')?.textContent,
    ).toBe('Structure');
    // A heading followed by another heading holds an empty group.
    expect(danger!.querySelectorAll('.kui-popup-menu__item')).toHaveLength(0);
    const [copy, remove] = items(menu);
    expect(copy!.getAttribute('data-item-id')).toBe('copy');
    expect(
      copy!.querySelector('.kui-popup-menu__icon [data-lucide="copy"]'),
    ).not.toBe(null);
    expect(
      copy!.querySelector('.kui-popup-menu__details kbd')?.textContent,
    ).toBe('⌘C');
    expect(remove!.getAttribute('aria-disabled')).toBe('true');
    expect(remove!.hasAttribute('title')).toBe(false);
  });

  it('renders a context anchor named by the menu, not the hidden anchor', () => {
    const menu = render(
      asHtml(
        PopupMenu({
          context: true,
          label: 'Ticket actions',
          items: [{ label: 'Open', action: 'open' }],
        }),
      ),
    );
    expect(menu.dataset.trigger).toBe('context');
    const anchor = menu.querySelector(
      ':scope > .kui-popup-menu__context-anchor',
    )!;
    expect(anchor.getAttribute('aria-hidden')).toBe('true');
    expect(anchor.getAttribute('tabindex')).toBe('-1');
    expect(menu.querySelector('.kui-popup-menu__trigger')).toBe(null);
    expect(
      menu
        .querySelector(':scope > .kui-popup-menu__menu')
        ?.getAttribute('aria-label'),
    ).toBe('Ticket actions');
  });

  it('renders a context anchor point that survives re-renders and replacement', () => {
    const point = signal({ x: 40, y: 60 });
    const checked = signal(false);
    const host = document.createElement('div');
    document.body.append(host);
    const dispose = mount(host, () =>
      PopupMenu({
        context: true,
        label: 'Ticket actions',
        anchor: point.value,
        items: [
          { label: 'Pin', action: 'pin', checked: checked.value },
          { label: 'Open', action: 'open' },
        ],
      }),
    );
    const menu = () =>
      host.querySelector<PopupMenuElement>('[data-component="popup-menu"]')!;
    const at = () => [
      menu().style.getPropertyValue('--kui-popup-menu-context-x'),
      menu().style.getPropertyValue('--kui-popup-menu-context-y'),
    ];
    expect(at()).toEqual(['40px', '60px']);
    // A changed item rebuilds the menu under a new content key; the anchor is
    // part of its template, so the replacement keeps the point.
    const before = menu();
    checked.value = true;
    expect(menu()).not.toBe(before);
    expect(at()).toEqual(['40px', '60px']);
    point.value = { x: 300, y: 12.5 };
    expect(at()).toEqual(['300px', '12.5px']);
    dispose();
  });

  it('rejects an anchor outside context mode or with non-finite coordinates', () => {
    const entries = [{ label: 'Open', action: 'open' }] as const;
    for (const anchor of [
      { x: Number.NaN, y: 0 },
      { x: 0, y: Number.POSITIVE_INFINITY },
    ])
      expect(() =>
        PopupMenu({ context: true, label: 'Menu', anchor, items: entries }),
      ).toThrow(RangeError);
    expect(() =>
      PopupMenu({
        text: 'Menu',
        anchor: { x: 1, y: 1 },
        items: entries,
      } as unknown as Parameters<typeof PopupMenu>[0]),
    ).toThrow(RangeError);
    // Without an anchor the root renders no style attribute.
    expect(
      asHtml(PopupMenu({ context: true, label: 'Menu', items: entries })),
    ).not.toContain('style=');
  });

  it('rebuilds the morph-skipped menu when its items change and keeps it otherwise', () => {
    const entries = signal<readonly PopupMenuEntry[]>([{ label: 'Inbox' }]);
    const placement = signal<'bottom-start' | 'top-end'>('bottom-start');
    const root = document.createElement('div');
    document.body.append(root);
    const stop = mount(root, () =>
      PopupMenu({
        text: 'View',
        items: entries.value,
        placement: placement.value,
      }),
    );
    const menu = () => root.querySelector<HTMLElement>('.kui-popup-menu')!;
    const first = menu();
    const firstKey = first.dataset.key;
    expect(firstKey).toMatch(/^kui-popup-menu-[0-9a-z]+$/);

    // A root attribute change morphs in place; the key and children stay.
    placement.value = 'top-end';
    expect(menu()).toBe(first);
    expect(menu().dataset.placement).toBe('top-end');

    // Equal items keep the key, so the live menu and its state survive.
    entries.value = [{ label: 'Inbox' }];
    expect(menu()).toBe(first);

    // A defined false state changes the row to an unchecked checkbox.
    entries.value = [{ label: 'Inbox', checked: false }];
    expect(menu()).not.toBe(first);
    expect(items(menu())[0]!.getAttribute('aria-checked')).toBe('false');

    entries.value = [{ label: 'Inbox' }, { label: 'Archive' }];
    expect(menu().dataset.key).not.toBe(firstKey);
    expect(items(menu()).map(label)).toEqual(['Inbox', 'Archive']);
    stop();
  });
});

describe('PopupMenu open and close helpers', () => {
  it('send open and close requests to the root, with a point when given', () => {
    const menu = render(
      asHtml(PopupMenu({ text: 'Actions', items: [{ label: 'Open' }] })),
    );
    const requests: unknown[] = [];
    menu.addEventListener(POPUP_MENU_OPEN_EVENT, (event) =>
      requests.push(['open', (event as CustomEvent).detail]),
    );
    menu.addEventListener(POPUP_MENU_CLOSE_EVENT, () =>
      requests.push(['close']),
    );
    openPopupMenu(menu);
    openPopupMenuAt(menu, 123, 456);
    closePopupMenu(menu);
    expect(requests).toEqual([
      ['open', {}],
      ['open', { point: { x: 123, y: 456 } }],
      ['close'],
    ]);
    // The point also moves a context menu's invisible anchor.
    expect(menu.style.getPropertyValue('--kui-popup-menu-context-x')).toBe(
      '123px',
    );
    expect(menu.style.getPropertyValue('--kui-popup-menu-context-y')).toBe(
      '456px',
    );
  });

  it('are inert without the register', () => {
    const menu = render(
      asHtml(PopupMenu({ text: 'Actions', items: [{ label: 'Open' }] })),
    );
    document.body.append(menu);
    const listener = vi.fn();
    document.addEventListener('beforetoggle', listener, true);
    openPopupMenu(menu);
    expect(listener).not.toHaveBeenCalled();
    document.removeEventListener('beforetoggle', listener, true);
  });
});

describe('PopupMenu content trigger', () => {
  it('renders the content as the whole trigger, named by label, without a caret', () => {
    const root = render(
      asHtml(
        PopupMenu({
          label: 'Status: Started',
          triggerContent: <span class="kui-badge">Started</span>,
          items: [{ label: 'Completed', action: 'complete' }],
        }),
      ),
    );
    expect(root.dataset.trigger).toBe('content');
    const trigger = root.querySelector('.kui-popup-menu__trigger')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    const content = trigger.querySelector('.kui-popup-menu__trigger-content')!;
    expect(content.getAttribute('aria-hidden')).toBe('true');
    expect(content.textContent).toBe('Started');
    expect(trigger.querySelector('.kui-popup-menu__label')!.textContent).toBe(
      'Status: Started',
    );
    expect(trigger.querySelector('.kui-popup-menu__caret')).toBeNull();
    const withCaret = render(
      asHtml(
        PopupMenu({
          label: 'Status',
          triggerContent: <span>Open</span>,
          caret: true,
          items: [],
        }),
      ),
    );
    expect(withCaret.querySelector('.kui-popup-menu__caret')).not.toBeNull();
    expect(
      render(asHtml(PopupMenu({ text: 'Sort', items: [] }))).dataset.trigger,
    ).toBe('button');
  });
});
