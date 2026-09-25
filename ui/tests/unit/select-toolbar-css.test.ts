import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

function declarations(root: postcss.Root, selector: string) {
  const rule = root.nodes.find(
    (node) => node.type === 'rule' && node.selector === selector,
  );
  if (!rule || rule.type !== 'rule') throw new Error(`Missing ${selector}`);
  return new Map(
    rule.nodes
      .filter((node) => node.type === 'decl')
      .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
  );
}

describe('Select toolbar composition CSS', () => {
  it('does not restyle the nested Skeleton component', async () => {
    const file = resolve(import.meta.dirname, '../../src/select.css');
    const css = await readFile(file, 'utf8');

    expect(css).not.toContain('.kui-skeleton');
  });

  it('puts option spacing on the Web Awesome start part', async () => {
    const file = resolve(import.meta.dirname, '../../src/select.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });

    expect(
      declarations(root, '.kui-select wa-option::part(start)').get(
        'margin-inline-end',
      ),
    ).toBe('remify(8px)');
    expect(
      declarations(root, '.kui-select > .kui-select__icon[slot="start"]').get(
        'margin-inline-end',
      ),
    ).toBe('remify(8px)');
    const selectedIconRule = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector === '.kui-select > .kui-select__icon[slot="start"]',
    );
    expect(
      selectedIconRule?.type === 'rule' &&
        selectedIconRule.nodes.some(
          (node) =>
            node.type === 'decl' &&
            node.prop === 'margin-inline-end' &&
            node.important,
        ),
    ).toBe(true);
  });

  it('paints delegated Select focus on the toolbar group', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/toolbar-control-group.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const rule = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector ===
          '.kui-toolbar-control-group[data-focus-ring="outline"]:focus-within',
    );
    if (!rule || rule.type !== 'rule')
      throw new Error('Missing delegated Select focus rule');
    const values = new Map(
      rule.nodes
        .filter((node) => node.type === 'decl')
        .map((node) => [node.prop, node.value]),
    );
    expect(values.get('outline')).toBe('var(--kui-focus-ring)');
    expect(values.get('outline-offset')).toBe('1px');
  });
});
