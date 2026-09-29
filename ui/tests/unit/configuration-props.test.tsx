import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Circle } from 'lucide';
import { describe, expect, it } from 'vitest';

import { px, remify, space } from '../../src/css-values.js';
import { DisclosureArrow } from '../../src/disclosure-arrow.js';
import { FloatingToolbar } from '../../src/floating-toolbar.js';
import { ListHeader } from '../../src/list-header.js';
import { LucideIcon } from '../../src/lucide-icon.js';
import { TokenSearchField } from '../../src/token-search-field.js';

const asHtml = (value: unknown) => String(value);
const icon = LucideIcon({ icon: Circle, name: 'circle' });

describe('props that replace raw token overrides', () => {
  it('sets FloatingToolbar inset through its token only when given', () => {
    const plain = asHtml(FloatingToolbar({ label: 'Drawer', children: icon }));
    expect(plain).not.toContain('style=');

    const inset = asHtml(
      FloatingToolbar({
        label: 'Drawer',
        position: 'top-start',
        inset: space('xs'),
        children: icon,
      }),
    );
    expect(inset).toContain(
      'style="--kui-floating-toolbar-inset:var(--kui-space-xs)"',
    );
    expect(inset).toContain('data-position="top-start"');
  });

  it('sizes DisclosureArrow through its token while keeping the rotation', () => {
    const plain = asHtml(DisclosureArrow({ open: false }));
    expect(plain).toContain('style="--_kui-disclosure-arrow-rotation:0deg"');

    const sized = asHtml(DisclosureArrow({ open: true, size: remify(24) }));
    expect(sized).toContain(
      'style="--_kui-disclosure-arrow-rotation:90deg;--kui-disclosure-arrow-size:1.5rem"',
    );
  });

  it('renders ListHeader labels at the requested heading level', () => {
    expect(asHtml(ListHeader({ label: 'Recent' }))).toMatch(
      /<h2 class="kui-text"/,
    );
    expect(asHtml(ListHeader({ label: 'Recent', headingLevel: 3 }))).toMatch(
      /<h3 class="kui-text"[^>]*>Recent<\/h3>/,
    );
    expect(
      asHtml(
        ListHeader({
          label: 'Files',
          headingLevel: 4,
          action: 'add-file',
          actionLabel: 'Add file',
          actionIcon: icon,
        }),
      ),
    ).toMatch(/<h4 class="kui-text"/);
    // A toggle header's label is its button text, not a heading.
    const toggle = asHtml(
      ListHeader({
        label: 'Folders',
        toggle: true,
        action: 'toggle-folders',
        expanded: true,
      }),
    );
    expect(toggle).not.toMatch(/<h[1-6]/);
  });

  it('rejects headingLevel on a toggle header at compile time', () => {
    const html = asHtml(
      ListHeader({
        label: 'Folders',
        toggle: true,
        action: 'toggle-folders',
        expanded: false,
        // @ts-expect-error -- a toggle header has no heading element.
        headingLevel: 3,
      }),
    );
    expect(html).not.toMatch(/<h[1-6]/);
  });

  it('replaces the TokenSearchField clear glyph only when clearIcon is given', () => {
    const clear = (html: string) =>
      /<button[^>]*kui-token-search__clear[^>]*>([\s\S]*?)<\/button>/.exec(
        html,
      )?.[1] ?? '';
    const plain = asHtml(
      TokenSearchField({ id: 'search', label: 'Search', query: 'a' }),
    );
    expect(clear(plain)).toContain('data-lucide="x"');

    const custom = asHtml(
      TokenSearchField({
        id: 'search',
        label: 'Search',
        query: 'a',
        clearIcon: icon,
      }),
    );
    expect(clear(custom)).toContain('data-lucide="circle"');
    expect(clear(custom)).not.toContain('data-lucide="x"');
    expect(custom).toContain('aria-label="Clear search"');
  });

  it('accepts only typed lengths for the length props', () => {
    // @ts-expect-error -- a raw string is not a CssLength.
    FloatingToolbar({ label: 'Drawer', inset: '4px', children: icon });
    // @ts-expect-error -- a raw string is not a CssLength.
    DisclosureArrow({ open: false, size: '24px' });
    expect(asHtml(DisclosureArrow({ open: false, size: px(20) }))).toContain(
      '--kui-disclosure-arrow-size:20px',
    );
  });

  it('frames a content item with the neutral border without changing geometry', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../../src/content-item.css'),
      'utf8',
    );
    expect(css).toMatch(
      /\.kui-content-item--framed \{\s*--kui-content-item-border: var\(--kui-color-neutral-border-normal\);\s*\}/,
    );
  });
});
