import { describe, expect, it } from 'vitest';

import {
  COLLAPSED_WORKBENCH_ID,
  resetWorkbenchDemo,
  RESPONSIVE_DRAWER_WORKBENCH_ID,
  toggleWorkbenchOutput,
  WorkbenchDemo,
  workbenchOutputCollapsed,
} from '../../ux-demo/demos/workbench.js';

/** The rendered markup of one example Workbench, by id. */
function example(id: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(WorkbenchDemo());
  const workbench = host.querySelector<HTMLElement>(`#${id}`);
  if (!workbench) throw new Error(`Missing #${id}`);
  return workbench;
}

describe('WorkbenchDemo', () => {
  it('renders a responsive overlay drawer, open inline by default', () => {
    resetWorkbenchDemo();
    const workbench = example(RESPONSIVE_DRAWER_WORKBENCH_ID);
    // Only a work area and the drawer: no rails.
    expect(workbench.querySelectorAll('[data-workbench-rail]')).toHaveLength(0);
    const drawer = workbench.querySelector<HTMLElement>(
      '[data-workbench-drawer]',
    )!;
    expect(drawer.dataset.responsiveOverlayAt).toBe('narrow');
    expect(drawer.dataset.collapsed).toBe('false');
    expect(drawer.dataset.presentation).toBe('inline');
    // A fixed size, not resizable: the example is about presentation.
    expect(drawer.hasAttribute('data-resizable')).toBe(false);
    expect(drawer.style.getPropertyValue('--kui-workbench-drawer-height')).toBe(
      '180px',
    );
    // Open: the drawer's own toolbar closes it, and the editor carries no
    // second copy of the toggle.
    const own = drawer.querySelector<HTMLButtonElement>(
      '[data-action="toggle-workbench-output"]',
    )!;
    expect(own.getAttribute('aria-label')).toBe('Hide output');
    expect(own.getAttribute('aria-expanded')).toBe('true');
    expect(
      workbench.querySelector(
        '.kui-workbench__main [data-action="toggle-workbench-output"]',
      ),
    ).toBeNull();
    expect(workbench.querySelector('.kui-workbench__restore')).toBeNull();
  });

  it('toggles the output drawer from the app-owned signal and resets it', () => {
    resetWorkbenchDemo();
    expect(toggleWorkbenchOutput()).toBe(true);
    expect(workbenchOutputCollapsed.value).toBe(true);
    let workbench = example(RESPONSIVE_DRAWER_WORKBENCH_ID);
    expect(
      workbench.querySelector<HTMLElement>('[data-workbench-drawer]')!.dataset
        .collapsed,
    ).toBe('true');
    // Collapsed: the toggle trails the editor's bottom toolbar.
    const moved = workbench.querySelector<HTMLButtonElement>(
      '.kui-workbench__main > [data-component="pane"] > .kui-pane__footer .kui-toolbar__trailing [data-action="toggle-workbench-output"]',
    )!;
    expect(moved.getAttribute('aria-label')).toBe('Show output');
    expect(moved.getAttribute('aria-expanded')).toBe('false');
    expect(workbench.querySelector('.kui-workbench__restore')).toBeNull();

    expect(toggleWorkbenchOutput()).toBe(false);
    toggleWorkbenchOutput();
    resetWorkbenchDemo();
    expect(workbenchOutputCollapsed.value).toBe(false);
    workbench = example(RESPONSIVE_DRAWER_WORKBENCH_ID);
    expect(
      workbench.querySelector<HTMLElement>('[data-workbench-drawer]')!.dataset
        .collapsed,
    ).toBe('false');
  });

  it('keeps each open rail toggle in the rail and moves a closed rail toggle to its edge of the editor toolbar', () => {
    resetWorkbenchDemo();
    const workbench = example('catalog-workbench-resizable');
    const editor = workbench.querySelector<HTMLElement>(
      '.kui-workbench__main .kui-toolbar',
    )!;
    // The navigator starts open: its toggle closes it from its own toolbar.
    const navigator = workbench.querySelector<HTMLElement>(
      '[data-workbench-rail="left"]',
    )!;
    expect(
      navigator
        .querySelector('[data-action="toggle-workbench-navigator"]')!
        .getAttribute('aria-label'),
    ).toBe('Hide navigator');
    expect(
      editor.querySelector('[data-action="toggle-workbench-navigator"]'),
    ).toBeNull();
    // The inspector starts closed: its toggle is the last editor control.
    const trailing = [
      ...editor.querySelectorAll<HTMLElement>(
        '.kui-toolbar__trailing [data-workbench-toggle]',
      ),
    ];
    expect(trailing.map((button) => button.getAttribute('aria-label'))).toEqual(
      ['Show inspector'],
    );
    expect(
      editor.querySelector('.kui-toolbar__leading [data-workbench-toggle]'),
    ).toBeNull();
  });

  it("lends a closed navigator's search and toggle to the editor toolbar and floats a closed console's toggle in the editor's corner", () => {
    resetWorkbenchDemo();
    const workbench = example(COLLAPSED_WORKBENCH_ID);
    const pane = workbench.querySelector<HTMLElement>(
      '.kui-workbench__main > [data-component="pane"]',
    )!;
    const leading = pane.querySelector<HTMLElement>(
      ':scope > .kui-pane__header .kui-toolbar__leading',
    )!;
    const labels = [
      ...leading.querySelectorAll<HTMLElement>(
        'button, [data-component="toolbar-text"]',
      ),
    ].map(
      (node) => node.getAttribute('aria-label') ?? node.textContent!.trim(),
    );
    expect(labels).toEqual(['Search files', 'Show navigator', 'Editor']);
    // The panel-only "New file" group stays in the closed navigator.
    expect(pane.innerHTML).not.toContain('New file');
    expect(pane.querySelector(':scope > .kui-pane__footer')).toBeNull();
    const corner = workbench.querySelector<HTMLElement>(
      '.kui-workbench__restore[data-panel="bottom"]',
    )!;
    expect(
      corner
        .querySelector('[data-action="toggle-workbench-console"]')!
        .getAttribute('aria-label'),
    ).toBe('Show console');
    expect(
      corner.querySelector('[data-component="floating-toolbar"]'),
    ).not.toBeNull();
  });
});
