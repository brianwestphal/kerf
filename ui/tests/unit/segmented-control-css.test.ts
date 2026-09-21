import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('SegmentedControl corner geometry', () => {
  it('subtracts the control border and padding from the item radius', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/segmented-control.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const control = root.nodes.find(
      (node) =>
        node.type === 'rule' && node.selector === '.kui-segmented-control',
    );

    if (!control || control.type !== 'rule')
      throw new Error('Missing SegmentedControl rule');

    const declarations = new Map(
      control.nodes
        .filter((node) => node.type === 'decl')
        .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
    );
    expect(declarations.get('border')).toBe(
      '1px solid var(--kui-segmented-border)',
    );
    expect(declarations.get('padding')).toBe('1px');
    expect(declarations.get('--kui-segmented-item-radius')).toBe(
      'max( 0px, calc(var(--kui-segmented-radius) - 2px) )',
    );
  });
});
