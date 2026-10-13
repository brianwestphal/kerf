import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('TabNavigator label geometry', () => {
  it('keeps the complete label line box from shrinking below its text', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/components/navigation/tab-navigator/tab-navigator.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const label = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector === '.kui-tab-scaffold__tab-label',
    );

    if (!label || label.type !== 'rule')
      throw new Error('Missing TabNavigator label rule');

    const declarations = Object.fromEntries(
      label.nodes
        .filter((node) => node.type === 'decl')
        .map((node) => [node.prop, node.value]),
    );
    expect(declarations).toMatchObject({
      flex: 'none',
      overflow: 'hidden',
      'text-overflow': 'ellipsis',
      'white-space': 'nowrap',
    });
  });
});

// KF-C3V8B7: the overlay bar's material, measured placement, the scenes'
// block-end edge context, the plain scene's clearance, and the label lift.
describe('TabNavigator overlay bar', () => {
  async function rules() {
    const file = resolve(
      import.meta.dirname,
      '../../src/components/navigation/tab-navigator/tab-navigator.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const found: Array<{ selector: string; decls: Record<string, string> }> =
      [];
    root.walkRules((rule) => {
      found.push({
        selector: rule.selector.replace(/\s+/g, ' '),
        decls: Object.fromEntries(
          rule.nodes
            .filter((node) => node.type === 'decl')
            .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
        ),
      });
    });
    return (selector: string) =>
      found.filter((rule) => rule.selector === selector).map((r) => r.decls);
  }

  const overlay = '.kui-tab-scaffold[data-bar-presentation="overlay"]';
  const measured = `${overlay}[data-bar-overlay="measured"]`;

  it('paints the material, then lays the measured bar over the scenes', async () => {
    const rule = await rules();
    expect(rule(`${overlay} > .kui-tab-scaffold__bar`)[0]).toEqual({
      '-webkit-backdrop-filter': 'var(--kui-chrome-material-filter)',
      'backdrop-filter': 'var(--kui-chrome-material-filter)',
      background: 'var(--kui-chrome-material)',
    });
    expect(rule(measured)[0]).toEqual({ position: 'relative' });
    expect(rule(`${measured} > .kui-tab-scaffold__bar`)[0]).toEqual({
      position: 'absolute',
      'z-index': '2',
      'inset-block-end': '0',
      'inset-inline': '0',
    });
    expect(rule(`${measured} > .kui-tab-scaffold__scenes`)[0]).toEqual({
      '--kui-edge-inset-block-end':
        'var(--_kui-tab-scaffold-bar-block-size, 0px)',
    });
    // Forced colors: the second rule for the bar, inside the media query.
    expect(rule(`${overlay} > .kui-tab-scaffold__bar`)[1]).toMatchObject({
      background: 'Canvas',
      'border-block-start-color': 'CanvasText',
    });
  });

  it('lifts both tab labels over the material', async () => {
    const rule = await rules();
    expect(
      rule(
        `${overlay} > .kui-tab-scaffold__bar > .kui-tab-scaffold__tab:not([aria-selected="true"])`,
      )[0]!.color,
    ).toBe(
      'color-mix( in srgb, var(--kui-color-text-quiet), var(--kui-color-text) 50% )',
    );
    expect(
      rule(
        `${overlay} > .kui-tab-scaffold__bar > .kui-tab-scaffold__tab[aria-selected="true"]`,
      )[0]!.color,
    ).toBe(
      'color-mix( in srgb, var(--kui-color-brand-on-quiet), var(--kui-color-text) 40% )',
    );
  });
});
