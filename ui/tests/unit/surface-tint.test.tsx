import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { paneConfigProps } from '../../src/components/layout/pane/internal/pane-config-props.js';
import { Pane } from '../../src/components/layout/pane/pane.js';
import { NavStack } from '../../src/components/navigation/nav-stack/nav-stack.js';
import { TabNavigator } from '../../src/components/navigation/tab-navigator/tab-navigator.js';
import { fillColor } from '../../src/css-values.js';
import {
  joinStyles,
  surfaceTintAttributes,
} from '../../src/shared/styles/surface-tint.js';

// KF-RYZ0HJ scoped tint: a `tint` ({ color, scheme }) marks a layout root as a
// tint scope. foundation.css re-declares the palette there and re-derives the
// base surface and text tokens from the color with relative color syntax.

const foundation = postcss.parse(
  readFileSync(
    resolve(import.meta.dirname, '../../src/foundation.css'),
    'utf8',
  ),
);

describe('surface tint', () => {
  it('renders the scheme, the Web Awesome scheme class, and the color', () => {
    expect(surfaceTintAttributes(undefined)).toEqual({
      'data-kui-tint': undefined,
      className: '',
      style: undefined,
    });
    expect(
      surfaceTintAttributes({ color: fillColor('#2962ff'), scheme: 'dark' }),
    ).toEqual({
      'data-kui-tint': 'dark',
      className: 'wa-dark',
      style: '--_kui-tint-color:#2962ff',
    });
    expect(
      surfaceTintAttributes({
        color: fillColor('#1b2438'),
        scheme: 'dark',
        accent: fillColor('#ff4081'),
      }),
    ).toEqual({
      'data-kui-tint': 'dark',
      'data-kui-tint-accent': '',
      className: 'wa-dark',
      style: '--_kui-tint-color:#1b2438;--_kui-tint-accent:#ff4081',
    });
    expect(joinStyles(undefined, undefined)).toBeUndefined();
    expect(joinStyles('a:1', undefined, 'b:2')).toBe('a:1;b:2');
  });

  it('Pane combines a tint with a background and forwards it through PaneConfig', () => {
    const html = String(
      Pane({
        className: 'album',
        background: fillColor('#111'),
        tint: { color: fillColor('#2962ff'), scheme: 'dark' },
        children: <span>Tracks</span>,
      }),
    );
    expect(html).toContain('class="kui-pane wa-dark album"');
    expect(html).toContain('data-kui-tint="dark"');
    expect(html).toContain(
      'style="--_kui-pane-background:#111;--_kui-tint-color:#2962ff"',
    );
    const tint = { color: fillColor('#ffd60a'), scheme: 'light' } as const;
    expect(paneConfigProps({ tint }).tint).toBe(tint);
    // The attribute is Pane-owned.
    const forged = String(
      Pane({
        children: <span>Tracks</span>,
        // @ts-expect-error data-kui-tint is Pane-owned
        rootAttributes: { 'data-kui-tint': 'dark' },
      }),
    );
    expect(forged).not.toContain('data-kui-tint');
  });

  it('NavStack and TabNavigator tint their roots, and a tab tints its scene', () => {
    const stack = String(
      NavStack({
        id: 'stack',
        label: 'Stack',
        tint: { color: fillColor('#e6edfb'), scheme: 'light' },
        views: [{ key: 'home', content: <span>Home</span> }],
      }),
    );
    expect(stack).toContain('class="kui-nav-stack wa-light"');
    expect(stack).toContain('data-kui-tint="light"');
    const tabs = String(
      TabNavigator({
        id: 'tabs',
        label: 'Sections',
        active: 'a',
        tint: { color: fillColor('#1b2438'), scheme: 'dark' },
        tabs: [
          {
            id: 'a',
            label: 'A',
            content: <span>A</span>,
            tint: { color: fillColor('#ff4081'), scheme: 'light' },
          },
        ],
      }),
    );
    expect(tabs).toContain('class="kui-tab-scaffold wa-dark"');
    expect(tabs).toContain('class="kui-tab-scaffold__scene wa-light"');
    expect(tabs).toContain('style="--_kui-tint-color:#ff4081"');
  });

  it('re-declares the palette in the tint scope, gated on relative color syntax and contrast', () => {
    const selectors: string[] = [];
    foundation.walkRules((rule) => {
      if (
        rule.some(
          (node) => node.type === 'decl' && node.prop === '--kui-color-surface',
        )
      )
        selectors.push(rule.selector.replace(/\s+/g, ' '));
    });
    expect(selectors).toEqual([':root, [data-kui-tint]']);

    const tintRules: string[] = [];
    foundation.walkRules(/^\[data-kui-tint="(light|dark)"\]$/, (rule) => {
      const at: string[] = [];
      for (
        let node = rule.parent;
        node && node.type === 'atrule';
        node = node.parent
      )
        at.push((node as postcss.AtRule).params);
      if (
        rule.some(
          (node) => node.type === 'decl' && node.prop.startsWith('--wa-'),
        )
      )
        tintRules.push(`${at.reverse().join(' > ')} ${rule.selector}`);
    });
    const accentRules: string[] = [];
    foundation.walkRules(
      /^\[data-kui-tint="(light|dark)"\]\[data-kui-tint-accent\]$/,
      (rule) => {
        const props = rule.nodes
          .filter((node): node is postcss.Declaration => node.type === 'decl')
          .map((decl) => decl.prop);
        accentRules.push(`${rule.selector} ${props.join(',')}`);
      },
    );
    expect(accentRules).toEqual([
      '[data-kui-tint="light"][data-kui-tint-accent] --wa-color-brand-fill-loud,--wa-color-brand-on-loud,--wa-color-brand-on-quiet,--kui-color-brand-on-fill,--wa-color-focus',
      '[data-kui-tint="dark"][data-kui-tint-accent] --wa-color-brand-fill-loud,--wa-color-brand-on-loud,--wa-color-brand-on-quiet,--kui-color-brand-on-fill,--wa-color-focus',
    ]);
    expect(tintRules).toEqual([
      '(color: oklch(from red l c h)) > not (prefers-contrast: more) [data-kui-tint="light"]',
      '(color: oklch(from red l c h)) > not (prefers-contrast: more) [data-kui-tint="dark"]',
    ]);
  });
});
