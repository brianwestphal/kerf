import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { Workbench } from '../../src/workbench.js';

const content = raw('<p>Content</p>');
const base = { id: 'wb', label: 'Workspace', main: content };

describe('Workbench overlay backdrop', () => {
  it('is absent by default, including for an open overlay', () => {
    const html = String(
      Workbench({
        ...base,
        leftRail: { content, presentation: 'overlay', collapsed: false },
      }),
    );
    expect(html).toContain('data-rail-overlay-expanded="true"');
    expect(html).not.toContain('data-workbench-backdrop');
  });

  it('renders one decorative backdrop after panel controls for static rail and drawer overlays', () => {
    const host = document.createElement('div');
    host.innerHTML = String(
      Workbench({
        ...base,
        overlayBackdrop: true,
        leftRail: { content, presentation: 'overlay', collapsed: false },
        bottomDrawer: { content, presentation: 'overlay', collapsed: false },
      }),
    );
    const root = host.querySelector('[data-component="workbench"]')!;
    expect(root.getAttribute('data-overlay-backdrop')).toBe('true');
    expect(root.getAttribute('data-rail-overlay-expanded')).toBe('true');
    expect(root.getAttribute('data-drawer-overlay-expanded')).toBe('true');
    expect(root.querySelectorAll('[data-workbench-backdrop]')).toHaveLength(1);
    expect(root.lastElementChild?.hasAttribute('data-workbench-backdrop')).toBe(
      true,
    );
    expect(root.lastElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('marks expanded responsive overlays while collapsed panels do not opt in', () => {
    const host = document.createElement('div');
    host.innerHTML = String(
      Workbench({
        ...base,
        overlayBackdrop: true,
        leftRail: { content, responsiveOverlayAt: 'compact', collapsed: false },
        rightRail: { content, responsiveOverlayAt: 'narrow', collapsed: true },
        bottomDrawer: {
          content,
          responsiveOverlayAt: 'narrow',
          collapsed: false,
        },
      }),
    );
    const root = host.querySelector('[data-component="workbench"]')!;
    expect(root.getAttribute('data-left-responsive-expanded')).toBe('compact');
    expect(root.hasAttribute('data-right-responsive-expanded')).toBe(false);
    expect(root.getAttribute('data-drawer-responsive-expanded')).toBe('narrow');
    expect(root.hasAttribute('data-drawer-overlay-expanded')).toBe(false);
  });
});
