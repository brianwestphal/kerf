import { Circle, Star } from 'lucide';
import { describe, expect, it } from 'vitest';

import { foregroundColor, uiColor } from '../../src/css-values.js';
import { LucideIcon, type LucideIconProps } from '../../src/lucide-icon.js';

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
