import { signal } from 'kerfjs';
import { jsx } from 'kerfjs/jsx-runtime';
import { Circle, icons, Star } from 'lucide';
import { describe, expect, it } from 'vitest';

import {
  LucideIcon,
  type LucideIconProps,
} from '../../src/components/media/lucide-icon/lucide-icon.js';
import {
  foregroundColor,
  uiColor,
} from '../../src/shared/styles/css-values.js';

const props = { icon: Circle, name: 'circle' };

describe('LucideIcon size', () => {
  it('defaults to outline and fills a solid glyph from currentColor', () => {
    const star = { icon: Star, name: 'star' };
    expect(String(LucideIcon(star))).toContain('fill="none"');
    expect(String(LucideIcon({ ...star, appearance: 'outline' }))).toContain(
      'fill="none"',
    );
    expect(String(LucideIcon({ ...star, appearance: 'solid' }))).toContain(
      'fill="currentColor"',
    );
  });
  it('keeps the original 1em default and semantics', () => {
    const html = String(LucideIcon(props));
    expect(html).toContain('data-lucide="circle" aria-hidden="true"');
    expect(html).not.toContain('data-size');
    expect(html).not.toContain('data-inline');
    expect(html).not.toContain('--_kui-lucide-size');
  });

  it('opts into inline layout without changing icon size or semantics', () => {
    const html = String(LucideIcon({ ...props, inline: true }));
    expect(html).toContain('data-inline="true"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('data-size');
  });

  it('sets an optional foreground color without changing size or appearance', () => {
    const token = String(
      LucideIcon({ ...props, color: uiColor('warning-on-quiet') }),
    );
    expect(token).toContain('style="color:var(--kui-color-warning-on-quiet)"');
    expect(token).toContain('stroke="currentColor"');
    const custom = String(
      LucideIcon({
        ...props,
        color: foregroundColor('rgb(20 40 60 / 0.8)'),
        size: 's',
        appearance: 'solid',
      }),
    );
    expect(custom).toContain(
      'style="--_kui-lucide-size:1rem;color:rgb(20 40 60 / 0.8)"',
    );
    expect(custom).toContain('fill="currentColor"');
  });

  it.each([
    ['xs', '0.75rem'],
    ['s', '1rem'],
    ['m', '1.25rem'],
    ['l', '1.5rem'],
    ['xl', '2rem'],
  ] as const)('maps %s to the root-scaled icon step %s', (size, length) => {
    expect(String(LucideIcon({ ...props, size }))).toContain(
      `data-size="${size}"`,
    );
    expect(String(LucideIcon({ ...props, size }))).toContain(
      `style="--_kui-lucide-size:${length}"`,
    );
  });

  it('converts positive numeric pixels to rem and preserves accessible labels', () => {
    const html = String(LucideIcon({ ...props, size: 30, label: 'Ready' }));
    expect(html).toContain('data-size="30"');
    expect(html).toContain('style="--_kui-lucide-size:1.875rem"');
    expect(html).toContain('role="img" aria-label="Ready"');
  });

  it('rejects nonpositive and unknown JavaScript sizes', () => {
    for (const size of [0, -4, Number.NaN, Infinity])
      expect(() => LucideIcon({ ...props, size })).toThrow(RangeError);
    expect(() =>
      LucideIcon({ ...props, size: 'giant' } as unknown as LucideIconProps),
    ).toThrow(RangeError);
  });
});

describe('LucideIcon child markup cache', () => {
  it('renders every Lucide glyph byte-identically to serializing each child and concatenating', () => {
    // The children are built as one Fragment SafeHtml; the reference is the
    // plain per-child serialization, so PopupMenu data-key digests (which hash
    // this markup) do not move.
    for (const [name, node] of Object.entries(icons)) {
      const reference = node
        .map(([tag, attrs]) => String(jsx(tag, attrs)))
        .join('');
      const html = String(LucideIcon({ icon: node, name }));
      const children = html.slice(html.indexOf('>') + 1, -'</svg>'.length);
      expect(children, name).toBe(reference);
    }
  });

  it('serializes each icon node once and reuses it across renders and props', () => {
    const node: LucideIconProps['icon'] = [
      ['path', { d: 'M1 1h22' }],
      ['circle', { cx: 12, cy: 12, r: 4 }],
    ];
    const first = String(LucideIcon({ icon: node, name: 'own', size: 's' }));
    expect(first).toContain(
      '<path d="M1 1h22"></path><circle cx="12" cy="12" r="4"></circle></svg>',
    );
    // A rendered node is treated as immutable: the cached markup is reused,
    // while every per-instance prop still renders fresh.
    node[0]![1].d = 'M9 9h9';
    const second = String(
      LucideIcon({ icon: node, name: 'own', size: 'l', label: 'Own' }),
    );
    expect(second).toContain('<path d="M1 1h22"></path>');
    expect(second).toContain('data-size="l"');
    expect(second).toContain('aria-label="Own"');
    // A different node identity renders its own markup.
    expect(String(LucideIcon({ icon: [...node], name: 'copy' }))).toContain(
      '<path d="M9 9h9"></path>',
    );
  });

  it('renders a node with a value outside the IconNode type fresh every time', () => {
    const d = signal('M1 1h22');
    const node = [['path', { d }]] as unknown as LucideIconProps['icon'];
    expect(String(LucideIcon({ icon: node, name: 'live' }))).toContain(
      '<path d="M1 1h22"></path>',
    );
    d.value = 'M2 2h20';
    expect(String(LucideIcon({ icon: node, name: 'live' }))).toContain(
      '<path d="M2 2h20"></path>',
    );
  });
});
