import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss, { type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

describe('Catalog related selector CSS', () => {
  it('leaves trigger and popup geometry to the toolbar and dropdown contracts', async () => {
    const file = resolve(import.meta.dirname, '../../src/catalog.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const matchingRules = root.nodes.filter(
      (node): node is Rule =>
        node.type === 'rule' && node.selector.includes('related-menu'),
    );
    expect(matchingRules).toEqual([]);
  });
});
