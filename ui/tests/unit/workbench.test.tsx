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

  it('keeps a minimum work-area width only beside a resizable rail', () => {
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

    // Fixed rails and a resizable drawer keep the shell exactly as before.
    for (const fixed of [
      root({
        leftRail: { content: panel('nav'), size: 300 },
        mainMinSize: 500,
      }),
      root({ bottomDrawer: { content: panel('console'), resizable: true } }),
    ]) {
      expect(fixed.hasAttribute('data-main-min-size')).toBe(false);
      expect(fixed.hasAttribute('style')).toBe(false);
    }
  });

  it('lets resizable inline rails shrink in proportion around the work-area minimum', async () => {
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
    const expanded =
      '.kui-workbench__rail[data-resizable="true"][data-presentation="inline"]:not( [data-collapsed="true"] )';
    expect(rule(expanded)).toEqual({ 'flex-shrink': '1' });
    expect(rule(`${expanded} > .kui-workbench__panel-content`)).toEqual({
      width: '100%',
    });
  });
});
