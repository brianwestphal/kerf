import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { raw } from 'kerfjs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
  collapsiblePanelToggleIcon,
} from '../../src/collapsible-panel.js';

const html = (value: unknown) => String(value);

describe('CollapsiblePanel', () => {
  it('renders a docked panel with side, collapsed, label, and a sliding content wrapper', () => {
    const open = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        label: 'Navigator',
        size: 320,
        children: raw('<p>items</p>'),
      }),
    );
    expect(open).toContain('data-component="collapsible-panel"');
    expect(open).toContain('kui-collapsible-panel--left');
    expect(open).toContain('data-collapsible-panel="nav"');
    expect(open).toContain('data-side="left"');
    expect(open).toContain('data-collapsed="false"');
    expect(open).toContain('aria-label="Navigator"');
    expect(open).toContain('--kui-collapsible-panel-width: 320px');
    expect(open).toContain('class="kui-collapsible-panel__content"');
    expect(open).not.toContain('aria-hidden');

    const collapsed = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        collapsed: true,
        children: raw('<p>items</p>'),
      }),
    );
    expect(collapsed).toContain('data-collapsed="true"');
    expect(collapsed).toContain('aria-hidden="true"');
  });

  it('uses the height custom property for a bottom drawer', () => {
    const drawer = html(
      CollapsiblePanel({
        id: 'console',
        side: 'bottom',
        size: 240,
        children: raw('<x/>'),
      }),
    );
    expect(drawer).toContain('kui-collapsible-panel--bottom');
    expect(drawer).toContain('--kui-collapsible-panel-height: 240px');
  });

  it('anchors the restore control to the panel container, inset once even around a FloatingToolbar', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/collapsible-panel.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const declarations = (selector: string): Record<string, string> => {
      const rule = root.nodes.find(
        (node) => node.type === 'rule' && node.selector === selector,
      );
      if (!rule || rule.type !== 'rule')
        throw new Error(`Missing ${selector} rule`);
      return Object.fromEntries(
        rule.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
      );
    };

    // The container, not the viewport, is the corner's containing block while
    // a restore control is shown; zero specificity lets an app's own
    // positioning of that container win.
    expect(
      declarations(':where(:has(> .kui-collapsible-panel__restore))'),
    ).toEqual({
      position: 'relative',
      isolation: 'isolate',
      'anchor-scope': '--kui-restore-drawer',
    });
    const corner = declarations('.kui-collapsible-panel__restore');
    expect(corner).toMatchObject({
      position: 'absolute',
      '--kui-floating-toolbar-inset': '0px',
    });
    // Without anchor positioning, the first inset-block-end (the container's
    // bottom edge) is the one that applies.
    const cornerRule = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector === '.kui-collapsible-panel__restore',
    );
    if (cornerRule?.type !== 'rule') throw new Error('Missing corner rule');
    const blockEnds = cornerRule.nodes
      .filter((node) => node.type === 'decl' && node.prop === 'inset-block-end')
      .map((node) => (node.type === 'decl' ? node.value : ''));
    expect(blockEnds).toHaveLength(2);
    expect(blockEnds[0]!.replace(/\s+/g, ' ')).toContain(
      'var(--_kui-collapsible-panel-restore-inset) + var( --kui-edge-inset-block-end,',
    );
    expect(
      declarations(
        '.kui-collapsible-panel__restore[data-position="bottom-start"]',
      )['inset-inline-start'],
    ).toContain('--kui-edge-inset-inline-start');
    expect(
      declarations(
        '.kui-collapsible-panel__restore[data-position="bottom-end"]',
      )['inset-inline-end'],
    ).toContain('--kui-edge-inset-inline-end');
  });

  it('stacks the restore control beneath an open overlay and its backdrop, tied to the overlay z-index', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/collapsible-panel.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const zIndex = (selector: string): string => {
      const rule = root.nodes.find(
        (node) => node.type === 'rule' && node.selector === selector,
      );
      if (rule?.type !== 'rule') throw new Error(`Missing ${selector} rule`);
      const decl = rule.nodes.find(
        (node) => node.type === 'decl' && node.prop === 'z-index',
      );
      if (decl?.type !== 'decl') throw new Error(`No z-index on ${selector}`);
      return decl.value.replace(/\s+/g, ' ');
    };

    // An open overlay is the top layer (the Workbench rule). The backdrop sits
    // one below the overlay and the restore control two below, so a moved
    // overlay z-index moves both and the control never floats over the
    // backdrop or the open panel.
    expect(
      zIndex(
        '[data-collapsible-overlay="true"] .kui-collapsible-panel,\n.kui-collapsible-panel[data-presentation="overlay"]',
      ),
    ).toBe('var(--kui-collapsible-panel-overlay-z, 40)');
    expect(zIndex('.kui-collapsible-panel__backdrop')).toBe(
      'var( --kui-collapsible-panel-backdrop-z, calc(var(--kui-collapsible-panel-overlay-z, 40) - 1) )',
    );
    expect(zIndex('.kui-collapsible-panel__restore')).toBe(
      'var( --kui-collapsible-panel-restore-z, calc(var(--kui-collapsible-panel-overlay-z, 40) - 2) )',
    );
  });

  it('lifts the restore corner above an expanded drawer beside the panel, but not one nested in the work area', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/collapsible-panel.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const rule = (selector: string) => {
      const found = root.nodes.find(
        (node) =>
          node.type === 'rule' &&
          node.selector.replace(/\s+/g, ' ') === selector,
      );
      if (found?.type !== 'rule') throw new Error(`Missing ${selector} rule`);
      return found.nodes.flatMap((node) =>
        node.type === 'decl'
          ? [[node.prop, node.value.replace(/\s+/g, ' ')] as const]
          : [],
      );
    };

    // Only an expanded, inline bottom drawer publishes the anchor.
    expect(
      rule(
        '.kui-collapsible-panel--bottom[data-presentation="inline"]:not( [data-collapsed="true"], [data-collapsible-overlay="true"] *, [data-collapsible-responsive="hidden"] * )',
      ),
    ).toEqual([['anchor-name', '--kui-restore-drawer']]);
    // Drawers at depth three or more below the restore's container are
    // another layout's, so they are scoped out of the corner's lookup.
    expect(
      rule(':where(:has(> .kui-collapsible-panel__restore)) > * > * > *'),
    ).toEqual([['anchor-scope', '--kui-restore-drawer']]);
    // The corner floats above the drawer's top edge, falling back to the
    // container's bottom edge when no drawer is in scope.
    const blockEnds = rule('.kui-collapsible-panel__restore').filter(
      ([prop]) => prop === 'inset-block-end',
    );
    expect(blockEnds[1]![1]).toBe(
      'calc( var(--_kui-collapsible-panel-restore-inset) + anchor( --kui-restore-drawer top, var( --kui-edge-inset-block-end, var(--kui-safe-area-block-end, env(safe-area-inset-bottom, 0px)) ) ) )',
    );
  });

  it('bottom-anchors drawer content so the slide has one stable motion origin', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/collapsible-panel.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const declarations = (selector: string) => {
      const rule = root.nodes.find(
        (node) => node.type === 'rule' && node.selector === selector,
      );
      if (!rule || rule.type !== 'rule')
        throw new Error(`Missing ${selector} rule`);
      return Object.fromEntries(
        rule.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value]),
      );
    };

    expect(declarations('.kui-collapsible-panel--bottom')).toMatchObject({
      position: 'relative',
    });
    expect(
      declarations(
        '.kui-collapsible-panel--bottom .kui-collapsible-panel__content',
      ),
    ).toMatchObject({
      position: 'absolute',
      'inset-inline': '0',
      'inset-block-end': '0',
    });
    expect(declarations('.kui-collapsible-panel__content')).toMatchObject({
      transition: 'transform 200ms ease',
    });
  });

  it('projects panel policies and renders a collapsed safe-area restore control', () => {
    const drawer = html(
      CollapsiblePanel({
        id: 'console',
        side: 'bottom',
        collapsed: true,
        separator: 'hidden',
        collapseMotion: 'fade-slide',
        contentOverflow: 'visible',
        presentation: 'overlay',
        restoreControl: raw('<button>Show console</button>'),
        children: raw('<x/>'),
      }),
    );
    expect(drawer).toContain('data-separator="hidden"');
    expect(drawer).toContain('data-collapse-motion="fade-slide"');
    expect(drawer).toContain('data-content-overflow="visible"');
    expect(drawer).toContain('data-presentation="overlay"');
    expect(drawer).toContain(
      'class="kui-collapsible-panel__restore" data-panel-restore="console" data-position="bottom-end"',
    );
    const replacement = html(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        collapsed: true,
        presentation: 'hidden',
        restoreControl: raw('<button>Suppressed</button>'),
        restorePosition: 'bottom-end',
      }),
    );
    expect(replacement).toContain('data-presentation="hidden"');
    expect(replacement).toContain('aria-hidden="true"');
    expect(replacement).not.toContain('Suppressed');
  });

  it('picks the standard per-side collapse/expand glyph', () => {
    expect(collapsiblePanelToggleIcon('left', false).name).toBe(
      'panel-left-close',
    );
    expect(collapsiblePanelToggleIcon('left', true).name).toBe(
      'panel-left-open',
    );
    expect(collapsiblePanelToggleIcon('right', false).name).toBe(
      'panel-right-close',
    );
    expect(collapsiblePanelToggleIcon('right', true).name).toBe(
      'panel-right-open',
    );
    expect(collapsiblePanelToggleIcon('bottom', false).name).toBe(
      'panel-bottom-close',
    );
    expect(collapsiblePanelToggleIcon('bottom', true).name).toBe(
      'panel-bottom-open',
    );
  });

  it('renders a standard toggle button with the action, aria-expanded, and target', () => {
    const collapse = html(
      CollapsiblePanelToggle({
        side: 'left',
        collapsed: false,
        action: 'toggle-nav',
        panelId: 'nav',
      }),
    );
    expect(collapse).toContain('data-action="toggle-nav"');
    expect(collapse).toContain('data-collapsible-target="nav"');
    expect(collapse).toContain('aria-expanded="true"');
    expect(collapse).toContain('aria-label="Collapse"');
    expect(collapse).toContain('data-lucide="panel-left-close"');

    const expand = html(
      CollapsiblePanelToggle({
        side: 'left',
        collapsed: true,
        action: 'toggle-nav',
        label: 'Show navigator',
      }),
    );
    expect(expand).toContain('aria-expanded="false"');
    expect(expand).toContain('aria-label="Show navigator"');
    expect(expand).toContain('data-lucide="panel-left-open"');
  });
});
