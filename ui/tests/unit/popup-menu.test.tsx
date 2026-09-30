import { mount, signal } from 'kerfjs';
import { ArrowDownAZ, Check, Copy } from 'lucide';
import { describe, expect, it } from 'vitest';

import { installPopupMenuKeyboard } from '../../src/install-popup-menu-keyboard.js';
import { LucideIcon } from '../../src/lucide-icon.js';
import {
  closePopupMenu,
  openPopupMenuAt,
  PopupMenu,
  type PopupMenuElement,
  type PopupMenuEntry,
} from '../../src/popup-menu.js';

const asHtml = (value: unknown) => String(value);

const render = (html: string) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstElementChild as HTMLElement;
};

describe('PopupMenu', () => {
  it('renders nested choices, selected details, disabled reasons, and danger tone', () => {
    const menu = render(
      asHtml(
        PopupMenu({
          text: 'Actions',
          items: [
            { label: 'Copy', action: 'copy' },
            {
              label: 'Decide',
              submenu: [
                {
                  label: 'Approve',
                  action: 'decide',
                  checked: true,
                  attributes: { 'data-decision': 'approve' },
                },
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
            {
              label: 'Newest first',
              action: 'sort',
              details: <LucideIcon icon={Check} name="Selected" />,
            },
          ],
        }),
      ),
    );
    const parent = menu.querySelector<HTMLElement>(
      'wa-dropdown-item:has(> [slot="submenu"])',
    )!;
    expect(parent.textContent).toContain('Decide');
    expect(parent.querySelector('[slot="details"]')).not.toBeNull();
    const children = parent.querySelectorAll<HTMLElement>(
      ':scope > wa-dropdown-item[slot="submenu"]',
    );
    expect(children).toHaveLength(2);
    expect(children[0].getAttribute('type')).toBe('checkbox');
    expect(children[0].hasAttribute('checked')).toBe(true);
    expect(children[0].getAttribute('data-decision')).toBe('approve');
    expect(children[1].getAttribute('variant')).toBe('danger');
    expect(children[1].getAttribute('title')).toBe('Needs a price');
    expect(children[1].hasAttribute('disabled')).toBe(true);
    expect(
      menu.querySelector('.kui-popup-menu__details [data-lucide]'),
    ).not.toBeNull();
  });

  it('renders a context anchor and controls its open state at pointer coordinates', () => {
    const menu = render(
      asHtml(
        PopupMenu({
          context: true,
          label: 'Demand actions',
          rootAttributes: { 'data-demand-menu': 'd-1' },
          items: [
            {
              label: 'Open',
              action: 'open',
              attributes: { 'data-demand-id': 'd-1' },
            },
          ],
        }),
      ),
    ) as PopupMenuElement;
    expect(menu.dataset.trigger).toBe('context');
    expect(menu.dataset.demandMenu).toBe('d-1');
    const anchor = menu.querySelector('button[slot="trigger"]')!;
    expect(anchor.getAttribute('aria-label')).toBe('Demand actions');
    expect(anchor.getAttribute('tabindex')).toBe('-1');
    openPopupMenuAt(menu, 123, 456);
    expect(menu.open).toBe(true);
    expect(menu.style.getPropertyValue('--kui-popup-menu-context-x')).toBe(
      '123px',
    );
    expect(menu.style.getPropertyValue('--kui-popup-menu-context-y')).toBe(
      '456px',
    );
    closePopupMenu(menu);
    expect(menu.open).toBe(false);
  });
  it('renders an icon-only trigger named by its label over typed commands', () => {
    const menu = render(
      asHtml(
        PopupMenu({
          label: 'Sort tickets',
          icon: <LucideIcon icon={ArrowDownAZ} name="arrow-down-a-z" />,
          items: [
            { label: 'Recently updated', action: 'sort-recent' },
            { label: 'Priority', action: 'sort-priority', value: 'priority' },
          ],
        }),
      ),
    );
    expect(menu.localName).toBe('wa-dropdown');
    expect(menu.className).toBe('kui-popup-menu');
    expect(menu.dataset.component).toBe('popup-menu');
    expect(menu.getAttribute('placement')).toBe('bottom-start');
    // Web Awesome's reflected default size is rendered, so a re-render's
    // morph never strips it and forces a Lit update to restore it.
    expect(menu.getAttribute('size')).toBe('m');
    // Web Awesome owns the trigger and item DOM once upgraded.
    expect(menu.hasAttribute('data-morph-skip-children')).toBe(true);
    const trigger = menu.querySelector(':scope > wa-button[slot="trigger"]')!;
    // Web Awesome names its button from slotted content, not a host aria-label.
    expect(trigger.hasAttribute('aria-label')).toBe(false);
    expect(trigger.querySelector('.kui-popup-menu__label')?.textContent).toBe(
      'Sort tickets',
    );
    expect(trigger.getAttribute('appearance')).toBe('plain');
    expect(trigger.hasAttribute('with-caret')).toBe(true);
    expect(trigger.querySelector('[data-lucide="arrow-down-a-z"]')).not.toBe(
      null,
    );

    const items = [...menu.querySelectorAll(':scope > wa-dropdown-item')];
    expect(items.map((item) => item.textContent)).toEqual([
      'Recently updated',
      'Priority',
    ]);
    expect(items.map((item) => item.getAttribute('data-action'))).toEqual([
      'sort-recent',
      'sort-priority',
    ]);
    expect(items[0]!.hasAttribute('value')).toBe(false);
    expect(items[1]!.getAttribute('value')).toBe('priority');
  });

  it('renders visible trigger text, headings, dividers, item icons, and item metadata', () => {
    const menu = render(
      asHtml(
        PopupMenu({
          text: 'Components',
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
              attributes: { 'data-item-id': 'copy' },
            },
            { kind: 'divider' },
            { label: 'Delete', disabled: true },
          ],
        }),
      ),
    );
    expect(menu.getAttribute('placement')).toBe('top-end');
    expect(menu.getAttribute('slot')).toBe('end');
    expect(menu.hasAttribute('data-catalog-related')).toBe(true);
    const trigger = menu.querySelector('wa-button[slot="trigger"]')!;
    // Visible text names the trigger; there is no hidden label.
    expect(trigger.querySelector('span')?.textContent).toBe('Components');
    expect(trigger.querySelector('.kui-popup-menu__label')).toBe(null);
    expect(trigger.hasAttribute('with-caret')).toBe(false);
    expect(trigger.hasAttribute('disabled')).toBe(true);
    expect([...menu.children].slice(1).map((child) => child.localName)).toEqual(
      ['div', 'wa-dropdown-item', 'wa-divider', 'wa-dropdown-item'],
    );
    // A styled group title (the Select's), not a slotted h1-h6 whose Web
    // Awesome metrics are !important.
    expect(menu.querySelector('.kui-popup-menu__heading')?.textContent).toBe(
      'Structure',
    );
    expect(menu.querySelector('h1, h2, h3, h4, h5, h6')).toBe(null);
    const [copy, remove] = menu.querySelectorAll('wa-dropdown-item');
    expect(copy!.getAttribute('data-item-id')).toBe('copy');
    expect(
      copy!.querySelector(
        '[slot="icon"].kui-popup-menu__icon [data-lucide="copy"]',
      ),
    ).not.toBe(null);
    expect(remove!.hasAttribute('disabled')).toBe(true);
  });

  it('rebuilds the morph-skipped menu when its items change and keeps it otherwise', () => {
    const items = signal<readonly PopupMenuEntry[]>([{ label: 'Inbox' }]);
    const placement = signal<'bottom-start' | 'top-end'>('bottom-start');
    const root = document.createElement('div');
    document.body.append(root);
    const stop = mount(root, () =>
      PopupMenu({
        text: 'View',
        items: items.value,
        placement: placement.value,
      }),
    );
    const menu = () => root.querySelector<HTMLElement>('wa-dropdown')!;
    const first = menu();
    const firstKey = first.dataset.key;
    expect(firstKey).toMatch(/^kui-popup-menu-[0-9a-z]+$/);

    // A root attribute change morphs in place; the key and children stay.
    placement.value = 'top-end';
    expect(menu()).toBe(first);
    expect(menu().getAttribute('placement')).toBe('top-end');

    // Equal items keep the key, so Web Awesome's upgraded children survive.
    items.value = [{ label: 'Inbox' }];
    expect(menu()).toBe(first);

    items.value = [{ label: 'Inbox' }, { label: 'Archive' }];
    expect(menu()).not.toBe(first);
    expect(menu().dataset.key).not.toBe(firstKey);
    expect(
      [...menu().querySelectorAll('wa-dropdown-item')].map(
        (item) => item.textContent,
      ),
    ).toEqual(['Inbox', 'Archive']);
    stop();
    root.remove();
  });
});

describe('installPopupMenuKeyboard', () => {
  class FakeDropdown extends HTMLElement {
    selections: [string, string][] = [];
    makeSelection(item: HTMLElement, event?: Event) {
      this.selections.push([item.textContent ?? '', event?.type ?? '']);
    }
  }
  customElements.define('fake-popup-dropdown', FakeDropdown);
  installPopupMenuKeyboard(FakeDropdown.prototype);
  // Installing twice must not wrap the method twice.
  installPopupMenuKeyboard(FakeDropdown.prototype);

  const setup = (className: string) => {
    const dropdown = document.createElement(
      'fake-popup-dropdown',
    ) as FakeDropdown;
    dropdown.className = className;
    const item = document.createElement('button') as HTMLButtonElement & {
      disabled: boolean;
    };
    item.textContent = 'Archive';
    dropdown.append(item);
    // Web Awesome selects a pointer choice from the item's click.
    item.addEventListener('click', (event) =>
      dropdown.makeSelection(item, event),
    );
    document.body.append(dropdown);
    return { dropdown, item };
  };

  it('routes a keyboard choice in a PopupMenu through one item click', () => {
    const { dropdown, item } = setup('kui-popup-menu');
    const clicks: EventTarget[] = [];
    document.body.addEventListener('click', (event) =>
      clicks.push(event.target!),
    );
    dropdown.makeSelection(
      item,
      new KeyboardEvent('keydown', { key: 'Enter' }),
    );
    expect(clicks).toEqual([item]);
    expect(dropdown.selections).toEqual([['Archive', 'click']]);
  });

  it('leaves pointer choices, disabled items, and raw dropdowns unchanged', () => {
    const menu = setup('kui-popup-menu');
    menu.item.click();
    expect(menu.dropdown.selections).toEqual([['Archive', 'click']]);

    const disabled = setup('kui-popup-menu');
    disabled.item.disabled = true;
    disabled.dropdown.makeSelection(
      disabled.item,
      new KeyboardEvent('keydown', { key: 'Enter' }),
    );
    expect(disabled.dropdown.selections).toEqual([['Archive', 'keydown']]);

    const raw = setup('');
    raw.dropdown.makeSelection(
      raw.item,
      new KeyboardEvent('keydown', { key: 'Enter' }),
    );
    expect(raw.dropdown.selections).toEqual([['Archive', 'keydown']]);
  });
});
