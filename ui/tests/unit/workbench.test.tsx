import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { raw } from 'kerfjs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { Workbench } from '../../src/workbench.js';

const main = raw('<div class="editor">editor</div>');
const panel = (label: string) => raw(`<div>${label}</div>`);

describe('Workbench', () => {
  it('renders just the work area when no panels are given', () => {
    const html = String(Workbench({ id: 'wb', label: 'Studio', main }));
    expect(html).toContain('data-component="workbench"');
    expect(html).toContain('data-workbench-main');
    expect(html).not.toContain('data-workbench-rail');
    expect(html).not.toContain('data-workbench-drawer');
  });

  it('renders left rail, right rail, and bottom drawer with their collapsed state', () => {
    const html = String(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main,
        leftRail: {
          content: panel('nav'),
          label: 'Navigator',
          collapsed: false,
        },
        rightRail: {
          content: panel('inspector'),
          label: 'Inspector',
          collapsed: true,
        },
        bottomDrawer: {
          content: panel('console'),
          label: 'Console',
          collapsed: true,
        },
      }),
    );
    expect(html).toContain('data-workbench-rail="left" data-collapsed="false"');
    expect(html).toContain('data-workbench-rail="right" data-collapsed="true"');
    expect(html).toContain('data-workbench-drawer data-collapsed="true"');
    expect(html).toContain('aria-label="Navigator"');
    expect(html).toContain('aria-label="Inspector"');
    expect(html).toContain('aria-label="Console"');
    // Each panel's id derives from the Workbench's, for aria-controls.
    expect(html).toContain('<aside id="wb-left-rail"');
    expect(html).toContain('<aside id="wb-right-rail"');
    expect(html).toContain('<section id="wb-bottom-drawer"');
  });

  it('hides a collapsed panel, content and landmark, and leaves its restore control reachable', () => {
    const render = (collapsed: boolean) => {
      const root = document.createElement('div');
      root.innerHTML = String(
        Workbench({
          id: 'wb',
          label: 'Studio',
          main,
          leftRail: {
            content: raw('<button type="button">Hide navigator</button>'),
            collapsed,
            restoreControl: raw(
              '<button type="button">Show navigator</button>',
            ),
          },
          rightRail: {
            content: raw('<button type="button">Hide inspector</button>'),
            collapsed,
            responsiveOverlayAt: 'narrow',
          },
          bottomDrawer: {
            content: raw('<button type="button">Hide console</button>'),
            collapsed,
            restoreControl: raw('<button type="button">Show console</button>'),
          },
        }),
      );
      return root;
    };
    const contents = (root: HTMLElement) => [
      ...root.querySelectorAll<HTMLElement>('.kui-workbench__panel-content'),
    ];

    const collapsed = render(true);
    expect(contents(collapsed)).toHaveLength(3);
    for (const content of contents(collapsed))
      expect(content.hasAttribute('inert')).toBe(true);
    // The restore controls live outside the inert content.
    const restores = [
      ...collapsed.querySelectorAll<HTMLElement>('.kui-workbench__restore'),
    ];
    expect(restores).toHaveLength(2);
    for (const restore of restores)
      expect(restore.closest('[inert], [aria-hidden="true"]')).toBe(null);
    // The labeled rail/drawer itself leaves the accessibility tree too, so no
    // empty complementary/region landmark stays behind.
    const regions = [
      ...collapsed.querySelectorAll<HTMLElement>(
        '[data-workbench-rail], [data-workbench-drawer]',
      ),
    ];
    expect(regions).toHaveLength(3);
    for (const region of regions) {
      expect(region.hasAttribute('inert')).toBe(true);
      expect(region.getAttribute('aria-hidden')).toBe('true');
    }

    const expanded = render(false);
    for (const content of contents(expanded))
      expect(content.hasAttribute('inert')).toBe(false);
    expect(expanded.querySelector('[inert]')).toBe(null);
    expect(expanded.querySelector('[aria-hidden="true"][aria-label]')).toBe(
      null,
    );
  });

  it('defaults collapsed to false and omits an unset size style', () => {
    const html = String(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main,
        leftRail: { content: panel('nav') },
      }),
    );
    expect(html).toContain('data-collapsed="false"');
    expect(html).not.toContain('--kui-workbench-rail-width');
  });

  it('applies custom rail width and drawer height sizes', () => {
    const html = String(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main,
        leftRail: { content: panel('nav'), size: 320 },
        rightRail: { content: panel('inspector'), size: 260 },
        bottomDrawer: { content: panel('console'), size: 180 },
      }),
    );
    expect(html).toContain('data-workbench-rail="left" data-collapsed="false"');
    expect(html).toContain(
      'data-workbench-rail="right" data-collapsed="false"',
    );
    expect(html).toContain('--kui-workbench-rail-width: 320px');
    expect(html).toContain('--kui-workbench-rail-width: 260px');
    expect(html).toContain('--kui-workbench-drawer-height: 180px');
  });

  it('bottom-anchors drawer content so both motion directions share one origin', async () => {
    const file = resolve(import.meta.dirname, '../../src/workbench.css');
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

    expect(declarations('.kui-workbench__drawer')).toMatchObject({
      position: 'relative',
    });
    expect(
      declarations('.kui-workbench__drawer .kui-workbench__panel-content'),
    ).toMatchObject({
      position: 'absolute',
      'inset-inline': '0',
      'inset-block-end': '0',
      transition: 'transform 200ms ease',
    });
  });

  it('applies a custom className', () => {
    expect(
      String(
        Workbench({ id: 'wb', label: 'Studio', main, className: 'flush' }),
      ),
    ).toContain('kui-workbench flush');
  });

  it('projects reusable panel policies and safe-area restore controls', () => {
    const html = String(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main,
        bottomDrawer: {
          content: panel('console'),
          collapsed: true,
          separator: 'hidden',
          collapseMotion: 'fade-slide',
          contentOverflow: 'visible',
          presentation: 'overlay',
          restoreControl: raw('<button>Show console</button>'),
        },
      }),
    );
    expect(html).toContain('data-separator="hidden"');
    expect(html).toContain('data-collapse-motion="fade-slide"');
    expect(html).toContain('data-content-overflow="visible"');
    expect(html).toContain('data-presentation="overlay"');
    expect(html).toContain(
      'class="kui-workbench__restore" data-panel="bottom" data-position="bottom-end"',
    );
    expect(html).toContain('<button>Show console</button>');
  });

  it('supports per-edge restore positions and hidden responsive replacements', () => {
    const html = String(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main,
        leftRail: {
          content: panel('nav'),
          collapsed: true,
          restoreControl: raw('<button>Show nav</button>'),
        },
        rightRail: {
          content: panel('inspector'),
          collapsed: true,
          restoreControl: raw('<button>Show inspector</button>'),
        },
        bottomDrawer: {
          content: panel('console'),
          collapsed: true,
          presentation: 'hidden',
          restoreControl: raw('<button>Suppressed</button>'),
        },
      }),
    );
    expect(html).toContain(
      'data-panel="left" data-position="bottom-start"><button>Show nav</button>',
    );
    expect(html).toContain(
      'data-panel="right" data-position="bottom-end"><button>Show inspector</button>',
    );
    expect(html).toContain('data-presentation="hidden" aria-hidden="true"');
    expect(html).not.toContain('Suppressed');

    const hiddenRails = String(
      Workbench({
        id: 'hidden',
        label: 'Compact replacement',
        main,
        leftRail: { content: panel('nav'), presentation: 'hidden' },
        rightRail: { content: panel('inspector'), presentation: 'hidden' },
      }),
    );
    expect(hiddenRails.match(/aria-hidden="true"/g)).toHaveLength(2);
  });

  it('keeps resizing off by default: no handle and no resize contract', () => {
    const html = String(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main,
        leftRail: { content: panel('nav'), size: 300 },
        bottomDrawer: { content: panel('console'), resizable: false },
      }),
    );
    expect(html).not.toContain('data-kui-resize-handle');
    expect(html).not.toContain('data-resizable');
    expect(html).not.toContain('--kui-resizable-region-size');
    expect(html).toContain('--kui-workbench-rail-width: 300px');
  });

  it('renders the separator contract for each resizable panel with default limits', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main,
        leftRail: {
          content: panel('nav'),
          label: 'Navigator',
          resizable: true,
        },
        rightRail: { content: panel('inspector'), resizable: true, size: 999 },
        bottomDrawer: {
          content: panel('console'),
          resizable: { min: 100, max: 50 },
          size: 10,
        },
      }),
    );
    const left = root.querySelector<HTMLElement>(
      '[data-workbench-rail="left"]',
    )!;
    const right = root.querySelector<HTMLElement>(
      '[data-workbench-rail="right"]',
    )!;
    const drawer = root.querySelector<HTMLElement>('[data-workbench-drawer]')!;
    expect(left.dataset).toMatchObject({
      resizable: 'true',
      regionId: 'wb-left-rail',
      axis: 'horizontal',
      edge: 'end',
    });
    expect(right.dataset).toMatchObject({
      regionId: 'wb-right-rail',
      axis: 'horizontal',
      edge: 'start',
    });
    expect(drawer.dataset).toMatchObject({
      regionId: 'wb-bottom-drawer',
      axis: 'vertical',
      edge: 'start',
    });
    expect(left.style.getPropertyValue('--kui-resizable-region-size')).toBe(
      '280px',
    );
    // Sizes clamp to the limits; a max below min collapses to min.
    expect(right.style.getPropertyValue('--kui-resizable-region-size')).toBe(
      '480px',
    );
    expect(drawer.style.getPropertyValue('--kui-resizable-region-size')).toBe(
      '100px',
    );
    const handle = (element: HTMLElement) =>
      element.querySelector<HTMLElement>(':scope > [data-kui-resize-handle]')!;
    expect(handle(left).getAttribute('role')).toBe('separator');
    expect(handle(left).getAttribute('aria-label')).toBe('Resize Navigator');
    expect(handle(left).getAttribute('aria-orientation')).toBe('vertical');
    expect(handle(left).getAttribute('aria-valuemin')).toBe('180');
    expect(handle(left).getAttribute('aria-valuemax')).toBe('480');
    expect(handle(left).getAttribute('aria-valuenow')).toBe('280');
    expect(handle(left).getAttribute('tabindex')).toBe('0');
    expect(handle(right).getAttribute('aria-label')).toBe('Resize right rail');
    expect(handle(drawer).getAttribute('aria-label')).toBe(
      'Resize bottom drawer',
    );
    expect(handle(drawer).getAttribute('aria-orientation')).toBe('horizontal');
    expect(handle(drawer).getAttribute('aria-valuemax')).toBe('100');
  });

  it('keeps the resize size while collapsed and takes the handle out of the tab order', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main,
        leftRail: {
          content: panel('nav'),
          resizable: true,
          size: 320,
          collapsed: true,
        },
        rightRail: {
          content: panel('inspector'),
          resizable: true,
          presentation: 'overlay',
        },
      }),
    );
    const left = root.querySelector<HTMLElement>(
      '[data-workbench-rail="left"]',
    )!;
    expect(left.style.getPropertyValue('--kui-resizable-region-size')).toBe(
      '320px',
    );
    for (const handle of root.querySelectorAll('[data-kui-resize-handle]')) {
      expect(handle.getAttribute('tabindex')).toBe('-1');
      expect(handle.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('keeps a work-area minimum width beside any rail and height above the drawer', () => {
    const root = (props: Partial<Parameters<typeof Workbench>[0]>) => {
      const host = document.createElement('div');
      host.innerHTML = String(
        Workbench({ id: 'wb', label: 'Studio', main, ...props }),
      );
      return host.querySelector<HTMLElement>('[data-component="workbench"]')!;
    };

    const byDefault = root({
      leftRail: { content: panel('nav'), resizable: true },
    });
    expect(byDefault.dataset.mainMinSize).toBe('320');
    expect(
      byDefault.style.getPropertyValue('--_kui-workbench-main-min-width'),
    ).toBe('320px');

    const custom = root({
      rightRail: { content: panel('inspector'), resizable: { max: 400 } },
      mainMinSize: 400.4,
    });
    expect(custom.dataset.mainMinSize).toBe('400');
    expect(
      root({
        leftRail: { content: panel('nav'), resizable: true },
        mainMinSize: -5,
      }).dataset.mainMinSize,
    ).toBe('0');

    // A fixed rail keeps the work area its minimum width too.
    const fixed = root({
      leftRail: { content: panel('nav'), size: 300 },
      mainMinSize: 500,
    });
    expect(fixed.dataset.mainMinSize).toBe('500');
    expect(fixed.hasAttribute('data-main-min-height')).toBe(false);
    expect(fixed.getAttribute('style')).toBe(
      '--_kui-workbench-main-min-width:500px',
    );

    // The drawer, fixed or resizable, keeps it a minimum height.
    const drawer = root({ bottomDrawer: { content: panel('console') } });
    expect(drawer.hasAttribute('data-main-min-size')).toBe(false);
    expect(drawer.dataset.mainMinHeight).toBe('120');
    expect(drawer.getAttribute('style')).toBe(
      '--_kui-workbench-main-min-height:120px',
    );
    const both = root({
      leftRail: { content: panel('nav') },
      bottomDrawer: { content: panel('console'), resizable: true },
      mainMinHeight: 200.6,
    });
    expect(both.dataset.mainMinHeight).toBe('201');
    expect(both.getAttribute('style')).toBe(
      '--_kui-workbench-main-min-width:320px;--_kui-workbench-main-min-height:201px',
    );
    expect(
      root({
        bottomDrawer: { content: panel('console') },
        mainMinHeight: -1,
      }).dataset.mainMinHeight,
    ).toBe('0');

    // Without a panel on an axis, that axis keeps the shell as before.
    const bare = root({ mainMinSize: 500, mainMinHeight: 500 });
    expect(bare.hasAttribute('data-main-min-size')).toBe(false);
    expect(bare.hasAttribute('data-main-min-height')).toBe(false);
    expect(bare.hasAttribute('style')).toBe(false);
  });

  it('lets inline rails and the drawer give way around the work-area minimum', async () => {
    const file = resolve(import.meta.dirname, '../../src/workbench.css');
    const css = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const rule = (selector: string) => {
      const found = css.nodes.find(
        (node) =>
          node.type === 'rule' &&
          node.selector.replace(/\s+/g, ' ') === selector,
      );
      if (!found || found.type !== 'rule')
        throw new Error(`Missing ${selector} rule`);
      return Object.fromEntries(
        found.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value]),
      );
    };
    expect(
      rule('.kui-workbench[data-main-min-size] > .kui-workbench__center'),
    ).toEqual({
      'min-width': 'min(var(--_kui-workbench-main-min-width), 100%)',
    });
    expect(
      rule(
        '.kui-workbench[data-main-min-height] > .kui-workbench__center > .kui-workbench__main',
      ),
    ).toEqual({
      'min-height': 'min(var(--_kui-workbench-main-min-height), 100%)',
    });
    const expanded =
      '.kui-workbench__rail[data-presentation="inline"]:not([data-collapsed="true"]), .kui-workbench__drawer[data-presentation="inline"]:not( [data-collapsed="true"] )';
    expect(rule(expanded)).toEqual({ 'flex-shrink': '1' });
    expect(
      rule(
        '.kui-workbench__rail:where( [data-presentation="inline"]:not([data-collapsed="true"]) ) > .kui-workbench__panel-content',
      ),
    ).toEqual({ width: '100%' });
    expect(
      rule(
        '.kui-workbench__drawer:where( [data-presentation="inline"]:not([data-collapsed="true"]) ) > .kui-workbench__panel-content',
      ),
    ).toEqual({ height: '100%' });
  });

  it('renders a responsive overlay breakpoint on rails and the drawer', () => {
    const html = String(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main,
        leftRail: {
          content: panel('nav'),
          resizable: true,
          responsiveOverlayAt: 'narrow',
        },
        rightRail: {
          content: panel('inspector'),
          responsiveOverlayAt: 'compact',
        },
        bottomDrawer: {
          content: panel('console'),
          responsiveOverlayAt: 'narrow',
        },
      }),
    );
    const root = document.createElement('div');
    root.innerHTML = html;
    const attr = (selector: string) =>
      root.querySelector(selector)!.getAttribute('data-responsive-overlay-at');
    expect(attr('[data-workbench-rail="left"]')).toBe('narrow');
    expect(attr('[data-workbench-rail="right"]')).toBe('compact');
    expect(attr('[data-workbench-drawer]')).toBe('narrow');
    // The inline presentation stays the rendered state; the CSS decides.
    expect(
      root
        .querySelector('[data-workbench-rail="left"]')!
        .getAttribute('data-presentation'),
    ).toBe('inline');
    // Rails overlay below `narrow` by default and fill a compact Workbench
    // less the dismiss margin; `never` keeps a rail inline, `full` fills.
    // The drawer stays inline unless it opts in.
    const defaults = document.createElement('div');
    defaults.innerHTML = String(
      Workbench({
        id: 'wb',
        label: 'Studio',
        main,
        leftRail: { content: panel('nav') },
        rightRail: {
          content: panel('inspector'),
          responsiveOverlayAt: 'never',
          compactOverlay: 'full',
        },
        bottomDrawer: { content: panel('console') },
      }),
    );
    const left = defaults.querySelector('[data-workbench-rail="left"]')!;
    const right = defaults.querySelector('[data-workbench-rail="right"]')!;
    expect(left.getAttribute('data-responsive-overlay-at')).toBe('narrow');
    expect(left.getAttribute('data-compact-overlay')).toBe('inset');
    expect(right.hasAttribute('data-responsive-overlay-at')).toBe(false);
    expect(right.getAttribute('data-compact-overlay')).toBe('full');
    expect(
      defaults
        .querySelector('[data-workbench-drawer]')!
        .hasAttribute('data-responsive-overlay-at'),
    ).toBe(false);
  });

  it('presents opted-in rails as overlays below their Workbench container breakpoint', async () => {
    const file = resolve(import.meta.dirname, '../../src/workbench.css');
    const css = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const normalize = (selector: string) =>
      selector.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')');
    const container = css.nodes.find(
      (node) =>
        node.type === 'rule' &&
        normalize(node.selector) ===
          '.kui-workbench:has(> .kui-workbench__rail[data-responsive-overlay-at], > .kui-workbench__center > .kui-workbench__drawer[data-responsive-overlay-at])',
    );
    expect(container?.type === 'rule' && container.toString()).toContain(
      'container: kui-workbench / inline-size',
    );
    for (const [at, width] of [
      ['narrow', '704px'],
      ['compact', '448px'],
    ]) {
      const query = css.nodes.find(
        (node) =>
          node.type === 'atrule' &&
          node.name === 'container' &&
          node.params === `kui-workbench (max-width: remify(${width}))`,
      );
      if (!query || query.type !== 'atrule')
        throw new Error(`Missing ${at} container query`);
      const decls = (selector: string) => {
        const rule = query.nodes?.find(
          (node) =>
            node.type === 'rule' && normalize(node.selector) === selector,
        );
        if (!rule || rule.type !== 'rule')
          throw new Error(`Missing ${selector} in ${at}`);
        return Object.fromEntries(
          rule.nodes
            .filter((node) => node.type === 'decl')
            .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
        );
      };
      const rail = `.kui-workbench__rail[data-responsive-overlay-at="${at}"]`;
      expect(decls(rail)).toMatchObject({
        position: 'absolute',
        width: 'var(--_kui-workbench-rail-extent)',
        'inset-block': '0',
        'box-shadow': 'var(--kui-shadow-l)',
      });
      expect(decls(`${rail} > .kui-workbench__handle`)).toEqual({
        display: 'none',
      });
      expect(decls(`${rail} > .kui-workbench__panel-content`)).toEqual({
        width: '100%',
        background: 'var(--kui-color-surface)',
      });
      // A collapsed overlay keeps its box for the slide-out but paints nothing.
      expect(decls(`${rail}[data-collapsed="true"]`)).toEqual({
        background: 'transparent',
        'box-shadow': 'none',
        'pointer-events': 'none',
      });

      // The drawer overlays from the bottom at full width, with an explicit
      // height: its content is absolutely positioned, so the out-of-flow box
      // would otherwise collapse to its border.
      const drawer = `.kui-workbench__drawer[data-responsive-overlay-at="${at}"]`;
      expect(decls(drawer)).toMatchObject({
        position: 'absolute',
        height: 'var(--_kui-workbench-drawer-extent)',
        'inset-inline': '0',
        'inset-block-end': '0',
        'box-shadow': 'var(--kui-shadow-l)',
      });
      expect(decls(`${drawer} > .kui-workbench__handle`)).toEqual({
        display: 'none',
      });
      expect(decls(`${drawer} > .kui-workbench__panel-content`)).toEqual({
        height: '100%',
        background: 'var(--kui-color-surface)',
      });
      expect(decls(`${drawer}[data-collapsed="true"]`)).toEqual({
        background: 'transparent',
        'box-shadow': 'none',
        'pointer-events': 'none',
      });
      // The work area keeps its bottom safe-area inset under the overlay.
      expect(
        decls(
          `.kui-workbench__main:has(~ .kui-workbench__drawer[data-responsive-overlay-at="${at}"][data-presentation="inline"])`,
        ),
      ).toEqual({
        '--kui-edge-inset-block-end': 'var(--_kui-workbench-safe-block-end)',
      });
    }
  });

  it('sizes a static overlay rail to exactly its extent, border included', async () => {
    const file = resolve(import.meta.dirname, '../../src/workbench.css');
    const css = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const decls = (selector: string) => {
      const rule = css.nodes.find(
        (node) =>
          node.type === 'rule' &&
          node.selector.replace(/\s+/g, ' ') === selector,
      );
      if (!rule || rule.type !== 'rule') throw new Error(`Missing ${selector}`);
      return Object.fromEntries(
        rule.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
      );
    };
    // The track is the size, separator border included, whatever box model
    // the app defaults to: an out-of-flow rail used to render its content
    // width plus its 1px border (281px for a 280px rail).
    expect(decls('.kui-workbench__rail')).toMatchObject({
      'box-sizing': 'border-box',
      flex: '0 0 var(--_kui-workbench-rail-extent)',
    });
    expect(decls('.kui-workbench__drawer')).toMatchObject({
      'box-sizing': 'border-box',
    });
    // The overlay maximum caps only the rail's own (inline) axis, so it still
    // spans the Workbench's full height.
    expect(decls('.kui-workbench__rail[data-presentation="overlay"]')).toEqual({
      width: 'var(--_kui-workbench-rail-extent)',
      'max-width': 'var(--kui-workbench-overlay-max-width, 85vw)',
      'inset-block': '0',
    });
    expect(
      decls(
        '.kui-workbench__rail[data-presentation="overlay"] > .kui-workbench__panel-content',
      ),
    ).toEqual({ width: '100%', background: 'var(--kui-color-surface)' });
  });

  it("floats a collapsed rail's restore control above an expanded inline drawer, scoped to the Workbench", async () => {
    const file = resolve(import.meta.dirname, '../../src/workbench.css');
    const css = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const rules: Array<{ selector: string; decls: Record<string, string> }> =
      [];
    css.walkRules((rule) => {
      rules.push({
        selector: rule.selector.replace(/\s+/g, ' '),
        decls: Object.fromEntries(
          rule.nodes
            .filter((node) => node.type === 'decl')
            .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
        ),
      });
    });
    const withProp = (prop: string) =>
      rules.filter((rule) => prop in rule.decls);

    // The Workbench scopes the name, so neither a nested Workbench's drawer
    // nor an enclosing layout's anchor reaches across it.
    expect(withProp('anchor-scope')).toEqual([
      {
        selector: '.kui-workbench',
        decls: { 'anchor-scope': '--kui-restore-drawer' },
      },
    ]);
    // Only an expanded inline drawer publishes its top edge, at zero-ish
    // specificity so a responsive overlay drawer's container rule wins.
    expect(
      Object.fromEntries(
        withProp('anchor-name').map((rule) => [
          rule.selector,
          rule.decls['anchor-name'],
        ]),
      ),
    ).toEqual({
      '.kui-workbench__drawer:where( [data-presentation="inline"]:not([data-collapsed="true"]) )':
        '--kui-restore-drawer',
      '.kui-workbench__drawer[data-responsive-overlay-at="narrow"]': 'none',
      '.kui-workbench__drawer[data-responsive-overlay-at="compact"]': 'none',
    });
    expect(
      rules.find((rule) => rule.decls['anchor-name'] === '--kui-restore-drawer')
        ?.decls,
    ).toEqual({ 'anchor-name': '--kui-restore-drawer' });
    // A rail's control (a Workbench child) lifts above that edge and falls
    // back to the Workbench corner; the drawer's own control never anchors.
    expect(
      rules.find(
        (rule) => rule.selector === '.kui-workbench > .kui-workbench__restore',
      )?.decls,
    ).toEqual({
      'position-visibility': 'always',
      'inset-block-end':
        'calc( var(--_kui-workbench-restore-inset) + anchor(--kui-restore-drawer top, var(--_kui-workbench-safe-block-end)) )',
    });
    expect(
      rules
        .filter((rule) =>
          rule.selector.startsWith(
            '.kui-workbench__center > .kui-workbench__restore',
          ),
        )
        .some((rule) => rule.decls['inset-block-end']?.includes('anchor(')),
    ).toBe(false);
  });

  it('anchors restore controls to the Workbench, inset once even around a FloatingToolbar', async () => {
    const parse = async (name: string) => {
      const file = resolve(import.meta.dirname, `../../src/${name}`);
      return postcss.parse(await readFile(file, 'utf8'), { from: file });
    };
    const declsIn = (
      css: postcss.Root,
      selector: string,
    ): Record<string, string> => {
      const rule = css.nodes.find(
        (node) =>
          node.type === 'rule' &&
          node.selector.replace(/\s+/g, ' ') === selector,
      );
      if (!rule || rule.type !== 'rule') throw new Error(`Missing ${selector}`);
      return Object.fromEntries(
        rule.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
      );
    };
    const workbench = await parse('workbench.css');
    // The Workbench, not the viewport, is the corner's containing block, and
    // its overlays and restore controls stack within it.
    expect(declsIn(workbench, '.kui-workbench')).toMatchObject({
      position: 'relative',
      isolation: 'isolate',
    });
    expect(declsIn(workbench, '.kui-workbench__center')).toMatchObject({
      position: 'relative',
    });
    expect(declsIn(workbench, '.kui-workbench__restore')).toMatchObject({
      position: 'absolute',
      'inset-block-end':
        'calc( var(--_kui-workbench-restore-inset) + var(--_kui-workbench-safe-block-end) )',
    });
    expect(
      declsIn(
        workbench,
        '.kui-workbench__restore[data-position="bottom-start"]',
      )['inset-inline-start'],
    ).toContain('var(--_kui-workbench-safe-inline-start)');
    expect(
      declsIn(workbench, '.kui-workbench__restore[data-position="bottom-end"]')[
        'inset-inline-end'
      ],
    ).toContain('var(--_kui-workbench-safe-inline-end)');
    // The drawer's control, in the center, uses the edges the center reaches.
    expect(
      declsIn(workbench, '.kui-workbench__center > .kui-workbench__restore')[
        'inset-block-end'
      ],
    ).toContain('var(--kui-edge-inset-block-end)');
    expect(
      declsIn(
        workbench,
        '.kui-workbench__center > .kui-workbench__restore[data-position="bottom-end"]',
      )['inset-inline-end'],
    ).toContain('var(--kui-edge-inset-inline-end)');
    expect(
      declsIn(
        workbench,
        '.kui-workbench__center > .kui-workbench__restore[data-position="bottom-start"]',
      )['inset-inline-start'],
    ).toContain('var(--kui-edge-inset-inline-start)');

    expect(declsIn(workbench, '.kui-workbench__restore')).not.toHaveProperty(
      '--kui-floating-toolbar-inset',
    );
    // A FloatingToolbar resolves its inset from its token, and zeroes that
    // token itself in a restore corner, at zero specificity so its own inset
    // still wins.
    const floating = await parse('floating-toolbar.css');
    expect(
      declsIn(
        floating,
        ':where( .kui-workbench__restore, .kui-collapsible-panel__restore, .kui-resizable-region__restore ) :where(.kui-floating-toolbar)',
      ),
    ).toEqual({ '--kui-floating-toolbar-inset': '0px' });
    const own = declsIn(floating, '.kui-floating-toolbar');
    expect(own).not.toHaveProperty('--kui-floating-toolbar-inset');
    expect(own['--_kui-floating-toolbar-inset']).toBe(
      'var( --kui-floating-toolbar-inset, var(--kui-space-m, remify(16px)) )',
    );
    expect(
      declsIn(floating, '.kui-floating-toolbar[data-position$="-end"]'),
    ).toEqual({ 'inset-inline-end': 'var(--_kui-floating-toolbar-inset)' });
  });

  it('gives a static overlay drawer an explicit height instead of collapsing to its border', async () => {
    const file = resolve(import.meta.dirname, '../../src/workbench.css');
    const css = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const decls = (selector: string) => {
      const rule = css.nodes.find(
        (node) =>
          node.type === 'rule' &&
          node.selector.replace(/\s+/g, ' ') === selector,
      );
      if (!rule || rule.type !== 'rule') throw new Error(`Missing ${selector}`);
      return Object.fromEntries(
        rule.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
      );
    };
    expect(
      decls('.kui-workbench__drawer[data-presentation="overlay"]'),
    ).toEqual({
      'z-index': 'calc(var(--kui-workbench-overlay-z, 41) - 1)',
      height: 'var(--_kui-workbench-drawer-extent)',
      // Only the drawer's own (block) axis is capped; it spans the full width.
      'max-height': 'var(--kui-workbench-overlay-max-height, 85vh)',
      'inset-inline': '0',
      'inset-block-end': '0',
    });
    expect(
      decls(
        '.kui-workbench__drawer[data-presentation="overlay"] > .kui-workbench__panel-content',
      ),
    ).toEqual({
      height: '100%',
      background: 'var(--kui-color-surface)',
    });
  });

  it('stacks overlay rails above an overlay drawer, and both above restore controls', async () => {
    const file = resolve(import.meta.dirname, '../../src/workbench.css');
    const css = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const normalize = (selector: string) => selector.replace(/\s+/g, ' ');
    /** The z-index of every rule for `selector`, static or in a query. */
    const zIndexes = (selector: string) => {
      const found: string[] = [];
      css.walkRules((rule) => {
        if (
          !normalize(rule.selector)
            .split(', ')
            .some((part) => part.trim() === selector)
        )
          return;
        rule.walkDecls('z-index', (decl) => {
          found.push(normalize(decl.value));
        });
      });
      return found;
    };
    const RAIL_Z = 'var(--kui-workbench-overlay-z, 41)';
    const DRAWER_Z = 'calc(var(--kui-workbench-overlay-z, 41) - 1)';
    // A static overlay: the shared rule gives the rail the overlay z-index,
    // and the drawer's own rule, later in the file, lowers it by one.
    expect(
      zIndexes('.kui-workbench__rail[data-presentation="overlay"]'),
    ).toEqual([RAIL_Z]);
    expect(
      zIndexes('.kui-workbench__drawer[data-presentation="overlay"]'),
    ).toEqual([RAIL_Z, DRAWER_Z]);
    // A responsive overlay at each breakpoint: the same order.
    for (const at of ['narrow', 'compact']) {
      expect(
        zIndexes(`.kui-workbench__rail[data-responsive-overlay-at="${at}"]`),
      ).toEqual([RAIL_Z]);
      expect(
        zIndexes(`.kui-workbench__drawer[data-responsive-overlay-at="${at}"]`),
      ).toEqual([DRAWER_Z]);
    }
    // Restore controls stack below every overlay, tied to its z-index.
    expect(zIndexes('.kui-workbench__restore')).toEqual([
      'var( --kui-workbench-restore-z, calc(var(--kui-workbench-overlay-z, 41) - 2) )',
    ]);
  });

  it('drops a collapsed static overlay rail surface so it covers nothing', async () => {
    const file = resolve(import.meta.dirname, '../../src/workbench.css');
    const css = await readFile(file, 'utf8');
    const root = postcss.parse(css, { from: file });
    const rule = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector.includes(
          '.kui-workbench__rail[data-presentation="overlay"][data-collapsed="true"]',
        ),
    );
    if (!rule || rule.type !== 'rule') throw new Error('Missing rule');
    expect(rule.toString()).toContain('background: transparent');
    expect(rule.toString()).toContain('box-shadow: none');
    const content = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector.replace(/\s+/g, ' ') ===
          '.kui-workbench__rail[data-presentation="overlay"] > .kui-workbench__panel-content',
    );
    expect(content?.toString()).toContain(
      'background: var(--kui-color-surface)',
    );
  });
});
