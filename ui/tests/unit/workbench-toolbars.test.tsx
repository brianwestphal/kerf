import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { ToolbarControlGroup } from '../../src/components/actions/toolbar-control-group/toolbar-control-group.js';
import {
  Workbench,
  type WorkbenchPanel,
  type WorkbenchStaticPanel,
} from '../../src/components/layout/workbench/workbench.js';

const group = (name: string, relocateOnCollapse = false) => (
  <ToolbarControlGroup relocateOnCollapse={relocateOnCollapse}>
    <button type="button" data-group={name}>
      {name}
    </button>
  </ToolbarControlGroup>
);
const title = (text: string) =>
  raw(`<h2 data-component="toolbar-text" data-title="${text}">${text}</h2>`);

const rail = (
  name: string,
  collapsed: boolean,
  extra: Partial<WorkbenchStaticPanel> = {},
): WorkbenchStaticPanel => ({
  label: name,
  content: raw(`<p data-content="${name}">${name}</p>`),
  collapsed,
  toolbar: {
    label: name,
    title: title(name),
    leading: group(`${name}-only`),
    trailing: group(`${name}-constant`, true),
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
const mainZone = (host: Element, zone: 'leading' | 'center' | 'trailing') =>
  mainToolbar(host)!.querySelector(`.kui-toolbar__${zone}`);
const panelToolbar = (host: Element, selector: string) =>
  host.querySelector(`${selector} .kui-toolbar`);

describe('Workbench panel toolbars', () => {
  it('hosts per-view navigation chrome and keeps the standard right-rail toggle last through collapse', () => {
    const views = [
      {
        key: 'collection',
        toolbar: { title: 'Tickets' },
        header: raw('<h2>Collection header</h2>'),
        content: raw('<p>Collection content</p>'),
      },
      {
        key: 'detail',
        toolbar: {
          title: 'T-42',
          trailing: group('detail-share', true),
        },
        header: raw('<h2>Detail header</h2>'),
        content: raw('<p>Detail content</p>'),
      },
    ];
    const panel = (depth: number, collapsed: boolean) => ({
      label: 'Tickets',
      toolbar: {
        label: 'Ticket rail',
        toggle: { action: 'toggle-tickets', name: 'tickets' },
      },
      navStack: {
        id: 'ticket-nav',
        label: 'Ticket navigation',
        views: views.slice(0, depth),
      },
      collapsed,
    });
    const props = (depth: number, collapsed = false) => ({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>Main</p>'),
      mainToolbar: { label: 'Main toolbar' },
      rightRail: panel(depth, collapsed),
    });

    const root = render(props(1));
    const rootRail = root.querySelector('[data-workbench-rail="right"]')!;
    expect(
      rootRail.querySelectorAll('[data-component="toolbar"]'),
    ).toHaveLength(1);
    expect(rootRail.querySelector('[data-nav-back]')).toBeNull();
    expect(
      rootRail.querySelector(
        '.kui-nav-stack__view[data-nav-active="true"] [data-nav-stack-header]',
      )?.textContent,
    ).toBe('Collection header');
    expect(rootRail.querySelectorAll('.kui-nav-stack__view')).toHaveLength(1);

    const detail = render(props(2));
    const detailRail = detail.querySelector('[data-workbench-rail="right"]')!;
    expect(
      detailRail.querySelectorAll('[data-component="toolbar"]'),
    ).toHaveLength(1);
    expect(detailRail.querySelector('[data-nav-back]')).not.toBeNull();
    expect(
      detailRail.querySelector(
        '.kui-nav-stack__view[data-nav-active="true"] [data-nav-stack-header]',
      )?.textContent,
    ).toBe('Detail header');
    expect(order(detailRail.querySelector('.kui-toolbar__trailing'))).toEqual([
      'detail-share',
      'toggle:Hide tickets',
    ]);
    expect(detailRail.querySelectorAll('.kui-nav-stack__view')).toHaveLength(2);

    const collapsed = render(props(2, true));
    expect(order(mainZone(collapsed, 'trailing'))).toEqual([
      'detail-share',
      'toggle:Show tickets',
    ]);
    expect(
      collapsed.querySelector(
        '[data-workbench-rail="right"] [data-workbench-toggle]',
      ),
    ).not.toBeNull();

    const emptied = render(props(0, true));
    expect(order(mainZone(emptied, 'trailing'))).toEqual([
      'toggle:Show tickets',
    ]);
    const refilled = render(props(1, true));
    expect(order(mainZone(refilled, 'trailing'))).toEqual([
      'toggle:Show tickets',
    ]);
  });

  it('composes an open panel toolbar: title and unmarked groups lead; marked groups and the toggle trail', () => {
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

  it("leads the work-area toolbar with a collapsed left rail's marked groups and toggle, before the title", () => {
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

  it("ends the work-area toolbar with a collapsed right rail's marked groups and then its toggle", () => {
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

  it('keeps mixed groups in their chosen open zones and relocates only marked groups in zone order', () => {
    const toolbar = {
      label: 'Navigator',
      title: title('Navigator'),
      leading: [group('leading-persistent', true), group('leading-local')],
      center: [group('center-local'), [group('center-persistent', true)]],
      trailing: [group('trailing-persistent', true), group('trailing-local')],
      toggle: { action: 'toggle-navigator', name: 'navigator' },
    };
    const props = (collapsed: boolean, side: 'left' | 'right') => ({
      id: 'wb',
      label: 'Studio',
      main: raw('<p>main</p>'),
      mainToolbar: {
        label: 'Editor',
        title: title('Editor'),
        trailing: group('editor-trailing'),
      },
      [side === 'left' ? 'leftRail' : 'rightRail']: {
        label: 'Navigator',
        content: raw('<p>files</p>'),
        collapsed,
        toolbar,
      },
    });

    const open = render(props(false, 'left'));
    const panel = panelToolbar(open, '[data-workbench-rail="left"]')!;
    expect(order(panel.querySelector('.kui-toolbar__leading'))).toEqual([
      'Navigator',
      'leading-persistent',
      'leading-local',
    ]);
    expect(order(panel.querySelector('.kui-toolbar__center'))).toEqual([
      'center-local',
      'center-persistent',
    ]);
    expect(order(panel.querySelector('.kui-toolbar__trailing'))).toEqual([
      'trailing-persistent',
      'trailing-local',
      'toggle:Hide navigator',
    ]);
    expect(order(mainToolbar(open))).toEqual(['Editor', 'editor-trailing']);

    const leftClosed = render(props(true, 'left'));
    expect(order(mainZone(leftClosed, 'leading'))).toEqual([
      'leading-persistent',
      'center-persistent',
      'trailing-persistent',
      'toggle:Show navigator',
      'Editor',
    ]);
    expect(order(mainZone(leftClosed, 'trailing'))).toEqual([
      'editor-trailing',
    ]);
    const rightClosed = render(props(true, 'right'));
    expect(order(mainZone(rightClosed, 'trailing'))).toEqual([
      'editor-trailing',
      'leading-persistent',
      'center-persistent',
      'trailing-persistent',
      'toggle:Show navigator',
    ]);
    expect(order(mainToolbar(render(props(false, 'right'))))).toEqual([
      'Editor',
      'editor-trailing',
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

  it('relocates marked groups alone for a panel toolbar without a toggle', () => {
    const toolbar = {
      label: 'Navigator',
      trailing: group('navigator-constant', true),
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

    const mixed = pane(render({ ...base, mainHeaderPlacement: 'scroll' }));
    expect(
      mixed.querySelector(':scope > .kui-pane__content [data-header]'),
    ).not.toBeNull();
    expect(
      mixed.querySelector(':scope > .kui-pane__footer [data-footer]'),
    ).not.toBeNull();

    // `auto` keeps the chrome pinned in the markup and hands the choice to
    // the Pane, which lets it scroll with the content only when short; the
    // other placements leave the Pane at its default.
    expect(pinned.getAttribute('data-chrome-placement')).toBeNull();
    const auto = pane(render({ ...base, mainHeaderPlacement: 'auto' }));
    expect(auto.getAttribute('data-chrome-placement')).toBe('auto');
    expect(
      auto.querySelector(':scope > .kui-pane__header [data-header]'),
    ).not.toBeNull();
    expect(
      auto.querySelector(':scope > .kui-pane__footer [data-footer]'),
    ).not.toBeNull();
    expect(
      pane(render({ ...base, mainFooterPlacement: 'auto' })).getAttribute(
        'data-chrome-placement',
      ),
    ).toBe('auto');

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

  it('forwards toolbar configuration to every toolbar it composes, drawing no toolbar dividers by default', () => {
    const config = {
      dividerSides: 'tb' as const,
      centerAlign: 'stretch' as const,
      responsive: 'stack' as const,
      responsiveAt: 'compact' as const,
      safeAreaEdges: ['block-start'] as const,
    };
    const configured = rail('Files', false);
    configured.toolbar = {
      ...configured.toolbar!,
      ...config,
      center: group('files-center'),
      toggle: {
        action: 'toggle-files',
        name: 'Files',
        showLabel: 'Afficher les fichiers',
        hideLabel: 'Masquer les fichiers',
      },
    };
    const host = render({
      id: 'studio',
      label: 'Studio',
      main: raw('<p data-main>main</p>'),
      mainToolbar: { label: 'Editor', title: title('Editor'), ...config },
      mainBottomToolbar: {
        label: 'Status',
        center: group('status-center'),
        ...config,
      },
      leftRail: configured,
    });
    const toolbars = [
      mainToolbar(host)!,
      host.querySelector(
        '[data-workbench-main] > [data-component="pane"] > .kui-pane__footer .kui-toolbar',
      )!,
      panelToolbar(host, '#studio-left-rail')!,
    ];
    for (const toolbar of toolbars) {
      expect(toolbar.getAttribute('divider-sides')).toBe('tb');
      expect(toolbar.getAttribute('data-center-align')).toBe('stretch');
      expect(toolbar.getAttribute('data-responsive')).toBe('stack');
      expect(toolbar.getAttribute('data-responsive-at')).toBe('compact');
      expect(toolbar.getAttribute('data-safe-area-block-start')).toBe('true');
    }
    expect(
      toolbars[1]!.querySelector('.kui-toolbar__center [data-group]'),
    ).not.toBeNull();
    expect(
      toolbars[2]!.querySelector(
        '.kui-toolbar__center [data-group="files-center"]',
      ),
    ).not.toBeNull();
    expect(
      toolbars[2]!
        .querySelector('[data-workbench-toggle]')!
        .getAttribute('aria-label'),
    ).toBe('Masquer les fichiers');

    // Collapsed, the relocated toggle takes the show label.
    const collapsed = render({
      id: 'studio',
      label: 'Studio',
      main: raw('<p data-main>main</p>'),
      mainToolbar: { label: 'Editor' },
      leftRail: { ...configured, collapsed: true },
    });
    expect(
      mainToolbar(collapsed)!
        .querySelector('[data-workbench-toggle]')!
        .getAttribute('aria-label'),
    ).toBe('Afficher les fichiers');

    // Without configuration no toolbar draws a divider: each Pane draws its
    // chrome dividers from the scroll state instead.
    const defaults = render({
      id: 'studio',
      label: 'Studio',
      main: raw('<p data-main>main</p>'),
      mainToolbar: { label: 'Editor' },
      mainBottomToolbar: { label: 'Status' },
      leftRail: rail('Files', false),
    });
    expect(mainToolbar(defaults)!.getAttribute('divider-sides')).toBeNull();
    expect(
      defaults
        .querySelector(
          '[data-workbench-main] > [data-component="pane"] > .kui-pane__footer .kui-toolbar',
        )!
        .getAttribute('divider-sides'),
    ).toBeNull();
    expect(
      panelToolbar(defaults, '#studio-left-rail')!.getAttribute(
        'divider-sides',
      ),
    ).toBeNull();
    for (const pane of defaults.querySelectorAll('[data-component="pane"]'))
      expect(pane.hasAttribute('data-chrome-dividers')).toBe(false);
  });

  it('forwards Pane and header/footer List configuration, keeping the defaults', () => {
    const base = {
      id: 'studio',
      label: 'Studio',
      main: raw('<p data-main>main</p>'),
      mainToolbar: { label: 'Editor' },
      mainHeader: raw('<p data-header>about</p>'),
      mainFooter: raw('<p data-footer>status</p>'),
      leftRail: rail('Files', false),
    };
    const workArea = (host: Element) =>
      host.querySelector('[data-workbench-main] > [data-component="pane"]')!;
    const railPane = (host: Element) =>
      host.querySelector('#studio-left-rail [data-component="pane"]')!;
    const chrome = (host: Element, slot: 'header' | 'footer') =>
      workArea(host).querySelector(
        `:scope > .kui-pane__${slot} > [data-component="list"]`,
      )!;

    const host = render({
      ...base,
      mainPane: {
        contentElement: 'section',
        contentLabel: 'Document',
        separators: ['inline-start'],
        safeAreaEdges: ['block-end'],
        chromeDividers: 'always',
        appearance: 'sunken',
      },
      mainHeaderList: {
        dividerSides: 't',
        gap: 's',
        hAlign: 'center',
        vAlign: 'middle',
        textInsets: 'rl',
        controlInsets: 'tb',
      },
      mainFooterList: { dividerSides: 'b', gap: true },
      leftRail: {
        ...rail('Files', false),
        pane: {
          contentElement: 'nav',
          contentLabel: 'Files',
          chromeDividers: 'none',
          appearance: 'sunken',
        },
      },
    });
    const main = workArea(host);
    expect(main.getAttribute('data-chrome-dividers')).toBe('always');
    expect(main.getAttribute('data-appearance')).toBe('sunken');
    expect(railPane(host).getAttribute('data-chrome-dividers')).toBe('none');
    expect(railPane(host).getAttribute('data-appearance')).toBe('sunken');
    const content = main.querySelector(':scope > .kui-pane__content')!;
    expect(content.tagName).toBe('SECTION');
    expect(content.getAttribute('aria-label')).toBe('Document');
    expect(main.getAttribute('data-separator-inline-start')).toBe('true');
    expect(main.getAttribute('data-safe-area-block-end')).toBe('true');
    expect(main.getAttribute('data-safe-area-block-start')).toBe('false');
    const header = chrome(host, 'header');
    expect(header.getAttribute('divider-sides')).toBe('t');
    expect(header.getAttribute('data-gap')).toBe('true');
    expect(header.getAttribute('data-h-align')).toBe('center');
    expect(header.getAttribute('data-v-align')).toBe('middle');
    expect(header.getAttribute('data-text-insets')).toBe('rl');
    expect(header.getAttribute('data-control-insets')).toBe('tb');
    expect(chrome(host, 'footer').getAttribute('divider-sides')).toBe('b');
    const nav = railPane(host).querySelector(':scope > .kui-pane__content')!;
    expect(nav.tagName).toBe('NAV');
    expect(nav.getAttribute('aria-label')).toBe('Files');

    // Omitted and explicitly undefined configuration both keep the defaults,
    // rendering exactly what an unconfigured Workbench renders.
    const plain = render(base);
    const undefinedConfig = render({
      ...base,
      mainPane: {
        contentElement: undefined,
        contentLabel: undefined,
        separators: undefined,
        safeAreaEdges: undefined,
        chromeDividers: undefined,
      },
      mainHeaderList: { dividerSides: undefined, gap: undefined },
      mainFooterList: {},
      leftRail: {
        ...rail('Files', false),
        pane: { contentElement: undefined, separators: undefined },
      },
    });
    expect(undefinedConfig.innerHTML).toBe(plain.innerHTML);
    expect(
      workArea(plain).querySelector(':scope > .kui-pane__content')!.tagName,
    ).toBe('DIV');
    expect(workArea(plain).getAttribute('data-safe-area-block-start')).toBe(
      'true',
    );
    expect(chrome(plain, 'header').getAttribute('divider-sides')).toBeNull();
    expect(chrome(plain, 'footer').getAttribute('divider-sides')).toBeNull();
    expect(
      railPane(plain).querySelector(':scope > .kui-pane__content')!.tagName,
    ).toBe('DIV');
  });

  it('floats a collapsed panel restore in its restorePosition corner', () => {
    const host = render({
      id: 'studio',
      label: 'Studio',
      main: raw('<p data-main>main</p>'),
      leftRail: rail('Files', true, { restorePosition: 'bottom-end' }),
    });
    expect(
      host
        .querySelector(
          '.kui-workbench__restore [data-component="floating-toolbar"]',
        )!
        .getAttribute('data-position'),
    ).toBe('bottom-end');
  });
});
