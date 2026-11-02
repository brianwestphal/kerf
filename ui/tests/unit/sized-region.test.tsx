// KF-63XR5K: SizedRegion gives content that cannot size itself a definite
// height; its geometry is measured in tests/browser/sized-region.spec.ts.
import { describe, expect, it } from 'vitest';

import { SizedRegion } from '../../src/components/layout/sized-region/sized-region.js';
import { px, rem } from '../../src/shared/styles/css-values.js';

const render = (html: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host.firstElementChild as HTMLElement;
};

describe('SizedRegion', () => {
  it('fills by default and holds its content', () => {
    const region = render(
      SizedRegion({ children: <span class="inner">Layout</span> }),
    );
    expect(region.className).toBe('kui-sized-region');
    expect(region.dataset.component).toBe('sized-region');
    expect(region.dataset.fill).toBe('true');
    expect(region.hasAttribute('style')).toBe(false);
    expect(region.querySelector('.inner')?.textContent).toBe('Layout');
  });

  it('sets a typed height and bounds, and stops filling', () => {
    const region = render(
      SizedRegion({
        height: rem(30),
        minHeight: px(200),
        maxHeight: rem(40),
        children: <span>Layout</span>,
        id: 'activity',
        className: 'app-region',
      }),
    );
    expect(region.dataset.fill).toBeUndefined();
    expect(region.id).toBe('activity');
    expect(region.className).toBe('kui-sized-region app-region');
    const style = region.getAttribute('style');
    expect(style).toContain('--_kui-sized-region-height:30rem');
    expect(style).toContain('--_kui-sized-region-min-height:200px');
    expect(style).toContain('--_kui-sized-region-max-height:40rem');
  });

  it('bounds a fill without setting a height', () => {
    const region = render(
      SizedRegion({ minHeight: rem(20), children: <span>Layout</span> }),
    );
    expect(region.dataset.fill).toBe('true');
    expect(region.getAttribute('style')).toBe(
      '--_kui-sized-region-min-height:20rem',
    );
  });

  it('keeps its own markers over application data attributes', () => {
    const region = render(
      SizedRegion({
        children: <span>Layout</span>,
        rootAttributes: {
          'data-row': 'one',
          'data-component': 'other',
          'data-fill': 'false',
        } as never,
      }),
    );
    expect(region.dataset.row).toBe('one');
    expect(region.dataset.component).toBe('sized-region');
    expect(region.dataset.fill).toBe('true');
  });
});
