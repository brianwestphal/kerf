import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { Workbench, type WorkbenchPanel } from '../../src/workbench.js';

const group = (name: string) =>
  raw(
    `<div data-component="toolbar-control-group" data-group="${name}"><button type="button">${name}</button></div>`,
  );
const title = (text: string) =>
  raw(`<h2 data-component="toolbar-text" data-title="${text}">${text}</h2>`);

const rail = (
  name: string,
  collapsed: boolean,
  extra: Partial<WorkbenchPanel> = {},
): WorkbenchPanel => ({
  label: name,
  content: raw(`<p data-content="${name}">${name}</p>`),
  collapsed,
  toolbar: {
    label: name,
    title: title(name),
    panelOnly: group(`${name}-only`),
    constant: group(`${name}-constant`),
    toggle: { action: `toggle-${name}`, name },
  },
  ...extra,
});

function render(props: Parameters<typeof Workbench>[0]) {
  const host = document.createElement('div');
  host.innerHTML = String(Workbench(props));
  return host;
}

/** The order of titles, groups, and toggles in one element. */
function order(root: Element | null): string[] {
  if (!root) return [];
  return [
    ...root.querySelectorAll(
      '[data-title], [data-group], [data-workbench-toggle]',
    ),
  ].map((node) =>
    node.hasAttribute('data-workbench-toggle')
      ? `toggle:${node.getAttribute('aria-label')}`
      : (node.getAttribute('data-title') ?? node.getAttribute('data-group'))!,
  );
}

const mainToolbar = (host: Element) =>
  host.querySelector(
    '[data-workbench-main] > [data-component="pane"] .kui-toolbar',
  );
const mainZone = (host: Element, zone: 'leading' | 'trailing') =>
  mainToolbar(host)!.querySelector(`.kui-toolbar__${zone}`);
const panelToolbar = (host: Element, selector: string) =>
  host.querySelector(`${selector} .kui-toolbar`);

describe('Workbench panel toolbars', () => {
  it('composes an open panel toolbar: title and panel-only groups lead; constant groups and the toggle trail', () => {
    const host = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      mainToolbar: { label: 'Editor', title: title('Editor') },
      leftRail: rail('navigator', false),
    });
    const toolbar = panelToolbar(host, '[data-workbench-rail="left"]');
    expect(order(toolbar!.querySelector('.kui-toolbar__leading'))).toEqual([
      'navigator',
      'navigator-only',
    ]);
    expect(order(toolbar!.querySelector('.kui-toolbar__trailing'))).toEqual([
      'navigator-constant',
      'toggle:Hide navigator',
    ]);
    const toggle = toolbar!.querySelector('[data-workbench-toggle]')!;
    expect(toggle.getAttribute('data-action')).toBe('toggle-navigator');
    expect(toggle.getAttribute('aria-controls')).toBe('wb-left-rail');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.querySelector('svg')!.getAttribute('data-lucide')).toBe(
      'panel-left-close',
    );
    // The content sits in the panel's Pane, and nothing relocates while open.
    expect(
      host.querySelector(
        '[data-workbench-rail="left"] [data-content="navigator"]',
      ),
    ).not.toBeNull();
    expect(order(mainToolbar(host))).toEqual(['Editor']);
  });

  it("leads the work-area toolbar with a collapsed left rail's constant groups and toggle, before the title", () => {
    const host = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      mainToolbar: {
        label: 'Editor',
        title: title('Editor'),
        leading: group('editor-leading'),
        trailing: group('editor-trailing'),
      },
      leftRail: rail('navigator', true),
    });
    expect(order(mainZone(host, 'leading'))).toEqual([
      'navigator-constant',
      'toggle:Show navigator',
      'Editor',
      'editor-leading',
    ]);
    expect(order(mainZone(host, 'trailing'))).toEqual(['editor-trailing']);
    const moved = mainToolbar(host)!.querySelector('[data-workbench-toggle]')!;
    expect(moved.getAttribute('aria-expanded')).toBe('false');
    expect(moved.getAttribute('aria-controls')).toBe('wb-left-rail');
    expect(moved.querySelector('svg')!.getAttribute('data-lucide')).toBe(
      'panel-left-open',
    );
    // Panel-only groups never leave the (inert) panel.
    expect(mainToolbar(host)!.innerHTML).not.toContain('navigator-only');
    expect(
      host.querySelector('[data-workbench-rail="left"]')!.innerHTML,
    ).toContain('navigator-only');
  });

  it("ends the work-area toolbar with a collapsed right rail's constant groups and then its toggle", () => {
    const host = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      mainToolbar: {
        label: 'Editor',
        title: title('Editor'),
        trailing: group('editor-trailing'),
      },
      rightRail: rail('inspector', true),
    });
    expect(order(mainZone(host, 'leading'))).toEqual(['Editor']);
    expect(order(mainZone(host, 'trailing'))).toEqual([
      'editor-trailing',
      'inspector-constant',
      'toggle:Show inspector',
    ]);
  });

  it("walks open → collapsed → reopened without leaving a panel's groups behind in the work area", () => {
    const props = (collapsed: boolean) => ({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      mainToolbar: { label: 'Editor', title: title('Editor') },
      leftRail: rail('navigator', collapsed),
      rightRail: rail('inspector', !collapsed),
    });
    const states = [false, true, false, true].map((collapsed) =>
      order(mainToolbar(render(props(collapsed)))),
    );
    expect(states[0]).toEqual([
      'Editor',
      'inspector-constant',
      'toggle:Show inspector',
    ]);
    expect(states[1]).toEqual([
      'navigator-constant',
      'toggle:Show navigator',
      'Editor',
    ]);
    expect(states[2]).toEqual(states[0]);
    expect(states[3]).toEqual(states[1]);
  });

  it("trails the work area's bottom toolbar with a collapsed drawer's groups, else floats them in its corner", () => {
    const drawer = (collapsed: boolean): WorkbenchPanel => ({
      ...rail('console', collapsed),
      toolbar: {
        label: 'Console',
        title: title('Console'),
        toggle: { action: 'toggle-console', name: 'console' },
      },
    });
    const withBottom = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      mainBottomToolbar: { label: 'Status', trailing: group('status') },
      bottomDrawer: drawer(true),
    });
    const footer = withBottom.querySelector(
      '[data-workbench-main] > [data-component="pane"] > .kui-pane__footer .kui-toolbar__trailing',
    );
    expect(order(footer)).toEqual(['status', 'toggle:Show console']);
    expect(
      withBottom.querySelector('.kui-workbench__restore[data-panel="bottom"]'),
    ).toBeNull();

    const floating = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      bottomDrawer: drawer(true),
    });
    const corner = floating.querySelector(
      '.kui-workbench__restore[data-panel="bottom"]',
    );
    expect(
      corner!.querySelector('[data-component="floating-toolbar"]'),
    ).not.toBeNull();
    expect(order(corner)).toEqual(['toggle:Show console']);

    // Open: the close toggle trails the drawer's own toolbar, nothing floats.
    const open = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      bottomDrawer: drawer(false),
    });
    expect(order(panelToolbar(open, '[data-workbench-drawer]'))).toEqual([
      'Console',
      'toggle:Hide console',
    ]);
    expect(open.querySelector('.kui-workbench__restore')).toBeNull();
  });

  it('floats a collapsed rail’s groups in its corner when there is no work-area toolbar, and an app restoreControl still wins', () => {
    const floating = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      leftRail: rail('navigator', true),
    });
    const corner = floating.querySelector(
      '.kui-workbench__restore[data-panel="left"]',
    );
    expect(order(corner)).toEqual([
      'navigator-constant',
      'toggle:Show navigator',
    ]);
    expect(
      corner!
        .querySelector('[data-component="floating-toolbar"]')!
        .getAttribute('data-position'),
    ).toBe('bottom-start');
    // Without a composed toolbar the main area renders exactly as given.
    expect(
      floating.querySelector('[data-workbench-main] > [data-component="pane"]'),
    ).toBeNull();

    const custom = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      leftRail: rail('navigator', true, {
        restoreControl: raw('<button data-custom-restore>Back</button>'),
      }),
    });
    const restore = custom.querySelector(
      '.kui-workbench__restore[data-panel="left"]',
    );
    expect(restore!.querySelector('[data-custom-restore]')).not.toBeNull();
    expect(restore!.querySelector('[data-workbench-toggle]')).toBeNull();
  });

  it('renders a panel without a toolbar exactly as its content, with no relocation', () => {
    const host = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      mainToolbar: { label: 'Editor', title: title('Editor') },
      leftRail: {
        label: 'Navigator',
        content: raw('<p data-content="plain">plain</p>'),
        collapsed: true,
      },
    });
    expect(
      host.querySelector(
        '[data-workbench-rail="left"] > .kui-workbench__panel-content > [data-content="plain"]',
      ),
    ).not.toBeNull();
    expect(order(mainToolbar(host))).toEqual(['Editor']);
    expect(host.querySelector('.kui-workbench__restore')).toBeNull();
  });

  it('relocates constant groups alone for a panel toolbar without a toggle', () => {
    const toolbar = {
      label: 'Navigator',
      constant: group('navigator-constant'),
    };
    const closed = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      mainToolbar: { label: 'Editor', title: title('Editor') },
      leftRail: {
        label: 'Navigator',
        content: raw('<p>n</p>'),
        collapsed: true,
        toolbar,
      },
    });
    expect(order(mainZone(closed, 'leading'))).toEqual([
      'navigator-constant',
      'Editor',
    ]);
    const open = render({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      leftRail: { label: 'Navigator', content: raw('<p>n</p>'), toolbar },
    });
    expect(order(panelToolbar(open, '[data-workbench-rail="left"]'))).toEqual([
      'navigator-constant',
    ]);
  });

  it('pins header and footer chrome by default and lets each scroll with the content', () => {
    const base = {
      id: 'wb',
      label: 'Studio',
      main: raw('<p data-main>main</p>'),
      mainToolbar: { label: 'Editor', title: title('Editor') },
      mainHeader: raw('<p data-header>about</p>'),
      mainFooter: raw('<p data-footer>status</p>'),
      mainBottomToolbar: { label: 'Status', trailing: group('status') },
    };
    const pane = (host: Element) =>
      host.querySelector('[data-workbench-main] > [data-component="pane"]')!;
    const pinned = pane(render(base));
    expect(
      pinned.querySelector(':scope > .kui-pane__header [data-header]'),
    ).not.toBeNull();
    expect(
      pinned.querySelector(':scope > .kui-pane__footer [data-footer]'),
    ).not.toBeNull();
    // The header chrome's single divider sits under mainHeader, the footer's
    // over mainFooter.
    expect(
      pinned
        .querySelector(
          ':scope > .kui-pane__header > [data-component="toolbar"]',
        )!
        .getAttribute('divider-sides'),
    ).toBeNull();

    const scrolling = pane(
      render({
        ...base,
        mainHeaderPlacement: 'scroll',
        mainFooterPlacement: 'scroll',
      }),
    );
    expect(scrolling.querySelector(':scope > .kui-pane__header')).toBeNull();
    expect(scrolling.querySelector(':scope > .kui-pane__footer')).toBeNull();
    const column = scrolling.querySelector(
      ':scope > .kui-pane__content > [data-component="list"]',
    )!;
    const order = [
      ...column.querySelectorAll('[data-header], [data-main], [data-footer]'),
    ].map(
      (node) =>
        [...node.attributes].find((a) => a.name.startsWith('data-'))!.name,
    );
    expect(order).toEqual(['data-header', 'data-main', 'data-footer']);

    // Only the footer scrolling keeps the header pinned.
    const footerOnly = pane(render({ ...base, mainFooterPlacement: 'scroll' }));
    expect(
      footerOnly.querySelector(':scope > .kui-pane__header [data-header]'),
    ).not.toBeNull();
    expect(
      footerOnly.querySelector(':scope > .kui-pane__content [data-footer]'),
    ).not.toBeNull();

    // A header or footer on its own still composes the Pane.
    expect(
      pane(
        render({
          id: 'wb',
          label: 'S',
          main: raw('<p>m</p>'),
          mainFooter: raw('<p data-only>f</p>'),
        }),
      ).querySelector(':scope > .kui-pane__footer [data-only]'),
    ).not.toBeNull();
    expect(
      pane(
        render({
          id: 'wb',
          label: 'S',
          main: raw('<p>m</p>'),
          mainHeader: raw('<p data-only>h</p>'),
        }),
      ).querySelector(':scope > .kui-pane__header [data-only]'),
    ).not.toBeNull();
  });
});
