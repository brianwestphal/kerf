import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss, { type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

describe('Catalog related selector CSS', () => {
  it('keeps the public stylesheet as import-only compatibility surface', async () => {
    const file = resolve(import.meta.dirname, '../../src/catalog.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const nodes = root.nodes.filter((node) => node.type !== 'comment');
    expect(nodes.every((node) => node.type === 'atrule')).toBe(true);
    expect(
      nodes.map((node) => (node.type === 'atrule' ? node.params : undefined)),
    ).toEqual([
      '"./catalog/components/catalog.css"',
      '"./catalog/components/catalog-sidebar.css"',
      '"./catalog/components/catalog-section-list.css"',
      '"./catalog/components/catalog-secondary-sections.css"',
      '"./catalog/components/catalog-detail.css"',
      '"./catalog/components/catalog-stage.css"',
      '"./catalog/components/catalog-resource-footer.css"',
      '"./catalog/components/catalog-example.css"',
      '"./catalog/components/catalog-example-stack.css"',
    ]);
  });

  it('leaves trigger and popup geometry to the toolbar and dropdown contracts', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/catalog/components/catalog-resource-footer.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const matchingRules = root.nodes.filter(
      (node): node is Rule =>
        node.type === 'rule' && node.selector.includes('related-menu'),
    );
    expect(matchingRules).toEqual([]);
  });
});
