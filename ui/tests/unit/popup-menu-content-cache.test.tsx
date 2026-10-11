import { mount, SafeHtml, signal } from 'kerfjs';
import { ArrowDownAZ, Copy, Ellipsis, Trash } from 'lucide';
import { afterEach, describe, expect, it } from 'vitest';

import {
  _clearPopupMenuMarkupCache,
  _popupMenuMarkupCacheSize,
  cachedPopupMenuContent,
  cachePopupMenuContent,
  MARKUP_CACHE_LIMIT,
  popupMenuContentKey,
} from '../../src/components/actions/popup-menu/internal/popup-menu-content-cache.js';
import {
  PopupMenu,
  type PopupMenuEntry,
  type PopupMenuProps,
} from '../../src/components/actions/popup-menu/popup-menu.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';
import { LegacyPopupMenu } from '../fixtures/popup-menu-legacy.js';

const icon = (glyph: typeof Copy, name: string) =>
  LucideIcon({ icon: glyph, name });

const richItems = (): PopupMenuEntry[] => [
  { kind: 'heading', label: 'Edit' },
  {
    label: 'Copy',
    action: 'copy',
    value: 'copy',
    icon: icon(Copy, 'copy'),
    details: new SafeHtml('<kbd>⌘C</kbd>'),
    attributes: { 'data-row': '7', 'data-skip': undefined },
  },
  {
    label: 'Sort',
    submenu: [
      { kind: 'heading', label: 'Order' },
      {
        label: 'A–Z',
        action: 'sort',
        checked: true,
        icon: icon(ArrowDownAZ, 'az'),
      },
      { kind: 'divider' },
      { label: 'Newest', action: 'sort', checked: false },
    ],
  },
  { kind: 'divider' },
  {
    label: 'Delete',
    action: 'delete',
    tone: 'danger',
    disabled: true,
    disabledReason: 'Locked "row" <b>',
    icon: icon(Trash, 'trash'),
  },
  { kind: 'item', label: 'Plain' },
];

const cases: [string, PopupMenuProps][] = [
  ['text trigger', { text: 'Actions', items: richItems() }],
  [
    'icon-only trigger without caret',
    {
      label: 'Row actions',
      icon: icon(Ellipsis, 'more'),
      caret: false,
      disabled: true,
      placement: 'bottom-end',
      rootAttributes: { 'data-row': '3' },
      slot: 'end',
      items: richItems(),
    },
  ],
  [
    'icon array trigger',
    {
      text: 'View',
      icon: [icon(Copy, 'a'), null, false, icon(Trash, 'b')],
      items: [{ label: 'One' }],
    },
  ],
  ['context trigger', { context: true, label: 'Row menu', items: richItems() }],
  ['empty menu', { text: 'Nothing', items: [] }],
  [
    'astral, lone-surrogate, and separator text',
    {
      text: 'Emoji 😀 \uD83D tail \uDE00',
      items: [
        { kind: 'heading', label: '\uDE00 low first' },
        { label: 'Rocket 🚀', action: 'go\u0000\u0001', value: '\uD83D' },
        { label: '𝔘𝔫𝔦𝔠𝔬𝔡𝔢', attributes: { 'data-x': '😀\uD800' } },
      ],
    },
  ],
];

afterEach(() => _clearPopupMenuMarkupCache());

describe('PopupMenu content key and markup cache', () => {
  it.each(cases)(
    'renders %s byte-identically to the previous implementation, cached or not',
    (_name, props) => {
      const expected = String(LegacyPopupMenu(props));
      expect(String(PopupMenu(props))).toBe(expected);
      // The second render is served from the markup cache.
      expect(String(PopupMenu(props))).toBe(expected);
      _clearPopupMenuMarkupCache();
      expect(String(PopupMenu(props))).toBe(expected);
    },
  );

  it('reuses one cached markup for equal props built afresh', () => {
    const first = popupMenuContentKey(['Actions'], richItems());
    String(PopupMenu({ text: 'Actions', items: richItems() }));
    expect(_popupMenuMarkupCacheSize()).toBe(1);
    String(PopupMenu({ text: 'Actions', items: richItems() }));
    expect(_popupMenuMarkupCacheSize()).toBe(1);
    expect(popupMenuContentKey(['Actions'], richItems())).toEqual(first);
  });

  it('changes the key and markup when only an icon changes', () => {
    const withIcon = (glyph: typeof Copy) =>
      String(
        PopupMenu({
          text: 'Actions',
          items: [{ label: 'Go', icon: icon(glyph, 'glyph') }],
        }),
      );
    const copy = withIcon(Copy);
    const trash = withIcon(Trash);
    expect(trash).not.toBe(copy);
    const keyOf = (html: string) => /data-key="([^"]+)"/.exec(html)![1];
    expect(keyOf(trash)).not.toBe(keyOf(copy));
    expect(trash).toBe(
      String(
        LegacyPopupMenu({
          text: 'Actions',
          items: [{ label: 'Go', icon: icon(Trash, 'glyph') }],
        }),
      ),
    );
    // Switching back reuses the first menu's cached markup.
    expect(withIcon(Copy)).toBe(copy);
    expect(_popupMenuMarkupCacheSize()).toBe(2);
  });

  it('keys the cache by the data-key digest plus an independent check hash', () => {
    const a = popupMenuContentKey(['x'], [{ label: 'One' }]);
    const b = popupMenuContentKey(['x'], [{ label: 'Two' }]);
    expect(a.cacheKey).not.toBe(b.cacheKey);
    expect(a.cacheKey.startsWith(a.key.replace('kui-popup-menu-', ''))).toBe(
      true,
    );
  });

  it('evicts the least recently used markup once full', () => {
    const render = (row: number) =>
      String(PopupMenu({ text: `Row ${row}`, items: [{ label: 'Open' }] }));
    for (let row = 0; row < MARKUP_CACHE_LIMIT; row++) render(row);
    expect(_popupMenuMarkupCacheSize()).toBe(MARKUP_CACHE_LIMIT);
    const keyFor = (row: number) =>
      popupMenuContentKey(
        [`Row ${row}`, '', '', 'true', 'false', 'false'],
        [{ label: 'Open' }],
      ).cacheKey;
    // Touch row 0 so row 1 becomes the least recently used.
    render(0);
    render(MARKUP_CACHE_LIMIT);
    expect(_popupMenuMarkupCacheSize()).toBe(MARKUP_CACHE_LIMIT);
    expect(cachedPopupMenuContent(keyFor(0))).toBeDefined();
    expect(cachedPopupMenuContent(keyFor(1))).toBeUndefined();
    expect(cachedPopupMenuContent(keyFor(2))).toBeDefined();
    expect(cachedPopupMenuContent(keyFor(MARKUP_CACHE_LIMIT))).toBeDefined();
    // An evicted menu renders afresh, identically, and is cached again.
    expect(render(1)).toBe(
      String(LegacyPopupMenu({ text: 'Row 1', items: [{ label: 'Open' }] })),
    );
    expect(cachedPopupMenuContent(keyFor(1))).toBeDefined();
  });

  it('never caches markup that holds a keyed list segment', () => {
    const listed = new SafeHtml({
      kind: 'mixed',
      parts: [
        { kind: 'static', html: '<span>' },
        { kind: 'list', id: 'l0', items: [] },
        { kind: 'static', html: '</span>' },
      ],
    });
    const props: PopupMenuProps = {
      text: 'Lists',
      items: [{ label: 'Rows', details: listed }],
    };
    const html = String(PopupMenu(props));
    expect(html).toBe(String(LegacyPopupMenu(props)));
    expect(_popupMenuMarkupCacheSize()).toBe(0);
    cachePopupMenuContent('static', new SafeHtml('<b>ok</b>'));
    expect(_popupMenuMarkupCacheSize()).toBe(1);
  });

  it('keeps mounted menus across repeated, changed, and restored renders', () => {
    const rows = signal([1, 2, 3]);
    const label = signal('Open');
    const root = document.createElement('div');
    document.body.append(root);
    const stop = mount(root, () => (
      <div>
        {rows.value.map((row) =>
          PopupMenu({
            label: `Row ${row}`,
            icon: icon(Ellipsis, 'more'),
            rootAttributes: { 'data-row': String(row) },
            items: [
              { label: label.value, action: 'open', icon: icon(Copy, 'c') },
            ],
          }),
        )}
      </div>
    ));
    const menus = () => [...root.querySelectorAll<HTMLElement>('wa-dropdown')];
    const first = menus();
    expect(first).toHaveLength(3);

    // Repeated renders with equal props keep every live menu.
    rows.value = [1, 2, 3];
    rows.value = [1, 2, 3];
    expect(menus()).toEqual(first);

    // A content change rebuilds each menu with the new label.
    label.value = 'View';
    const changed = menus();
    expect(changed.every((menu, index) => menu !== first[index])).toBe(true);
    expect(changed.map((menu) => menu.textContent?.includes('View'))).toEqual([
      true,
      true,
      true,
    ]);

    // Restoring the label serves the earlier markup and key again.
    label.value = 'Open';
    expect(menus().map((menu) => menu.dataset.key)).toEqual(
      first.map((menu) => menu.dataset.key),
    );
    expect(menus()[0]!.textContent).toContain('Open');

    // Emptying and refilling the list renders cached menus correctly.
    rows.value = [];
    expect(menus()).toHaveLength(0);
    rows.value = [3, 1];
    expect(menus().map((menu) => menu.dataset.row)).toEqual(['3', '1']);
    expect(
      menus()[0]!.querySelector('.kui-popup-menu__label')?.textContent,
    ).toBe('Row 3');
    stop();
    root.remove();
  });
});
