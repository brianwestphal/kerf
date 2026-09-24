import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('catalog-example note alignment', () => {
  it('insets a CatalogExample note by the margin, border, and content padding so it lines up with the ListHeader label and a content-item component', async () => {
    const file = resolve(import.meta.dirname, '../../src/catalog.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const rule = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector === '.kui-catalog-example__note.kui-text',
    );

    if (!rule || rule.type !== 'rule')
      throw new Error('Missing catalog example note rule');
    const inset = rule.nodes.find(
      (node) => node.type === 'decl' && node.prop === 'padding-inline',
    );

    if (!inset || inset.type !== 'decl')
      throw new Error('Missing catalog example note inset');
    expect(inset.value.replace(/\s+/g, ' ')).toBe(
      'calc( var(--kui-layout-inline-margin, remify(8px)) + var(--kui-layout-item-padding, remify(8px)) )',
    );
  });
});
