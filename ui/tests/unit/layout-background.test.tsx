import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { paneConfigProps } from '../../src/components/layout/pane/internal/pane-config-props.js';
import { Pane } from '../../src/components/layout/pane/pane.js';
import { NavStack } from '../../src/components/navigation/nav-stack/nav-stack.js';
import { TabNavigator } from '../../src/components/navigation/tab-navigator/tab-navigator.js';
import { fillColor, uiColor } from '../../src/css-values.js';

// KF-C7GSDQ layout backgrounds: Pane, NavStack, and TabNavigator (and each
// TabNavigator scene) take a typed `background` color. The color travels as a
// component-private custom property behind a `data-background` gate; omitted,
// every surface keeps its default.

const components = resolve(import.meta.dirname, '../../src/components');

function rules(file: string) {
  const root = postcss.parse(readFileSync(resolve(components, file), 'utf8'));
  const found: { selector: string; media: string; decls: string[] }[] = [];
  root.walkRules((rule) => {
    const parent = rule.parent as postcss.AtRule | postcss.Root;
    found.push({
      selector: rule.selector.replace(/\s+/g, ' '),
      media: parent.type === 'atrule' ? parent.params : '',
      decls: rule.nodes
        .filter((node): node is postcss.Declaration => node.type === 'decl')
        .map((decl) => `${decl.prop}:${decl.value.replace(/\s+/g, ' ')}`),
    });
  });
  return found;
}

describe('layout backgrounds', () => {
  it('Pane carries its color as a private property and gates it on data-background', () => {
    const html = String(
      Pane({
        background: fillColor('#1f2a44'),
        children: <span>Content</span>,
      }),
    );
    expect(html).toContain('data-background=""');
    expect(html).toContain('style="--_kui-pane-background:#1f2a44"');

    const plain = String(Pane({ children: <span>Content</span> }));
    expect(plain).not.toContain('data-background');
    expect(plain).not.toContain('style=');
  });

  it('Pane background replaces the sunken fill, so no grain is drawn', () => {
    const css = rules('layout/pane/pane.css');
    expect(
      css.find((rule) => rule.selector === '.kui-pane[data-background]')?.decls,
    ).toEqual([
      'background:var(--_kui-pane-background)',
      // The app color is a region in the surface context (foundation.css).
      '--kui-color-surface-current-region:var(--_kui-pane-background)',
    ]);
    expect(
      css.find((rule) =>
        rule.selector.startsWith(
          '.kui-pane[data-background][data-appearance="sunken"] > .kui-pane__content',
        ),
      )?.decls,
    ).toEqual([
      // The transparent slots keep the root's surface context.
      '--kui-color-surface-current:inherit',
      '--kui-color-surface-current-region:inherit',
      '--kui-color-surface-current-tint:inherit',
      'background:transparent',
    ]);
    expect(
      css.find(
        (rule) =>
          rule.media === '(forced-colors: active)' &&
          rule.selector === '.kui-pane[data-background]',
      )?.decls,
    ).toEqual(['background:Canvas']);
  });

  it('a composite forwards PaneConfig.background to its Pane', () => {
    expect(
      paneConfigProps({ background: uiColor('surface-raised') }).background,
    ).toBe('var(--kui-color-surface-raised)');
  });

  it('a protected data-background cannot be forged through rootAttributes', () => {
    const html = String(
      Pane({
        children: <span>Content</span>,
        // @ts-expect-error data-background is Pane-owned
        rootAttributes: { 'data-background': '' },
      }),
    );
    expect(html).not.toContain('data-background');
  });

  it('NavStack paints its color on the stack, docked chrome, bottom toolbar, and views', () => {
    const html = String(
      NavStack({
        id: 'stack',
        label: 'Stack',
        background: fillColor('oklch(30% 0.05 260)'),
        views: [{ key: 'home', content: <span>Home</span> }],
      }),
    );
    expect(html).toContain('data-background=""');
    expect(html).toContain(
      'style="--_kui-nav-stack-background:oklch(30% 0.05 260)"',
    );

    const css = rules('navigation/nav-stack/nav-stack.css');
    const painted = css.filter((rule) =>
      rule.decls.includes(
        'background:var(--_kui-nav-stack-background, var(--kui-color-surface))',
      ),
    );
    expect(painted.map((rule) => rule.selector)).toEqual([
      '.kui-nav-stack',
      '.kui-nav-stack__chrome',
      '.kui-nav-stack__view',
      '.kui-nav-stack__bottom',
    ]);
    // A nested stack without its own color never inherits the outer one.
    expect(
      css.find(
        (rule) => rule.selector === '.kui-nav-stack:not([data-background])',
      )?.decls,
    ).toEqual(['--_kui-nav-stack-background:initial']);
  });

  it('TabNavigator paints its root and docked bar; a tab paints its own scene', () => {
    const html = String(
      TabNavigator({
        id: 'tabs',
        label: 'Sections',
        active: 'a',
        background: uiColor('surface-raised'),
        tabs: [
          {
            id: 'a',
            label: 'A',
            content: <span>A</span>,
            appearance: 'sunken',
            background: fillColor('#202020'),
          },
          { id: 'b', label: 'B', content: <span>B</span> },
        ],
      }),
    );
    expect(html).toContain(
      'style="--_kui-tab-scaffold-background:var(--kui-color-surface-raised)"',
    );
    expect(html).toContain(
      'style="--_kui-tab-scaffold-scene-background:#202020"',
    );
    // The tab's color replaces its sunken appearance.
    expect(html).not.toContain('data-appearance="sunken"');

    const css = rules('navigation/tab-navigator/tab-navigator.css');
    expect(
      css
        .filter((rule) =>
          rule.decls.includes(
            'background:var(--_kui-tab-scaffold-background, var(--kui-color-surface))',
          ),
        )
        .map((rule) => rule.selector),
    ).toEqual(['.kui-tab-scaffold', '.kui-tab-scaffold__bar']);
    expect(
      css.find(
        (rule) => rule.selector === '.kui-tab-scaffold__scene[data-background]',
      )?.decls,
    ).toEqual([
      'background:var(--_kui-tab-scaffold-scene-background)',
      '--kui-color-surface-current-region:var(--_kui-tab-scaffold-scene-background)',
    ]);
    expect(
      css.find((rule) => rule.selector === '.kui-tab-scaffold[data-background]')
        ?.decls,
    ).toEqual([
      '--kui-color-surface-current-region:var(--_kui-tab-scaffold-background)',
    ]);
  });
});
