import { describe, expect, it } from 'vitest';

import {
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
    // The drawer's own header closes it; the editor toolbar toggles it.
    const own = drawer.querySelector<HTMLButtonElement>(
      '[data-action="toggle-workbench-output"]',
    )!;
    expect(own.getAttribute('aria-label')).toBe('Hide output');
    const editor = workbench.querySelector<HTMLButtonElement>(
      '.kui-workbench__main [data-action="toggle-workbench-output"]',
    )!;
    expect(editor.getAttribute('aria-label')).toBe('Hide output');
    expect(editor.getAttribute('aria-expanded')).toBe('true');
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
    const editor = workbench.querySelector<HTMLButtonElement>(
      '.kui-workbench__main [data-action="toggle-workbench-output"]',
    )!;
    expect(editor.getAttribute('aria-label')).toBe('Show output');
    expect(editor.getAttribute('aria-expanded')).toBe('false');

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

  it("gives each resizable example rail its own header's close control", () => {
    resetWorkbenchDemo();
    const workbench = example('catalog-workbench-resizable');
    for (const [side, action, label] of [
      ['left', 'toggle-workbench-navigator', 'Hide navigator'],
      ['right', 'toggle-workbench-inspector', 'Hide inspector'],
    ]) {
      const rail = workbench.querySelector<HTMLElement>(
        `[data-workbench-rail="${side}"]`,
      )!;
      const close = rail.querySelector<HTMLButtonElement>(
        `[data-action="${action}"]`,
      )!;
      expect(close.getAttribute('aria-label')).toBe(label);
      expect(close.closest('[data-component="toolbar"]')).not.toBeNull();
    }
  });
});
