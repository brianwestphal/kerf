import { mount, SafeHtml, signal } from 'kerfjs';
import { ArrowDownAZ, Copy, Ellipsis, Trash } from 'lucide';
import { afterEach, describe, expect, it } from 'vitest';

import {
  _clearPopupMenuMarkupCache,
  _popupMenuMarkupCacheSize,
  _popupMenuPartDigestCount,
  cachedPopupMenuContent,
  cachePopupMenuContent,
  LONG_PART_LENGTH,
  MARKUP_CACHE_LIMIT,
  PART_DIGEST_LIMIT,
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

// Long parts (icon and details markup) feed the digest as their own memoized
// hashes, so a menu holding one has a different `data-key` value than the
// legacy character-by-character digest; everything else is byte-identical.
const withoutKey = (html: string) =>
  html.replace(/ data-key="kui-popup-menu-[^"]*"/, '');
const keyOf = (html: string) => /data-key="([^"]+)"/.exec(html)![1];

describe('PopupMenu content key and markup cache', () => {
  it.each(cases)(
    'renders %s byte-identically to the previous implementation apart from the key value, cached or not',
    (_name, props) => {
      const expected = withoutKey(String(LegacyPopupMenu(props)));
      const first = String(PopupMenu(props));
      expect(withoutKey(first)).toBe(expected);
      // The second render is served from the markup cache.
      expect(String(PopupMenu(props))).toBe(first);
      _clearPopupMenuMarkupCache();
      expect(String(PopupMenu(props))).toBe(first);
    },
  );

  it.each(
    cases.filter(
      ([name]) => name === 'empty menu' || name.startsWith('astral'),
    ),
  )(
    'keeps the legacy key value for %s, which has no long part',
    (_name, props) => {
      expect(String(PopupMenu(props))).toBe(String(LegacyPopupMenu(props)));
    },
  );

  it('hashes a part below the long-part length by its characters', () => {
    const short = new SafeHtml('x'.repeat(LONG_PART_LENGTH - 1));
    const props: PopupMenuProps = {
      text: 'Short',
      items: [{ label: 'Go', details: short }],
    };
    expect(String(PopupMenu(props))).toBe(String(LegacyPopupMenu(props)));
    expect(_popupMenuPartDigestCount()).toBe(0);
  });

  it('keys a long part by its content, not its string identity', () => {
    const long = (fill: string) =>
      new SafeHtml(`<span>${fill.repeat(LONG_PART_LENGTH)}</span>`);
    const keyFor = (details: SafeHtml) =>
      popupMenuContentKey(['x'], [{ label: 'Go', details }]);
    const first = keyFor(long('a'));
    expect(_popupMenuPartDigestCount()).toBe(1);
    // An equal string built afresh hits the memo and keys identically.
    expect(keyFor(long('a'))).toEqual(first);
    expect(_popupMenuPartDigestCount()).toBe(1);
    // A one-character change is a new part with a new key.
    const changed = keyFor(new SafeHtml(String(long('a')).replace('a', 'b')));
    expect(changed.key).not.toBe(first.key);
    expect(changed.cacheKey).not.toBe(first.cacheKey);
    // The same long text as a trigger part keys the same way.
    expect(popupMenuContentKey([String(long('a'))], []).key).not.toBe(
      popupMenuContentKey([String(long('b'))], []).key,
    );
  });

  it('bounds the memoized part digests, evicting the oldest', () => {
    const keyFor = (index: number) =>
      popupMenuContentKey(
        ['x'],
        [
          {
            label: 'Go',
            details: new SafeHtml(`${'p'.repeat(LONG_PART_LENGTH)}${index}`),
          },
        ],
      ).key;
    const first = keyFor(0);
    for (let index = 1; index <= PART_DIGEST_LIMIT; index++) keyFor(index);
    expect(_popupMenuPartDigestCount()).toBe(PART_DIGEST_LIMIT);
    // The evicted digest is recomputed to the same key.
    expect(keyFor(0)).toBe(first);
    expect(_popupMenuPartDigestCount()).toBe(PART_DIGEST_LIMIT);
  });

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
    expect(keyOf(trash)).not.toBe(keyOf(copy));
    expect(withoutKey(trash)).toBe(
      withoutKey(
        String(
          LegacyPopupMenu({
            text: 'Actions',
            items: [{ label: 'Go', icon: icon(Trash, 'glyph') }],
          }),
        ),
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
