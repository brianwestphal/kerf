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
    const file = resolve(
      import.meta.dirname,
      '../../src/components/forms/select/select.css',
    );
    const css = await readFile(file, 'utf8');

    expect(css).not.toContain('.kui-skeleton');
  });

  it('spaces option and trigger icons from their labels', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/components/forms/select/select.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });

    expect(
      declarations(root, '.kui-select__option > .kui-select__icon').get(
        'margin-inline-end',
      ),
    ).toBe('var(--_kui-popup-row-icon-gap)');
    expect(
      declarations(root, '.kui-select__trigger > .kui-select__icon').get(
        'margin-inline-end',
      ),
    ).toBe('remify(8px)');
  });

  it('paints delegated Select focus on the toolbar group', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/components/actions/toolbar-control-group/toolbar-control-group.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const rule = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector.replace(/\s+/g, ' ') ===
          '.kui-toolbar-control-group[data-focus-ring="outline"]:focus-within:not( :where( :has( .kui-select[open], .kui-popup-menu > [aria-expanded="true"], wa-dropdown:not(.kui-popup-menu)[open] ) ) )',
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
