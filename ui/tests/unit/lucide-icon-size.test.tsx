import { Circle } from 'lucide';
import { describe, expect, it } from 'vitest';

import { LucideIcon, type LucideIconProps } from '../../src/lucide-icon.js';

const props = { icon: Circle, name: 'circle' };

describe('LucideIcon size', () => {
  it('keeps the original 1em default and semantics', () => {
    const html = String(LucideIcon(props));
    expect(html).toContain('data-lucide="circle" aria-hidden="true"');
    expect(html).not.toContain('data-size');
    expect(html).not.toContain('--_kui-lucide-size');
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
