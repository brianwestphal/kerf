import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { CatalogResourceFooter } from '../../src/catalog/components/catalog-resource-footer.js';
import { CollapsiblePanelRelocated } from '../../src/components/layout/collapsible-panel/collapsible-panel.js';
import { Workbench } from '../../src/components/layout/workbench/workbench.js';
import { NavStack } from '../../src/components/navigation/nav-stack/nav-stack.js';

const html = (value: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(value);
  return host;
};

/** The size of the control group that holds the element matching `selector`. */
const groupSize = (host: Element, selector: string) =>
  host
    .querySelector(selector)!
    .closest('.kui-toolbar-control-group')!
    .getAttribute('data-size');

describe('Toolbar density through composites', () => {
  it('forwards density to Workbench panel, main, and bottom toolbars and sizes composed toggles to fit', () => {
    const rail = (collapsed: boolean) => ({
      label: 'Files',
      content: raw('<p>Files</p>'),
      collapsed,
      toolbar: {
        label: 'Files',
        density: 'compact' as const,
        toggle: { action: 'toggle-files', name: 'files' },
      },
      bottomToolbar: { label: 'File status', density: 'compact' as const },
    });
    const open = html(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main: raw('<p>Main</p>'),
        mainToolbar: { label: 'Main', density: 'compact' },
        mainBottomToolbar: { label: 'Status', density: 'compact' },
        leftRail: rail(false),
      }),
    );
    const toolbars = [...open.querySelectorAll('[data-component="toolbar"]')];
    expect(toolbars.length).toBeGreaterThanOrEqual(4);
    for (const toolbar of toolbars)
      expect(toolbar.getAttribute('data-density')).toBe('compact');
    expect(groupSize(open, '[data-workbench-toggle]')).toBe('compact');

    // Collapsed, the toggle relocates into the main toolbar at its density.
    const closed = html(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main: raw('<p>Main</p>'),
        mainToolbar: { label: 'Main', density: 'compact' },
        leftRail: rail(true),
      }),
    );
    const relocated = [
      ...closed.querySelectorAll(
        '[data-workbench-main] [data-workbench-toggle]',
      ),
    ];
    expect(relocated.length).toBeGreaterThan(0);
    for (const toggle of relocated)
      expect(
        toggle.closest('.kui-toolbar-control-group')!.getAttribute('data-size'),
      ).toBe('compact');

    // A default-density main toolbar keeps default-size relocated toggles.
    const standard = html(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main: raw('<p>Main</p>'),
        mainToolbar: { label: 'Main' },
        leftRail: rail(true),
      }),
    );
    expect(
      groupSize(standard, '[data-workbench-main] [data-workbench-toggle]'),
    ).toBe('default');
  });

  it('forwards density to a Workbench panel NavStack and its toggle', () => {
    const host = html(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main: raw('<p>Main</p>'),
        rightRail: {
          label: 'Tickets',
          toolbar: {
            label: 'Tickets',
            density: 'compact',
            toggle: { action: 'toggle-tickets', name: 'tickets' },
          },
          navStack: {
            id: 'nav',
            label: 'Tickets',
            views: [
              { key: 'a', toolbar: { title: 'All' }, content: raw('<p>A</p>') },
              { key: 'b', toolbar: { title: 'T-1' }, content: raw('<p>B</p>') },
            ],
          },
        },
      }),
    );
    const rail = host.querySelector('[data-workbench-rail="right"]')!;
    expect(
      rail
        .querySelector('[data-component="toolbar"]')!
        .getAttribute('data-density'),
    ).toBe('compact');
    expect(groupSize(rail, '[data-nav-back]')).toBe('compact');
    expect(groupSize(rail, '[data-workbench-toggle]')).toBe('compact');
  });

  it('forwards density to NavStack top and bottom toolbars and its back group', () => {
    const views = [
      { key: 'a', toolbar: { title: 'All' }, content: raw('<p>A</p>') },
      {
        key: 'b',
        toolbar: { title: 'T-1', density: 'default' as const },
        content: raw('<p>B</p>'),
      },
    ];
    const compact = html(
      NavStack({
        id: 'nav',
        label: 'Tickets',
        views: views.slice(0, 1).concat({
          key: 'b',
          toolbar: { title: 'T-1' },
          content: raw('<p>B</p>'),
        }),
        toolbarConfig: { density: 'compact' },
        bottomToolbar: { label: 'Actions', density: 'compact' },
      }),
    );
    const [top, bottom] = compact.querySelectorAll(
      '[data-component="toolbar"]',
    );
    expect(top!.getAttribute('data-density')).toBe('compact');
    expect(bottom!.getAttribute('data-density')).toBe('compact');
    expect(groupSize(compact, '[data-nav-back]')).toBe('compact');
    // A view's own toolbar density overrides the stack-wide default.
    const overridden = html(
      NavStack({
        id: 'nav',
        label: 'Tickets',
        views,
        toolbarConfig: { density: 'compact' },
      }),
    );
    expect(
      overridden
        .querySelector('[data-component="toolbar"]')!
        .hasAttribute('data-density'),
    ).toBe(false);
    expect(groupSize(overridden, '[data-nav-back]')).toBe('default');
  });

  it('sizes CollapsiblePanelRelocated toggles to the destination density', () => {
    const toolbar = {
      label: 'Files',
      toggle: { action: 'toggle-files', name: 'files' },
    };
    const props = {
      panelId: 'files',
      side: 'left' as const,
      collapsed: true,
      toolbar,
    };
    expect(
      html(CollapsiblePanelRelocated({ ...props, density: 'compact' }))
        .querySelector('.kui-toolbar-control-group')!
        .getAttribute('data-size'),
    ).toBe('compact');
    expect(
      html(CollapsiblePanelRelocated(props))
        .querySelector('.kui-toolbar-control-group')!
        .getAttribute('data-size'),
    ).toBe('default');
  });

  it('forwards density to the catalog resource footer', () => {
    const host = html(
      CatalogResourceFooter({
        name: 'Toolbar',
        resources: [{ href: '#a', label: 'Source' }],
        related: [],
        selectAction: 'select-entry',
        toolbar: { density: 'compact' },
      }),
    );
    expect(
      host
        .querySelector('[data-component="toolbar"]')!
        .getAttribute('data-density'),
    ).toBe('compact');
  });
});
